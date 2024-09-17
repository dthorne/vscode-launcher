import {readFileSync} from "fs";
import {LaunchFile} from "../models/index.js";
import chalk from "chalk";
import {exec, execSync, spawn} from "child_process";
import stripJsonComments from "strip-json-comments";

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

export function readJsonFile<T>(path: string): LaunchFile {
  const launchFile = readFileSync(path, 'utf8');
  const strippedLaunchFile = stripJsonComments(launchFile);
  const launchConfigurations = JSON.parse(strippedLaunchFile);
  return launchConfigurations as LaunchFile;
}

const COLORS = [
  chalk.magenta,
  chalk.blue,
  chalk.cyan,
  chalk.green,
  chalk.yellow,
  chalk.red
]

export function launch(launchFile: LaunchFile, configurationName: string, cwd?: string) {
  const expandedLaunchFile = expandVariables(launchFile) as LaunchFile;
  const nameWidth = expandedLaunchFile.configurations.reduce((max, config) => Math.max(max, config.name.length), 0) + 1;

  const config = expandedLaunchFile.configurations.find(config => config.name === configurationName)
  if (!config) {
    console.error(chalk.red(`Configuration ${configurationName} not found`));
    return;
  }

  console.log(chalk.bold(`Launching ${config.name}`));
  console.log(config);

  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  console.log(color(`Launching ${config.name}`));

  // TODO: Needs OS specific handling
  const runtimeExecutable = config.osx?.runtimeExecutable || '';
  const program = config.cwd || '.';

  execSync(
    `${runtimeExecutable} ${config.runtimeArgs?.join(' ') || ''} ${program} ${config.args?.join(' ') || ''}`,
    {
      stdio: 'inherit',
    }
  );
}
