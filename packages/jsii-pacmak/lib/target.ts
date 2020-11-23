import * as spec from '@jsii/spec';
import * as fs from 'fs-extra';
import * as reflect from 'jsii-reflect';
import { Rosetta } from 'jsii-rosetta';
import * as path from 'path';

import { traverseDependencyGraph } from './dependency-graph';
import { IGenerator } from './generator';
import * as logging from './logging';

export abstract class Target {
  protected readonly packageDir: string;
  protected readonly fingerprint: boolean;
  protected readonly force: boolean;
  protected readonly arguments: { [name: string]: any };
  protected readonly targetName: string;
  protected readonly assembly: reflect.Assembly;
  protected readonly rosetta: Rosetta;

  protected abstract readonly generator: IGenerator;

  public constructor(options: TargetOptions) {
    this.packageDir = options.packageDir;
    this.assembly = options.assembly;
    this.rosetta = options.rosetta;
    this.fingerprint = options.fingerprint ?? true;
    this.force = options.force ?? false;
    this.arguments = options.arguments;
    this.targetName = options.targetName;
  }

  /**
   * Emits code artifacts.
   *
   * @param outDir the directory where the generated source will be placed.
   */
  public async generateCode(outDir: string, tarball: string): Promise<void> {
    this.generator.load(this.packageDir, this.assembly);

    if (this.force || !(await this.generator.upToDate(outDir))) {
      this.generator.generate(this.fingerprint);
      await this.generator.save(outDir, tarball);
    } else {
      logging.info(
        `Generated code for ${this.targetName} was already up-to-date in ${outDir} (use --force to re-generate)`,
      );
    }
  }

  /**
   * Builds the generated code.
   *
   * @param sourceDir the directory where the generated source was put.
   * @param outDir    the directory where the build artifacts will be placed.
   */
  public abstract build(sourceDir: string, outDir: string): Promise<void>;

  /**
   * A utility to copy files from one directory to another.
   *
   * @param sourceDir the directory to copy from.
   * @param targetDir the directory to copy into.
   */
  protected async copyFiles(sourceDir: string, targetDir: string) {
    // Preemptively create target directory, to avoid unsafely racing on it's creation.
    await fs.mkdirp(targetDir);
    await fs.copy(sourceDir, targetDir, { recursive: true });
  }

  /**
   * Traverses the dep graph and returns a list of pacmak output directories
   * available locally for this specific target. This allows target builds to
   * take local dependencies in case a dependency is checked-out.
   *
   * @param packageDir The directory of the package to resolve from.
   */
  protected async findLocalDepsOutput(rootPackageDir: string) {
    return findLocalBuildDirs(rootPackageDir, this.targetName);
  }
}

/**
 * Traverses the dep graph and returns a list of pacmak output directories
 * available locally for this specific target. This allows target builds to
 * take local dependencies in case a dependency is checked-out.
 *
 * @param packageDir The directory of the package to resolve from.
 */
export async function findLocalBuildDirs(
  rootPackageDir: string,
  targetName: string,
) {
  const results = new Set<string>();
  await traverseDependencyGraph(rootPackageDir, processPackage);
  return Array.from(results);

  async function processPackage(
    packageDir: string,
    pkg: any,
    isRoot: boolean,
  ): Promise<boolean> {
    // no jsii or jsii.outdir - either a misconfigured jsii package or a non-jsii dependency. either way, we are done here.
    if (!pkg.jsii || !pkg.jsii.outdir) {
      return false;
    }

    if (isRoot) {
      // This is the root package - no need to register it's outdir
      return true;
    }

    // if an output directory exists for this module, then we add it to our
    // list of results (unless it's the root package, which we are currently building)
    const outdir = path.join(packageDir, pkg.jsii.outdir, targetName);
    if (await fs.pathExists(outdir)) {
      logging.debug(`Found ${outdir} as a local dependency output`);
      results.add(outdir);
    }

    return true;
  }
}

export interface TargetConstructor {
  /**
   * Provides information about an assembly in the usual package repositories for the target. This includes information
   * necessary to locate the package in the repositories (a URL to the repository's public endpoint), as well as usage
   * instructions for the various configruation files (e.g: Maven POM, Gemfile, ...) and/or installation instructions
   * using the standard command line tools (npm, yarn, ...).
   *
   * @param assm the assembly for which coodinates are requested.
   *
   * @return Information about the assembly in the various package managers supported for a given language. The return
   *         value is a hash, as some packages can be used across different languages (typescript & javascript, java &
   *         scala & clojure & kotlin...).
   */
  toPackageInfos?: (assm: spec.Assembly) => { [language: string]: PackageInfo };

  /**
   * Provides the native way to reference a Type, for example a Java import statement, or a Javscript require directive.
   * Particularly useful when generating documentation.
   *
   * @param type    the JSII type for which a native reference is requested.
   * @param options the target-specific options provided.
   *
   * @return the native reference for the target for each supported language (there can be multiple languages
   *         supported by a given target: typescript & javascript, java & scala & clojure & kotlin, ...)
   */
  toNativeReference?: (
    type: spec.Type,
    options: any,
  ) => { [language: string]: string | undefined };

  new (options: TargetOptions): Target;
}

/**
 * Information about a package
 */
export interface PackageInfo {
  /** The name by which the package repository is known */
  repository: string;

  /** The URL to the package within it's repository */
  url: string;

  /**
   * Configuration fragments or installation instructions, by client scenario (e.g: maven + gradle). Values can be a
   * plain string (documentation should render as a pre-formatted block of text using monospace font), or an object
   * describing a language-tagged block of code.
   *
   * @example {
   *              maven: {
   *                  language: 'xml',
   *                  code: '<dependency><groupId>grp</groupId><artifactId>art</artifactId><version>version</version></dependency>'
   *              },
   *              gradle: "compile 'grp:art:version'",
   *          }
   *
   * @example {
   *              npm: { language: 'console', code: '$ npm install pkg' },
   *              yarn: { language: 'console', code: '$ yarn add pkg' },
   *              'package.json': { language: json, code: '{"pkg": "^version" }' }
   *          }
   */
  usage: { [label: string]: string | { language: string; code: string } };
}

export interface TargetOptions {
  /** The name of the target language we are generating */
  targetName: string;

  /** The directory where the JSII package is located */
  packageDir: string;

  /** The JSII-reflect assembly for this JSII assembly */
  assembly: reflect.Assembly;

  /** The Rosetta instance */
  rosetta: Rosetta;

  /**
   * Whether to fingerprint the produced artifacts.
   * @default true
   */
  fingerprint?: boolean;
  /**
   * Whether artifacts should be re-build even if their fingerprints look up-to-date.
   * @default false
   */
  force?: boolean;
  /**
   * Arguments provided by the user (how they are used is target-dependent)
   */
  arguments: { [name: string]: any };
}
