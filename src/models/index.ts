export interface BaseLaunchConfiguration {
  name: string;
  type: string;
  request: 'launch' | 'attach';
  windows?: RuntimeExecutableOptions;
  osx?: RuntimeExecutableOptions;
  cwd?: string;
  runtimeArgs?: string[];
  args?: string[];
  // TODO: this is not the full list of properties
}

export interface RuntimeExecutableOptions {
  runtimeExecutable: string;
}

export interface LaunchFile {
  version: string;
  configurations: BaseLaunchConfiguration[];
}

