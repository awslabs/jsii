import * as jsii from '@jsii/spec';
import { ClassType } from './class';
import { Dependency } from './dependency';
import { EnumType } from './enum';
import { ModuleLike } from './module-like';
import { InterfaceType } from './interface';
import { Submodule } from './submodule';
import { Type } from './type';
import { TypeSystem } from './type-system';

export class Assembly extends ModuleLike {
  private _typeCache?: { [fqn: string]: Type };
  private _submoduleCache?: { [fqn: string]: Submodule };
  private _dependencyCache?: { [name: string]: Dependency };

  public constructor(system: TypeSystem, public readonly spec: jsii.Assembly) {
    super(system);
  }

  public get fqn(): string {
    return this.spec.name;
  }

  /**
   * The version of the spec schema
   */
  public get schema(): jsii.SchemaVersion {
    return this.spec.schema;
  }

  /**
   * The name of the assembly
   */
  public get name(): string {
    return this.spec.name;
  }

  /**
   * Description of the assembly, maps to "description" from package.json
   * This is required since some package managers (like Maven) require it.
   */
  public get description(): string {
    return this.spec.description;
  }

  /**
   * The metadata associated with the assembly, if any.
   */
  public get metadata(): { readonly [key: string]: any } | undefined {
    return this.spec.metadata;
  }

  /**
   * The url to the project homepage. Maps to "homepage" from package.json.
   */
  public get homepage(): string {
    return this.spec.homepage;
  }

  /**
   * The module repository, maps to "repository" from package.json
   * This is required since some package managers (like Maven) require it.
   */
  public get repository(): {
    readonly type: string;
    readonly url: string;
    readonly directory?: string;
  } {
    return this.spec.repository;
  }

  /**
   * The main author of this package.
   */
  public get author(): jsii.Person {
    return this.spec.author;
  }

  /**
   * Additional contributors to this package.
   */
  public get contributors(): readonly jsii.Person[] {
    return this.spec.contributors ?? [];
  }

  /**
   * A fingerprint that can be used to determine if the specification has changed.
   */
  public get fingerprint(): string {
    return this.spec.fingerprint;
  }

  /**
   * The version of the assembly
   */
  public get version(): string {
    return this.spec.version;
  }

  /**
   * The SPDX name of the license this assembly is distributed on.
   */
  public get license(): string {
    return this.spec.license;
  }

  /**
   * A map of target name to configuration, which is used when generating packages for
   * various languages.
   */
  public get targets() {
    return this.spec.targets;
  }

  /**
   * Dependencies on other assemblies (with semver), the key is the JSII assembly name.
   */
  public get dependencies(): readonly Dependency[] {
    return Object.keys(this._dependencies).map(
      (name) => this._dependencies[name],
    );
  }

  public findDependency(name: string) {
    const dep = this._dependencies[name];
    if (!dep) {
      throw new Error(`Dependency ${name} not found for assembly ${this.name}`);
    }
    return dep;
  }

  /**
   * List if bundled dependencies (these are not expected to be jsii assemblies).
   */
  public get bundled(): { readonly [module: string]: string } {
    return this.spec.bundled ?? {};
  }

  /**
   * The top-level readme document for this assembly (if any).
   */
  public get readme() {
    return this.spec.readme;
  }

  public get submodules(): readonly Submodule[] {
    const { submodules } = this._types;
    return Object.values(submodules);
  }

  /**
   * All types in the assembly
   */
  public get types(): readonly Type[] {
    const { types } = this._types;
    return Object.values(types);
  }

  public findType(fqn: string) {
    const type = this.tryFindType(fqn);
    if (!type) {
      throw new Error(`Type '${fqn}' not found in assembly ${this.name}`);
    }
    return type;
  }

  /**
   * Validate an assembly after loading
   *
   * If the assembly was loaded without validation, call this to validate
   * it after all. Throws an exception if validation fails.
   */
  public validate() {
    jsii.validateAssembly(this.spec);
  }

  private get _dependencies() {
    if (!this._dependencyCache) {
      this._dependencyCache = {};
      if (this.spec.dependencies) {
        for (const name of Object.keys(this.spec.dependencies)) {
          this._dependencyCache[name] = new Dependency(
            this.system,
            name,
            this.spec.dependencies[name],
          );
        }
      }
    }

    return this._dependencyCache;
  }

  private get _types() {
    if (!this._typeCache || !this._submoduleCache) {
      this._typeCache = {};

      const submodules: { [fullName: string]: SubmoduleMap } = {};

      const ts = this.spec.types ?? {};
      for (const fqn of Object.keys(ts)) {
        const typeSpec = ts[fqn];

        let submodule = typeSpec.namespace;
        while (submodule != null && `${this.spec.name}.${submodule}` in ts) {
          submodule = ts[`${this.spec.name}.${submodule}`].namespace;
        }

        let type: Type;
        switch (typeSpec.kind) {
          case jsii.TypeKind.Class:
            type = new ClassType(this.system, this, typeSpec);
            break;

          case jsii.TypeKind.Interface:
            type = new InterfaceType(this.system, this, typeSpec);
            break;

          case jsii.TypeKind.Enum:
            type = new EnumType(this.system, this, typeSpec);
            break;

          default:
            throw new Error(`Unsupported type kind: ${typeSpec.kind}`);
        }

        if (submodule != null) {
          const [root, ...parts] = submodule.split('.');
          let container = (submodules[root] = submodules[root] ?? {
            submodules: {},
            types: [],
          });
          for (const part of parts) {
            container = container.submodules[part] = container.submodules[
              part
            ] ?? { submodules: {}, types: [] };
          }
          container.types.push(type);
        } else {
          this._typeCache[fqn] = type;
        }
      }

      this._submoduleCache = {};
      for (const [name, map] of Object.entries(submodules)) {
        this._submoduleCache[name] = makeSubmodule(
          this.system,
          map,
          `${this.name}.${name}`,
        );
      }
    }

    return { types: this._typeCache, submodules: this._submoduleCache };
  }
}

interface SubmoduleMap {
  readonly submodules: { [fullName: string]: SubmoduleMap };
  readonly types: Type[];
}

function makeSubmodule(
  system: TypeSystem,
  map: SubmoduleMap,
  fullName: string,
): Submodule {
  return new Submodule(
    system,
    fullName,
    Object.entries(map.submodules).map(([name, subMap]) =>
      makeSubmodule(system, subMap, `${fullName}.${name}`),
    ),
    map.types,
  );
}
