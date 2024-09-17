#!/usr/bin/env node
import * as figlet from 'figlet';
import { Command } from 'commander';
import { readJsonFile, launch } from './util/';


console.log(figlet.textSync('VSCode Launcher'));

const program = new Command();
program.version('0.0.1')
  .option(
    '--cwd [cwd]',
    'The current working directory to use',
    process.cwd()
  )
  .option(
    '-c, --configuration-name <configuration>',
    'The name of the configuration to launch'
  )
  .option('-d, --debug', 'output extra debugging')
  .option(
    '-l, --launchFile [launch-file]',
    'The path to the launch.json file',
    '.vscode/launch.json'
  )
  .description('Run a launch configuration from .vscode/launch.json')
  .parse(process.argv);

const options = program.opts();

options.debug && console.debug(`Launching with options: ${JSON.stringify(options)}`);

const launchFile = readJsonFile(options.launchFile);

launch(launchFile, options.configurationName);
