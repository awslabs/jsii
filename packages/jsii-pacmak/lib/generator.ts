import * as spec from '@jsii/spec';
import * as clone from 'clone';
import { CodeMaker } from 'codemaker';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as reflect from 'jsii-reflect';
import * as path from 'path';

import { VERSION_DESC } from './version';

/**
 * Options for the code generator framework.
 */
export interface GeneratorOptions {
  /**
   * If this property is set to 'true', union properties are "expanded" into multiple
   * properties, each with a different type and a postfix based on the type name. This
   * can be used by languages that don't have support for union types (e.g. Java).
   */
  expandUnionProperties?: boolean;

  /**
   * If this property is set to 'true', methods that have optional arguments are duplicated
   * and overloads are created with all parameters.
   */
  generateOverloadsForMethodWithOptionals?: boolean;

  /**
   * If this property is set, the generator will add "Base" to abstract class names
   */
  addBasePostfixToAbstractClassNames?: boolean;
}

export interface IGenerator {
  /**
   *
   * @param fingerprint
   */
  generate(fingerprint: boolean): void;

  /**
   * Load a module into the generator.
   * @param packageDir is the root directory of the module.
   */
  load(packageDir: string, assembly: reflect.Assembly): void;

  /**
   * Determine if the generated artifacts for this generator are already up-to-date.
   * @param outDir the directory where generated artifacts would be placed.
   * @return ``true`` if no generation is necessary
   */
  upToDate(outDir: string): Promise<boolean>;
  save(outdir: string, tarball: string): Promise<any>;
}

export abstract class GeneratorBase implements IGenerator {
  public constructor(protected readonly options: GeneratorOptions = {}) {}

  public abstract generate(fingerprint: boolean): void;
  public abstract load(packageDir: string, assembly: reflect.Assembly): void;
  public abstract async upToDate(outDir: string): Promise<boolean>;
  public abstract async save(outdir: string, tarball: string): Promise<any>;

  protected calculateFingerprint(assembly: reflect.Assembly): string {
    return crypto
      .createHash('sha256')
      .update(VERSION_DESC)
      .update('\0')
      .update(assembly.fingerprint)
      .digest('base64');
  }

  /**
   * Returns the file name of the assembly resource as it is going to be saved.
   */
  protected getAssemblyArchiveFileName(assembly: reflect.Assembly): string {
    let name = assembly.name;
    const parts = name.split('/');

    if (parts.length === 1) {
      name = parts[0];
    } else if (parts.length === 2 && parts[0].startsWith('@')) {
      name = parts[1];
    } else {
      throw new Error(
        'Malformed assembly name. Expecting either <name> or @<scope>/<name>',
      );
    }

    return `${name}@${assembly.version}.jsii.tgz`;
  }
}

/**
 * Abstract base class for jsii package generators.
 * Given a jsii module, it will invoke "events" to emit various elements.
 */
export abstract class Generator extends GeneratorBase {
  private readonly excludeTypes = new Array<string>();
  protected readonly code = new CodeMaker();
  private _assembly?: spec.Assembly;
  protected _reflectAssembly?: reflect.Assembly;
  private fingerprint?: string;

  protected get assembly(): spec.Assembly {
    if (!this._assembly) {
      throw new Error(
        'No assembly has been loaded! The #load() method must be called first!',
      );
    }
    return this._assembly;
  }

  public get reflectAssembly(): reflect.Assembly {
    if (!this._reflectAssembly) {
      throw new Error('Call load() first');
    }
    return this._reflectAssembly;
  }

  public get metadata() {
    return { fingerprint: this.fingerprint };
  }

  public load(_packageRoot: string, assembly: reflect.Assembly): void {
    this._reflectAssembly = assembly;
    this._assembly = assembly.spec;

    // Including the version of jsii-pacmak in the fingerprint, as a new version may imply different code generation.
    this.fingerprint = this.calculateFingerprint(assembly);
  }

  /**
   * Runs the generator (in-memory).
   */
  public generate(fingerprint: boolean): void {
    this.onBeginAssembly(this.assembly, fingerprint);
    this.visit(spec.NameTree.of(this.assembly));
    this.onEndAssembly(this.assembly, fingerprint);
  }

  public async upToDate(_outDir: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Returns the file name of the assembly resource as it is going to be saved.
   */
  protected getAssemblyFileName(): string {
    return this.getAssemblyArchiveFileName(this.reflectAssembly);
  }

  /**
   * Saves all generated files to an output directory, creating any subdirs if needed.
   */
  public async save(outdir: string, tarball: string) {
    const assemblyDir = this.getAssemblyOutputDir(this.assembly);
    if (assemblyDir) {
      const fullPath = path.resolve(
        path.join(outdir, assemblyDir, this.getAssemblyFileName()),
      );
      await fs.mkdirp(path.dirname(fullPath));
      await fs.copy(tarball, fullPath, { overwrite: true });
    }

    return this.code.save(outdir);
  }

  //
  // Bundled assembly
  // jsii modules should bundle the assembly itself as a resource and use the load() kernel API to load it.
  //

  /**
   * Returns the destination directory for the assembly file.
   */
  protected getAssemblyOutputDir(_mod: spec.Assembly): string | undefined {
    return undefined;
  }

  //
  // Assembly

  protected onBeginAssembly(_assm: spec.Assembly, _fingerprint: boolean) {
    /* noop */
  }
  protected onEndAssembly(_assm: spec.Assembly, _fingerprint: boolean) {
    /* noop */
  }

  //
  // Namespaces

  protected onBeginNamespace(_ns: string) {
    /* noop */
  }
  protected onEndNamespace(_ns: string) {
    /* noop */
  }

  //
  // Classes

  protected onBeginClass(_cls: spec.ClassType, _abstract: boolean | undefined) {
    /* noop */
  }
  protected onEndClass(_cls: spec.ClassType) {
    /* noop */
  }

  //
  // Interfaces

  protected abstract onBeginInterface(ifc: spec.InterfaceType): void;
  protected abstract onEndInterface(ifc: spec.InterfaceType): void;
  protected abstract onInterfaceMethod(
    ifc: spec.InterfaceType,
    method: spec.Method,
  ): void;
  protected abstract onInterfaceMethodOverload(
    ifc: spec.InterfaceType,
    overload: spec.Method,
    originalMethod: spec.Method,
  ): void;
  protected abstract onInterfaceProperty(
    ifc: spec.InterfaceType,
    prop: spec.Property,
  ): void;

  //
  // Initializers (constructos)

  protected onInitializer(
    _cls: spec.ClassType,
    _initializer: spec.Initializer,
  ) {
    /* noop */
  }
  protected onInitializerOverload(
    _cls: spec.ClassType,
    _overload: spec.Initializer,
    _originalInitializer: spec.Initializer,
  ) {
    /* noop */
  }

  //
  // Properties

  protected onBeginProperties(_cls: spec.ClassType) {
    /* noop */
  }
  protected abstract onProperty(cls: spec.ClassType, prop: spec.Property): void;
  protected abstract onStaticProperty(
    cls: spec.ClassType,
    prop: spec.Property,
  ): void;
  protected onEndProperties(_cls: spec.ClassType) {
    /* noop */
  }

  //
  // Union Properties
  // Those are properties that can accept more than a single type (i.e. String | Token). If the option `expandUnionProperties` is enabled
  // instead of onUnionProperty, the method onExpandedUnionProperty will be called for each of the types defined in the property.
  // `primaryName` indicates the original name of the union property (without the 'AsXxx' postfix).

  protected abstract onUnionProperty(
    cls: spec.ClassType,
    prop: spec.Property,
    union: spec.UnionTypeReference,
  ): void;
  protected onExpandedUnionProperty(
    _cls: spec.ClassType,
    _prop: spec.Property,
    _primaryName: string,
  ): void {
    return;
  }

  //
  // Methods
  // onMethodOverload is triggered if the option `generateOverloadsForMethodWithOptionals` is enabled for each overload of the original method.
  // The original method will be emitted via onMethod.

  protected onBeginMethods(_cls: spec.ClassType) {
    /* noop */
  }
  protected abstract onMethod(cls: spec.ClassType, method: spec.Method): void;
  protected abstract onMethodOverload(
    cls: spec.ClassType,
    overload: spec.Method,
    originalMethod: spec.Method,
  ): void;
  protected abstract onStaticMethod(
    cls: spec.ClassType,
    method: spec.Method,
  ): void;
  protected abstract onStaticMethodOverload(
    cls: spec.ClassType,
    overload: spec.Method,
    originalMethod: spec.Method,
  ): void;
  protected onEndMethods(_cls: spec.ClassType) {
    /* noop */
  }

  //
  // Enums

  protected onBeginEnum(_enm: spec.EnumType) {
    /* noop */
  }
  protected onEndEnum(_enm: spec.EnumType) {
    /* noop */
  }
  protected onEnumMember(_enm: spec.EnumType, _member: spec.EnumMember) {
    /* noop */
  }

  //
  // Fields
  // Can be used to implements properties backed by fields in cases where we want to generate "native" classes.
  // The default behavior is that properties do not have backing fields.

  protected hasField(_cls: spec.ClassType, _prop: spec.Property): boolean {
    return false;
  }
  protected onField(
    _cls: spec.ClassType,
    _prop: spec.Property,
    _union?: spec.UnionTypeReference,
  ) {
    /* noop */
  }

  private visit(node: spec.NameTree, names = new Array<string>()) {
    const namespace =
      !node.fqn && names.length > 0 ? names.join('.') : undefined;

    if (namespace) {
      this.onBeginNamespace(namespace);
    }

    const visitChildren = () => {
      Object.keys(node.children)
        .sort()
        .forEach((name) => {
          this.visit(node.children[name], names.concat(name));
        });
    };

    if (node.fqn) {
      const type = this.assembly.types?.[node.fqn];
      if (!type) {
        throw new Error(`Malformed jsii file. Cannot find type: ${node.fqn}`);
      }
      if (!this.shouldExcludeType(type.name)) {
        switch (type.kind) {
          case spec.TypeKind.Class:
            const classSpec = type as spec.ClassType;
            const abstract = classSpec.abstract;
            if (abstract && this.options.addBasePostfixToAbstractClassNames) {
              this.addAbstractPostfixToClassName(classSpec);
            }
            this.onBeginClass(classSpec, abstract);
            this.visitClass(classSpec);
            visitChildren();
            this.onEndClass(classSpec);
            break;
          case spec.TypeKind.Enum:
            const enumSpec = type as spec.EnumType;
            this.onBeginEnum(enumSpec);
            this.visitEnum(enumSpec);
            visitChildren();
            this.onEndEnum(enumSpec);
            break;
          case spec.TypeKind.Interface:
            const interfaceSpec = type as spec.InterfaceType;
            this.onBeginInterface(interfaceSpec);
            this.visitInterface(interfaceSpec);
            visitChildren();
            this.onEndInterface(interfaceSpec);
            break;
          default:
            throw new Error(`Unsupported type kind: ${(type as any).kind}`);
        }
      }
    } else {
      visitChildren();
    }

    if (namespace) {
      this.onEndNamespace(namespace);
    }
  }

  /**
   * Adds a postfix ("XxxBase") to the class name to indicate it is abstract.
   */
  private addAbstractPostfixToClassName(cls: spec.ClassType) {
    cls.name = `${cls.name}Base`;
    const components = cls.fqn.split('.');
    cls.fqn = components
      .map((x, i) => (i < components.length - 1 ? x : `${x}Base`))
      .join('.');
  }

  protected excludeType(...names: string[]) {
    for (const n of names) {
      this.excludeTypes.push(n);
    }
  }

  private shouldExcludeType(name: string) {
    return this.excludeTypes.includes(name);
  }

  /**
   * Returns all the method overloads needed to satisfy optional arguments.
   * For example, for the method `foo(bar: string, hello?: number, world?: number)`
   * this method will return:
   *  - foo(bar: string)
   *  - foo(bar: string, hello: number)
   *
   * Notice that the method that contains all the arguments will not be returned.
   */
  protected createOverloadsForOptionals<
    T extends spec.Method | spec.Initializer
  >(method: T) {
    const overloads = new Array<T>();

    // if option disabled, just return the empty array.
    if (
      !this.options.generateOverloadsForMethodWithOptionals ||
      !method.parameters
    ) {
      return overloads;
    }

    //
    // pop an argument from the end of the parameter list.
    // if it is an optional argument, clone the method without that parameter.
    // continue until we reach a non optional param or no parameters left.
    //

    const remaining: spec.Parameter[] = clone(method.parameters);
    let next: spec.Parameter | undefined;

    next = remaining.pop();
    // Parameter is optional if it's type is optional, and all subsequent parameters are optional/variadic
    while (next?.optional) {
      // clone the method but set the parameter list based on the remaining set of parameters
      const cloned: T = clone(method);
      cloned.parameters = clone(remaining);
      overloads.push(cloned);

      // pop the next parameter
      next = remaining.pop();
    }

    return overloads;
  }

  private visitInterface(ifc: spec.InterfaceType) {
    if (ifc.properties) {
      ifc.properties.forEach((prop) => {
        this.onInterfaceProperty(ifc, prop);
      });
    }

    if (ifc.methods) {
      ifc.methods.forEach((method) => {
        this.onInterfaceMethod(ifc, method);

        for (const overload of this.createOverloadsForOptionals(method)) {
          this.onInterfaceMethodOverload(ifc, overload, method);
        }
      });
    }
  }

  private visitClass(cls: spec.ClassType) {
    const initializer = cls.initializer;
    if (initializer) {
      this.onInitializer(cls, initializer);

      // if method has optional arguments and
      for (const overload of this.createOverloadsForOptionals(initializer)) {
        this.onInitializerOverload(cls, overload, initializer);
      }
    }

    // if running in 'pure' mode and the class has methods, emit them as abstract methods.
    if (cls.methods) {
      this.onBeginMethods(cls);
      cls.methods.forEach((method) => {
        if (!method.static) {
          this.onMethod(cls, method);

          for (const overload of this.createOverloadsForOptionals(method)) {
            this.onMethodOverload(cls, overload, method);
          }
        } else {
          this.onStaticMethod(cls, method);

          for (const overload of this.createOverloadsForOptionals(method)) {
            this.onStaticMethodOverload(cls, overload, method);
          }
        }
      });
      this.onEndMethods(cls);
    }

    if (cls.properties) {
      this.onBeginProperties(cls);
      cls.properties.forEach((prop) => {
        if (this.hasField(cls, prop)) {
          this.onField(
            cls,
            prop,
            spec.isUnionTypeReference(prop.type) ? prop.type : undefined,
          );
        }
      });

      cls.properties.forEach((prop) => {
        if (!spec.isUnionTypeReference(prop.type)) {
          if (!prop.static) {
            this.onProperty(cls, prop);
          } else {
            this.onStaticProperty(cls, prop);
          }
        } else {
          // okay, this is a union. some languages support unions (mostly the dynamic ones) and some will need some help
          // if `expandUnionProperties` is set, we will "expand" each property that has a union type into multiple properties
          // and postfix their name with the type name (i.e. FooAsToken).

          // first, emit a property for the union, for languages that support unions.
          this.onUnionProperty(cls, prop, prop.type);

          // if require, we also "expand" the union for languages that don't support unions.
          if (this.options.expandUnionProperties) {
            for (const [index, type] of prop.type.union.types.entries()) {
              // create a clone of this property
              const propClone = clone(prop);
              const primary = this.isPrimaryExpandedUnionProperty(
                prop.type,
                index,
              );
              const propertyName = primary
                ? prop.name
                : `${prop.name}As${this.displayNameForType(type)}`;
              propClone.type = type;
              propClone.optional = prop.optional;
              propClone.name = propertyName;
              this.onExpandedUnionProperty(cls, propClone, prop.name);
            }
          }
        }
      });
      this.onEndProperties(cls);
    }
  }

  /**
   * Magical heuristic to determine which type in a union is the primary type. The primary type will not have
   * a postfix with the name of the type attached to the expanded property name.
   *
   * The primary type is determined according to the following rules (first match):
   * 1. The first primitive type
   * 2. The first primitive collection
   * 3. No primary
   */
  protected isPrimaryExpandedUnionProperty(
    ref: spec.UnionTypeReference | undefined,
    index: number,
  ) {
    if (!ref) {
      return false;
    }

    return (
      index ===
      ref.union.types.findIndex((t) => {
        if (spec.isPrimitiveTypeReference(t)) {
          return true;
        }

        return false;
      })
    );
  }

  private visitEnum(enumSpec: spec.EnumType) {
    if (enumSpec.members) {
      enumSpec.members.forEach((spec) => this.onEnumMember(enumSpec, spec));
    }
  }

  private displayNameForType(type: spec.TypeReference): string {
    // last name from FQN
    if (spec.isNamedTypeReference(type)) {
      const comps = type.fqn.split('.');
      const last = comps[comps.length - 1];
      return this.code.toPascalCase(last);
    }

    // primitive name
    if (spec.isPrimitiveTypeReference(type)) {
      return this.code.toPascalCase(type.primitive);
    }

    // ListOfX or MapOfX
    const coll = spec.isCollectionTypeReference(type) && type.collection;
    if (coll) {
      return `${this.code.toPascalCase(coll.kind)}Of${this.displayNameForType(
        coll.elementtype,
      )}`;
    }

    const union = spec.isUnionTypeReference(type) && type.union;
    if (union) {
      return union.types.map((t) => this.displayNameForType(t)).join('Or');
    }

    throw new Error(
      `Cannot determine display name for type: ${JSON.stringify(type)}`,
    );
  }

  /**
   * Looks up a jsii module in the dependency tree.
   * @param name The name of the jsii module to look up
   */
  protected findModule(name: string): spec.AssemblyConfiguration {
    // if this is the current module, return it
    if (this.assembly.name === name) {
      return this.assembly;
    }

    const found = (this.assembly.dependencyClosure ?? {})[name];

    if (found) {
      return found;
    }

    throw new Error(
      `Unable to find module ${name} as a dependency of ${this.assembly.name}`,
    );
  }

  protected findType(fqn: string): spec.Type {
    const ret = this.reflectAssembly.system.tryFindFqn(fqn);
    if (!ret) {
      throw new Error(
        `Cannot find type '${fqn}' either as internal or external type`,
      );
    }

    return ret.spec;
  }
}
