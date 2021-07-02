# Elastic Ruby Client

Elastic Ruby Client is a VSCode extension providing a client for [Elastic Ruby Server](https://github.com/pheen/elastic_ruby_server).

## Installation

**1.** Install the extension through VSCode

**2.** Configure `projectPaths` in VSCode's settings. A workspace **must** be a sub-directory of one of these paths for this extension to function.

```
"elasticRubyClient.projectPaths": [
	"/Users/<name>/projects",
	"/Users/<name>/a_folder/more_projects"
]
```

- These paths are mounted as `readonly` when starting the server's docker container:

- *Note: do not use your home directory as a path or docker will use a large amount of CPU %.*

**3.** Navigate to the extension folder:

```bash
cd ~/.vscode/extensions/blinknlights.elastic-ruby-client-0.2.6/
```

**4.** Install dependencies:

```
npm install
```

*Note: dependencies need to be installed again when a new version is installed.*

**5.** Reload VSCode and navigate to a *.rb file to activate the extension.
- The docker image may take a few minutes to download. It's about ~360mb.
- Once the docker image is downloaded it will boot and start indexing.
- Large projects can take take a few minutes to scan. Files are indexed at about 1000 files/minute on my machine.

## Features

#### Go To Definition

Go to definition can be activated with `cmd + click`, `f12`, or by setting a new keybind for `Go to Definition` in VSCode (`cmd + g`, for example).

#### Workspace symbol lookup

Workspace Symbol Lookup is activated with `cmd + t`. Modules, classes, and method definitions for the entire project can be searched.

## Troubleshooting

- Repeat Installation steps 3 and 4 to install the extension's dependencies. This needs to be done again if a new version of the extension is installed.

- Check that the container is running. The image name is `blinknlights/elastic_ruby_server` which is ran with the name `elastic-ruby-server`. You could check with `docker ps` or in the Docker app:

![Screen Shot 2021-07-01 at 8 41 06 PM](https://user-images.githubusercontent.com/1145873/124217196-bc1a4380-daac-11eb-9f9a-e05bca82d5f6.png)

## Contributing

This project is still early in development, but I would be stoked for any help!

## License
[MIT](https://choosealicense.com/licenses/mit/)
