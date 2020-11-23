import * as spec from '@jsii/spec';

import { BuildOptions } from '../builder';
import * as logging from '../logging';
import { JsiiModule } from '../packaging';
import { PackageInfo, Target, TargetOptions } from '../target';
import { Scratch } from '../util';
import { TemporaryPackage } from './aggregatebuilder';
import { JvmAggregateBuilder } from './jvm/jvmaggregatebuilder';
import { getJvmPackageInfos } from './jvm/mavenutils';
import { KotlinCodeMaker } from './kotlin/kotlincodemaker';
import { KotlinGenerator } from './kotlin/kotlingenerator';
import {
  KotlinGeneratorConfiguration,
  KotlinArtifactConfiguration,
} from './kotlin/kotlingeneratorconfiguration';
import { KotlinGradleBuilder } from './kotlin/kotlingradlebuilder';

export class KotlinBuilder extends JvmAggregateBuilder {
  public constructor(modules: readonly JsiiModule[], options: BuildOptions) {
    super('kotlin', modules, options);
  }

  protected async invokeBuild(
    tempSourceDir: Scratch<TemporaryPackage[]>,
    scratchDirs: Array<Scratch<any>>,
  ): Promise<void> {
    const tempOutputDir = await Scratch.make(async (dir) => {
      logging.debug('Building Kotlin');
      const builder = new KotlinGradleBuilder({});
      await builder.build(tempSourceDir.directory, dir);
    });
    scratchDirs.push(tempOutputDir);
    return this.copyOutArtifacts(tempOutputDir.directory, tempSourceDir.object);
  }

  protected async generateAdditionalAggregateFiles(
    tmpDir: string,
    ret: readonly TemporaryPackage[],
  ): Promise<void> {
    const code = new KotlinCodeMaker();

    this.generateSettingsGradle(code, ret);
    await this.generateBuildGradle(code, ret);

    return code.save(tmpDir).then(() => void null);
  }

  private generateSettingsGradle(
    code: KotlinCodeMaker,
    ret: readonly TemporaryPackage[],
  ): void {
    const fileName = 'settings.gradle';
    code.openFile(fileName);

    this.iterateArtifacts(ret, (pkg, artifact) => {
      code.extraLine();
      code.line(`include "${artifact.artifactId}"`);
      code.line(
        `project(":${artifact.artifactId}").projectDir = file("${pkg.relativeSourceDir}")`,
      );
    });

    code.closeFile(fileName);
  }

  private async generateBuildGradle(
    code: KotlinCodeMaker,
    ret: readonly TemporaryPackage[],
  ): Promise<void> {
    const localRepos = await this.collectLocalRepos();

    const fileName = 'build.gradle';
    code.openFile(fileName);

    code.block('allprojects', () => {
      code.block('configurations.all', () => {
        code.block('resolutionStrategy.dependencySubstitution', () => {
          this.iterateArtifacts(ret, (_, artifact) => {
            const projectName = `:${artifact.artifactId}`;
            code.line(
              `substitute module("${artifact.dependency}") with project("${projectName}")`,
            );
          });
        });
      });
      code.block('repositories', () => {
        for (const repo of localRepos) {
          code.line(`maven { url "file://${repo}" }`);
        }
      });
    });

    code.closeFile(fileName);
  }

  private iterateArtifacts(
    ret: readonly TemporaryPackage[],
    block: (
      pkg: TemporaryPackage,
      artifact: KotlinArtifactConfiguration,
    ) => void,
  ): void {
    for (const pkg of ret) {
      const assembly = pkg.module.assembly;
      const kotlinTarget = assembly.targets!.kotlin!;
      const artifact = KotlinGeneratorConfiguration.buildArtifactConfiguration(
        kotlinTarget,
        assembly.version,
      );
      if (!artifact) {
        continue;
      }

      block(pkg, artifact);
    }
  }

  protected makeTarget(options: TargetOptions): Target {
    return new Kotlin(options);
  }
}

class Kotlin extends Target {
  public static toPackageInfos(
    assembly: spec.Assembly,
  ): { [language: string]: PackageInfo } {
    const kotlinTarget = assembly.targets!.kotlin!;
    const artifact = KotlinGeneratorConfiguration.buildArtifactConfiguration(
      kotlinTarget,
      assembly.version,
    );
    if (!artifact) {
      throw new Error(
        `${assembly.name}: artifact information not found for target "Kotlin"`,
      );
    }
    return getJvmPackageInfos(
      'kotlin',
      artifact.groupId,
      artifact.artifactId,
      artifact.version,
    );
  }

  public static toNativeReference(type: spec.Type, options: any) {
    const [, ...name] = type.fqn.split('.');
    return { java: `import ${[options.package, ...name].join('.')}` };
  }

  protected readonly generator = new KotlinGenerator();

  public async build(sourceDir: string, outDir: string): Promise<void> {
    const builder = new KotlinGradleBuilder(this.arguments);
    await builder.build(sourceDir, outDir);
  }
}
