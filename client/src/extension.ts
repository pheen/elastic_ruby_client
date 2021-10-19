"use strict";

import * as vscode from "vscode";
import { execFile } from "mz/child_process";
import * as net from "net";

import { LanguageClient, LanguageClientOptions, StreamInfo } from "vscode-languageclient/node";
import { workspace } from "vscode";

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

function bindCustomEvents(client: LanguageClient, context: vscode.ExtensionContext, settings) {
  let disposables = []

	disposables.push(
    vscode.commands.registerCommand("elasticRubyServer.reindexWorkspace", () => {
      vscode.window.withProgress({ title: "Elastic Ruby Client", location: vscode.ProgressLocation.Window }, async progress => {
        progress.report({ message: "Reindexing workspace..." });
        client.sendNotification("workspace/reindex");
      });
    })
  );

	disposables.push(
    vscode.commands.registerCommand("elasticRubyServer.stopServer", () => {
      vscode.window.withProgress({ title: "Elastic Ruby Client", location: vscode.ProgressLocation.Window }, async progress => {
        progress.report({ message: "Stopping server..." });
        execFile("docker", [ "stop", settings.containerName ]);
      });
    })
  );

  for (let disposable of disposables) {
    context.subscriptions.push(disposable);
  }
}

function buildContainerArgs(settings) {
  let dockerArgs = [
    "run",
    "-d",
    "--rm",
    "--name", settings.containerName,
    "--ulimit", "memlock=-1:-1",
    "-v", `${settings.volumeName}:/usr/share/elasticsearch/data`,
    "-p", `${settings.port}:${settings.port}`,
    "-e", `SERVER_PORT=${settings.port}`,
    "-e", `LOG_LEVEL=${settings.logLevel}`,
    "-e", `HOST_PROJECT_ROOTS="${settings.projectPaths.join(",")}"`
  ];

  const mounts = settings.projectPaths.map(path => {
    return {
      path: path,
      name: path.match(/\/([^\/]*?)(\/$|$)/)[1]
    };
  });

  mounts.forEach(mount => {
    dockerArgs.push(
      "--mount",
      `type=bind,source=${mount.path},target=/projects/${mount.name},readonly`
    );
  });

  dockerArgs.push(settings.image);

  return dockerArgs;
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
        vscode.window.showErrorMessage("Waiting for docker to start");
        await delay(10 * 1000);
      } else {
        if (err.code == "ENOENT") {
          const selected = await vscode.window.showErrorMessage(
            "Docker executable not found. Install Docker.",
            { modal: true },
            "Open settings"
            );
            if (selected === "Open settings") {
              await vscode.commands.executeCommand("workbench.action.openWorkspaceSettings");
            }
        } else {
          vscode.window.showErrorMessage("Error updating docker image! - will try to use existing local one: " + err.message);
          console.error(err);
        }
      }
    }
  }
}

async function createVolume(volumeName: string) {
  await execFile("docker", ["volume", "create",volumeName]);
}

async function startContainer(settings) {
  // todo: cleanup this function
  try {
    // check if the container is already running
    await execFile("docker", [ "container", "top", settings.containerName ]);
  } catch (error) {
    // it's not running, fire it up!
    await execFile("docker", buildContainerArgs(settings));

    await delay(5 * 1000)
  }

  try {
    await execFile("docker", [ "container", "top", settings.containerName ]);
  } catch (error) {
    // Give it a bit more time, probably will be fine
    await delay(5 * 1000);
  }
}

function buildLanguageClient(settings) {
  let serverOptions = () => {
    let socket = net.connect({
      port: settings.port,
      host: "localhost"
    });
    let result: StreamInfo = {
      writer: socket,
      reader: socket
    };
    return Promise.resolve(result);
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: ["ruby"],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/*.rb")
    }
  };

  return new LanguageClient(
    "ElasticRubyServer",
    "Elastic Ruby Server",
    serverOptions,
    clientOptions
  );
}

export async function activate(context: vscode.ExtensionContext, reactivating = false) {
  if (!workspace.workspaceFolders) { return; }

  const conf = vscode.workspace.getConfiguration("elasticRubyServer");
  const settings = {
    image:         conf["image"] || "blinknlights/elastic_ruby_server",
    projectPaths:  conf["projectPaths"],
    port:          conf["port"],
    logLevel:      conf["logLevel"],
    volumeName:    `elastic_ruby_server-0.2.0`,
    containerName: "elastic-ruby-server"
  }

  pullImage(settings.image);
  await createVolume(settings.volumeName);
  await startContainer(settings);

  const client = buildLanguageClient(settings);

  client.start();
  bindCustomEvents(client, context, settings);
}
