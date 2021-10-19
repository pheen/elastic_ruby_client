# Elastic Ruby Server

[Elastic Ruby Server](https://github.com/pheen/elastic_ruby_server) is a Ruby language server with persistent storage backed by Elasticsearch.

## Features & Usage
##### - Workspace symbol lookup
- Default keybind is `cmd + t`.
- Search modules, classes, and method definitions in for the whole project.

##### - Go To Definition
- Default keybinds are `cmd + click` or `f12`. Rebind to another key by setting `Go to Definition` in your VSCode's keybinds.
- Some framework variable and method definitions are supported:
  - Rails:
    - belongs_to
    - has_one
    - has_many
    - has_and_belongs_to_many
  - RSpec:
    - let!
    - let

## Installation
**1.** Install Docker if needed and the `Elastic Ruby Server` extension

**2.** Configure `elasticRubyServer.projectPaths`. **Important:** A project must be a sub-directory of one of these paths to be readable by the langue server.
- Configure in VSCode's JSON settings (`cmd + shift + p` and search for `Preferences: Open Settings (JSON)`).
- Don't use your home directory a path or docker will use a large amount of CPU %.
```
"elasticRubyServer.projectPaths": [
	"/Users/<name>/projects",
	"/Users/<name>/a_folder/more_projects"
]
```

**3.** Install dependencies needed for the extension to interact with docker:
```bash
> cd ~/.vscode/extensions/blinknlights.elastic-ruby-client-0.5.1/
> npm install
```

**5.** Reload VSCode

**6.** Navigate to any `.rb` file to activate the extension.

The extension will automatically start indexing a workspace when activated.

Notes:
- Indexing can be much faster for projects with lots of files if the project has been checked into Git
- Large projects will take take a few minutes to scan.
- The docker image may take a few minutes to download as it's ~700mb.

## Commands
Run commands with `cmd + shift + p`.
- `Reindex Workspace` deletes all current data for the project and starts reindexing all files.
- `Stop Server` to shutdown the Docker container.

## How does it work?
The server runs inside a docker container and has its own instance of Elasticsearch. Clients connect through TCP which allows all clients to connect to the single docker container.

Ruby files are converted to an AST with [Parser](https://github.com/whitequark/parser) which is serialized by the language server and indexed into Elasticsearch. Data is written to a Docker volume.

Definitions are searched by storing a `scope` which is built for a given location using mostly similar rules to Ruby's variable scope. The server doesn't store specifically which variables correspond. At runtime it searches by looking for the cursor's current `scope` plus some other factors like file path. It's a "fuzzy" search so there may be more than one result. There is a threshold of correctness where the server will guess that it has the exact match and will return only one result.

## Performance considerations?
- It should take up ~1.3gb of RAM while idling.
- Open files are tracked and are reindexed as changes are made. Two optimizations have been made so you shouldn't notice any slow down:
  - Only partial updates are sent so there is no difference even when editing large files. When opening a file the whole contents are sent to the server only once.
  - Reindexing is debounced so it's only triggered after you've stopped making changes.

## Configuration
- `elasticRubyServer.port`. The default is `8341`.

## Troubleshooting
- Check that the container is running. The image name is `blinknlights/elastic_ruby_server` which is ran with the name `elastic-ruby-server`. You could check with `docker ps` or in the Docker app:

  ![Screen Shot 2021-07-01 at 8 41 06 PM](https://user-images.githubusercontent.com/1145873/124217196-bc1a4380-daac-11eb-9f9a-e05bca82d5f6.png)

## License
[MIT](https://choosealicense.com/licenses/mit/)
