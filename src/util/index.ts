import {readFileSync, writeFileSync} from "fs";
import {LaunchFile} from "../models/index.js";
import chalk from "chalk";
import {execSync} from "child_process";
import JSON5 from "json5";

export function expandVariables(value: any): any {
    if (typeof value === 'string') {
        return value
            .replace(/\$\{workspaceRoot\}/g, process.cwd())
            .replace(/\$\{workspaceFolder\}/g, process.cwd())
            .replace(/\$\{env\.(\w+)\}/g, (match, varName) => process.env[varName] || '') as any
    }
    if (typeof value === 'object' && value !== null) {
      Array.isArray(value) ? value.map(expandVariables) : Object.keys(value).forEach(key => value[key] = expandVariables(value[key]))
    }
    return value
}

export function readJsonFile(path: string, debug: boolean = false): LaunchFile {
  try {
    const launchFile = readFileSync(path, 'utf8');
    const launchConfigurations = JSON5.parse(launchFile); // Validate JSON5
    return launchConfigurations as LaunchFile;
  } catch (e) {
    debug && console.error(e);
    console.error(chalk.red(`Could not read file ${path}`));
    process.exit(1);
  }
}

const COLORS = [
  chalk.magenta,
  chalk.blue,
  chalk.cyan,
  chalk.green,
  chalk.yellow,
  chalk.red
]

export function launch(launchFile: LaunchFile, configurationName: string, cwd?: string, showCommand: boolean = false) {
  const expandedLaunchFile = expandVariables(launchFile) as LaunchFile;

  const config = expandedLaunchFile.configurations.find(config => config.name === configurationName)
  if (!config) {
    console.error(chalk.red(`Configuration ${configurationName} not found`));
    return;
  }

  // TODO: Needs OS specific handling
  const runtimeExecutable = config.osx?.runtimeExecutable || '';
  const program = config.cwd || '.';

  const command = `${runtimeExecutable} ${config.runtimeArgs?.join(' ') || ''} ${program} ${config.args?.join(' ') || ''}`.trim().replace(/\s+/g, ' ');

  if (showCommand) {
    console.log(command);
    return;
  }

  console.log(chalk.bold(`Launching ${config.name}`));
  console.log(config);

  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  console.log(color(`Launching ${config.name}`));

  execSync(command, {
    stdio: 'inherit',
  });
}
