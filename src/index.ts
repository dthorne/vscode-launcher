#!/usr/bin/env npx ts-node --esm

import figlet from 'figlet';
import { Command, Flags } from '@oclif/core';
import { readJsonFile, launch } from './util/index.js';

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
    'show-command': Flags.boolean({
      description: 'Display the command that would be executed',
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(Launch);

    if (!flags['show-command']) {
      this.log(figlet.textSync('VSCode Launcher'));
    }

    if (flags.debug) {
      this.log(`Launching with options: ${JSON.stringify(flags)}`);
    }

    const launchFile = readJsonFile(flags.launchFile, flags.debug);

    launch(launchFile, flags['configuration-name'], flags.cwd, flags['show-command']);
  }
}

