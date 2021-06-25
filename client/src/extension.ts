'use strict';

import * as vscode from 'vscode';
import { execFile } from 'mz/child_process';
import * as net from 'net';

import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo, TransportKind } from 'vscode-languageclient/node';
import { workspace } from 'vscode';

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

function hashCode(s: any) {
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
}

async function pullImage(image: string) {
  var attempts = 0;
  while (attempts < 10) {
    try {
      await vscode.window.withProgress({ title: "elastic_ruby_server", location: vscode.ProgressLocation.Window }, async progress => {
        progress.report({ message: `Pulling ${image}` });
        // console.log('before')
        await execFile("docker", ["pull", image], {});
        // console.error('after');
        attempts = attempts + 10
      });
    } catch (err) {
      attempts = attempts + 1
      // vscode.window.showErrorMessage(`${err.code}`);
      if (err.code == 1) { // Docker not yet running
        // console.error('a');
        vscode.window.showErrorMessage('Waiting for docker to start');
        // console.error('b');
        await delay(10 * 1000);
        // console.error('c');
      } else {
        if (err.code == "ENOENT") {
          const selected = await vscode.window.showErrorMessage(
            'Docker executable not found. Install Docker.',
            { modal: true },
            'Open settings'
            );
            if (selected === 'Open settings') {
              await vscode.commands.executeCommand('workbench.action.openWorkspaceSettings');
            }
        } else {
          vscode.window.showErrorMessage('Error updating docker image! - will try to use existing local one: ' + err.message);
          console.error(err);
        }
      }

    }
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const conf = vscode.workspace.getConfiguration("elastic-ruby-server");
  let defaultImage = "blinknlights/elastic_ruby_server";
  let command: string;
  let args: Array<string>;
  const image = conf["dockerImage"] || defaultImage;

  command = "docker";
  let logLevel = conf["logLevel"] || "DEBUG";

  const project_path = vscode.workspace.workspaceFolders[0].uri.path;

  const volume_name = `elastic_ruby_server-${hashCode(project_path)}`;

  await execFile("docker", ["volume", "create", volume_name]);

  args = ["run", "--rm", "-i", "-e", `LOG_LEVEL=${logLevel}`, "-v", `${project_path}:/project`, "-v", `${volume_name}:/usr/share/elasticsearch/data`, "-w", "/project"];
  let additionalGems = conf["additionalGems"];
  if (additionalGems && additionalGems != "") {
    args.push("-e", `ADDITIONAL_GEMS=${additionalGems}`)
  }
  args.push(image);

  // console.log("HERE 1");
  // pullImage(image);
  // console.log("HERE 2");

  const clientOptions: LanguageClientOptions = {
    documentSelector: ['ruby'],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.rb')
    }
  };

  const executable: ServerOptions = { command, args };
  // console.log("HERE 3");
  try {
    // Try to run a simple docker command
    await execFile("docker", ["ps"]);
    // console.log("HERE 3.1");
  } catch (error) {
    // If it fails we assume it's starting up - give it time
    // console.log("HERE 3.2");
    await delay(20 * 1000)
    // console.log("HERE 3.3");
  }

  // const disposable = new LanguageClient("Elastic Ruby Server", executable, clientOptions).start();
  // // console.log("HERE 4");

  // context.subscriptions.push(disposable);

	let connectionInfo = {
		port: 5686,
		host: "localhost"
  };

	let serverOptions = () => {
    // Connect to language server via socket
    let socket = net.connect(connectionInfo);
    let result: StreamInfo = {
        writer: socket,
        reader: socket
    };
    return Promise.resolve(result);
  };

	// Create the language client and start the client.
	let client = new LanguageClient(
		'languageServerExample',
		'Language Server Example',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();
}
