import type { Assembly, TypeSystem } from 'jsii-reflect';
import * as os from 'os';
import * as path from 'path';

import * as logging from '../lib/logging';
import { Scratch, shell } from './util';

export interface JsiiModuleOptions {
  /**
   * Name of the module
   */
  name: string;

  /**
   * The module directory
   */
  moduleDirectory: string;

  /**
   * Identifier of the targets to build
   */
  availableTargets: string[];

  /**
   * Output directory where to package everything
   */
  defaultOutputDirectory: string;

  /**
   * Names of packages this package depends on, if any
   */
  dependencyNames?: string[];
}
export class JsiiModule {
  public readonly name: string;
  public readonly dependencyNames: string[];
  public readonly moduleDirectory: string;
  public readonly availableTargets: string[];
  public outputDirectory: string;

  private _tarball?: Scratch<string>;
  public _assembly?: Assembly;

  public constructor(options: JsiiModuleOptions) {
    this.name = options.name;
    this.moduleDirectory = options.moduleDirectory;
    this.availableTargets = options.availableTargets;
    this.outputDirectory = options.defaultOutputDirectory;
    this.dependencyNames = options.dependencyNames ?? [];
  }

  /**
   * Prepare an NPM package from this source module
   */
  public async npmPack() {
    this._tarball = await Scratch.make(async (tmpdir) => {
      logging.debug(`Running "npm pack ${this.moduleDirectory}" in ${tmpdir}`);
      // Quoting (JSON-stringifying) the module directory in order to avoid
      // problems if there are spaces or other special characters in the path.
      const args = ['pack', JSON.stringify(this.moduleDirectory)];
      if (logging.level >= logging.LEVEL_VERBOSE) {
        args.push('--loglevel=verbose');
      }
      const out = await shell('npm', args, { cwd: tmpdir });
      // Take only the last line of npm pack which should contain the
      // tarball name. otherwise, there can be a lot of extra noise there
      // from scripts that emit to STDOUT.
      const lines = out.trim().split(os.EOL);
      const lastLine = lines[lines.length - 1].trim();

      if (!lastLine.endsWith('.tgz') && !lastLine.endsWith('.tar.gz')) {
        throw new Error(
          `npm pack did not produce tarball from ${
            this.moduleDirectory
          } into ${tmpdir} (output was ${JSON.stringify(lines)})`,
        );
      }

      return path.resolve(tmpdir, lastLine);
    });
  }

  public get tarball(): string {
    if (!this._tarball) {
      throw new Error('Tarball not available yet, call npmPack() first');
    }
    return this._tarball.object;
  }

  public async load(system: TypeSystem) {
    return system
      .loadModule(this.moduleDirectory)
      .then((assembly) => (this._assembly = assembly));
  }

  public get assembly(): Assembly {
    if (!this._assembly) {
      throw new Error('Assembly not available yet, call load() first');
    }
    return this._assembly;
  }

  public async cleanup() {
    if (this._tarball) {
      await this._tarball.cleanup();
    }
  }
}
