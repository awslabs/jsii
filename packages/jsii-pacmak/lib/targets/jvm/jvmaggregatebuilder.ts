import * as fs from 'fs-extra';
import * as path from 'path';

import * as logging from '../../logging';
import { JsiiModule } from '../../packaging';
import { findLocalBuildDirs } from '../../target';
import { Scratch, slugify, setExtend } from '../../util';
import { AggregateBuilder, TemporaryPackage } from '../aggregatebuilder';

export abstract class JvmAggregateBuilder extends AggregateBuilder {
  protected abstract async generateAdditionalAggregateFiles(
    tempDir: string,
    ret: readonly TemporaryPackage[],
  ): Promise<void>;

  protected async generateAggregateSourceDir(): Promise<
    Scratch<TemporaryPackage[]>
  > {
    return Scratch.make(async (tmpDir: string) => {
      logging.debug(`Generating aggregate Java source dir at ${tmpDir}`);
      const ret: TemporaryPackage[] = [];

      const generatedModules = this.modules
        .map((module) => ({ module, relativeName: slugify(module.name) }))
        .map(({ module, relativeName }) => ({
          module,
          relativeName,
          sourceDir: path.join(tmpDir, relativeName),
        }))
        .map(({ module, relativeName, sourceDir }) =>
          this.generateModuleCode(module, sourceDir).then(() => ({
            module,
            relativeName,
          })),
        );

      for await (const { module, relativeName } of generatedModules) {
        const pkg = new TemporaryPackage(
          module,
          relativeName,
          this.moduleArtifactsSubdir(module),
          module.outputDirectory,
        );

        ret.push(pkg);
      }

      return this.generateAdditionalAggregateFiles(tmpDir, ret).then(() => ret);
    });
  }

  protected async copyOutArtifacts(
    artifactsRoot: string,
    packages: readonly TemporaryPackage[],
  ): Promise<void> {
    logging.debug('Copying out Java artifacts');
    // The artifacts directory looks like this:
    //  /tmp/XXX/software/amazon/awscdk/something/v1.2.3
    //                                 /else/v1.2.3
    //                                 /entirely/v1.2.3
    //
    // We get the 'software/amazon/awscdk/something' path from the package, identifying
    // the files we need to copy, including Maven metadata. But we need to recreate
    // the whole path in the target directory.

    return Promise.all(
      packages.map(async (pkg) => {
        const artifactsSource = path.join(
          artifactsRoot,
          pkg.relativeArtifactsDir,
        );
        const artifactsDest = path.join(
          this.outputDir(pkg.outputTargetDirectory),
          pkg.relativeArtifactsDir,
        );

        await fs.mkdirp(artifactsDest);
        return fs.copy(artifactsSource, artifactsDest, { recursive: true });
      }),
    ).then(() => void null);
  }

  protected async collectLocalRepos(): Promise<string[]> {
    // traverse the dep graph of this module and find all modules that have
    // an <outdir>/java directory. we will add those as local maven
    // repositories which will resolve instead of Maven Central for those
    // module. this enables building against local modules (i.e. in lerna
    // repositories or linked modules).
    const allDepsOutputDirs = new Set<string>();

    const resolvedModules = this.modules.map(async (mod) => ({
      module: mod,
      localBuildDirs: await findLocalBuildDirs(
        mod.moduleDirectory,
        this.targetName,
      ),
    }));
    for await (const { module, localBuildDirs } of resolvedModules) {
      setExtend(allDepsOutputDirs, localBuildDirs);

      // Also include output directory where we're building to, in case we build multiple packages into
      // the same output directory.
      allDepsOutputDirs.add(
        path.join(
          module.outputDirectory,
          this.options.languageSubdirectory ? this.targetName : '',
        ),
      );
    }

    const localRepos = Array.from(allDepsOutputDirs);

    // if java-runtime is checked-out and we can find a local repository,
    // add it to the list.
    const localJavaRuntime = await this.findJavaRuntimeLocalRepository();
    if (localJavaRuntime) {
      localRepos.push(localJavaRuntime);
    }

    return localRepos;
  }

  /**
   * Looks up the `@jsii/java-runtime` package from the local repository.
   * If it contains a "maven-repo" directory, it will be added as a local maven repo
   * so when we build locally, we build against it and not against the one published
   * to Maven Central.
   */
  private findJavaRuntimeLocalRepository() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-require-imports,import/no-extraneous-dependencies
      const javaRuntime = require('@jsii/java-runtime');
      return javaRuntime.repository;
    } catch {
      return undefined;
    }
  }

  /**
   * Return the subdirectory of the output directory where the artifacts for this particular package are produced
   */
  private moduleArtifactsSubdir(module: JsiiModule) {
    const targets = module.assembly.targets!;
    const target = targets[this.targetName]!;
    const groupId = target.maven.groupId;
    const artifactId = target.maven.artifactId;
    return `${groupId.replace(/\./g, '/')}/${artifactId}`;
  }
}
