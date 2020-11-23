import { OneByOneBuilder, TargetBuilder, BuildOptions } from '../builder';
import { JsiiModule } from '../packaging';
import { DotnetBuilder } from './dotnet';
import { Golang } from './go';
import { JavaBuilder } from './java';
import JavaScript from './js';
import { KotlinBuilder } from './kotlin';
import Python from './python';

export enum TargetName {
  DOTNET = 'dotnet',
  GO = 'go',
  JAVA = 'java',
  JAVASCRIPT = 'js',
  KOTLIN = 'kotlin',
  PYTHON = 'python',
}

export type BuilderFactory = (
  modules: readonly JsiiModule[],
  options: BuildOptions,
) => TargetBuilder;

export const ALL_BUILDERS: { [key in TargetName]: BuilderFactory } = {
  dotnet: (ms, o) => new DotnetBuilder(ms, o),
  go: (ms, o) => new OneByOneBuilder(TargetName.GO, Golang, ms, o),
  java: (ms, o) => new JavaBuilder(ms, o),
  js: (ms, o) => new OneByOneBuilder(TargetName.JAVASCRIPT, JavaScript, ms, o),
  kotlin: (ms, o) => new KotlinBuilder(ms, o),
  python: (ms, o) => new OneByOneBuilder(TargetName.PYTHON, Python, ms, o),
};

export const INCOMPLETE_DISCLAIMER_COMPILING =
  'Example automatically generated. See https://github.com/aws/jsii/issues/826';
export const INCOMPLETE_DISCLAIMER_NONCOMPILING =
  'Example automatically generated without compilation. See https://github.com/aws/jsii/issues/826';
