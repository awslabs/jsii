import { promises as fs } from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as ts from 'typescript';

import { Compiler } from './compiler';
import { loadProjectInfo } from './project-info';

export async function compile(
  project: string,
  opts: CompileOpts & { watch: true },
): Promise<never>;
export async function compile(
  project: string,
  opts: CompileOpts & { watch?: false },
): Promise<{ projectRoot: string; emitResult: ts.EmitResult }>;
export async function compile(
  project: string,
  opts?: CompileOpts,
): Promise<{ projectRoot: string; emitResult: ts.EmitResult } | never>;
export async function compile(
  project: string,
  {
    failOnWarnings = false,
    fixPeerDependencies = true,
    projectReferences = true,
    watch = false,
  }: CompileOpts = {},
): Promise<{ projectRoot: string; emitResult: ts.EmitResult } | never> {
  const projectRoot = await findRoot(
    path.normalize(path.resolve(process.cwd(), project)),
  );
  const projectInfo = await loadProjectInfo(projectRoot, {
    fixPeerDependencies,
  });

  const compiler = new Compiler({
    projectInfo,
    projectReferences: projectReferences,
    failOnWarnings: failOnWarnings,
  });

  return (watch ? compiler.watch() : compiler.emit()).then((emitResult) => ({
    emitResult,
    projectRoot,
  }));
}

interface CompileOpts {
  readonly failOnWarnings?: boolean;
  readonly fixPeerDependencies?: boolean;
  readonly projectReferences?: boolean;
  readonly watch?: boolean;
}

async function findRoot(file: string): Promise<string> {
  return fs.stat(path.join(file, 'package.json')).then(
    () => file,
    (error) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      const dirname = path.dirname(file);
      if (dirname === file) {
        throw new Error(`Unable not locate package.json`);
      }
      return findRoot(dirname);
    },
  );
}
