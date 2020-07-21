/**
 * Helper routines for use with the jsii compiler
 *
 * These are mostly used for testing, but all projects that need to exercise
 * the JSII compiler to test something need to share this code, so might as
 * well put it in one reusable place.
 */

import * as fs from 'fs-extra';
import * as spec from '@jsii/spec';
import * as os from 'os';
import * as path from 'path';
import { DiagnosticCategory } from 'typescript';
import { Compiler } from './compiler';
import { loadProjectInfo, ProjectInfo } from './project-info';

/**
 * Compile a piece of source and return the JSII assembly for it
 *
 * Only usable for trivial cases and tests.
 */
export async function sourceToAssemblyHelper(
  source: string,
  cb?: (obj: PackageInfo) => void,
): Promise<spec.Assembly> {
  // Easiest way to get the source into the compiler is to write it to disk somewhere.
  // I guess we could make an in-memory compiler host but that seems like work...
  return inTempDir(async () => {
    const fileName = 'index.ts';
    await fs.writeFile(fileName, source, { encoding: 'utf-8' });
    const compiler = new Compiler({
      projectInfo: await makeProjectInfo(fileName, cb),
    });
    const emitResult = await compiler.emit();

    expect(emitResult.emitSkipped).toBeFalsy();

    const errors = emitResult.diagnostics.filter(
      (d) => d.category === DiagnosticCategory.Error,
    );
    for (const error of errors) {
      console.error(error.messageText);
      // logDiagnostic() doesn't work out of the box, so console.error() it is.
    }
    if (errors.length > 0) {
      throw new Error('There were compiler errors');
    }
    return fs.readJSON('.jsii', { encoding: 'utf-8' });
  });
}

async function inTempDir<T>(block: () => Promise<T>): Promise<T> {
  const origDir = process.cwd();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsii'));
  process.chdir(tmpDir);
  const ret = await block();
  process.chdir(origDir);
  await fs.remove(tmpDir);
  return ret;
}

/**
 * Obtain project info so we can call the compiler
 *
 * Creating this directly in-memory leads to slightly different behavior from calling
 * jsii from the command-line, and I don't want to figure out right now.
 *
 * Most consistent behavior seems to be to write a package.json to disk and
 * then calling the same functions as the CLI would.
 */
async function makeProjectInfo(
  types: string,
  cb?: (obj: PackageInfo) => Promise<void> | void,
): Promise<ProjectInfo> {
  const packageInfo: PackageInfo = {
    types,
    main: types.replace(/(?:\.d)?\.ts(x?)/, '.js$1'),
    name: 'testpkg', // That's what package.json would tell if we look up...
    version: '0.0.1',
    license: 'Apache-2.0',
    author: { name: 'John Doe', roles: ['author'] },
    repository: { type: 'git', url: 'https://github.com/aws/jsii.git' },
    jsii: {},
  };
  if (cb) {
    await cb(packageInfo);
  }

  await fs.writeJson('package.json', packageInfo, {
    encoding: 'utf-8',
    replacer: (_: string, v: any) => v,
    spaces: 2,
  });

  return loadProjectInfo(path.resolve(process.cwd(), '.'), {
    fixPeerDependencies: true,
  });
}

export type PackageInfo = {
  name: string;
  version: string;
  license: string;
  types: string;
  author: {
    name: string;
    roles: string[];
    [key: string]: any;
  };
  repository: {
    type?: string;
    url: string;
    directory?: string;
    [key: string]: any;
  };
  jsii: {
    [key: string]: any;
  };
  [key: string]: any;
};
