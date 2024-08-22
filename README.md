# CodeArt - BinExplore

![logo](assets/images/logo.png)

VSCode extension for analyzing compiled binaries and object files.

## Features

- Previewing `objdump` output in a new editor tab once a binary or object file is opened.

## Requirements

- `objdump` must be installed on your system.
- The binary or object file must be opened in the editor.
- The extension is currently supported and tested on Linux Ubuntu 20.04 LTS.

## Extension Settings

- `Objdump Path`: Path to the `objdump` executable. Default is `objdump` to be fetched from system `$PATH`.
- `Build Args`: Arguments to pass to `objdump`. Default is `-d -S`.

## Installation and Usage
- Currently the extension is not published on the VSCode marketplace. It can be only installed manually as .vsix file.
- Download the latest release from the [releases](TBD)

## License
- [MIT](LICENSE)
