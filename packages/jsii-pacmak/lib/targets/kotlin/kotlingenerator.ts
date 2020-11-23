import * as fs from 'fs-extra';
import { Assembly, ReferenceType, EnumType, TypeSystem } from 'jsii-reflect';
import * as path from 'path';

import { GeneratorBase } from '../../generator';
import { VERSION } from '../../version';
import { JvmAbi } from '../jvm/jvmabi';
import { DeclarationNode } from './declarationnode';
import { KotlinCodeMaker } from './kotlincodemaker';
import { KotlinGeneratorConfiguration } from './kotlingeneratorconfiguration';
import { createDeclaration, KTypeDeclaration, KElement } from './kotlinmodel';
import { KotlinTypeMapper } from './kotlintypemapper';

export class KotlinGenerator extends GeneratorBase {
  private static getFileName(fqn: string, system: TypeSystem): string {
    const kotlinFqn = KotlinTypeMapper.mapReferenceName(fqn, system);
    return `${path.join('src', 'main', 'kotlin', ...kotlinFqn.split('.'))}.kt`;
  }

  private static getAssemblyOutputDir(assembly: Assembly): string {
    const dir = assembly.name.replace(/\./g, '/');
    return path.join('src', 'main', 'resources', dir);
  }

  private readonly code = new KotlinCodeMaker();

  private packageDir?: string;
  private _assembly?: Assembly;

  private get assembly(): Assembly {
    const assembly = this._assembly;

    if (!assembly) {
      throw new Error('Assembly is not set');
    }

    return assembly;
  }

  public load(packageDir: string, assembly: Assembly): void {
    this.packageDir = packageDir;
    this._assembly = assembly;
  }

  public generate(fingerprint: boolean): void {
    const packageDir = this.packageDir;
    const assembly = this.assembly;
    const config = KotlinGeneratorConfiguration.of(assembly, fingerprint);

    if (!packageDir || !assembly) {
      throw new Error('KotlinGenerator is not initialized yet');
    }

    const node = DeclarationNode.of(assembly);
    const moduleGenerator = new ModuleFileGenerator(
      assembly,
      this.getAssemblyArchiveFileName(assembly),
    );

    this.generateNode(node, node.name, moduleGenerator, config);
    this.generateFile(moduleGenerator, moduleGenerator.fqn, '', config);

    const buildFileGenerator = new BuildGradleFileGenerator(assembly);
    this.doGenerateFile(buildFileGenerator, 'build.gradle', undefined, config);
  }

  private generateNode(
    node: DeclarationNode,
    namespace: string,
    moduleGenerator: ModuleFileGenerator,
    config: KotlinGeneratorConfiguration,
  ) {
    const decl = createDeclaration(node, true);
    if (decl) {
      moduleGenerator.add(decl, config);
      this.generateFile(decl, decl.type.fqn, namespace, config);
    } else {
      for (const childNode of node.children) {
        const childNamespace =
          namespace.length === 0 ? node.name : `${namespace}.${node.name}`;
        this.generateNode(childNode, childNamespace, moduleGenerator, config);
      }
    }
  }

  private generateFile(
    decl: KElement,
    fqn: string,
    namespace: string,
    config: KotlinGeneratorConfiguration,
  ) {
    const typeSystem = this.assembly.system;
    const fileName = KotlinGenerator.getFileName(fqn, typeSystem);
    const packagePostfix = namespace.length === 0 ? '' : `.${namespace}`;
    const packageName = `package ${config.packageName}${packagePostfix}`;
    this.doGenerateFile(decl, fileName, packageName, config);
  }

  private doGenerateFile(
    decl: KElement,
    fileName: string,
    packageName: string | undefined,
    config: KotlinGeneratorConfiguration,
  ) {
    this.code.openFile(fileName);

    if (packageName) {
      this.code.line(packageName);
    }

    decl.render(this.code, config);

    this.code.closeFile(fileName);
  }

  public async save(outdir: string, tarball: string): Promise<any> {
    const assemblyDir = KotlinGenerator.getAssemblyOutputDir(this.assembly);
    if (assemblyDir) {
      const fullPath = path.resolve(
        path.join(
          outdir,
          assemblyDir,
          this.getAssemblyArchiveFileName(this.assembly),
        ),
      );
      await fs.mkdirp(path.dirname(fullPath));
      await fs.copy(tarball, fullPath, { overwrite: true });
    }

    return this.code.save(outdir);
  }

  public async upToDate(_outDir: string): Promise<boolean> {
    return Promise.resolve(false);
  }
}

class ModuleFileGenerator implements KElement {
  private static readonly className = '$Module';

  public readonly fqn: string;
  private readonly bindings: Array<[string, string]> = [];

  public constructor(
    private readonly assembly: Assembly,
    private readonly assemblyFileName: string,
  ) {
    this.fqn = `${assembly.name}.${ModuleFileGenerator.className}`;
  }

  public add(decl: KTypeDeclaration, config: KotlinGeneratorConfiguration) {
    const jsiiName = decl.type.fqn;
    const kotlinName = this.getType(decl, config);
    this.bindings.push([jsiiName, kotlinName]);
  }

  private getType(
    decl: KTypeDeclaration,
    config: KotlinGeneratorConfiguration,
  ): string {
    const type = decl.type;
    if (type instanceof ReferenceType) {
      return config.typeMapper.mapReferenceType(type);
    } else if (type instanceof EnumType) {
      return config.typeMapper.mapEnumType(type);
    }

    throw new Error(`Reference or enum type expected, got ${type as any}`);
  }

  public render(
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ): void {
    const escapedClassName = `\`${ModuleFileGenerator.className}\``;

    const name = this.assembly.name;
    const version = this.assembly.version;
    const constructorArgs = `"${name}", "${version}", ${escapedClassName}::class.java, "${this.assemblyFileName}"`;

    code.declarationBlock(
      `class ${escapedClassName}: ${JvmAbi.jsiiModule}(${constructorArgs})`,
    );
    this.renderResolveClass(code, config);
    code.closeBlock();
  }

  private renderResolveClass(
    code: KotlinCodeMaker,
    _config: KotlinGeneratorConfiguration,
  ) {
    code.declarationBlock('override fun resolveClass(fqn: String?): Class<*>');
    code.openBlock('return when (fqn)');

    for (const [jsiiName, kotlinName] of this.bindings) {
      code.line(`"${jsiiName}" -> ${kotlinName}::class.java`);
    }

    code.line(
      'else -> throw ClassNotFoundException("Unknown JSII type: $fqn")',
    );
    code.closeBlock();
    code.closeBlock();
  }
}

class BuildGradleFileGenerator implements KElement {
  private readonly DOKKA_VERSION = '0.10.1';

  public constructor(private readonly assembly: Assembly) {}

  public render(
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ): void {
    const artifact = config.artifact;
    const baseVersion = this.assembly.version;
    const version =
      artifact && artifact.version ? artifact.version : baseVersion;

    code.block('plugins', () => {
      code.line(
        `id "org.jetbrains.kotlin.jvm" version "${config.kotlinVersion}"`,
      );
      code.line('id "java-library"');
      if (artifact) {
        code.line(`id 'org.jetbrains.dokka' version '${this.DOKKA_VERSION}'`);
        code.line('id "maven-publish"');
      }
    });

    code.block('repositories', () => {
      code.line('int index = 0');
      code.openBlock('while (project.hasProperty("customRepo" + index))');
      code.line('maven { url project.property("customRepo" + index) }');
      code.line('index += 1');
      code.closeBlock();

      code.line('mavenCentral()');
      code.line('maven { url "https://dl.bintray.com/kotlin/dokka" }');
    });

    code.block('dependencies', () => {
      code.line(`api "software.amazon.jsii:jsii-runtime:${VERSION}"`);
      code.line('implementation "org.jetbrains.kotlin:kotlin-stdlib"');
      code.line('implementation "javax.annotation:javax.annotation-api:1.3.2"');

      for (const dep of this.prepareDependencyArtifacts()) {
        code.line(`api "${dep}"`);
      }
    });

    if (artifact) {
      code.block('dokka', () => {
        code.line('outputFormat = "html"');
        code.line('outputDirectory = "$buildDir/dokka"');
      });

      code.block('task sourceJar(type: Jar)', () => {
        code.line('from sourceSets.main.allSource');
        code.line('archiveClassifier = "sources"');
      });

      code.block('task dokkaJar(type: Jar)', () => {
        code.line('from(tasks.dokka)');
        code.line('group = JavaBasePlugin.DOCUMENTATION_GROUP');
        code.line('archiveClassifier = "javadoc"');
      });

      code.block('publishing', () => {
        code.block('repositories', () => {
          code.block('maven', () => {
            code.line('url project.property("deployRepo")');
          });
        });

        code.block('publications', () => {
          code.block('maven(MavenPublication)', () => {
            code.line(`groupId = "${artifact.groupId}"`);
            code.line(`artifactId = "${artifact.artifactId}"`);
            code.line(`version = "${version}"`);
            code.line();
            code.line('from components.kotlin');
            code.line('artifact sourceJar');
            code.line('artifact dokkaJar');
          });
        });
      });
    }
  }

  private prepareDependencyArtifacts(): string[] {
    const artifacts = [];

    for (const dep of this.assembly.dependencies) {
      const artifact = KotlinGeneratorConfiguration.buildAssemblyArtifactConfiguration(
        dep.assembly,
      );
      if (artifact) {
        artifacts.push(
          `${artifact.groupId}:${artifact.artifactId}:${artifact.version}`,
        );
      }
    }

    return artifacts;
  }
}
