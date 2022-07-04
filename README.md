# Elastic Ruby Server

A Ruby language server with persistent storage backed by Elasticsearch. The goal of this language server is to provide reasonably accurate static analysis while staying performant for large projects.
&nbsp;

| Features  |  |
| ------------- | ------------- |
| [Definitions](#definitions) | Jump to definitions for methods, variables, etc. |
| ~[Definition Search](#definition-search)~  | Search definitions in all files. Currently Disabled while WIP. |
| [Diagnostics](#diagnostics) | Indicates issues generated with Rubocop |
| [Formatting](#formatting) | Supports formatting only modified lines |
| [Highlights](#highlights) | Highlight all occurrences in a document |
| [References](#references) | Show where a method/variable/symbol is being used |
| [Rename](#rename) | Update all references to a method/variable/symbol |

&nbsp;
## Installation
**1.** Install the `Elastic Ruby Language Server` extension from the VSCode Marketplace.

**2.** Install Docker if needed.

**3.** Install the dependencies needed for the extension to interact with Docker:
```bash
> cd ~/.vscode/extensions/blinknlights.elastic-ruby-client-1.0.0/
> npm install
```

**3.** Set paths the server can read. A file must be in a sub-directory of one of these paths to be accessable by the server. Configure in VSCode's settings:

```
"elasticRubyServer.projectPaths": [
  "/Users/<name>/projects",
  "/Users/<name>/a_folder/more_projects"
]
```

- Note: don't use your home directory as a path or docker will use a large amount of CPU %.
- Tip: add a path that includes your gems so you can use the language server when running `bundle open <gem name>`. For example using rbenv: `"/Users/<username>/.rbenv/versions"`

**5.** Enable formatting on save. Only modified lines are formatted. Configure in VSCode's settings:

```
"editor.formatOnSave": true,
"editor.formatOnSaveMode": "modifications",
"[ruby]": {
  "editor.defaultFormatter": "Blinknlights.elastic-ruby-client"
},
```

**6.** Activate the extension by reloading VSCode and navigating to any `.rb` file.

- The server's Docker image will automatically download and run before indexing the workspace.
- The status bar icon turns red while the server is busy. The tooltip displays progress:
![image](https://user-images.githubusercontent.com/1145873/177087354-ef3ab14f-5e85-4440-8447-85eb3bbdadc2.png)
![image](https://user-images.githubusercontent.com/1145873/177087554-1bd900f3-c14b-454f-8af7-052be40ec0d9.png)

&nbsp;
## Configuration
- `elasticRubyServer.projectPaths`. See Installation.
- `elasticRubyServer.port`. Default: `8341`

&nbsp;
## Features
<a id="definitions"></a>
### Definitions
Peek or go to the definition of a method/variable/symbol

- Command: `Go to Definition`
- Keybinds:
  - `f12`
  - `cmd + click`

&nbsp;
- Supported framework definitions:
  - Rails:
    - belongs_to
    - has_one
    - has_many
    - has_and_belongs_to_many
  - RSpec:
    - let!
    - let

![goto-definition](https://code.visualstudio.com/assets/api/language-extensions/language-support/goto-definition.gif)

&nbsp;
<a id="definition-search"></a>
### Definition Search
Quickly navigate to definitions anywhere in a project.

- Command: `Go to Symbol in Workspace...`
- Keybind: `cmd + t`

![workspace-symbols](https://code.visualstudio.com/assets/api/language-extensions/language-support/workspace-symbols.gif)

&nbsp;
<a id="diagnostics"></a>
### Diagnostics
Enable and configure Rubocop to highlight issues by adding .rubocop.yml to the root of a project.

&nbsp;
<a id="formatting"></a>
### Formatting
Formats modified lines using a light Rubocop configuration. Duplicate changes are ignored so formatting will not be applied when undoing the automatic formatting then re-saving.

- Trigger: on save
- Command: `Format Selection`
- Keybind: `cmd+k cmd+f`

![format-document](https://code.visualstudio.com/assets/api/language-extensions/language-support/format-document.gif)

&nbsp;
<a id="highlights"></a>
### Highlights
See all occurrences of a method/variable/symbol in the current editor.

![document-highlights](https://code.visualstudio.com/assets/api/language-extensions/language-support/document-highlights.gif)

&nbsp;
<a id="references"></a>
### References
See all the locations where a method/variable/symbol is being used. Only locations in the the file being edited are shown currently.

- Command: `Go to References`
- Keybind: `shift + f12`

![find-references](https://code.visualstudio.com/assets/api/language-extensions/language-support/find-references.gif)

&nbsp;
<a id="rename"></a>
### Rename
Change the name of a method/variable/symbol.

- Command: `Rename Symbol`
- Keybind: `f2`

![rename](https://code.visualstudio.com/assets/api/language-extensions/language-support/rename.gif)

&nbsp;
## Custom Commands
Run commands with `cmd + shift + p`.
- `Reindex Workspace` deletes all current data for the project and starts reindexing all files.
- `Stop Server` to shutdown the Docker container.

&nbsp;
## How does it work?
The server runs inside a docker container and has its own instance of Elasticsearch. Clients connect through TCP allowing multiple clients to connect to a single instance of the server.

Ruby files are converted to an AST with [Parser](https://github.com/whitequark/parser) which is serialized by the language server and indexed into Elasticsearch. Data is persisted in a named Docker volume.

Definitions are searched by storing a `scope` which is built for a given location using rules mimicking Ruby's variable scope. When searching with `Go To` the correct definitions are chosen largely based on this scope. Multiple definitions will be shown if more than one match the search criteria.

&nbsp;
## Troubleshooting
- Check that the container is running. The image name is `blinknlights/elastic_ruby_server` which is ran with the name `elastic-ruby-server`. You could check with `docker ps` or in the Docker app:

  ![Screen Shot 2021-07-01 at 8 41 06 PM](https://user-images.githubusercontent.com/1145873/124217196-bc1a4380-daac-11eb-9f9a-e05bca82d5f6.png)

&nbsp;
## License
[MIT](https://choosealicense.com/licenses/mit/)
