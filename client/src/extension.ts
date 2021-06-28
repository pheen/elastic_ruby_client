'use strict';

import * as vscode from 'vscode';
import { execFile } from 'mz/child_process';
import * as net from 'net';

import { LanguageClient, LanguageClientOptions, StreamInfo } from 'vscode-languageclient/node';
import { workspace } from 'vscode';

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

async function pullImage(image: string) {
  var attempts = 0;
  while (attempts < 10) {
    try {
      await vscode.window.withProgress({ title: "elastic_ruby_server", location: vscode.ProgressLocation.Window }, async progress => {
        progress.report({ message: `Pulling ${image}` });
        await execFile("docker", ["pull", image], {});
        attempts = attempts + 10
      });
    } catch (err) {
      attempts = attempts + 1
      // vscode.window.showErrorMessage(`${err.code}`);
      if (err.code == 1) { // Docker not yet running
        vscode.window.showErrorMessage('Waiting for docker to start');
        await delay(10 * 1000);
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
  const image = "blinknlights/elastic_ruby_server";

  const conf = vscode.workspace.getConfiguration("elasticRubyClient");
  const logLevel = conf["logLevel"] || "error";
  const projectPaths = conf["projectPaths"] || [];

  const version = "0.2.0";
  const volumeName = `elastic_ruby_server-${version}`;
  const containerName = "elastic-ruby-server";

  pullImage(image);

  await execFile("docker", ["volume", "create", volumeName]);

  const mounts = projectPaths.map(path => {
    return {
      path: path,
      name: path.match(/\/([^\/]*?)(\/$|$)/)[1]
    };
  });

  let dockerArgs = [
    "run",
    "-d",
    "--rm",
    "--name", containerName,
    "-v", `${volumeName}:/usr/share/elasticsearch/data`,
    "-p", "8341:8341",
    "-e", `LOG_LEVEL=${logLevel}`,
    "-e", `HOST_PROJECT_ROOTS="${projectPaths.join(",")}"`
  ];

  mounts.forEach(mount => {
    dockerArgs.push(
      "--mount",
      `type=bind,source=${mount.path},target=/projects/${mount.name},readonly`
    );
  });

  dockerArgs.push(image);

  try {
    // check if the container is already running
    await execFile("docker", [ "container", "top", containerName ]);
  } catch (error) {
    // it's not running, fire it up!
    await execFile("docker", dockerArgs);
    await delay(5 * 1000)
  }

  try {
    await execFile("docker", [ "container", "top", containerName ]);
  } catch (error) {
    // Give it a bit more time, probably will be fine
    await delay(5 * 1000);
  }

  const clientOptions: LanguageClientOptions = {
    documentSelector: ['ruby'],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.rb')
    }
  };

	let connectionInfo = {
		port: 8341,
		host: "localhost"
  };

	let serverOptions = () => {
    let socket = net.connect(connectionInfo); // TCP socket
    let result: StreamInfo = {
        writer: socket,
        reader: socket
    };
    return Promise.resolve(result);
  };

	let client = new LanguageClient(
		"ElasticRubyServer",
		"Elastic Ruby Server",
		serverOptions,
		clientOptions
	);

	client.start();
}

export function deactivate() {
  const containerName = "elastic-ruby-server";
  execFile("docker", [ "stop", containerName ]);
}
