import * as path from 'path';

import { TargetBuilder, BuildOptions } from '../builder';
import * as logging from '../logging';
import { JsiiModule } from '../packaging';
import { Target, TargetOptions } from '../target';
import { Scratch } from '../util';

export class TemporaryPackage {
  public constructor(
    public readonly module: JsiiModule,

    /** Where the sources are (relative to the source root) */
    public readonly relativeSourceDir: string,

    /** Where the artifacts will be stored after build (relative to build dir) */
    public readonly relativeArtifactsDir: string,

    /* Where the artifacts ought to go for this particular module */
    public readonly outputTargetDirectory: string,
  ) {}
}

export abstract class AggregateBuilder implements TargetBuilder {
  protected constructor(
    protected readonly targetName: string,
    protected readonly modules: readonly JsiiModule[],
    protected readonly options: BuildOptions,
  ) {}

  protected abstract async invokeBuild(
    tempSourceDir: Scratch<TemporaryPackage[]>,
    scratchDirs: Array<Scratch<any>>,
  ): Promise<void>;

  protected abstract async generateAggregateSourceDir(): Promise<
    Scratch<TemporaryPackage[]>
  >;

  protected abstract makeTarget(options: TargetOptions): Target;

  public async buildModules(): Promise<void> {
    if (this.modules.length === 0) {
      return;
    }

    if (this.options.codeOnly) {
      // Simple, just generate code to respective output dirs
      await Promise.all(
        this.modules.map((module) =>
          this.generateModuleCode(
            module,
            this.outputDir(module.outputDirectory),
          ),
        ),
      );
      return;
    }

    // Otherwise make a single tempdir to hold all sources, build them together and copy them back out
    const scratchDirs: Array<Scratch<any>> = [];
    try {
      const tempSourceDir = await this.generateAggregateSourceDir();
      scratchDirs.push(tempSourceDir);

      await this.invokeBuild(tempSourceDir, scratchDirs);

      if (this.options.clean) {
        await Scratch.cleanupAll(scratchDirs);
      }
    } catch (e) {
      logging.warn(
        `Exception occurred, not cleaning up ${scratchDirs
          .map((s) => s.directory)
          .join(', ')}`,
      );
      throw e;
    }
  }

  protected makeTargetForModule(module: JsiiModule): Target {
    return this.makeTarget({
      targetName: this.targetName,
      packageDir: module.moduleDirectory,
      assembly: module.assembly,
      fingerprint: this.options.fingerprint,
      force: this.options.force,
      arguments: this.options.arguments,
      rosetta: this.options.rosetta,
    });
  }

  protected async generateModuleCode(
    module: JsiiModule,
    where: string,
  ): Promise<void> {
    const target = this.makeTargetForModule(module);
    logging.debug(`Generating ${this.targetName} code into ${where}`);
    await target.generateCode(where, module.tarball);
  }

  /**
   * Decide whether or not to append the target name to the given output directory
   */
  protected outputDir(declaredDir: string) {
    return this.options.languageSubdirectory
      ? path.join(declaredDir, this.targetName)
      : declaredDir;
  }
}
