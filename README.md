# VSCode Launcher

![VSCode Launcher](https://img.shields.io/badge/version-0.0.1-blue)

This project is a CLI tool for running a launch configuration from `.vscode/launch.json`. It uses [Figlet](https://www.npmjs.com/package/figlet) to print a fun banner, [Commander](https://www.npmjs.com/package/commander) for argument parsing, and custom utilities for launching and reading configuration files.

## Features
- Launch a specific configuration from `.vscode/launch.json`
- Specify the working directory
- Optional debug mode for extra logging

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vscode-launcher.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Command Syntax
```bash
node index.js [options]
```

### Options
| Option                                 | Description                                                          | Default Value            |
|----------------------------------------|----------------------------------------------------------------------|--------------------------|
| `--cwd [cwd]`                          | Set the current working directory to use.                            | `process.cwd()`           |
| `-c, --configuration-name <configuration>` | Specify the name of the configuration to launch.                     | *None*                   |
| `-d, --debug`                          | Enable debug mode for additional logs.                               | `false`                  |
| `-l, --launchFile [launch-file]`        | Path to the `launch.json` file.                                       | `.vscode/launch.json`    |

### Example Usage

To run a specific configuration:
```bash
node index.js --configuration-name myConfig
```

To run with a custom launch file:
```bash
node index.js -l ./custom/launch.json -c myConfig
```

Enable debugging:
```bash
node index.js --debug
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

