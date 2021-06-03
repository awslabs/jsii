import * as jsii from '@jsii/spec';
import * as path from 'path';
import { promisify } from 'util';

import { Assembly } from './assembly';
import { ClassType } from './class';
import { EnumType } from './enum';
import { InterfaceType } from './interface';
import { Method } from './method';
import { ModuleLike } from './module-like';
import { Property } from './property';
import { Type } from './type';

export class TypeSystem {
  /**
   * All assemblies in this type system.
   */
  public readonly assemblies = new Array<Assembly>();

  /**
   * The "root" assemblies (ones that loaded explicitly via a "load" call).
   */
  public readonly roots = new Array<Assembly>();

  private readonly _assemblyLookup: { [name: string]: Assembly } = {};

  /**
   * Load all JSII dependencies of the given NPM package directory.
   *
   * The NPM package itself does *not* have to be a jsii package, and does
   * NOT have to declare a JSII dependency on any of the packages.
   */
  public async loadNpmDependencies(
    packageRoot: string,
    options: { validate?: boolean } = {},
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const pkg = require(path.resolve(packageRoot, 'package.json'));

    for (const dep of dependenciesOf(pkg)) {
      // Filter jsii dependencies
      const depPkgJsonPath = require.resolve(`${dep}/package.json`, {
        paths: [packageRoot],
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      const depPkgJson = require(depPkgJsonPath);
      if (!depPkgJson.jsii) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await this.loadModule(path.dirname(depPkgJsonPath), options);
    }
  }

  /**
   * Loads a jsii module or a single .jsii file into the type system.
   *
   * If `fileOrDirectory` is a file, it will be treated as a single .jsii file.
   * If `fileOrDirectory` is a directory, it will be treated as a jsii npm module.
   *
   * Not validating makes the difference between loading assemblies with lots
   * of dependencies (such as app-delivery) in 90ms vs 3500ms.
   *
   * @param fileOrDirectory A .jsii file path or a module directory
   * @param validate Whether or not to validate the assembly while loading it.
   */
  public async load(
    fileOrDirectory: string,
    options: { validate?: boolean } = {},
  ) {
    if ((await stat(fileOrDirectory)).isDirectory()) {
      return this.loadModule(fileOrDirectory, options);
    }
    return this.loadFile(fileOrDirectory, { ...options, isRoot: true });
  }

  public async loadModule(
    dir: string,
    options: { validate?: boolean } = {},
  ): Promise<Assembly> {
    const out = await _loadModule.call(this, dir, true);
    if (!out) {
      throw new Error(`Unable to load module from directory: ${dir}`);
    }

    return out;

    async function _loadModule(
      this: TypeSystem,
      moduleDirectory: string,
      isRoot = false,
    ) {
      const filePath = path.join(moduleDirectory, 'package.json');
      const pkg = JSON.parse((await readFile(filePath)).toString());
      if (!pkg.jsii) {
        throw new Error(`No "jsii" section in ${filePath}`);
      }

      // Load the assembly, but don't recurse if we already have an assembly with the same name.
      // Validation is not an insignificant time sink, and loading IS insignificant, so do a
      // load without validation first. This saves about 2/3rds of processing time.
      const asm = await this.loadAssembly(
        path.join(moduleDirectory, '.jsii'),
        false,
      );
      if (this.includesAssembly(asm.name)) {
        const existing = this.findAssembly(asm.name);
        if (existing.version !== asm.version) {
          throw new Error(
            `Conflicting versions of ${asm.name} in type system: previously loaded ${existing.version}, trying to load ${asm.version}`,
          );
        }
        // Make sure that we mark this thing as root after all if it wasn't yet.
        if (isRoot) {
          this.addRoot(asm);
        }

        return existing;
      }

      if (options.validate !== false) {
        asm.validate();
      }

      const root = this.addAssembly(asm, { isRoot });
      // Using || instead of ?? because npmjs.com will alter the package.json file and possibly put `false` in pkg.bundleDependencies.
      // This is actually non compliant to the package.json specification, but that's how it is...
      const bundled: string[] =
        pkg.bundledDependencies || pkg.bundleDependencies || [];

      for (const name of dependenciesOf(pkg)) {
        if (bundled.includes(name)) {
          continue;
        }

        const depDir = require.resolve(`${name}/package.json`, {
          paths: [moduleDirectory],
        });
        // eslint-disable-next-line no-await-in-loop
        await _loadModule.call(this, path.dirname(depDir));
      }

      return root;
    }
  }

  public async loadFile(
    file: string,
    options: { isRoot?: boolean; validate?: boolean } = {},
  ) {
    const assembly = await this.loadAssembly(file, options.validate !== false);
    return this.addAssembly(assembly, options);
  }

  public addAssembly(asm: Assembly, options: { isRoot?: boolean } = {}) {
    if (asm.system !== this) {
      throw new Error('Assembly has been created for different typesystem');
    }

    if (!this._assemblyLookup[asm.name]) {
      this._assemblyLookup[asm.name] = asm;
      this.assemblies.push(asm);
    }

    if (options.isRoot !== false) {
      this.addRoot(asm);
    }

    return asm;
  }

  /**
   * Determines whether this TypeSystem includes a given assembly.
   *
   * @param name the name of the assembly being looked for.
   */
  public includesAssembly(name: string): boolean {
    return name in this._assemblyLookup;
  }

  public isRoot(name: string) {
    return this.roots.map((r) => r.name).includes(name);
  }

  public findAssembly(name: string) {
    const ret = this.tryFindAssembly(name);
    if (!ret) {
      throw new Error(`Assembly "${name}" not found`);
    }
    return ret;
  }

  public tryFindAssembly(name: string): Assembly | undefined {
    return this._assemblyLookup[name];
  }

  public findFqn(fqn: string): Type {
    const [assembly] = fqn.split('.');
    const asm = this.findAssembly(assembly);
    return asm.findType(fqn);
  }

  public tryFindFqn(fqn: string): Type | undefined {
    const [assembly] = fqn.split('.');
    const asm = this.tryFindAssembly(assembly);
    return asm?.tryFindType(fqn);
  }

  public findClass(fqn: string): ClassType {
    const type = this.findFqn(fqn);
    if (!(type instanceof ClassType)) {
      throw new Error(`FQN ${fqn} is not a class`);
    }
    return type;
  }

  public findInterface(fqn: string): InterfaceType {
    const type = this.findFqn(fqn);
    if (!(type instanceof InterfaceType)) {
      throw new Error(`FQN ${fqn} is not an interface`);
    }
    return type;
  }

  public findEnum(fqn: string): EnumType {
    const type = this.findFqn(fqn);
    if (!(type instanceof EnumType)) {
      throw new Error(`FQN ${fqn} is not an enum`);
    }
    return type;
  }

  /**
   * All methods in the type system.
   */
  public get methods() {
    const getMethods = (mod: ModuleLike): readonly Method[] => {
      return [
        ...flatMap(mod.submodules, getMethods),
        ...flatMap(mod.interfaces, (iface) => iface.ownMethods),
        ...flatMap(mod.classes, (clazz) => clazz.ownMethods),
      ];
    };

    return flatMap(this.assemblies, getMethods);
  }

  /**
   * All properties in the type system.
   */
  public get properties() {
    const getProperties = (mod: ModuleLike): readonly Property[] => {
      return [
        ...flatMap(mod.submodules, getProperties),
        ...flatMap(mod.interfaces, (iface) => iface.ownProperties),
        ...flatMap(mod.classes, (clazz) => clazz.ownProperties),
      ];
    };

    return flatMap(this.assemblies, getProperties);
  }

  /**
   * All classes in the type system.
   */
  public get classes(): readonly ClassType[] {
    const out = new Array<ClassType>();
    this.assemblies.forEach((a) => {
      out.push(...collectTypes(a, (item) => item.classes));
    });
    return out;
  }

  /**
   * All interfaces in the type system.
   */
  public get interfaces(): readonly InterfaceType[] {
    const out = new Array<InterfaceType>();
    this.assemblies.forEach((a) => {
      out.push(...collectTypes(a, (item) => item.interfaces));
    });
    return out;
  }

  /**
   * All enums in the type system.
   */
  public get enums(): readonly EnumType[] {
    const out = new Array<EnumType>();
    this.assemblies.forEach((a) => {
      out.push(...collectTypes(a, (item) => item.enums));
    });
    return out;
  }

  /**
   * Load an assembly without adding it to the typesystem
   * @param file Assembly file to load
   * @param validate Whether to validate the assembly or just assume it matches the schema
   */
  private async loadAssembly(file: string, validate = true) {
    const spec = JSON.parse((await readFile(file)).toString());
    const ass = validate
      ? jsii.validateAssembly(spec)
      : (spec as jsii.Assembly);
    return new Assembly(this, ass);
  }

  private addRoot(asm: Assembly) {
    if (!this.roots.map((r) => r.name).includes(asm.name)) {
      this.roots.push(asm);
    }
  }
}

function dependenciesOf(packageJson: any) {
  const deps = new Set<string>();
  Object.keys(packageJson.dependencies ?? {}).forEach(deps.add.bind(deps));
  Object.keys(packageJson.peerDependencies ?? {}).forEach(deps.add.bind(deps));
  return Array.from(deps);
}

function collectTypes<T extends Type>(
  module: ModuleLike,
  getter: (module: ModuleLike) => readonly T[],
): readonly T[] {
  const result = new Array<T>();
  for (const submodule of module.submodules) {
    result.push(...collectTypes(submodule, getter));
  }
  result.push(...getter(module));
  return result;
}

function flatMap<T, R>(
  collection: readonly T[],
  mapper: (value: T) => readonly R[],
): readonly R[] {
  return collection
    .map(mapper)
    .reduce((acc, elt) => acc.concat(elt), new Array<R>());
}

function stat(p: string) {
  // just-in-time require so that this file can be loaded in browsers as well.
  // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
  const fs = require('fs');
  return promisify(fs.stat)(p);
}

function readFile(p: string) {
  // just-in-time require so that this file can be loaded in browsers as well.
  // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
  const fs = require('fs');
  return promisify(fs.readFile)(p);
}
