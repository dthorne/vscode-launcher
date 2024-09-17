#!/usr/bin/env npx ts-node --esm

import figlet from 'figlet';
import { Command, Flags } from '@oclif/core';
import { readJsonFile, launch } from './util/index.js';

console.log(figlet.textSync('VSCode Launcher'));

export default class Launch extends Command {
  static description = 'Run a launch configuration from .vscode/launch.json';

  static aliases = [];

  static flags = {
    cwd: Flags.string({
      description: 'The current working directory to use',
      default: process.cwd(),
    }),
    'configuration-name': Flags.string({
      char: 'c',
      description: 'The name of the configuration to launch',
      required: true,
    }),
    debug: Flags.boolean({
      char: 'd',
      description: 'output extra debugging',
      default: false,
    }),
    launchFile: Flags.string({
      char: 'l',
      description: 'The path to the launch.json file',
      default: '.vscode/launch.json',
    }),
  };

  async run() {
    const { flags } = await this.parse(Launch);

    if (flags.debug) {
      this.log(`Launching with options: ${JSON.stringify(flags)}`);
    }

    const launchFile = readJsonFile(flags.launchFile);

    launch(launchFile, flags['configuration-name']);
  }
}

