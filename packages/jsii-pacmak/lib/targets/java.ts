import * as spec from '@jsii/spec';
import * as clone from 'clone';
import { toSnakeCase } from 'codemaker/lib/case-utils';
import * as fs from 'fs-extra';
import * as reflect from 'jsii-reflect';
import {
  Rosetta,
  TargetLanguage,
  typeScriptSnippetFromSource,
  Translation,
  enforcesStrictMode,
  markDownToJavaDoc,
} from 'jsii-rosetta';
import * as path from 'path';
import * as xmlbuilder from 'xmlbuilder';

import { TargetBuilder, BuildOptions } from '../builder';
import { Generator } from '../generator';
import * as logging from '../logging';
import { jsiiToPascalCase } from '../naming-util';
import { JsiiModule } from '../packaging';
import {
  PackageInfo,
  Target,
  findLocalBuildDirs,
  TargetOptions,
} from '../target';
import { shell, Scratch, slugify, setExtend } from '../util';
import { VERSION, VERSION_DESC } from '../version';
import { stabilityPrefixFor, renderSummary } from './_utils';
import { toMavenVersionRange, toReleaseVersion } from './version-utils';

import {
  INCOMPLETE_DISCLAIMER_COMPILING,
  INCOMPLETE_DISCLAIMER_NONCOMPILING,
  TargetName,
} from '.';

// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-require-imports
const spdxLicenseList = require('spdx-license-list');

const BUILDER_CLASS_NAME = 'Builder';

const ANN_NOT_NULL = '@org.jetbrains.annotations.NotNull';
const ANN_NULLABLE = '@org.jetbrains.annotations.Nullable';
const ANN_INTERNAL = '@software.amazon.jsii.Internal';

/**
 * Build Java packages all together, by generating an aggregate POM
 *
 * This will make the Java build a lot more efficient (~300%).
 *
 * Do this by copying the code into a temporary directory, generating an aggregate
 * POM there, and then copying the artifacts back into the respective output
 * directories.
 */
export class JavaBuilder implements TargetBuilder {
  private readonly targetName = 'java';

  public constructor(
    private readonly modules: readonly JsiiModule[],
    private readonly options: BuildOptions,
  ) {}

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
            this.options,
            this.outputDir(module.outputDirectory),
          ),
        ),
      );
      return;
    }

    // Otherwise make a single tempdir to hold all sources, build them together and copy them back out
    const scratchDirs: Array<Scratch<any>> = [];
    try {
      const tempSourceDir = await this.generateAggregateSourceDir(
        this.modules,
        this.options,
      );
      scratchDirs.push(tempSourceDir);

      // Need any old module object to make a target to be able to invoke build, though none of its settings
      // will be used.
      const target = this.makeTarget(this.modules[0], this.options);
      const tempOutputDir = await Scratch.make(async (dir) => {
        logging.debug(`Building Java code to ${dir}`);
        await target.build(tempSourceDir.directory, dir);
      });
      scratchDirs.push(tempOutputDir);

      await this.copyOutArtifacts(
        tempOutputDir.directory,
        tempSourceDir.object,
      );

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

  private async generateModuleCode(
    module: JsiiModule,
    options: BuildOptions,
    where: string,
  ): Promise<void> {
    const target = this.makeTarget(module, options);
    logging.debug(`Generating Java code into ${where}`);
    await target.generateCode(where, module.tarball);
  }

  private async generateAggregateSourceDir(
    modules: readonly JsiiModule[],
    options: BuildOptions,
  ): Promise<Scratch<TemporaryJavaPackage[]>> {
    return Scratch.make(async (tmpDir: string) => {
      logging.debug(`Generating aggregate Java source dir at ${tmpDir}`);
      const ret: TemporaryJavaPackage[] = [];

      const generatedModules = modules
        .map((module) => ({ module, relativeName: slugify(module.name) }))
        .map(({ module, relativeName }) => ({
          module,
          relativeName,
          sourceDir: path.join(tmpDir, relativeName),
        }))
        .map(({ module, relativeName, sourceDir }) =>
          this.generateModuleCode(module, options, sourceDir).then(() => ({
            module,
            relativeName,
          })),
        );

      for await (const { module, relativeName } of generatedModules) {
        ret.push({
          relativeSourceDir: relativeName,
          relativeArtifactsDir: moduleArtifactsSubdir(module),
          outputTargetDirectory: module.outputDirectory,
        });
      }

      await this.generateAggregatePom(
        tmpDir,
        ret.map((m) => m.relativeSourceDir),
      );
      await this.generateMavenSettingsForLocalDeps(tmpDir);

      return ret;
    });
  }

  private async generateAggregatePom(where: string, moduleNames: string[]) {
    const aggregatePom = xmlbuilder
      .create(
        {
          project: {
            '@xmlns': 'http://maven.apache.org/POM/4.0.0',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            '@xsi:schemaLocation':
              'http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd',
            '#comment': [
              `Generated by jsii-pacmak@${VERSION_DESC} on ${new Date().toISOString()}`,
            ],

            modelVersion: '4.0.0',
            packaging: 'pom',

            groupId: 'software.amazon.jsii',
            artifactId: 'aggregatepom',
            version: '1.0.0',

            modules: {
              module: moduleNames,
            },
          },
        },
        { encoding: 'UTF-8' },
      )
      .end({ pretty: true });

    logging.debug(`Generated ${where}/pom.xml`);
    await fs.writeFile(path.join(where, 'pom.xml'), aggregatePom);
  }

  private async copyOutArtifacts(
    artifactsRoot: string,
    packages: TemporaryJavaPackage[],
  ) {
    logging.debug('Copying out Java artifacts');
    // The artifacts directory looks like this:
    //  /tmp/XXX/software/amazon/awscdk/something/v1.2.3
    //                                 /else/v1.2.3
    //                                 /entirely/v1.2.3
    //
    // We get the 'software/amazon/awscdk/something' path from the package, identifying
    // the files we need to copy, including Maven metadata. But we need to recreate
    // the whole path in the target directory.

    await Promise.all(
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
        await fs.copy(artifactsSource, artifactsDest, { recursive: true });
      }),
    );
  }

  /**
   * Decide whether or not to append 'java' to the given output directory
   */
  private outputDir(declaredDir: string) {
    return this.options.languageSubdirectory
      ? path.join(declaredDir, this.targetName)
      : declaredDir;
  }

  /**
   * Generates maven settings file for this build.
   * @param where The generated sources directory. This is where user.xml will be placed.
   * @param currentOutputDirectory The current output directory. Will be added as a local maven repo.
   */
  private async generateMavenSettingsForLocalDeps(where: string) {
    const filePath = path.join(where, 'user.xml');

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
    const localJavaRuntime = await findJavaRuntimeLocalRepository();
    if (localJavaRuntime) {
      localRepos.push(localJavaRuntime);
    }

    logging.debug('local maven repos:', localRepos);

    const profileName = 'local-jsii-modules';
    const settings = xmlbuilder
      .create(
        {
          settings: {
            '@xmlns': 'http://maven.apache.org/POM/4.0.0',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            '@xsi:schemaLocation':
              'http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd',
            '#comment': [
              `Generated by jsii-pacmak@${VERSION_DESC} on ${new Date().toISOString()}`,
            ],
            // Do *not* attempt to ask the user for stuff...
            interactiveMode: false,
            // Use a non-default local repository to isolate from cached artifacts...
            localRepository: path.resolve(where, '.m2', 'repository'),
            // Register locations of locally-sourced dependencies
            profiles: {
              profile: {
                id: profileName,
                repositories: {
                  repository: localRepos.map((repo) => ({
                    id: repo.replace(/[\\/:"<>|?*]/g, '$'),
                    url: `file://${repo}`,
                  })),
                },
              },
            },
            activeProfiles: {
              activeProfile: profileName,
            },
          },
        },
        { encoding: 'UTF-8' },
      )
      .end({ pretty: true });

    logging.debug(`Generated ${filePath}`);
    await fs.writeFile(filePath, settings);
    return filePath;
  }

  private makeTarget(module: JsiiModule, options: BuildOptions): Target {
    return new Java({
      targetName: this.targetName,
      packageDir: module.moduleDirectory,
      assembly: module.assembly,
      fingerprint: options.fingerprint,
      force: options.force,
      arguments: options.arguments,
      rosetta: options.rosetta,
    });
  }
}

interface TemporaryJavaPackage {
  /**
   * Where the sources are (relative to the source root)
   */
  relativeSourceDir: string;

  /**
   * Where the artifacts will be stored after build (relative to build dir)
   */
  relativeArtifactsDir: string;

  /**
   * Where the artifacts ought to go for this particular module
   */
  outputTargetDirectory: string;
}

/**
 * Return the subdirectory of the output directory where the artifacts for this particular package are produced
 */
function moduleArtifactsSubdir(module: JsiiModule) {
  const groupId = module.assembly.targets!.java!.maven.groupId;
  const artifactId = module.assembly.targets!.java!.maven.artifactId;
  return `${groupId.replace(/\./g, '/')}/${artifactId}`;
}

export default class Java extends Target {
  public static toPackageInfos(assm: spec.Assembly): {
    [language: string]: PackageInfo;
  } {
    const groupId = assm.targets!.java!.maven.groupId;
    const artifactId = assm.targets!.java!.maven.artifactId;
    const releaseVersion = toReleaseVersion(assm.version, TargetName.JAVA);
    const url = `https://repo1.maven.org/maven2/${groupId.replace(
      /\./g,
      '/',
    )}/${artifactId}/${assm.version}/`;
    return {
      java: {
        repository: 'Maven Central',
        url,
        usage: {
          'Apache Maven': {
            language: 'xml',
            code: xmlbuilder
              .create({
                dependency: { groupId, artifactId, version: releaseVersion },
              })
              .end({ pretty: true })
              .replace(/<\?\s*xml(\s[^>]+)?>\s*/m, ''),
          },
          'Apache Buildr': `'${groupId}:${artifactId}:jar:${releaseVersion}'`,
          'Apache Ivy': {
            language: 'xml',
            code: xmlbuilder
              .create({
                dependency: {
                  '@groupId': groupId,
                  '@name': artifactId,
                  '@rev': releaseVersion,
                },
              })
              .end({ pretty: true })
              .replace(/<\?\s*xml(\s[^>]+)?>\s*/m, ''),
          },
          'Groovy Grape': `@Grapes(\n@Grab(group='${groupId}', module='${artifactId}', version='${releaseVersion}')\n)`,
          'Gradle / Grails': `compile '${groupId}:${artifactId}:${releaseVersion}'`,
        },
      },
    };
  }

  public static toNativeReference(type: spec.Type, options: any) {
    const [, ...name] = type.fqn.split('.');
    return { java: `import ${[options.package, ...name].join('.')};` };
  }

  protected readonly generator: JavaGenerator;

  public constructor(options: TargetOptions) {
    super(options);

    this.generator = new JavaGenerator(options.rosetta);
  }

  public async build(sourceDir: string, outDir: string): Promise<void> {
    const url = `file://${outDir}`;
    const mvnArguments = new Array<string>();
    for (const arg of Object.keys(this.arguments)) {
      if (!arg.startsWith('mvn-')) {
        continue;
      }
      mvnArguments.push(`--${arg.slice(4)}`);
      mvnArguments.push(this.arguments[arg].toString());
    }

    await shell(
      'mvn',
      [
        // If we don't run in verbose mode, turn on quiet mode
        ...(this.arguments.verbose ? [] : ['--quiet']),
        '--batch-mode',
        ...mvnArguments,
        'deploy',
        `-D=altDeploymentRepository=local::default::${url}`,
        '--settings=user.xml',
      ],
      {
        cwd: sourceDir,
        env: {
          // Twiddle the JVM settings a little for Maven. Delaying JIT compilation
          // brings down Maven execution time by about 1/3rd (15->10s, 30->20s)
          MAVEN_OPTS: `${
            process.env.MAVEN_OPTS ?? ''
          } -XX:+TieredCompilation -XX:TieredStopAtLevel=1`,
        },
        retry: { maxAttempts: 5 },
      },
    );
  }
}

// ##################
// # CODE GENERATOR #
// ##################

const MODULE_CLASS_NAME = '$Module';
const INTERFACE_PROXY_CLASS_NAME = 'Jsii$Proxy';
const INTERFACE_DEFAULT_CLASS_NAME = 'Jsii$Default';

// Struct that stores metadata about a property that can be used in Java code generation.
interface JavaProp {
  // Documentation for the property
  docs?: spec.Docs;

  // The original JSII property spec this struct was derived from
  spec: spec.Property;

  // Canonical name of the Java property (eg: 'MyProperty')
  propName: string;

  // The original canonical name of the JSII property
  jsiiName: string;

  // Field name of the Java property (eg: 'myProperty')
  fieldName: string;

  // The java type for the property (eg: 'List<String>')
  fieldJavaType: string;

  // The java type for the parameter (e.g: 'List<? extends SomeType>')
  paramJavaType: string;

  // The NativeType representation of the property's type
  fieldNativeType: string;

  // The raw class type of the property that can be used for marshalling (eg: 'List.class')
  fieldJavaClass: string;

  // List of types that the property is assignable from. Used to overload setters.
  javaTypes: string[];

  // True if the property is optional.
  nullable: boolean;

  // True if the property has been transitively inherited from a base class.
  inherited: boolean;

  // True if the property is read-only once initialized.
  immutable: boolean;
}

class JavaGenerator extends Generator {
  // When the code-generator needs to generate code for a property or method that has the same name as a member of this list, the name will
  // be automatically modified to avoid compile errors. Most of these are java language reserved keywords. In addition to those, any keywords that
  // are likely to conflict with auto-generated methods or properties (eg: 'build') are also considered reserved.
  private static readonly RESERVED_KEYWORDS = [
    'abstract',
    'assert',
    'boolean',
    'break',
    'build',
    'byte',
    'case',
    'catch',
    'char',
    'class',
    'const',
    'continue',
    'default',
    'double',
    'do',
    'else',
    'enum',
    'extends',
    'false',
    'final',
    'finally',
    'float',
    'for',
    'goto',
    'if',
    'implements',
    'import',
    'instanceof',
    'int',
    'interface',
    'long',
    'native',
    'new',
    'null',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'short',
    'static',
    'strictfp',
    'super',
    'switch',
    'synchronized',
    'this',
    'throw',
    'throws',
    'transient',
    'true',
    'try',
    'void',
    'volatile',
    'while',
  ];

  /**
   * Turns a raw javascript property name (eg: 'default') into a safe Java property name (eg: 'defaultValue').
   * @param propertyName the raw JSII property Name
   */
  private static safeJavaPropertyName(propertyName: string) {
    if (!propertyName) {
      return propertyName;
    }

    if (JavaGenerator.RESERVED_KEYWORDS.includes(propertyName)) {
      return `${propertyName}Value`;
    }
    return propertyName;
  }

  /**
   * Turns a raw javascript method name (eg: 'import') into a safe Java method name (eg: 'doImport').
   * @param methodName
   */
  private static safeJavaMethodName(methodName: string) {
    if (!methodName) {
      return methodName;
    }

    if (JavaGenerator.RESERVED_KEYWORDS.includes(methodName)) {
      return `do${jsiiToPascalCase(methodName)}`;
    }
    return methodName;
  }

  /** If false, @Generated will not include generator version nor timestamp */
  private emitFullGeneratorInfo?: boolean;
  private moduleClass!: string;

  /**
   * A map of all the modules ever referenced during code generation. These include
   * direct dependencies but can potentially also include transitive dependencies, when,
   * for example, we need to refer to their types when flatting the class hierarchy for
   * interface proxies.
   */
  private readonly referencedModules: {
    [name: string]: spec.AssemblyConfiguration;
  } = {};

  public constructor(private readonly rosetta: Rosetta) {
    super({ generateOverloadsForMethodWithOptionals: true });
  }

  protected onBeginAssembly(assm: spec.Assembly, fingerprint: boolean) {
    this.emitFullGeneratorInfo = fingerprint;
    this.moduleClass = this.emitModuleFile(assm);

    this.emitAssemblyPackageInfo(assm);
  }

  protected onEndAssembly(assm: spec.Assembly, fingerprint: boolean) {
    this.emitMavenPom(assm, fingerprint);
    delete this.emitFullGeneratorInfo;
  }

  protected getAssemblyOutputDir(mod: spec.Assembly) {
    const dir = this.toNativeFqn(mod.name).replace(/\./g, '/');
    return path.join('src', 'main', 'resources', dir);
  }

  protected onBeginClass(cls: spec.ClassType, abstract: boolean) {
    this.openFileIfNeeded(cls);
    this.addJavaDocs(cls);

    const classBase = this.getClassBase(cls);
    const extendsExpression = classBase ? ` extends ${classBase}` : '';

    let implementsExpr = '';
    if (cls.interfaces?.length ?? 0 > 0) {
      implementsExpr = ` implements ${cls
        .interfaces!.map((x) => this.toNativeFqn(x))
        .join(', ')}`;
    }

    const nested = this.isNested(cls);
    const inner = nested ? ' static' : '';
    const absPrefix = abstract ? ' abstract' : '';

    if (!nested) {
      this.emitGeneratedAnnotation();
    }
    this.emitStabilityAnnotations(cls);
    this.code.line(
      `@software.amazon.jsii.Jsii(module = ${this.moduleClass}.class, fqn = "${cls.fqn}")`,
    );
    this.code.openBlock(
      `public${inner}${absPrefix} class ${cls.name}${extendsExpression}${implementsExpr}`,
    );

    this.emitJsiiInitializers(cls);
    this.emitStaticInitializer(cls);
  }

  protected onEndClass(cls: spec.ClassType) {
    if (cls.abstract) {
      const type = this.reflectAssembly.findType(cls.fqn) as reflect.ClassType;
      this.emitProxy(type);
    } else {
      this.emitClassBuilder(cls);
    }

    this.code.closeBlock();
    this.closeFileIfNeeded(cls);
  }

  protected onInitializer(cls: spec.ClassType, method: spec.Initializer) {
    this.code.line();

    // If needed, patching up the documentation to point users at the builder pattern
    this.addJavaDocs(method);
    this.emitStabilityAnnotations(method);

    // Abstract classes should have protected initializers
    const initializerAccessLevel = cls.abstract
      ? 'protected'
      : this.renderAccessLevel(method);

    this.code.openBlock(
      `${initializerAccessLevel} ${cls.name}(${this.renderMethodParameters(
        method,
      )})`,
    );
    this.code.line(
      'super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);',
    );
    this.code.line(
      `software.amazon.jsii.JsiiEngine.getInstance().createNewObject(this${this.renderMethodCallArguments(
        method,
      )});`,
    );
    this.code.closeBlock();
  }

  protected onInitializerOverload(
    cls: spec.ClassType,
    overload: spec.Method,
    _originalInitializer: spec.Method,
  ) {
    this.onInitializer(cls, overload);
  }

  protected onField(
    _cls: spec.ClassType,
    _prop: spec.Property,
    _union?: spec.UnionTypeReference,
  ) {
    /* noop */
  }

  protected onProperty(cls: spec.ClassType, prop: spec.Property) {
    this.emitProperty(cls, prop);
  }

  protected onStaticProperty(cls: spec.ClassType, prop: spec.Property) {
    if (prop.const) {
      this.emitConstProperty(prop);
    } else {
      this.emitProperty(cls, prop);
    }
  }

  /**
   * Since we expand the union setters, we will use this event to only emit the getter which returns an Object.
   */
  protected onUnionProperty(
    cls: spec.ClassType,
    prop: spec.Property,
    _union: spec.UnionTypeReference,
  ) {
    this.emitProperty(cls, prop);
  }

  protected onMethod(cls: spec.ClassType, method: spec.Method) {
    this.emitMethod(cls, method);
  }

  protected onMethodOverload(
    cls: spec.ClassType,
    overload: spec.Method,
    _originalMethod: spec.Method,
  ) {
    this.onMethod(cls, overload);
  }

  protected onStaticMethod(cls: spec.ClassType, method: spec.Method) {
    this.emitMethod(cls, method);
  }

  protected onStaticMethodOverload(
    cls: spec.ClassType,
    overload: spec.Method,
    _originalMethod: spec.Method,
  ) {
    this.emitMethod(cls, overload);
  }

  protected onBeginEnum(enm: spec.EnumType) {
    this.openFileIfNeeded(enm);
    this.addJavaDocs(enm);
    if (!this.isNested(enm)) {
      this.emitGeneratedAnnotation();
    }
    this.emitStabilityAnnotations(enm);
    this.code.line(
      `@software.amazon.jsii.Jsii(module = ${this.moduleClass}.class, fqn = "${enm.fqn}")`,
    );
    this.code.openBlock(`public enum ${enm.name}`);
  }
  protected onEndEnum(enm: spec.EnumType) {
    this.code.closeBlock();
    this.closeFileIfNeeded(enm);
  }
  protected onEnumMember(_: spec.EnumType, member: spec.EnumMember) {
    this.addJavaDocs(member);
    this.emitStabilityAnnotations(member);
    this.code.line(`${member.name},`);
  }

  /**
   * Namespaces are handled implicitly by onBeginClass().
   *
   * Only emit package-info in case this is a submodule
   */
  protected onBeginNamespace(ns: string) {
    const submodule = this.assembly.submodules?.[ns];
    if (submodule) {
      this.emitSubmodulePackageInfo(this.assembly, ns);
    }
  }

  protected onEndNamespace(_ns: string) {
    /* noop */
  }

  protected onBeginInterface(ifc: spec.InterfaceType) {
    this.openFileIfNeeded(ifc);
    this.addJavaDocs(ifc);

    // all interfaces always extend JsiiInterface so we can identify that it is a jsii interface.
    const interfaces = ifc.interfaces ?? [];
    const bases = [
      'software.amazon.jsii.JsiiSerializable',
      ...interfaces.map((x) => this.toNativeFqn(x)),
    ].join(', ');

    const nested = this.isNested(ifc);
    const inner = nested ? ' static' : '';
    if (!nested) {
      this.emitGeneratedAnnotation();
    }
    this.code.line(
      `@software.amazon.jsii.Jsii(module = ${this.moduleClass}.class, fqn = "${ifc.fqn}")`,
    );
    this.code.line(
      `@software.amazon.jsii.Jsii.Proxy(${ifc.name}.${INTERFACE_PROXY_CLASS_NAME}.class)`,
    );
    this.emitStabilityAnnotations(ifc);
    this.code.openBlock(
      `public${inner} interface ${ifc.name} extends ${bases}`,
    );
  }

  protected onEndInterface(ifc: spec.InterfaceType) {
    this.emitMultiplyInheritedOptionalProperties(ifc);

    if (ifc.datatype) {
      this.emitDataType(ifc);
    } else {
      const type = this.reflectAssembly.findType(
        ifc.fqn,
      ) as reflect.InterfaceType;

      this.emitProxy(type);
      // We don't emit Jsii$Default if the assembly opted out of it explicitly.
      // This is mostly to facilitate compatibility testing...
      if (hasDefaultInterfaces(this.reflectAssembly)) {
        this.emitDefaultImplementation(type);
      }
    }

    this.code.closeBlock();
    this.closeFileIfNeeded(ifc);
  }

  protected onInterfaceMethod(_ifc: spec.InterfaceType, method: spec.Method) {
    this.code.line();
    const returnType = method.returns
      ? this.toDecoratedJavaType(method.returns)
      : 'void';
    this.addJavaDocs(method);
    this.emitStabilityAnnotations(method);
    this.code.line(
      `${returnType} ${method.name}(${this.renderMethodParameters(method)});`,
    );
  }

  protected onInterfaceMethodOverload(
    ifc: spec.InterfaceType,
    overload: spec.Method,
    _originalMethod: spec.Method,
  ) {
    this.onInterfaceMethod(ifc, overload);
  }

  protected onInterfaceProperty(_ifc: spec.InterfaceType, prop: spec.Property) {
    const getterType = this.toDecoratedJavaType(prop);
    const propName = jsiiToPascalCase(
      JavaGenerator.safeJavaPropertyName(prop.name),
    );

    // for unions we only generate overloads for setters, not getters.
    this.code.line();
    this.addJavaDocs(prop);
    this.emitStabilityAnnotations(prop);
    if (prop.optional) {
      if (prop.overrides) {
        this.code.line('@Override');
      }
      this.code.openBlock(`default ${getterType} get${propName}()`);
      this.code.line('return null;');
      this.code.closeBlock();
    } else {
      this.code.line(`${getterType} get${propName}();`);
    }

    if (!prop.immutable) {
      const setterTypes = this.toDecoratedJavaTypes(prop);
      for (const type of setterTypes) {
        this.code.line();
        this.addJavaDocs(prop);
        if (prop.optional) {
          if (prop.overrides) {
            this.code.line('@Override');
          }
          this.code.line('@software.amazon.jsii.Optional');
          this.code.openBlock(
            `default void set${propName}(final ${type} value)`,
          );
          this.code.line(
            `throw new UnsupportedOperationException("'void " + getClass().getCanonicalName() + "#set${propName}(${type})' is not implemented!");`,
          );
          this.code.closeBlock();
        } else {
          this.code.line(`void set${propName}(final ${type} value);`);
        }
      }
    }
  }

  /**
   * Emits a local default implementation for optional properties inherited from
   * multiple distinct parent types. This remvoes the default method dispatch
   * ambiguity that would otherwise exist.
   *
   * @param ifc            the interface to be processed.

   *
   * @see https://github.com/aws/jsii/issues/2256
   */
  private emitMultiplyInheritedOptionalProperties(ifc: spec.InterfaceType) {
    if (ifc.interfaces == null || ifc.interfaces.length <= 1) {
      // Nothing to do if we don't have parent interfaces, or if we have exactly one
      return;
    }
    const inheritedOptionalProps = ifc.interfaces
      .map(allOptionalProps.bind(this))
      // Calculate how many direct parents brought a given optional property
      .reduce((histogram, entry) => {
        for (const [name, spec] of Object.entries(entry)) {
          histogram[name] = histogram[name] ?? { spec, count: 0 };
          histogram[name].count += 1;
        }
        return histogram;
      }, {} as Record<string, { readonly spec: spec.Property; count: number }>);

    const localProps = new Set(ifc.properties?.map((prop) => prop.name) ?? []);
    for (const { spec, count } of Object.values(inheritedOptionalProps)) {
      if (count < 2 || localProps.has(spec.name)) {
        continue;
      }
      this.onInterfaceProperty(ifc, spec);
    }

    function allOptionalProps(this: JavaGenerator, fqn: string) {
      const type = this.findType(fqn) as spec.InterfaceType;
      const result: Record<string, spec.Property> = {};
      for (const prop of type.properties ?? []) {
        // Adding artifical "overrides" here for code-gen quality's sake.
        result[prop.name] = { ...prop, overrides: type.fqn };
      }
      // Include optional properties of all super interfaces in the result
      for (const base of type.interfaces ?? []) {
        for (const [name, prop] of Object.entries(
          allOptionalProps.call(this, base),
        )) {
          if (!(name in result)) {
            result[name] = prop;
          }
        }
      }
      return result;
    }
  }

  private emitAssemblyPackageInfo(mod: spec.Assembly) {
    if (!mod.docs) {
      return;
    }

    const { packageName } = this.toNativeName(mod);
    const packageInfoFile = this.toJavaFilePath(
      mod,
      `${mod.name}.package-info`,
    );
    this.code.openFile(packageInfoFile);
    this.code.line('/**');
    if (mod.readme) {
      for (const line of markDownToJavaDoc(
        this.convertSamplesInMarkdown(mod.readme.markdown),
      ).split('\n')) {
        this.code.line(` * ${line.replace(/\*\//g, '*{@literal /}')}`);
      }
    }
    if (mod.docs.deprecated) {
      this.code.line(' *');
      // Javac won't allow @deprecated on packages, while @Deprecated is aaaabsolutely fine. Duh.
      this.code.line(` * Deprecated: ${mod.docs.deprecated}`);
    }
    this.code.line(' */');
    this.emitStabilityAnnotations(mod);
    this.code.line(`package ${packageName};`);
    this.code.closeFile(packageInfoFile);
  }

  private emitSubmodulePackageInfo(assembly: spec.Assembly, moduleFqn: string) {
    const mod = assembly.submodules?.[moduleFqn];
    if (!mod?.readme?.markdown) {
      return;
    }

    const { packageName } = translateFqn(assembly, moduleFqn);
    const packageInfoFile = this.toJavaFilePath(
      assembly,
      `${moduleFqn}.package-info`,
    );
    this.code.openFile(packageInfoFile);
    this.code.line('/**');
    if (mod.readme) {
      for (const line of markDownToJavaDoc(
        this.convertSamplesInMarkdown(mod.readme.markdown),
      ).split('\n')) {
        this.code.line(` * ${line.replace(/\*\//g, '*{@literal /}')}`);
      }
    }
    this.code.line(' */');
    this.code.line(`package ${packageName};`);
    this.code.closeFile(packageInfoFile);
  }

  private emitMavenPom(assm: spec.Assembly, fingerprint: boolean) {
    if (!assm.targets?.java) {
      throw new Error(`Assembly ${assm.name} does not declare a java target`);
    }

    const comment = fingerprint
      ? {
          '#comment': [
            `Generated by jsii-pacmak@${VERSION_DESC} on ${new Date().toISOString()}`,
            `@jsii-pacmak:meta@ ${JSON.stringify(this.metadata)}`,
          ],
        }
      : {};

    this.code.openFile('pom.xml');
    this.code.line(
      xmlbuilder
        .create(
          {
            project: {
              '@xmlns': 'http://maven.apache.org/POM/4.0.0',
              '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
              '@xsi:schemaLocation':
                'http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd',

              ...comment,

              modelVersion: '4.0.0',
              name: '${project.groupId}:${project.artifactId}',
              description: assm.description,
              url: assm.homepage,

              licenses: {
                license: getLicense(),
              },

              developers: {
                developer: mavenDevelopers(),
              },

              scm: {
                connection: `scm:${assm.repository.type}:${assm.repository.url}`,
                url: assm.repository.url,
              },

              groupId: assm.targets.java.maven.groupId,
              artifactId: assm.targets.java.maven.artifactId,
              version: makeVersion(
                assm.version,
                assm.targets.java.maven.versionSuffix,
              ),
              packaging: 'jar',

              properties: { 'project.build.sourceEncoding': 'UTF-8' },

              dependencies: { dependency: mavenDependencies.call(this) },

              build: {
                plugins: {
                  plugin: [
                    {
                      groupId: 'org.apache.maven.plugins',
                      artifactId: 'maven-compiler-plugin',
                      version: '3.8.1',
                      configuration: { source: '1.8', target: '1.8' },
                    },
                    {
                      groupId: 'org.apache.maven.plugins',
                      artifactId: 'maven-jar-plugin',
                      version: '3.2.0',
                      configuration: {
                        archive: {
                          index: true,
                          manifest: {
                            addDefaultImplementationEntries: true,
                            addDefaultSpecificationEntries: true,
                          },
                        },
                      },
                    },
                    {
                      groupId: 'org.apache.maven.plugins',
                      artifactId: 'maven-source-plugin',
                      version: '3.2.1',
                      executions: {
                        execution: {
                          id: 'attach-sources',
                          goals: { goal: 'jar' },
                        },
                      },
                    },
                    {
                      groupId: 'org.apache.maven.plugins',
                      artifactId: 'maven-javadoc-plugin',
                      version: '3.2.0',
                      executions: {
                        execution: {
                          id: 'attach-javadocs',
                          goals: { goal: 'jar' },
                        },
                      },
                      configuration: {
                        failOnError: false,
                        show: 'protected',
                        sourceFileExcludes: {
                          // Excluding the $Module classes so they won't pollute the docsite. They otherwise
                          // are all collected at the top of the classlist, burrying useful information under
                          // a lot of dry scrolling.
                          exclude: ['**/$Module.java'],
                        },
                        // Adding these makes JavaDoc generation about a 3rd faster (which is far and away the most
                        // expensive part of the build)
                        additionalJOption: [
                          '-J-XX:+TieredCompilation',
                          '-J-XX:TieredStopAtLevel=1',
                        ],
                      },
                    },
                    {
                      groupId: 'org.apache.maven.plugins',
                      artifactId: 'maven-enforcer-plugin',
                      version: '3.0.0-M3',
                      executions: {
                        execution: {
                          id: 'enforce-maven',
                          goals: { goal: 'enforce' },
                          configuration: {
                            rules: {
                              requireMavenVersion: { version: '3.6' },
                            },
                          },
                        },
                      },
                    },
                    {
                      groupId: 'org.codehaus.mojo',
                      artifactId: 'versions-maven-plugin',
                      version: '2.8.1',
                      configuration: {
                        generateBackupPoms: false,
                      },
                    },
                  ],
                },
              },
            },
          },
          { encoding: 'UTF-8' },
        )
        .end({ pretty: true }),
    );
    this.code.closeFile('pom.xml');

    /**
     * Combines a version number with an optional suffix. The suffix, when present, must begin with
     * '-' or '.', and will be concatenated as-is to the version number..
     *
     * @param version the semantic version number
     * @param suffix  the suffix, if any.
     */
    function makeVersion(version: string, suffix?: string): string {
      if (!suffix) {
        return toReleaseVersion(version, TargetName.JAVA);
      }
      if (!suffix.startsWith('-') && !suffix.startsWith('.')) {
        throw new Error(
          `versionSuffix must start with '-' or '.', but received ${suffix}`,
        );
      }
      return `${version}${suffix}`;
    }

    function mavenDependencies(this: JavaGenerator) {
      const dependencies = new Array<MavenDependency>();
      for (const [depName, version] of Object.entries(
        this.assembly.dependencies ?? {},
      )) {
        const dep = this.assembly.dependencyClosure?.[depName];
        if (!dep?.targets?.java) {
          throw new Error(
            `Assembly ${assm.name} depends on ${depName}, which does not declare a java target`,
          );
        }
        dependencies.push({
          groupId: dep.targets.java.maven.groupId,
          artifactId: dep.targets.java.maven.artifactId,
          version: toMavenVersionRange(
            version,
            dep.targets.java.maven.versionSuffix,
          ),
        });
      }
      // The JSII java runtime base classes
      dependencies.push({
        groupId: 'software.amazon.jsii',
        artifactId: 'jsii-runtime',
        version: toMavenVersionRange(`^${VERSION}`),
      });

      // Provides @org.jetbrains.*
      dependencies.push({
        groupId: 'org.jetbrains',
        artifactId: 'annotations',
        version: '[16.0.3,20.0.0)',
      });

      // Provides @javax.annotation.Generated for JDKs >= 9
      dependencies.push({
        '#comment': 'Provides @javax.annotation.Generated for JDKs >= 9',
        groupId: 'javax.annotation',
        artifactId: 'javax.annotation-api',
        version: '[1.3.2,1.4.0)',
        scope: 'compile',
      });

      return dependencies;
    }

    function mavenDevelopers() {
      return [assm.author, ...(assm.contributors ?? [])].map(toDeveloper);

      function toDeveloper(person: spec.Person) {
        const developer: any = {
          [person.organization ? 'organization' : 'name']: person.name,
          roles: { role: person.roles },
        };
        // We cannot set "undefined" or "null" to a field - this causes invalid XML to be emitted (per POM schema).
        if (person.email) {
          developer.email = person.email;
        }
        if (person.url) {
          developer[person.organization ? 'organizationUrl' : 'url'] =
            person.url;
        }
        return developer;
      }
    }

    /**
     * Get the maven-style license block for a the assembly.
     * @see https://maven.apache.org/pom.html#Licenses
     */
    function getLicense() {
      const spdx = spdxLicenseList[assm.license];
      return (
        spdx && {
          name: spdx.name,
          url: spdx.url,
          distribution: 'repo',
          comments: spdx.osiApproved ? 'An OSI-approved license' : undefined,
        }
      );
    }
  }

  private emitStaticInitializer(cls: spec.ClassType) {
    const consts = (cls.properties ?? []).filter((x) => x.const);
    if (consts.length === 0) {
      return;
    }

    const javaClass = this.toJavaType(cls);

    this.code.line();
    this.code.openBlock('static');

    for (const prop of consts) {
      const constName = this.renderConstName(prop);
      const propType = this.toNativeType(prop.type, { forMarshalling: true });
      const statement = `software.amazon.jsii.JsiiObject.jsiiStaticGet(${javaClass}.class, "${prop.name}", ${propType})`;
      this.code.line(
        `${constName} = ${this.wrapCollection(
          statement,
          prop.type,
          prop.optional,
        )};`,
      );
    }

    this.code.closeBlock();
  }

  private renderConstName(prop: spec.Property) {
    return this.code.toSnakeCase(prop.name).toLocaleUpperCase(); // java consts are SNAKE_UPPER_CASE
  }

  private emitConstProperty(prop: spec.Property) {
    const propType = this.toJavaType(prop.type);
    const propName = this.renderConstName(prop);
    const access = this.renderAccessLevel(prop);

    this.code.line();
    this.addJavaDocs(prop);
    this.emitStabilityAnnotations(prop);
    this.code.line(`${access} final static ${propType} ${propName};`);
  }

  private emitProperty(
    cls: spec.Type,
    prop: spec.Property,
    {
      defaultImpl = false,
      final = false,
      includeGetter = true,
      overrides = !!prop.overrides,
    }: {
      defaultImpl?: boolean;
      final?: boolean;
      includeGetter?: boolean;
      overrides?: boolean;
    } = {},
  ) {
    const getterType = this.toDecoratedJavaType(prop);
    const setterTypes = this.toDecoratedJavaTypes(prop, {
      covariant: prop.static,
    });
    const propName = jsiiToPascalCase(
      JavaGenerator.safeJavaPropertyName(prop.name),
    );

    const modifiers = [defaultImpl ? 'default' : this.renderAccessLevel(prop)];
    if (prop.static) modifiers.push('static');
    if (prop.abstract && !defaultImpl) modifiers.push('abstract');
    if (final && !prop.abstract && !defaultImpl) modifiers.push('final');

    const javaClass = this.toJavaType(cls);

    // for unions we only generate overloads for setters, not getters.
    if (includeGetter) {
      this.code.line();
      this.addJavaDocs(prop);
      if (overrides && !prop.static) {
        this.code.line('@Override');
      }
      this.emitStabilityAnnotations(prop);
      const signature = `${modifiers.join(' ')} ${getterType} get${propName}()`;
      if (prop.abstract && !defaultImpl) {
        this.code.line(`${signature};`);
      } else {
        this.code.openBlock(signature);
        let statement;
        if (prop.static) {
          statement = `software.amazon.jsii.JsiiObject.jsiiStaticGet(${this.toJavaType(
            cls,
          )}.class, `;
        } else {
          statement = 'software.amazon.jsii.Kernel.get(this, ';
        }

        statement += `"${prop.name}", ${this.toNativeType(prop.type, {
          forMarshalling: true,
        })})`;

        this.code.line(
          `return ${this.wrapCollection(statement, prop.type, prop.optional)};`,
        );
        this.code.closeBlock();
      }
    }

    if (!prop.immutable) {
      for (const type of setterTypes) {
        this.code.line();
        this.addJavaDocs(prop);
        if (overrides && !prop.static) {
          this.code.line('@Override');
        }
        this.emitStabilityAnnotations(prop);
        const signature = `${modifiers.join(
          ' ',
        )} void set${propName}(final ${type} value)`;
        if (prop.abstract && !defaultImpl) {
          this.code.line(`${signature};`);
        } else {
          this.code.openBlock(signature);
          let statement = '';

          if (prop.static) {
            statement += `software.amazon.jsii.JsiiObject.jsiiStaticSet(${javaClass}.class, `;
          } else {
            statement += 'software.amazon.jsii.Kernel.set(this, ';
          }
          const value = prop.optional
            ? 'value'
            : `java.util.Objects.requireNonNull(value, "${prop.name} is required")`;
          statement += `"${prop.name}", ${value});`;
          this.code.line(statement);
          this.code.closeBlock();
        }
      }
    }
  }

  private emitMethod(
    cls: spec.Type,
    method: spec.Method,
    {
      defaultImpl = false,
      final = false,
      overrides = !!method.overrides,
    }: { defaultImpl?: boolean; final?: boolean; overrides?: boolean } = {},
  ) {
    const returnType = method.returns
      ? this.toDecoratedJavaType(method.returns)
      : 'void';

    const modifiers = [
      defaultImpl ? 'default' : this.renderAccessLevel(method),
    ];
    if (method.static) modifiers.push('static');
    if (method.abstract && !defaultImpl) modifiers.push('abstract');
    if (final && !method.abstract && !defaultImpl) modifiers.push('final');

    const async = !!method.async;
    const methodName = JavaGenerator.safeJavaMethodName(method.name);
    const signature = `${returnType} ${methodName}(${this.renderMethodParameters(
      method,
    )})`;
    this.code.line();
    this.addJavaDocs(method);
    this.emitStabilityAnnotations(method);
    if (overrides && !method.static) {
      this.code.line('@Override');
    }
    if (method.abstract && !defaultImpl) {
      this.code.line(`${modifiers.join(' ')} ${signature};`);
    } else {
      this.code.openBlock(`${modifiers.join(' ')} ${signature}`);
      this.code.line(this.renderMethodCall(cls, method, async));
      this.code.closeBlock();
    }
  }

  /**
   * We are now going to build a class that can be used as a proxy for untyped
   * javascript objects that implement this interface. we want java code to be
   * able to interact with them, so we will create a proxy class which
   * implements this interface and has the same methods.
   *
   * These proxies are also used to extend abstract classes to allow the JSII
   * engine to instantiate an abstract class in Java.
   */
  private emitProxy(type: reflect.InterfaceType | reflect.ClassType) {
    const name = INTERFACE_PROXY_CLASS_NAME;

    this.code.line();
    this.code.line('/**');
    this.code.line(
      ' * A proxy class which represents a concrete javascript instance of this type.',
    );
    this.code.line(' */');

    const baseInterfaces = this.defaultInterfacesFor(type, {
      includeThisType: true,
    });

    if (type.isInterfaceType() && !hasDefaultInterfaces(type.assembly)) {
      // Extend this interface directly since this module does not have the Jsii$Default
      baseInterfaces.push(this.toNativeFqn(type.fqn));
    }

    const suffix = type.isInterfaceType()
      ? `extends software.amazon.jsii.JsiiObject implements ${baseInterfaces.join(
          ', ',
        )}`
      : `extends ${this.toNativeFqn(type.fqn)}${
          baseInterfaces.length > 0
            ? ` implements ${baseInterfaces.join(', ')}`
            : ''
        }`;

    const modifiers = type.isInterfaceType() ? 'final' : 'private static final';

    this.code.line(ANN_INTERNAL);
    this.code.openBlock(`${modifiers} class ${name} ${suffix}`);
    this.code.openBlock(
      `protected ${name}(final software.amazon.jsii.JsiiObjectRef objRef)`,
    );
    this.code.line('super(objRef);');
    this.code.closeBlock();

    // emit all properties
    for (const reflectProp of type.allProperties.filter(
      (prop) =>
        prop.abstract &&
        (prop.parentType.fqn === type.fqn ||
          prop.parentType.isClassType() ||
          !hasDefaultInterfaces(prop.assembly)),
    )) {
      const prop = clone(reflectProp.spec);
      prop.abstract = false;
      // Emitting "final" since this is a proxy and nothing will/should override this
      this.emitProperty(type.spec, prop, { final: true, overrides: true });
    }

    // emit all the methods
    for (const reflectMethod of type.allMethods.filter(
      (method) =>
        method.abstract &&
        (method.parentType.fqn === type.fqn ||
          method.parentType.isClassType() ||
          !hasDefaultInterfaces(method.assembly)),
    )) {
      const method = clone(reflectMethod.spec);
      method.abstract = false;
      // Emitting "final" since this is a proxy and nothing will/should override this
      this.emitMethod(type.spec, method, { final: true, overrides: true });

      for (const overloadedMethod of this.createOverloadsForOptionals(method)) {
        overloadedMethod.abstract = false;
        this.emitMethod(type.spec, overloadedMethod, {
          final: true,
          overrides: true,
        });
      }
    }

    this.code.closeBlock();
  }

  private emitDefaultImplementation(type: reflect.InterfaceType) {
    const baseInterfaces = [type.name, ...this.defaultInterfacesFor(type)];

    this.code.line();
    this.code.line('/**');
    this.code.line(
      ` * Internal default implementation for {@link ${type.name}}.`,
    );
    this.code.line(' */');
    this.code.line(ANN_INTERNAL);
    this.code.openBlock(
      `interface ${INTERFACE_DEFAULT_CLASS_NAME} extends ${baseInterfaces
        .sort()
        .join(', ')}`,
    );

    for (const property of type.allProperties.filter(
      (prop) =>
        prop.abstract &&
        // Only checking the getter - java.lang.Object has no setters.
        !isJavaLangObjectMethodName(`get${jsiiToPascalCase(prop.name)}`) &&
        (prop.parentType.fqn === type.fqn ||
          !hasDefaultInterfaces(prop.assembly)),
    )) {
      this.emitProperty(type.spec, property.spec, {
        defaultImpl: true,
        overrides: type.isInterfaceType(),
      });
    }
    for (const method of type.allMethods.filter(
      (method) =>
        method.abstract &&
        !isJavaLangObjectMethodName(method.name) &&
        (method.parentType.fqn === type.fqn ||
          !hasDefaultInterfaces(method.assembly)),
    )) {
      this.emitMethod(type.spec, method.spec, {
        defaultImpl: true,
        overrides: type.isInterfaceType(),
      });
    }
    this.code.closeBlock();
  }

  private emitStabilityAnnotations(entity: spec.Documentable) {
    if (!entity.docs) {
      return;
    }
    if (entity.docs.stability) {
      this.code.line(
        `@software.amazon.jsii.Stability(software.amazon.jsii.Stability.Level.${_level(
          entity.docs.stability,
        )})`,
      );
    }
    if (
      entity.docs.stability === spec.Stability.Deprecated ||
      entity.docs.deprecated
    ) {
      this.code.line('@Deprecated');
    }

    function _level(stability: spec.Stability): string {
      switch (stability) {
        case spec.Stability.Deprecated:
          return 'Deprecated';
        case spec.Stability.Experimental:
          return 'Experimental';
        case spec.Stability.External:
          // Rendering 'External' out as publicly visible state is confusing. As far
          // as users are concerned we just advertise this as stable.
          return 'Stable';
        case spec.Stability.Stable:
          return 'Stable';
        default:
          throw new Error(`Unexpected stability: ${stability as any}`);
      }
    }
  }

  private toJavaProp(property: spec.Property, inherited: boolean): JavaProp {
    const safeName = JavaGenerator.safeJavaPropertyName(property.name);
    const propName = jsiiToPascalCase(safeName);

    return {
      docs: property.docs,
      spec: property,
      propName,
      jsiiName: property.name,
      nullable: !!property.optional,
      fieldName: this.code.toCamelCase(safeName),
      fieldJavaType: this.toJavaType(property.type),
      paramJavaType: this.toJavaType(property.type, { covariant: true }),
      fieldNativeType: this.toNativeType(property.type),
      fieldJavaClass: `${this.toJavaType(property.type, {
        forMarshalling: true,
      })}.class`,
      javaTypes: this.toJavaTypes(property.type, { covariant: true }),
      immutable: property.immutable ?? false,
      inherited,
    };
  }

  private emitClassBuilder(cls: spec.ClassType) {
    // Not rendering if there is no initializer, or if the initializer is protected or variadic
    if (cls.initializer == null || cls.initializer.protected) {
      return;
    }
    // Not rendering if the initializer has no parameters
    if (cls.initializer.parameters == null) {
      return;
    }
    // Not rendering if there is a nested "Builder" class
    if (
      this.reflectAssembly.tryFindType(`${cls.fqn}.${BUILDER_CLASS_NAME}`) !=
      null
    ) {
      return;
    }

    // Find the first struct parameter of the constructor (if any)
    const firstStruct = cls.initializer.parameters.find((param) => {
      if (!spec.isNamedTypeReference(param.type)) {
        return false;
      }
      const paramType = this.reflectAssembly.tryFindType(param.type.fqn);
      return paramType?.isDataType();
    });

    // Not rendering if there is no struct parameter
    if (firstStruct == null) {
      return;
    }

    const structType = this.reflectAssembly.findType(
      (firstStruct.type as spec.NamedTypeReference).fqn,
    ) as reflect.InterfaceType;
    const structParamName = this.code.toCamelCase(
      JavaGenerator.safeJavaPropertyName(firstStruct.name),
    );
    const structBuilder = `${this.toJavaType(
      firstStruct.type,
    )}.${BUILDER_CLASS_NAME}`;

    const positionalParams = cls.initializer.parameters
      .filter((p) => p !== firstStruct)
      .map((param) => ({
        param,
        fieldName: this.code.toCamelCase(
          JavaGenerator.safeJavaPropertyName(param.name),
        ),
        javaType: this.toJavaType(param.type),
      }));

    const builtType = this.toJavaType(cls);

    this.code.line();
    this.code.line('/**');
    // eslint-disable-next-line prettier/prettier
    this.code.line(
      ` * ${stabilityPrefixFor(
        cls.initializer,
      )}A fluent builder for {@link ${builtType}}.`,
    );
    this.code.line(' */');
    this.emitStabilityAnnotations(cls.initializer);
    this.code.openBlock(
      `public static final class ${BUILDER_CLASS_NAME} implements software.amazon.jsii.Builder<${builtType}>`,
    );

    // Static factory method(s)
    for (const params of computeOverrides(positionalParams)) {
      const dummyMethod: spec.Method = {
        docs: {
          stability: cls.initializer.docs?.stability ?? cls.docs?.stability,
          returns: `a new instance of {@link ${BUILDER_CLASS_NAME}}.`,
        },
        name: 'create',
        parameters: params.map((param) => param.param),
      };
      this.addJavaDocs(dummyMethod);
      this.emitStabilityAnnotations(cls.initializer);
      this.code.openBlock(
        `public static ${BUILDER_CLASS_NAME} create(${params
          .map(
            (param) =>
              `final ${param.javaType}${param.param.variadic ? '...' : ''} ${
                param.fieldName
              }`,
          )
          .join(', ')})`,
      );
      this.code.line(
        `return new ${BUILDER_CLASS_NAME}(${positionalParams
          .map((param, idx) => (idx < params.length ? param.fieldName : 'null'))
          .join(', ')});`,
      );
      this.code.closeBlock();
    }

    // Private properties
    this.code.line();
    for (const param of positionalParams) {
      this.code.line(
        `private final ${param.javaType}${param.param.variadic ? '[]' : ''} ${
          param.fieldName
        };`,
      );
    }
    this.code.line(
      `private ${
        firstStruct.optional ? '' : 'final '
      }${structBuilder} ${structParamName};`,
    );

    // Private constructor
    this.code.line();
    this.code.openBlock(
      `private ${BUILDER_CLASS_NAME}(${positionalParams
        .map(
          (param) =>
            `final ${param.javaType}${param.param.variadic ? '...' : ''} ${
              param.fieldName
            }`,
        )
        .join(', ')})`,
    );
    for (const param of positionalParams) {
      this.code.line(`this.${param.fieldName} = ${param.fieldName};`);
    }
    if (!firstStruct.optional) {
      this.code.line(`this.${structParamName} = new ${structBuilder}();`);
    }
    this.code.closeBlock();

    // Fields
    for (const prop of structType.allProperties) {
      const fieldName = this.code.toCamelCase(
        JavaGenerator.safeJavaPropertyName(prop.name),
      );
      this.code.line();
      const setter: spec.Method = {
        name: fieldName,
        docs: {
          ...prop.spec.docs,
          stability: prop.spec.docs?.stability,
          returns: '{@code this}',
        },
        parameters: [
          {
            name: fieldName,
            type: spec.CANONICAL_ANY, // We don't quite care in this context!
            docs: prop.spec.docs,
          },
        ],
      };
      for (const javaType of this.toJavaTypes(prop.type.spec!, {
        covariant: true,
      })) {
        this.addJavaDocs(setter);
        this.emitStabilityAnnotations(prop.spec);
        this.code.openBlock(
          `public ${BUILDER_CLASS_NAME} ${fieldName}(final ${javaType} ${fieldName})`,
        );
        this.code.line(
          `this.${structParamName}${
            firstStruct.optional ? '()' : ''
          }.${fieldName}(${fieldName});`,
        );
        this.code.line('return this;');
        this.code.closeBlock();
      }
    }

    // Final build method
    this.code.line();
    this.code.line('/**');
    this.code.line(
      ` * @returns a newly built instance of {@link ${builtType}}.`,
    );
    this.code.line(' */');
    this.emitStabilityAnnotations(cls.initializer);
    this.code.line('@Override');
    this.code.openBlock(`public ${builtType} build()`);
    const params = cls.initializer.parameters.map((param) => {
      if (param === firstStruct) {
        return firstStruct.optional
          ? `this.${structParamName} != null ? this.${structParamName}.build() : null`
          : `this.${structParamName}.build()`;
      }
      return `this.${
        positionalParams.find((p) => param === p.param)!.fieldName
      }`;
    });
    this.code.indent(`return new ${builtType}(`);
    params.forEach((param, idx) =>
      this.code.line(`${param}${idx < params.length - 1 ? ',' : ''}`),
    );
    this.code.unindent(');');
    this.code.closeBlock();

    // Optional builder initialization
    if (firstStruct.optional) {
      this.code.line();
      this.code.openBlock(`private ${structBuilder} ${structParamName}()`);
      this.code.openBlock(`if (this.${structParamName} == null)`);
      this.code.line(`this.${structParamName} = new ${structBuilder}();`);
      this.code.closeBlock();
      this.code.line(`return this.${structParamName};`);
      this.code.closeBlock();
    }
    this.code.closeBlock();
  }

  private emitBuilderSetter(
    prop: JavaProp,
    builderName: string,
    builtType: string,
  ) {
    for (const type of prop.javaTypes) {
      this.code.line();
      this.code.line('/**');
      this.code.line(
        ` * Sets the value of {@link ${builtType}#${getterFor(
          prop.fieldName,
        )}}`,
      );
      const summary = prop.docs?.summary ?? 'the value to be set';
      this.code.line(
        ` * ${paramJavadoc(prop.fieldName, prop.nullable, summary)}`,
      );
      if (prop.docs?.remarks != null) {
        const indent = ' '.repeat(7 + prop.fieldName.length);
        const remarks = markDownToJavaDoc(
          this.convertSamplesInMarkdown(prop.docs.remarks),
        ).trimRight();
        for (const line of remarks.split('\n')) {
          this.code.line(` * ${indent} ${line}`);
        }
      }
      this.code.line(' * @return {@code this}');
      if (prop.docs?.deprecated) {
        this.code.line(` * @deprecated ${prop.docs.deprecated}`);
      }
      this.code.line(' */');
      this.emitStabilityAnnotations(prop.spec);
      // We add an explicit cast if both types are generic but they are not identical (one is covariant, the other isn't)
      const explicitCast =
        type.includes('<') &&
        prop.fieldJavaType.includes('<') &&
        type !== prop.fieldJavaType
          ? `(${prop.fieldJavaType})`
          : '';
      if (explicitCast !== '') {
        // We'll be doing a safe, but unchecked cast, so suppress that warning
        this.code.line('@SuppressWarnings("unchecked")');
      }
      this.code.openBlock(
        `public ${builderName} ${prop.fieldName}(${type} ${prop.fieldName})`,
      );
      this.code.line(
        `this.${prop.fieldName} = ${explicitCast}${prop.fieldName};`,
      );
      this.code.line('return this;');
      this.code.closeBlock();
    }

    function getterFor(fieldName: string): string {
      const [first, ...rest] = fieldName;
      return `get${first.toUpperCase()}${rest.join('')}`;
    }
  }

  private emitInterfaceBuilder(
    classSpec: spec.InterfaceType,
    constructorName: string,
    props: JavaProp[],
  ) {
    // Start builder()
    this.code.line();
    this.code.line('/**');
    this.code.line(
      ` * @return a {@link ${BUILDER_CLASS_NAME}} of {@link ${classSpec.name}}`,
    );
    this.code.line(' */');
    this.emitStabilityAnnotations(classSpec);
    this.code.openBlock(`static ${BUILDER_CLASS_NAME} builder()`);
    this.code.line(`return new ${BUILDER_CLASS_NAME}();`);
    this.code.closeBlock();
    // End builder()

    // Start Builder
    this.code.line('/**');
    this.code.line(` * A builder for {@link ${classSpec.name}}`);
    this.code.line(' */');
    this.emitStabilityAnnotations(classSpec);
    this.code.openBlock(
      `public static final class ${BUILDER_CLASS_NAME} implements software.amazon.jsii.Builder<${classSpec.name}>`,
    );

    props.forEach((prop) =>
      this.code.line(`private ${prop.fieldJavaType} ${prop.fieldName};`),
    );
    props.forEach((prop) =>
      this.emitBuilderSetter(prop, BUILDER_CLASS_NAME, classSpec.name),
    );

    // Start build()
    this.code.line();
    this.code.line('/**');
    this.code.line(' * Builds the configured instance.');
    this.code.line(` * @return a new instance of {@link ${classSpec.name}}`);
    this.code.line(
      ' * @throws NullPointerException if any required attribute was not provided',
    );
    this.code.line(' */');
    this.emitStabilityAnnotations(classSpec);
    this.code.line('@Override');
    this.code.openBlock(`public ${classSpec.name} build()`);

    const propFields = props.map((prop) => prop.fieldName).join(', ');

    this.code.line(`return new ${constructorName}(${propFields});`);
    this.code.closeBlock();
    // End build()

    this.code.closeBlock();
    // End Builder
  }

  private emitDataType(ifc: spec.InterfaceType) {
    // collect all properties from all base structs and dedupe by name. It is assumed that the generation of the
    // assembly will not permit multiple overloaded inherited properties with the same name and that this will be
    // enforced by Typescript constraints.
    const propsByName: { [name: string]: JavaProp } = {};

    function collectProps(
      this: JavaGenerator,
      currentIfc: spec.InterfaceType,
      isBaseClass = false,
    ) {
      for (const property of currentIfc.properties ?? []) {
        const javaProp = this.toJavaProp(property, isBaseClass);
        propsByName[javaProp.propName] = javaProp;
      }

      // add props of base struct
      for (const base of currentIfc.interfaces ?? []) {
        collectProps.call(
          this,
          this.findType(base) as spec.InterfaceType,
          true,
        );
      }
    }

    collectProps.call(this, ifc);
    const props = Object.values(propsByName);
    this.emitInterfaceBuilder(ifc, INTERFACE_PROXY_CLASS_NAME, props);

    // Start implementation class
    this.code.line();
    this.code.line('/**');
    this.code.line(` * An implementation for {@link ${ifc.name}}`);
    this.code.line(' */');
    this.emitStabilityAnnotations(ifc);
    this.code.line(ANN_INTERNAL);
    this.code.openBlock(
      `final class ${INTERFACE_PROXY_CLASS_NAME} extends software.amazon.jsii.JsiiObject implements ${ifc.name}`,
    );

    // Immutable properties
    props.forEach((prop) =>
      this.code.line(`private final ${prop.fieldJavaType} ${prop.fieldName};`),
    );

    // Start JSII reference constructor
    this.code.line();
    this.code.line('/**');
    this.code.line(
      ' * Constructor that initializes the object based on values retrieved from the JsiiObject.',
    );
    this.code.line(' * @param objRef Reference to the JSII managed object.');
    this.code.line(' */');
    this.code.openBlock(
      `protected ${INTERFACE_PROXY_CLASS_NAME}(final software.amazon.jsii.JsiiObjectRef objRef)`,
    );
    this.code.line('super(objRef);');
    props.forEach((prop) =>
      this.code.line(
        `this.${prop.fieldName} = software.amazon.jsii.Kernel.get(this, "${prop.jsiiName}", ${prop.fieldNativeType});`,
      ),
    );
    this.code.closeBlock();
    // End JSII reference constructor

    // Start literal constructor
    this.code.line();
    this.code.line('/**');
    this.code.line(
      ' * Constructor that initializes the object based on literal property values passed by the {@link Builder}.',
    );
    this.code.line(' */');
    if (props.some((prop) => prop.fieldJavaType !== prop.paramJavaType)) {
      this.code.line('@SuppressWarnings("unchecked")');
    }
    const constructorArgs = props
      .map((prop) => `final ${prop.paramJavaType} ${prop.fieldName}`)
      .join(', ');
    this.code.openBlock(
      `protected ${INTERFACE_PROXY_CLASS_NAME}(${constructorArgs})`,
    );
    this.code.line(
      'super(software.amazon.jsii.JsiiObject.InitializationMode.JSII);',
    );
    props.forEach((prop) => {
      const explicitCast =
        prop.fieldJavaType !== prop.paramJavaType
          ? `(${prop.fieldJavaType})`
          : '';
      this.code.line(
        `this.${prop.fieldName} = ${explicitCast}${_validateIfNonOptional(
          prop.fieldName,
          prop,
        )};`,
      );
    });
    this.code.closeBlock();
    // End literal constructor

    // Getters
    props.forEach((prop) => {
      this.code.line();
      this.code.line('@Override');
      this.code.openBlock(
        `public final ${prop.fieldJavaType} get${prop.propName}()`,
      );
      this.code.line(`return this.${prop.fieldName};`);
      this.code.closeBlock();
    });

    // emit $jsii$toJson which will be called to serialize this object when sent to JS
    this.code.line();
    this.code.line('@Override');
    this.code.line(ANN_INTERNAL);
    this.code.openBlock(
      'public com.fasterxml.jackson.databind.JsonNode $jsii$toJson()',
    );
    this.code.line(
      'final com.fasterxml.jackson.databind.ObjectMapper om = software.amazon.jsii.JsiiObjectMapper.INSTANCE;',
    );
    this.code.line(
      `final com.fasterxml.jackson.databind.node.ObjectNode data = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();`,
    );

    this.code.line();
    for (const prop of props) {
      if (prop.nullable) {
        this.code.openBlock(`if (this.get${prop.propName}() != null)`);
      }
      this.code.line(
        `data.set("${prop.spec.name}", om.valueToTree(this.get${prop.propName}()));`,
      );
      if (prop.nullable) {
        this.code.closeBlock();
      }
    }

    this.code.line();
    this.code.line(
      'final com.fasterxml.jackson.databind.node.ObjectNode struct = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();',
    );
    this.code.line(`struct.set("fqn", om.valueToTree("${ifc.fqn}"));`);
    this.code.line('struct.set("data", data);');

    this.code.line();
    this.code.line(
      'final com.fasterxml.jackson.databind.node.ObjectNode obj = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();',
    );
    this.code.line('obj.set("$jsii.struct", struct);');

    this.code.line();
    this.code.line('return obj;');
    this.code.closeBlock();
    // End $jsii$toJson

    // Generate equals() override
    this.emitEqualsOverride(ifc.name, props);

    // Generate hashCode() override
    this.emitHashCodeOverride(props);

    this.code.closeBlock();
    // End implementation class

    function _validateIfNonOptional(variable: string, prop: JavaProp): string {
      if (prop.nullable) {
        return variable;
      }
      return `java.util.Objects.requireNonNull(${variable}, "${prop.fieldName} is required")`;
    }
  }

  private emitEqualsOverride(className: string, props: JavaProp[]) {
    // A class without properties does not need to override equals()
    if (props.length === 0) {
      return;
    }

    this.code.line();
    this.code.line('@Override');
    this.code.openBlock('public final boolean equals(final Object o)');
    this.code.line('if (this == o) return true;');

    // This was already checked by `super.equals(o)`, so we skip it here...
    this.code.line(
      'if (o == null || getClass() != o.getClass()) return false;',
    );

    this.code.line();
    this.code.line(
      `${className}.${INTERFACE_PROXY_CLASS_NAME} that = (${className}.${INTERFACE_PROXY_CLASS_NAME}) o;`,
    );
    this.code.line();

    const initialProps = props.slice(0, props.length - 1);
    const finalProp = props[props.length - 1];

    initialProps.forEach((prop) => {
      const predicate = prop.nullable
        ? `this.${prop.fieldName} != null ? !this.${prop.fieldName}.equals(that.${prop.fieldName}) : that.${prop.fieldName} != null`
        : `!${prop.fieldName}.equals(that.${prop.fieldName})`;

      this.code.line(`if (${predicate}) return false;`);
    });

    // The final (returned predicate) is the inverse of the other ones
    const finalPredicate = finalProp.nullable
      ? `this.${finalProp.fieldName} != null ? this.${finalProp.fieldName}.equals(that.${finalProp.fieldName}) : ` +
        `that.${finalProp.fieldName} == null`
      : `this.${finalProp.fieldName}.equals(that.${finalProp.fieldName})`;
    this.code.line(`return ${finalPredicate};`);

    this.code.closeBlock();
  }

  private emitHashCodeOverride(props: JavaProp[]) {
    // A class without properties does not need to override hashCode()
    if (props.length === 0) {
      return;
    }

    this.code.line();
    this.code.line('@Override');
    this.code.openBlock('public final int hashCode()');

    const firstProp = props[0];
    const remainingProps = props.slice(1);

    this.code.line(`int result = ${_hashCodeForProp(firstProp)};`);
    remainingProps.forEach((prop) =>
      this.code.line(`result = 31 * result + (${_hashCodeForProp(prop)});`),
    );
    this.code.line('return result;');
    this.code.closeBlock();

    function _hashCodeForProp(prop: JavaProp) {
      return prop.nullable
        ? `this.${prop.fieldName} != null ? this.${prop.fieldName}.hashCode() : 0`
        : `this.${prop.fieldName}.hashCode()`;
    }
  }

  private openFileIfNeeded(type: spec.Type) {
    if (this.isNested(type)) {
      return;
    }

    this.code.openFile(this.toJavaFilePath(this.assembly, type));
    this.code.line(
      `package ${this.toNativeName(this.assembly, type).packageName};`,
    );
    this.code.line();
  }

  private closeFileIfNeeded(type: spec.Type) {
    if (this.isNested(type)) {
      return;
    }
    this.code.closeFile(this.toJavaFilePath(this.assembly, type));
  }

  private isNested(type: spec.Type) {
    if (!this.assembly.types || !type.namespace) {
      return false;
    }
    const parent = `${type.assembly}.${type.namespace}`;
    return parent in this.assembly.types;
  }

  private toJavaFilePath(assm: spec.Assembly, fqn: string): string;
  private toJavaFilePath(assm: spec.Assembly, type: spec.Type): string;
  private toJavaFilePath(assm: spec.Assembly, what: spec.Type | string) {
    const fqn = typeof what === 'string' ? what : what.fqn;
    const { packageName, typeNames } = translateFqn(assm, fqn);

    if (typeNames.length === 0) {
      throw new Error(
        `toJavaFilePath: ${fqn} must indicate a type, but doesn't: ${JSON.stringify(
          { packageName, typeNames },
        )}`,
      );
    }

    return `${path.join(
      'src',
      'main',
      'java',
      ...packageName.split('.'),
      typeNames[0],
    )}.java`;
  }

  private toJavaResourcePath(assm: spec.Assembly, fqn: string, ext = '.txt') {
    const { packageName, typeName } = this.toNativeName(assm, {
      fqn,
      kind: spec.TypeKind.Class,
      assembly: assm.name,
      name: fqn.replace(/.*\.([^.]+)$/, '$1'),
    });

    const parts = [
      ...packageName.split('.'),
      `${typeName.split('.')[0]}${ext}`,
    ];
    // Resource names are /-delimited paths (even on Windows *wink wink*)
    const name = parts.join('/');
    const filePath = path.join('src', 'main', 'resources', ...parts);

    return { filePath, name };
  }

  // eslint-disable-next-line complexity
  private addJavaDocs(doc: spec.Documentable, defaultText?: string) {
    if (
      !defaultText &&
      Object.keys(doc.docs ?? {}).length === 0 &&
      !((doc as spec.Method).parameters ?? []).some(
        (p) => Object.keys(p.docs ?? {}).length !== 0,
      )
    ) {
      return;
    }

    const docs = (doc.docs = doc.docs ?? {});

    const paras = [];

    if (docs.summary) {
      paras.push(renderSummary(docs));
    } else if (defaultText) {
      paras.push(defaultText);
    }

    if (docs.remarks) {
      paras.push(
        markDownToJavaDoc(
          this.convertSamplesInMarkdown(docs.remarks),
        ).trimRight(),
      );
    }

    if (docs.default) {
      paras.push(`Default: ${docs.default}`); // NOTE: there is no annotation in JavaDoc for this
    }

    if (docs.example) {
      paras.push('Example:');
      paras.push(
        `<blockquote><pre>{@code\n${this.convertExample(
          docs.example,
        )}}</pre></blockquote>`,
      );
    }

    const tagLines = [];

    if (docs.returns) {
      tagLines.push(`@return ${docs.returns}`);
    }
    if (docs.see) {
      tagLines.push(`@see ${docs.see}`);
    }
    if (docs.deprecated) {
      tagLines.push(`@deprecated ${docs.deprecated}`);
    }

    // Params
    if ((doc as spec.Method).parameters) {
      const method = doc as spec.Method;
      if (method.parameters) {
        for (const param of method.parameters) {
          const summary = param.docs?.summary;
          tagLines.push(paramJavadoc(param.name, param.optional, summary));
        }
      }
    }

    if (tagLines.length > 0) {
      paras.push(tagLines.join('\n'));
    }

    const lines = new Array<string>();
    for (const para of paras) {
      if (lines.length > 0) {
        lines.push('<p>');
      }
      lines.push(...para.split('\n').filter((l) => l !== ''));
    }

    this.code.line('/**');
    for (const line of lines) {
      this.code.line(` * ${line}`);
    }
    this.code.line(' */');
  }

  private getClassBase(cls: spec.ClassType) {
    if (!cls.base) {
      return 'software.amazon.jsii.JsiiObject';
    }

    return this.toJavaType({ fqn: cls.base });
  }

  private toDecoratedJavaType(
    optionalValue: spec.OptionalValue,
    { covariant = false } = {},
  ): string {
    const result = this.toDecoratedJavaTypes(optionalValue, { covariant });
    if (result.length > 1) {
      return `${
        optionalValue.optional ? ANN_NULLABLE : ANN_NOT_NULL
      } java.lang.Object`;
    }
    return result[0];
  }

  private toDecoratedJavaTypes(
    optionalValue: spec.OptionalValue,
    { covariant = false } = {},
  ): string[] {
    return this.toJavaTypes(optionalValue.type, { covariant }).map(
      (nakedType) =>
        `${optionalValue.optional ? ANN_NULLABLE : ANN_NOT_NULL} ${nakedType}`,
    );
  }

  private toJavaType(
    type: spec.TypeReference,
    opts?: { forMarshalling?: boolean; covariant?: boolean },
  ): string {
    const types = this.toJavaTypes(type, opts);
    if (types.length > 1) {
      return 'java.lang.Object';
    }
    return types[0];
  }

  private toNativeType(
    type: spec.TypeReference,
    { forMarshalling = false, covariant = false } = {},
  ): string {
    if (spec.isCollectionTypeReference(type)) {
      const nativeElementType = this.toNativeType(type.collection.elementtype, {
        forMarshalling,
        covariant,
      });
      switch (type.collection.kind) {
        case spec.CollectionKind.Array:
          return `software.amazon.jsii.NativeType.listOf(${nativeElementType})`;
        case spec.CollectionKind.Map:
          return `software.amazon.jsii.NativeType.mapOf(${nativeElementType})`;
        default:
          throw new Error(
            `Unsupported collection kind: ${type.collection.kind as any}`,
          );
      }
    }
    return `software.amazon.jsii.NativeType.forClass(${this.toJavaType(type, {
      forMarshalling,
      covariant,
    })}.class)`;
  }

  private toJavaTypes(
    typeref: spec.TypeReference,
    { forMarshalling = false, covariant = false } = {},
  ): string[] {
    if (spec.isPrimitiveTypeReference(typeref)) {
      return [this.toJavaPrimitive(typeref.primitive)];
    } else if (spec.isCollectionTypeReference(typeref)) {
      return [this.toJavaCollection(typeref, { forMarshalling, covariant })];
    } else if (spec.isNamedTypeReference(typeref)) {
      return [this.toNativeFqn(typeref.fqn)];
    } else if (typeref.union) {
      const types = new Array<string>();
      for (const subtype of typeref.union.types) {
        for (const t of this.toJavaTypes(subtype, {
          forMarshalling,
          covariant,
        })) {
          types.push(t);
        }
      }
      return types;
    }
    throw new Error(`Invalid type reference: ${JSON.stringify(typeref)}`);
  }

  private toJavaCollection(
    ref: spec.CollectionTypeReference,
    {
      forMarshalling,
      covariant,
    }: { forMarshalling: boolean; covariant: boolean },
  ) {
    const elementJavaType = this.toJavaType(ref.collection.elementtype, {
      covariant,
    });
    const typeConstraint = covariant
      ? makeCovariant(elementJavaType)
      : elementJavaType;
    switch (ref.collection.kind) {
      case spec.CollectionKind.Array:
        return forMarshalling
          ? 'java.util.List'
          : `java.util.List<${typeConstraint}>`;
      case spec.CollectionKind.Map:
        return forMarshalling
          ? 'java.util.Map'
          : `java.util.Map<java.lang.String, ${typeConstraint}>`;
      default:
        throw new Error(
          `Unsupported collection kind: ${ref.collection.kind as any}`,
        );
    }

    function makeCovariant(javaType: string): string {
      // Don't emit a covariant expression for String (it's `final` in Java)
      if (javaType === 'java.lang.String') {
        return javaType;
      }
      return `? extends ${javaType}`;
    }
  }

  private toJavaPrimitive(primitive: spec.PrimitiveType) {
    switch (primitive) {
      case spec.PrimitiveType.Boolean:
        return 'java.lang.Boolean';
      case spec.PrimitiveType.Date:
        return 'java.time.Instant';
      case spec.PrimitiveType.Json:
        return 'com.fasterxml.jackson.databind.node.ObjectNode';
      case spec.PrimitiveType.Number:
        return 'java.lang.Number';
      case spec.PrimitiveType.String:
        return 'java.lang.String';
      case spec.PrimitiveType.Any:
        return 'java.lang.Object';
      default:
        throw new Error(`Unknown primitive type: ${primitive as any}`);
    }
  }

  private renderMethodCallArguments(method: spec.Callable) {
    if (!method.parameters || method.parameters.length === 0) {
      return '';
    }
    const regularParams = method.parameters.filter((p) => !p.variadic);
    const values = regularParams.map(_renderParameter);
    const valueStr = `new Object[] { ${values.join(', ')} }`;
    if (method.variadic) {
      const valuesStream = `java.util.Arrays.<Object>stream(${valueStr})`;

      const lastParam = method.parameters[method.parameters.length - 1];
      const restStream = `java.util.Arrays.<Object>stream(${lastParam.name})`;

      const fullStream =
        regularParams.length > 0
          ? `java.util.stream.Stream.concat(${valuesStream}, ${restStream})`
          : restStream;
      return `, ${fullStream}.toArray(Object[]::new)`;
    }
    return `, ${valueStr}`;

    function _renderParameter(param: spec.Parameter) {
      const safeName = JavaGenerator.safeJavaPropertyName(param.name);
      return isNullable(param)
        ? safeName
        : `java.util.Objects.requireNonNull(${safeName}, "${safeName} is required")`;
    }
  }

  private renderMethodCall(
    cls: spec.TypeReference,
    method: spec.Method,
    async: boolean,
  ) {
    let statement = '';

    if (method.static) {
      const javaClass = this.toJavaType(cls);
      statement += `software.amazon.jsii.JsiiObject.jsiiStaticCall(${javaClass}.class, `;
    } else {
      statement += `software.amazon.jsii.Kernel.${
        async ? 'asyncCall' : 'call'
      }(this, `;
    }

    statement += `"${method.name}"`;

    if (method.returns) {
      statement += `, ${this.toNativeType(method.returns.type, {
        forMarshalling: true,
      })}`;
    } else {
      statement += ', software.amazon.jsii.NativeType.VOID';
    }
    statement += `${this.renderMethodCallArguments(method)})`;

    if (method.returns) {
      statement = this.wrapCollection(
        statement,
        method.returns.type,
        method.returns.optional,
      );
    }

    if (method.returns) {
      return `return ${statement};`;
    }
    return `${statement};`;
  }

  /**
   * Wraps a collection into an unmodifiable collection else returns the existing statement.
   * @param statement The statement to wrap if necessary.
   * @param type The type of the object to wrap.
   * @param optional Whether the value is optional (can be null/undefined) or not.
   * @returns The modified or original statement.
   */
  private wrapCollection(
    statement: string,
    type: spec.TypeReference,
    optional?: boolean,
  ): string {
    if (spec.isCollectionTypeReference(type)) {
      let wrapper: string;
      switch (type.collection.kind) {
        case spec.CollectionKind.Array:
          wrapper = 'unmodifiableList';
          break;
        case spec.CollectionKind.Map:
          wrapper = 'unmodifiableMap';
          break;
        default:
          throw new Error(
            `Unsupported collection kind: ${type.collection.kind as any}`,
          );
      }
      // In the case of "optional", the value needs ot be explicitly cast to allow for cases where the raw type was returned.
      return optional
        ? `java.util.Optional.ofNullable((${this.toJavaType(
            type,
          )})(${statement})).map(java.util.Collections::${wrapper}).orElse(null)`
        : `java.util.Collections.${wrapper}(${statement})`;
    }

    return statement;
  }

  private renderMethodParameters(method: spec.Callable) {
    const params = [];
    if (method.parameters) {
      for (const p of method.parameters) {
        // We can render covariant parameters only for methods that aren't overridable... so only for static methods currently.
        params.push(
          `final ${this.toDecoratedJavaType(p, {
            covariant: (method as spec.Method).static,
          })}${p.variadic ? '...' : ''} ${JavaGenerator.safeJavaPropertyName(
            p.name,
          )}`,
        );
      }
    }
    return params.join(', ');
  }

  private renderAccessLevel(method: spec.Callable | spec.Property) {
    return method.protected ? 'protected' : 'public';
  }

  private makeModuleClass(moduleName: string) {
    return `${this.toNativeFqn(moduleName)}.${MODULE_CLASS_NAME}`;
  }

  private emitModuleFile(mod: spec.Assembly) {
    const moduleName = mod.name;
    const moduleClass = this.makeModuleClass(moduleName);

    const { filePath: moduleResFile, name: moduleResName } =
      this.toJavaResourcePath(mod, `${mod.name}.${MODULE_CLASS_NAME}`);
    this.code.openFile(moduleResFile);
    for (const fqn of Object.keys(this.assembly.types ?? {})) {
      this.code.line(`${fqn}=${this.toNativeFqn(fqn, { binaryName: true })}`);
    }
    this.code.closeFile(moduleResFile);

    const moduleFile = this.toJavaFilePath(mod, {
      assembly: mod.name,
      fqn: `${mod.name}.${MODULE_CLASS_NAME}`,
      kind: spec.TypeKind.Class,
      name: MODULE_CLASS_NAME,
    });

    this.code.openFile(moduleFile);
    this.code.line(`package ${this.toNativeName(mod).packageName};`);
    this.code.line();
    if (Object.keys(mod.dependencies ?? {}).length > 0) {
      this.code.line('import static java.util.Arrays.asList;');
      this.code.line();
    }
    this.code.line('import java.io.BufferedReader;');
    this.code.line('import java.io.InputStream;');
    this.code.line('import java.io.InputStreamReader;');
    this.code.line('import java.io.IOException;');
    this.code.line('import java.io.Reader;');
    this.code.line('import java.io.UncheckedIOException;');
    this.code.line();
    this.code.line('import java.nio.charset.StandardCharsets;');
    this.code.line();
    this.code.line('import java.util.HashMap;');
    if (Object.keys(mod.dependencies ?? {}).length > 0) {
      this.code.line('import java.util.List;');
    }
    this.code.line('import java.util.Map;');
    this.code.line();
    this.code.line('import software.amazon.jsii.JsiiModule;');
    this.code.line();

    this.code.line(ANN_INTERNAL);
    this.code.openBlock(
      `public final class ${MODULE_CLASS_NAME} extends JsiiModule`,
    );
    this.code.line(
      'private static final Map<String, String> MODULE_TYPES = load();',
    );
    this.code.line();

    this.code.openBlock('private static Map<String, String> load()');
    this.code.line('final Map<String, String> result = new HashMap<>();');
    this.code.line(
      `final ClassLoader cl = ${MODULE_CLASS_NAME}.class.getClassLoader();`,
    );
    this.code.line(
      `try (final InputStream is = cl.getResourceAsStream("${moduleResName}");`,
    );
    this.code.line(
      '     final Reader rd = new InputStreamReader(is, StandardCharsets.UTF_8);',
    );
    this.code.openBlock(
      '     final BufferedReader br = new BufferedReader(rd))',
    );
    this.code.line('br.lines()');
    this.code.line('  .filter(line -> !line.trim().isEmpty())');
    this.code.openBlock('  .forEach(line -> ');
    this.code.line('final String[] parts = line.split("=", 2);');
    this.code.line('final String fqn = parts[0];');
    this.code.line('final String className = parts[1];');
    this.code.line('result.put(fqn, className);');
    this.code.unindent('});'); // Proxy for closeBlock
    this.code.closeBlock();
    this.code.openBlock('catch (final IOException exception)');
    this.code.line('throw new UncheckedIOException(exception);');
    this.code.closeBlock();
    this.code.line('return result;');
    this.code.closeBlock();
    this.code.line();

    this.code.line(
      'private final Map<String, Class<?>> cache = new HashMap<>();',
    );
    this.code.line();

    // ctor
    this.code.openBlock(`public ${MODULE_CLASS_NAME}()`);
    this.code.line(
      `super("${moduleName}", "${
        mod.version
      }", ${MODULE_CLASS_NAME}.class, "${this.getAssemblyFileName()}");`,
    );
    this.code.closeBlock(); // ctor

    // dependencies
    if (mod.dependencies && Object.keys(mod.dependencies).length > 0) {
      const deps = [];
      for (const dep of Object.keys(mod.dependencies)) {
        deps.push(`${this.makeModuleClass(dep)}.class`);
      }

      this.code.line();
      this.code.line('@Override');
      this.code.openBlock(
        'public List<Class<? extends JsiiModule>> getDependencies()',
      );
      this.code.line(`return asList(${deps.join(', ')});`);
      this.code.closeBlock();
    }

    this.code.line();
    this.code.line('@Override');
    this.code.openBlock(
      'protected Class<?> resolveClass(final String fqn) throws ClassNotFoundException',
    );
    this.code.openBlock('if (!MODULE_TYPES.containsKey(fqn))');
    this.code.line(
      'throw new ClassNotFoundException("Unknown JSII type: " + fqn);',
    );
    this.code.closeBlock();
    this.code.line('String className = MODULE_TYPES.get(fqn);');
    this.code.openBlock('if (!this.cache.containsKey(className))');
    this.code.line('this.cache.put(className, this.findClass(className));');
    this.code.closeBlock();
    this.code.line('return this.cache.get(className);');
    this.code.closeBlock();
    this.code.line();
    this.code.openBlock('private Class<?> findClass(final String binaryName)');
    this.code.openBlock('try');
    this.code.line('return Class.forName(binaryName);');
    this.code.closeBlock();
    this.code.openBlock('catch (final ClassNotFoundException exception)');
    this.code.line('throw new RuntimeException(exception);');
    this.code.closeBlock();
    this.code.closeBlock();

    this.code.closeBlock();

    this.code.closeFile(moduleFile);

    return moduleClass;
  }

  private emitJsiiInitializers(cls: spec.ClassType) {
    this.code.line();
    this.code.openBlock(
      `protected ${cls.name}(final software.amazon.jsii.JsiiObjectRef objRef)`,
    );
    this.code.line('super(objRef);');
    this.code.closeBlock();

    this.code.line();
    this.code.openBlock(
      `protected ${cls.name}(final software.amazon.jsii.JsiiObject.InitializationMode initializationMode)`,
    );
    this.code.line('super(initializationMode);');
    this.code.closeBlock();
  }

  /**
   * Computes the java FQN for a JSII FQN:
   * 1. Determine which assembly the FQN belongs to (first component of the FQN)
   * 2. Locate the `targets.java.package` value for that assembly (this assembly, or one of the dependencies)
   * 3. Return the java FQN: ``<module.targets.java.package>.<FQN stipped of first component>``
   *
   * Records an assembly reference if the referenced FQN comes from a different assembly.
   *
   * @param fqn the JSII FQN to be used.
   *
   * @returns the corresponding Java FQN.
   *
   * @throws if the assembly the FQN belongs to does not have a `targets.java.package` set.
   */
  private toNativeFqn(
    fqn: string,
    { binaryName }: { binaryName: boolean } = { binaryName: false },
  ): string {
    const [mod] = fqn.split('.');
    const depMod = this.findModule(mod);
    // Make sure any dependency (direct or transitive) of which any type is explicitly referenced by the generated
    // code is included in the generated POM's dependencies section (protecting the artifact from changes in the
    // dependencies' dependency structure).
    if (mod !== this.assembly.name) {
      this.referencedModules[mod] = depMod;

      const translated = translateFqn({ ...depMod, name: mod }, fqn);
      return [translated.packageName, ...translated.typeNames].join('.');
    }

    const { packageName, typeName } =
      fqn === this.assembly.name
        ? this.toNativeName(this.assembly)
        : this.toNativeName(this.assembly, this.assembly.types![fqn]);
    const className =
      typeName && binaryName ? typeName.replace('.', '$') : typeName;
    return `${packageName}${className ? `.${className}` : ''}`;
  }

  /**
   * Computes Java name for a jsii assembly or type.
   *
   * @param assm The assembly that contains the type
   * @param type The type we want the name of
   */
  private toNativeName(assm: spec.Assembly): {
    packageName: string;
    typeName: undefined;
  };
  private toNativeName(
    assm: spec.Assembly,
    type: spec.Type,
  ): { packageName: string; typeName: string };
  private toNativeName(
    assm: spec.Assembly,
    type?: spec.Type,
  ): { packageName: string; typeName?: string } {
    if (!type) {
      return { packageName: packageNameFromAssembly(assm) };
    }

    const translated = translateFqn(assm, type.fqn);
    return {
      packageName: translated.packageName,
      typeName: translated.typeNames.join('.'),
    };
  }

  /**
   * Emits an ``@Generated`` annotation honoring the ``this.emitFullGeneratorInfo`` setting.
   */
  private emitGeneratedAnnotation() {
    const date = this.emitFullGeneratorInfo
      ? `, date = "${new Date().toISOString()}"`
      : '';
    const generator = this.emitFullGeneratorInfo
      ? `jsii-pacmak/${VERSION_DESC}`
      : 'jsii-pacmak';
    this.code.line(
      `@javax.annotation.Generated(value = "${generator}"${date})`,
    );
  }

  private convertExample(example: string): string {
    const snippet = typeScriptSnippetFromSource(
      example,
      'example',
      enforcesStrictMode(this.assembly),
    );
    const translated = this.rosetta.translateSnippet(
      snippet,
      TargetLanguage.JAVA,
    );
    if (!translated) {
      return example;
    }
    return this.prefixDisclaimer(translated);
  }

  private convertSamplesInMarkdown(markdown: string): string {
    return this.rosetta.translateSnippetsInMarkdown(
      markdown,
      TargetLanguage.JAVA,
      enforcesStrictMode(this.assembly),
      (trans) => ({
        language: trans.language,
        source: this.prefixDisclaimer(trans),
      }),
    );
  }

  private prefixDisclaimer(translated: Translation) {
    if (translated.didCompile && INCOMPLETE_DISCLAIMER_COMPILING) {
      return `// ${INCOMPLETE_DISCLAIMER_COMPILING}\n${translated.source}`;
    }
    if (!translated.didCompile && INCOMPLETE_DISCLAIMER_NONCOMPILING) {
      return `// ${INCOMPLETE_DISCLAIMER_NONCOMPILING}\n${translated.source}`;
    }
    return translated.source;
  }

  /**
   * Fins the Java FQN of the default implementation interfaces that should be implemented when a new
   * default interface or proxy class is being emitted.
   *
   * @param type the type for which a default interface or proxy is emitted.
   * @param includeThisType whether this class's default interface should be included or not.
   *
   * @returns a list of Java fully qualified class names.
   */
  private defaultInterfacesFor(
    type: reflect.ClassType | reflect.InterfaceType,
    { includeThisType = false }: { includeThisType?: boolean } = {},
  ): string[] {
    const result = new Set<string>();

    if (
      includeThisType &&
      hasDefaultInterfaces(type.assembly) &&
      type.isInterfaceType()
    ) {
      result.add(
        `${this.toNativeFqn(type.fqn)}.${INTERFACE_DEFAULT_CLASS_NAME}`,
      );
    } else {
      for (const iface of type.interfaces) {
        if (hasDefaultInterfaces(iface.assembly)) {
          result.add(
            `${this.toNativeFqn(iface.fqn)}.${INTERFACE_DEFAULT_CLASS_NAME}`,
          );
        } else {
          for (const item of this.defaultInterfacesFor(iface)) {
            result.add(item);
          }
        }
      }
      if (type.isClassType() && type.base != null) {
        for (const item of this.defaultInterfacesFor(type.base)) {
          result.add(item);
        }
      }
    }

    return Array.from(result);
  }
}

/**
 * This models the POM schema for a <dependency> entity
 * @see https://maven.apache.org/pom.html#Dependencies
 */
interface MavenDependency {
  groupId: string;
  artifactId: string;
  version: string;

  type?: string;
  scope?: 'compile' | 'provided' | 'runtime' | 'test' | 'system';
  systemPath?: string;
  optional?: boolean;

  '#comment'?: string;
}

/**
 * Looks up the `@jsii/java-runtime` package from the local repository.
 * If it contains a "maven-repo" directory, it will be added as a local maven repo
 * so when we build locally, we build against it and not against the one published
 * to Maven Central.
 */
function findJavaRuntimeLocalRepository() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-require-imports,import/no-extraneous-dependencies
    const javaRuntime = require('@jsii/java-runtime');
    logging.info(
      `Using local version of the Java jsii runtime package at: ${javaRuntime.repository}`,
    );
    return javaRuntime.repository;
  } catch {
    return undefined;
  }
}

function isNullable(optionalValue: spec.OptionalValue | undefined): boolean {
  if (!optionalValue) {
    return false;
  }
  return (
    optionalValue.optional ||
    (spec.isPrimitiveTypeReference(optionalValue.type) &&
      optionalValue.type.primitive === spec.PrimitiveType.Any)
  );
}

function paramJavadoc(
  name: string,
  optional?: boolean,
  summary?: string,
): string {
  const parts = ['@param', name];
  if (summary) {
    parts.push(endWithPeriod(summary));
  }
  if (!optional) {
    parts.push('This parameter is required.');
  }

  return parts.join(' ');
}

function endWithPeriod(s: string): string {
  s = s.trimRight();
  if (!s.endsWith('.')) {
    return `${s}.`;
  }
  return s;
}

function computeOverrides<T extends { param: spec.Parameter }>(
  allParams: T[],
): Iterable<T[]> {
  return {
    [Symbol.iterator]: function* () {
      yield allParams;
      while (allParams.length > 0) {
        const lastParam = allParams[allParams.length - 1];
        if (!lastParam.param.variadic && !lastParam.param.optional) {
          // Neither variadic nor optional -- we're done here!
          return;
        }
        allParams = allParams.slice(0, allParams.length - 1);
        // If the lastParam was variadic, we shouldn't generate an override without it only.
        if (lastParam.param.optional) {
          yield allParams;
        }
      }
    },
  };
}

type AssemblyLike = spec.AssemblyConfiguration & { name: string };

/**
 * Return the native package name from an assembly
 */
function packageNameFromAssembly(assm: AssemblyLike) {
  const javaPackage = assm.targets?.java?.package;
  if (!javaPackage) {
    throw new Error(
      `The module ${assm.name} does not have a java.package setting`,
    );
  }
  return javaPackage;
}

/**
 * Analyzes and translates a jsii FQN to Java components
 *
 * The FQN can be of the assembly, a submodule, or a type.
 *
 * Any type can have the following characteristics:
 *
 * - Located in zero or more nested submodules. Any of these can have a Java
 *   package name assigned--if none, the name is automatically determined by
 *   snake casing. At least the assembly must have a Java package name assigned.
 * - Located in zero or more nested types (classes).
 *
 * Find up the set of namespaces until we find a submodule (or the assembly
 * itself) that has an explicit Java package name defined.
 *
 * Append all the namespaces that we crossed that didn't have a package name defined.
 *
 * Returns the Java package name determined this way, as well as the hierarchy of type
 * names inside the package. `typeNames` may be missing or empty if the FQN indicated
 * the assembly or a submodule, contains 1 element if the FQN indicated a top-level type,
 * multiple elements if the FQN indicated a nested type.
 */
function translateFqn(
  assm: AssemblyLike,
  originalFqn: string,
): { packageName: string; typeNames: string[] } {
  const implicitPackageNames = new Array<string>();
  const typeNames = new Array<string>();

  // We work ourselves upward through the FQN until we've found an explicit package
  let packageName = packageNameFromAssembly(assm);
  let fqn = originalFqn;
  while (fqn !== '' && fqn !== assm.name) {
    const [parentFqn, lastPart] = splitNamespace(fqn);

    const submodule = assm.submodules?.[fqn];
    if (submodule) {
      const explicitPackage = submodule.targets?.java?.package;
      if (explicitPackage) {
        packageName = explicitPackage;
        // We can stop recursing, types cannot be the parent of a module and nothing upwards can change
        // the package name anymore
        break;
      }
      implicitPackageNames.unshift(`.${toSnakeCase(lastPart)}`);
    } else {
      // If it's not a submodule, it must be a type.
      typeNames.unshift(lastPart);
    }

    fqn = parentFqn;
  }
  if (fqn === '') {
    throw new Error(`Could not find '${originalFqn}' inside '${assm.name}'`);
  }
  return {
    packageName: `${packageName}${implicitPackageNames.join('')}`,
    typeNames,
  };
}

/**
 * Determines whether the provided assembly exposes the "hasDefaultInterfaces"
 * jsii-pacmak feature flag.
 *
 * @param assembly the assembly that is tested
 *
 * @returns true if the Jsii$Default interfaces can be used
 */
function hasDefaultInterfaces(assembly: reflect.Assembly): boolean {
  return !!assembly.metadata?.jsii?.pacmak?.hasDefaultInterfaces;
}

/**
 * Whecks whether a name corresponds to a method on `java.lang.Object`. It is not
 * possible to emit default interface implementation for those names because
 * these would always be replaced by the implementations on `Object`.
 *
 * @param name the checked name
 *
 * @returns `true` if a default implementation cannot be generated for this name.
 */
function isJavaLangObjectMethodName(name: string): boolean {
  return JAVA_LANG_OBJECT_METHOD_NAMES.has(name);
}
const JAVA_LANG_OBJECT_METHOD_NAMES = new Set([
  'clone',
  'equals',
  'finalize',
  'getClass',
  'hashCode',
  'notify',
  'notifyAll',
  'toString',
  'wait',
]);

/**
 * In a dotted string, strip off the last dotted component
 */
function splitNamespace(ns: string): [string, string] {
  const dot = ns.lastIndexOf('.');
  if (dot === -1) {
    return ['', ns];
  }
  return [ns.substr(0, dot), ns.substr(dot + 1)];
}
