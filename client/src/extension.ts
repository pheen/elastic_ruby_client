"use strict";

import { commands, ExtensionContext, ProgressLocation, window, workspace } from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import { execFile } from "mz/child_process";

export async function activate(context: ExtensionContext) {
  const image = "blinknlights/elastic_ruby_server";
  const projectPath = workspace.workspaceFolders[0].uri.path;
  const volumeName = `elastic_ruby_server-${hashCode(projectPath)}`;

  const conf = workspace.getConfiguration("elasticRubyServer");
  let logLevel = conf["logLevel"] || "DEBUG";

  const executable: ServerOptions = {
    command: "docker",
    args: ["container", "attach", "elastic-ruby-server"]
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: ['ruby'],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.rb')
    }
  };

  await pullDockerImage(image);
  await execFile("docker", ["volume", "create", volumeName]);

  try {
    // check if the container is already running
    await execFile("docker", [ "container", "inspect", "elastic-ruby-server" ]);
  } catch {
    // it's not running, fire it up!
    await execFile(
      "docker",
      [
        "run", "--rm", "-i",
        "--name", "elastic-ruby-server",
        "-e", `LOG_LEVEL=${logLevel}`,
        "-v", `${projectPath}:/project`,
        "-v", `${volumeName}:/usr/share/elasticsearch/data`,
        "-w", "/project",
        image
      ]
    );
  }

  const client = new LanguageClient("Elastic Ruby Server", executable, clientOptions).start();

  // Push the client to the context's subscriptions so that the
  // client can be deactivated on extension deactivation
  context.subscriptions.push(client);
}

async function pullDockerImage(image: string) {
  var attempts = 0;

  while (attempts < 10) {
    try {
      await window.withProgress({ title: "elastic_ruby_server", location: ProgressLocation.Window }, async progress => {
        progress.report({ message: `Pulling ${image}` });
        await execFile("docker", ["pull", image], {});

        attempts = attempts + 10
      });
    } catch (error) {
      attempts = attempts + 1
      showPullImageError(error);
    }
  }
}

async function showPullImageError(error: any) {
  if (error.code == 1) { // Docker not yet running
    window.showErrorMessage("Waiting for docker to start");
    await delay(10 * 1000);
  } else {
    if (error.code == "ENOENT") {
      const msg = "Docker executable not found. Install Docker.";
      const selected = await window.showErrorMessage(msg, { modal: true }, "Open settings");

      if (selected === "Open settings") {
        await commands.executeCommand("workbench.action.openWorkspaceSettings");
      }
    } else {
      window.showErrorMessage("Error updating docker image! - will try to use existing local one: " + error.message);
      console.error(error);
    }
  }
}

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

// this hash is used as a unique id for the docker volume
function hashCode(s: any) {
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
}
