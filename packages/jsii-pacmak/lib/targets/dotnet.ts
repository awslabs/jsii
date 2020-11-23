import * as spec from '@jsii/spec';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as xmlbuilder from 'xmlbuilder';

import { BuildOptions } from '../builder';
import * as logging from '../logging';
import { JsiiModule } from '../packaging';
import {
  PackageInfo,
  Target,
  TargetOptions,
  findLocalBuildDirs,
} from '../target';
import { shell, Scratch, setExtend, filterAsync, slugify } from '../util';
import { AggregateBuilder, TemporaryPackage } from './aggregatebuilder';
import { DotNetGenerator } from './dotnet/dotnetgenerator';
import { toReleaseVersion } from './version-utils';

import { TargetName } from '.';

export const TARGET_FRAMEWORK = 'netcoreapp3.1';

/**
 * Build .NET packages all together, by generating an aggregate solution file
 */
export class DotnetBuilder extends AggregateBuilder {
  public constructor(modules: readonly JsiiModule[], options: BuildOptions) {
    super('dotnet', modules, options);
  }

  protected async invokeBuild(
    tempSourceDir: Scratch<TemporaryPackage[]>,
    _scratchDirs: Array<Scratch<any>>,
  ): Promise<void> {
    logging.debug('Building .NET');
    await shell('dotnet', ['build', '--force', '--configuration', 'Release'], {
      cwd: tempSourceDir.directory,
      retry: { maxAttempts: 5 },
    });
    await this.copyOutArtifacts(tempSourceDir.object);
  }

  protected async generateAggregateSourceDir(): Promise<
    Scratch<TemporaryPackage[]>
  > {
    return Scratch.make(async (tmpDir: string) => {
      logging.debug(`Generating aggregate .NET source dir at ${tmpDir}`);

      const csProjs = [];
      const ret: TemporaryPackage[] = [];

      // Code generator will make its own subdirectory
      const generatedModules = this.modules.map((mod) =>
        this.generateModuleCode(mod, tmpDir).then(() => mod),
      );

      for await (const mod of generatedModules) {
        const loc = projectLocation(mod);
        csProjs.push(loc.projectFile);
        ret.push({
          module: mod,
          relativeSourceDir: slugify(mod.name),
          relativeArtifactsDir: path.join(
            tmpDir,
            loc.projectDir,
            'bin',
            'Release',
          ),
          outputTargetDirectory: mod.outputDirectory,
        });
      }

      // Use 'dotnet' command line tool to build a solution file from these csprojs
      await shell('dotnet', ['new', 'sln', '-n', 'JsiiBuild'], { cwd: tmpDir });
      await shell('dotnet', ['sln', 'add', ...csProjs], { cwd: tmpDir });

      await this.generateNuGetConfigForLocalDeps(tmpDir);

      return ret;
    });
  }

  /**
   * Write a NuGet.config that will include build directories for local packages not in the current build
   *
   */
  private async generateNuGetConfigForLocalDeps(where: string): Promise<void> {
    // Traverse the dependency graph of this module and find all modules that have
    // an <outdir>/dotnet directory. We will add those as local NuGet repositories.
    // This enables building against local modules.
    const allDepsOutputDirs = new Set<string>();

    const resolvedModules = this.modules.map(async (module) => ({
      module,
      localBuildDirs: await findLocalBuildDirs(
        module.moduleDirectory,
        this.targetName,
      ),
    }));
    for await (const { module, localBuildDirs } of resolvedModules) {
      setExtend(allDepsOutputDirs, localBuildDirs);

      // Also include output directory where we're building to, in case we build multiple packages into
      // the same output directory.
      allDepsOutputDirs.add(this.outputDir(module.outputDirectory));
    }

    const localRepos = Array.from(allDepsOutputDirs);

    // If dotnet-runtime is checked-out and we can find a local repository, add it to the list.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-require-imports,import/no-extraneous-dependencies
      const jsiiDotNetRuntime = require('@jsii/dotnet-runtime');
      logging.info(
        `Using local version of the DotNet jsii runtime package at: ${jsiiDotNetRuntime.repository}`,
      );
      localRepos.push(jsiiDotNetRuntime.repository);
    } catch {
      // Couldn't locate @jsii/dotnet-runtime, which is owkay!
    }

    // Filter out nonexistant directories, .NET will be unhappy if paths don't exist
    const existingLocalRepos = await filterAsync(localRepos, fs.pathExists);

    logging.debug('local NuGet repos:', existingLocalRepos);

    // Construct XML content.
    const configuration = xmlbuilder.create('configuration', {
      encoding: 'UTF-8',
    });
    const packageSources = configuration.ele('packageSources');

    const nugetOrgAdd = packageSources.ele('add');
    nugetOrgAdd.att('key', 'nuget.org');
    nugetOrgAdd.att('value', 'https://api.nuget.org/v3/index.json');
    nugetOrgAdd.att('protocolVersion', '3');

    existingLocalRepos.forEach((repo, index) => {
      const add = packageSources.ele('add');
      add.att('key', `local-${index}`);
      add.att('value', path.join(repo));
    });

    if (this.options.arguments['dotnet-nuget-global-packages-folder']) {
      // Ensure we're not using the configured cache folder
      configuration
        .ele('config')
        .ele('add')
        .att('key', 'globalPackagesFolder')
        .att(
          'value',
          path.resolve(
            this.options.arguments['dotnet-nuget-global-packages-folder'],
            '.nuget',
            'packages',
          ),
        );
    }

    const xml = configuration.end({ pretty: true });

    // Write XML content to NuGet.config.
    const filePath = path.join(where, 'NuGet.config');
    logging.debug(`Generated ${filePath}`);
    await fs.writeFile(filePath, xml);
  }

  protected makeTarget(options: TargetOptions): Target {
    return new Dotnet(
      options,
      this.modules.map((m) => m.name),
    );
  }

  private async copyOutArtifacts(
    packages: readonly TemporaryPackage[],
  ): Promise<void> {
    logging.debug('Copying out .NET artifacts');

    return Promise.all(
      packages.map(copyOutIndividualArtifacts.bind(this)),
    ).then(() => void null);

    async function copyOutIndividualArtifacts(
      this: DotnetBuilder,
      pkg: TemporaryPackage,
    ) {
      const targetDirectory = this.outputDir(pkg.outputTargetDirectory);

      await fs.mkdirp(targetDirectory);
      return fs.copy(pkg.relativeArtifactsDir, targetDirectory, {
        recursive: true,
        filter: (_, dst) => {
          return dst !== path.join(targetDirectory, TARGET_FRAMEWORK);
        },
      });
    }
  }
}

function projectLocation(module: JsiiModule) {
  const packageId: string = module.assembly.targets!.dotnet!.packageId;
  return {
    projectDir: packageId,
    projectFile: path.join(packageId, `${packageId}.csproj`),
  };
}

export default class Dotnet extends Target {
  public static toPackageInfos(
    assm: spec.Assembly,
  ): { [language: string]: PackageInfo } {
    const packageId = assm.targets!.dotnet!.packageId;
    const version = toReleaseVersion(assm.version, TargetName.DOTNET);
    const packageInfo: PackageInfo = {
      repository: 'Nuget',
      url: `https://www.nuget.org/packages/${packageId}/${version}`,
      usage: {
        csproj: {
          language: 'xml',
          code: `<PackageReference Include="${packageId}" Version="${version}" />`,
        },
        dotnet: {
          language: 'console',
          code: `dotnet add package ${packageId} --version ${version}`,
        },
        'packages.config': {
          language: 'xml',
          code: `<package id="${packageId}" version="${version}" />`,
        },
      },
    };
    return { 'C#': packageInfo };
  }

  public static toNativeReference(_type: spec.Type, options: any) {
    return {
      'c#': `using ${options.namespace};`,
    };
  }

  protected readonly generator: DotNetGenerator;

  public constructor(
    options: TargetOptions,
    assembliesCurrentlyBeingCompiled: string[],
  ) {
    super(options);

    this.generator = new DotNetGenerator(
      assembliesCurrentlyBeingCompiled,
      options.rosetta,
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async build(_sourceDir: string, _outDir: string): Promise<void> {
    throw new Error('Should not be called; use builder instead');
  }
  /* eslint-enable @typescript-eslint/require-await */
}
