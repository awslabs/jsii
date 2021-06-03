import * as spec from '@jsii/spec';
import { CodeMaker, toSnakeCase } from 'codemaker';
import * as escapeStringRegexp from 'escape-string-regexp';
import * as fs from 'fs-extra';
import * as reflect from 'jsii-reflect';
import {
  Translation,
  Rosetta,
  enforcesStrictMode,
  typeScriptSnippetFromSource,
} from 'jsii-rosetta';
import * as path from 'path';

import { Generator, GeneratorOptions } from '../generator';
import { warn } from '../logging';
import { md2rst } from '../markdown';
import { Target, TargetOptions } from '../target';
import { shell } from '../util';
import { renderSummary } from './_utils';
import {
  NamingContext,
  toTypeName,
  PythonImports,
  mergePythonImports,
  toPackageName,
} from './python/type-name';
import { die, toPythonIdentifier } from './python/util';
import { toPythonVersionRange, toReleaseVersion } from './version-utils';

import {
  INCOMPLETE_DISCLAIMER_COMPILING,
  INCOMPLETE_DISCLAIMER_NONCOMPILING,
  TargetName,
} from '.';

// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-require-imports
const spdxLicenseList = require('spdx-license-list');

const requirementsFile = path.resolve(
  __dirname,
  'python',
  'requirements-dev.txt',
);

// we use single-quotes for multi-line strings to allow examples within the
// docstrings themselves to include double-quotes (see https://github.com/aws/jsii/issues/2569)
const DOCSTRING_QUOTES = "'''";

export default class Python extends Target {
  protected readonly generator: PythonGenerator;

  public constructor(options: TargetOptions) {
    super(options);

    this.generator = new PythonGenerator(options.rosetta);
  }

  public async generateCode(outDir: string, tarball: string): Promise<void> {
    await super.generateCode(outDir, tarball);
  }

  public async build(sourceDir: string, outDir: string): Promise<void> {
    // Create a fresh virtual env
    const venv = await fs.mkdtemp(path.join(sourceDir, '.env'));
    const venvBin = path.join(
      venv,
      process.platform === 'win32' ? 'Scripts' : 'bin',
    );
    await shell('python3', [
      '-m',
      'venv',
      '--system-site-packages', // Allow using globally installed packages (saves time & disk space)
      venv,
    ]);
    const env = {
      ...process.env,
      PATH: `${venvBin}:${process.env.PATH}`,
      VIRTUAL_ENV: venv,
    };
    const python = path.join(venvBin, 'python');

    // Install the necessary things
    await shell(
      python,
      ['-m', 'pip', 'install', '--no-input', '-r', requirementsFile],
      {
        cwd: sourceDir,
        env,
        retry: { maxAttempts: 5 },
      },
    );

    // Actually package up our code, both as a sdist and a wheel for publishing.
    await shell(python, ['setup.py', 'sdist', '--dist-dir', outDir], {
      cwd: sourceDir,
      env,
    });
    await shell(
      python,
      ['-m', 'pip', 'wheel', '--no-deps', '--wheel-dir', outDir, sourceDir],
      {
        cwd: sourceDir,
        env,
        retry: { maxAttempts: 5 },
      },
    );
    await shell(python, ['-m', 'twine', 'check', path.join(outDir, '*')], {
      cwd: sourceDir,
      env,
    });
  }
}

// ##################
// # CODE GENERATOR #
// ##################

interface EmitContext extends NamingContext {
  /** @deprecated The TypeResolver */
  readonly resolver: TypeResolver;
}

const pythonModuleNameToFilename = (name: string): string => {
  return path.join(...name.split('.'));
};

const toPythonMethodName = (name: string, protectedItem = false): string => {
  let value = toPythonIdentifier(toSnakeCase(name));
  if (protectedItem) {
    value = `_${value}`;
  }
  return value;
};

const toPythonPropertyName = (
  name: string,
  constant = false,
  protectedItem = false,
): string => {
  let value = toPythonIdentifier(toSnakeCase(name));

  if (constant) {
    value = value.toUpperCase();
  }

  if (protectedItem) {
    value = `_${value}`;
  }

  return value;
};

/**
 * Converts a given signature's parameter name to what should be emitted in Python. It slugifies the
 * positional parameter names that collide with a lifted prop by appending trailing `_`. There is no
 * risk of conflicting with an other positional parameter that ends with a `_` character because
 * this is prohibited by the `jsii` compiler (parameter names MUST be camelCase, and only a single
 * `_` is permitted when it is on **leading** position)
 *
 * @param name              the name of the parameter that needs conversion.
 * @param liftedParamNames  the list of "lifted" keyword parameters in this signature. This must be
 *                          omitted when generating a name for a parameter that **is** lifted.
 */
function toPythonParameterName(
  name: string,
  liftedParamNames = new Set<string>(),
): string {
  let result = toPythonIdentifier(toSnakeCase(name));

  while (liftedParamNames.has(result)) {
    result += '_';
  }

  return result;
}

const setDifference = <T>(setA: Set<T>, setB: Set<T>): Set<T> => {
  const result = new Set<T>();
  for (const item of setA) {
    if (!setB.has(item)) {
      result.add(item);
    }
  }
  return result;
};

/**
 * Prepare python members for emission.
 *
 * If there are multiple members of the same name, they will all map to the same python
 * name, so we will filter all deprecated members and expect that there will be only one
 * left.
 *
 * Returns the members in a sorted list.
 */
function prepareMembers(members: PythonBase[], resolver: TypeResolver) {
  // create a map from python name to list of members
  const map: { [pythonName: string]: PythonBase[] } = {};
  for (const m of members) {
    let list = map[m.pythonName];
    if (!list) {
      list = map[m.pythonName] = [];
    }

    list.push(m);
  }

  // now return all the members
  const ret = new Array<PythonBase>();

  for (const [name, list] of Object.entries(map)) {
    let member;

    if (list.length === 1) {
      // if we have a single member for this normalized name, then use it
      member = list[0];
    } else {
      // we found more than one member with the same python name, filter all
      // deprecated versions and check that we are left with exactly one.
      // otherwise, they will overwrite each other
      // see https://github.com/aws/jsii/issues/2508
      const nonDeprecated = list.filter((x) => !isDeprecated(x));
      if (nonDeprecated.length > 1) {
        throw new Error(
          `Multiple non-deprecated members which map to the Python name "${name}"`,
        );
      }

      if (nonDeprecated.length === 0) {
        throw new Error(
          `Multiple members which map to the Python name "${name}", but all of them are deprecated`,
        );
      }

      member = nonDeprecated[0];
    }

    ret.push(member);
  }

  return sortMembers(ret, resolver);
}

const sortMembers = (
  members: PythonBase[],
  resolver: TypeResolver,
): PythonBase[] => {
  let sortable = new Array<{
    member: PythonBase & ISortableType;
    dependsOn: Set<PythonType>;
  }>();
  const sorted = new Array<PythonBase>();
  const seen = new Set<PythonBase>();

  // The first thing we want to do, is push any item which is not sortable to the very
  // front of the list. This will be things like methods, properties, etc.
  for (const member of members) {
    if (!isSortableType(member)) {
      sorted.push(member);
      seen.add(member);
    } else {
      sortable.push({ member, dependsOn: new Set(member.dependsOn(resolver)) });
    }
  }

  // Now that we've pulled out everything that couldn't possibly have dependencies,
  // we will go through the remaining items, and pull off any items which have no
  // dependencies that we haven't already sorted.
  while (sortable.length > 0) {
    for (const { member, dependsOn } of sortable) {
      const diff = setDifference(dependsOn, seen);
      if ([...diff].find((dep) => !(dep instanceof PythonModule)) == null) {
        sorted.push(member);
        seen.add(member);
      }
    }

    const leftover = sortable.filter(({ member }) => !seen.has(member));
    if (leftover.length === sortable.length) {
      throw new Error(
        `Could not sort members (circular dependency?). Leftover: ${leftover
          .map((lo) => lo.member.pythonName)
          .join(', ')}`,
      );
    } else {
      sortable = leftover;
    }
  }

  return sorted;
};

interface PythonBase {
  readonly pythonName: string;
  readonly docs?: spec.Docs;

  emit(code: CodeMaker, context: EmitContext, opts?: any): void;

  requiredImports(context: EmitContext): PythonImports;
}

interface PythonType extends PythonBase {
  // The JSII FQN for this item, if this item doesn't exist as a JSII type, then it
  // doesn't have a FQN and it should be null;
  readonly fqn?: string;

  addMember(member: PythonBase): void;
}

interface ISortableType {
  dependsOn(resolver: TypeResolver): PythonType[];
}

function isSortableType(arg: unknown): arg is ISortableType {
  return (arg as Partial<ISortableType>).dependsOn !== undefined;
}

interface PythonTypeOpts {
  bases?: spec.TypeReference[];
}

abstract class BasePythonClassType implements PythonType, ISortableType {
  protected bases: spec.TypeReference[];
  protected members: PythonBase[];
  protected readonly separateMembers: boolean = true;

  public constructor(
    protected readonly generator: PythonGenerator,
    public readonly pythonName: string,
    public readonly fqn: string | undefined,
    opts: PythonTypeOpts,
    public readonly docs: spec.Docs | undefined,
  ) {
    const { bases = [] } = opts;

    this.bases = bases;
    this.members = [];
  }

  public dependsOn(resolver: TypeResolver): PythonType[] {
    const dependencies = new Array<PythonType>();
    const parent = resolver.getParent(this.fqn!);

    // We need to return any bases that are in the same module at the same level of
    // nesting.
    const seen = new Set<string>();
    for (const base of this.bases) {
      if (spec.isNamedTypeReference(base)) {
        if (resolver.isInModule(base)) {
          // Given a base, we need to locate the base's parent that is the same as
          // our parent, because we only care about dependencies that are at the
          // same level of our own.
          // TODO: We might need to recurse into our members to also find their
          //       dependencies.
          let baseItem = resolver.getType(base);
          let baseParent = resolver.getParent(base);
          while (baseParent !== parent) {
            baseItem = baseParent;
            baseParent = resolver.getParent(baseItem.fqn!);
          }

          if (!seen.has(baseItem.fqn!)) {
            dependencies.push(baseItem);
            seen.add(baseItem.fqn!);
          }
        }
      }
    }

    return dependencies;
  }

  public requiredImports(context: EmitContext): PythonImports {
    return mergePythonImports(
      ...this.bases.map((base) => toTypeName(base).requiredImports(context)),
      ...this.members.map((mem) => mem.requiredImports(context)),
    );
  }

  public addMember(member: PythonBase) {
    this.members.push(member);
  }

  public emit(code: CodeMaker, context: EmitContext) {
    context = nestedContext(context, this.fqn);

    const classParams = this.getClassParams(context);
    openSignature(code, 'class', this.pythonName, classParams);

    this.generator.emitDocString(code, this.docs, {
      documentableItem: `class-${this.pythonName}`,
      trailingNewLine: true,
    });

    if (this.members.length > 0) {
      const resolver = this.boundResolver(context.resolver);
      let shouldSeparate = false;
      for (const member of prepareMembers(this.members, resolver)) {
        if (shouldSeparate) {
          code.line();
        }
        shouldSeparate = this.separateMembers;
        member.emit(code, { ...context, resolver });
      }
    } else {
      code.line('pass');
    }

    code.closeBlock();

    if (this.fqn != null) {
      context.emittedTypes.add(this.fqn);
    }
  }

  protected boundResolver(resolver: TypeResolver): TypeResolver {
    if (this.fqn == null) {
      return resolver;
    }
    return resolver.bind(this.fqn);
  }

  protected abstract getClassParams(context: EmitContext): string[];
}

interface BaseMethodOpts {
  abstract?: boolean;
  liftedProp?: spec.InterfaceType;
  parent: spec.NamedTypeReference;
}

interface BaseMethodEmitOpts {
  renderAbstract?: boolean;
  forceEmitBody?: boolean;
}

abstract class BaseMethod implements PythonBase {
  public readonly abstract: boolean;

  protected abstract readonly implicitParameter: string;
  protected readonly jsiiMethod!: string;
  protected readonly decorator?: string;
  protected readonly classAsFirstParameter: boolean = false;
  protected readonly returnFromJSIIMethod: boolean = true;
  protected readonly shouldEmitBody: boolean = true;

  private readonly liftedProp?: spec.InterfaceType;
  private readonly parent: spec.NamedTypeReference;

  public constructor(
    protected readonly generator: PythonGenerator,
    public readonly pythonName: string,
    private readonly jsName: string | undefined,
    private readonly parameters: spec.Parameter[],
    private readonly returns: spec.OptionalValue | undefined,
    public readonly docs: spec.Docs | undefined,
    opts: BaseMethodOpts,
  ) {
    this.abstract = !!opts.abstract;
    this.liftedProp = opts.liftedProp;
    this.parent = opts.parent;
  }

  public requiredImports(context: EmitContext): PythonImports {
    return mergePythonImports(
      toTypeName(this.returns).requiredImports(context),
      ...this.parameters.map((param) =>
        toTypeName(param).requiredImports(context),
      ),
      ...liftedProperties(this.liftedProp),
    );

    function* liftedProperties(
      struct: spec.InterfaceType | undefined,
    ): IterableIterator<PythonImports> {
      if (struct == null) {
        return;
      }
      for (const prop of struct.properties ?? []) {
        yield toTypeName(prop.type).requiredImports(context);
      }
      for (const base of struct.interfaces ?? []) {
        const iface = context.resolver.dereference(base) as spec.InterfaceType;
        for (const imports of liftedProperties(iface)) {
          yield imports;
        }
      }
    }
  }

  public emit(
    code: CodeMaker,
    context: EmitContext,
    opts?: BaseMethodEmitOpts,
  ) {
    const { renderAbstract = true, forceEmitBody = false } = opts ?? {};

    const returnType: string = toTypeName(this.returns).pythonType(context);

    // We cannot (currently?) blindly use the names given to us by the JSII for
    // initializers, because our keyword lifting will allow two names to clash.
    // This can hopefully be removed once we get https://github.com/aws/jsii/issues/288
    // resolved, so build up a list of all of the prop names so we can check against
    // them later.
    const liftedPropNames = new Set<string>();
    if (this.liftedProp?.properties != null) {
      for (const prop of this.liftedProp.properties) {
        liftedPropNames.add(toPythonParameterName(prop.name));
      }
    }

    // We need to turn a list of JSII parameters, into Python style arguments with
    // gradual typing, so we'll have to iterate over the list of parameters, and
    // build the list, converting as we go.
    const pythonParams: string[] = [];
    for (const param of this.parameters) {
      // We cannot (currently?) blindly use the names given to us by the JSII for
      // initializers, because our keyword lifting will allow two names to clash.
      // This can hopefully be removed once we get https://github.com/aws/jsii/issues/288
      // resolved.
      const paramName: string = toPythonParameterName(
        param.name,
        liftedPropNames,
      );

      const paramType = toTypeName(param).pythonType({
        ...context,
        parameterType: true,
      });
      const paramDefault = param.optional ? ' = None' : '';

      pythonParams.push(`${paramName}: ${paramType}${paramDefault}`);
    }

    const documentableArgs: DocumentableArgument[] = this.parameters
      // If there's liftedProps, the last argument is the struct and it won't be _actually_ emitted.
      .filter((_, index) =>
        this.liftedProp != null ? index < this.parameters.length - 1 : true,
      )
      .map((param) => ({
        ...param,
        name: toPythonParameterName(param.name, liftedPropNames),
      }));

    // If we have a lifted parameter, then we'll drop the last argument to our params
    // and then we'll lift all of the params of the lifted type as keyword arguments
    // to the function.
    if (this.liftedProp !== undefined) {
      // Remove our last item.
      pythonParams.pop();
      const liftedProperties = this.getLiftedProperties(context.resolver);

      if (liftedProperties.length >= 1) {
        // All of these parameters are keyword only arguments, so we'll mark them
        // as such.
        pythonParams.push('*');

        // Iterate over all of our props, and reflect them into our params.
        for (const prop of liftedProperties) {
          const paramName = toPythonParameterName(prop.name);
          const paramType = toTypeName(prop).pythonType({
            ...context,
            parameterType: true,
          });
          const paramDefault = prop.optional ? ' = None' : '';

          pythonParams.push(`${paramName}: ${paramType}${paramDefault}`);
        }
      }

      // Document them as keyword arguments
      documentableArgs.push(...liftedProperties);
    } else if (
      this.parameters.length >= 1 &&
      this.parameters[this.parameters.length - 1].variadic
    ) {
      // Another situation we could be in, is that instead of having a plain parameter
      // we have a variadic parameter where we need to expand the last parameter as a
      // *args.
      pythonParams.pop();

      const lastParameter = this.parameters.slice(-1)[0];
      const paramName = toPythonParameterName(lastParameter.name);
      const paramType = toTypeName(lastParameter.type).pythonType(context);

      pythonParams.push(`*${paramName}: ${paramType}`);
    }

    const decorators = new Array<string>();

    if (this.jsName !== undefined) {
      // "# type: ignore[misc]" needed because mypy does not know how to check decorated declarations
      decorators.push(`@jsii.member(jsii_name="${this.jsName}")`);
    }

    if (this.decorator !== undefined) {
      decorators.push(`@${this.decorator}`);
    }

    if (renderAbstract && this.abstract) {
      decorators.push('@abc.abstractmethod');
    }

    if (decorators.length > 0) {
      // "# type: ignore[misc]" needed because mypy does not know how to check decorated declarations
      for (const decorator of decorators
        .join(' # type: ignore[misc]\n')
        .split('\n')) {
        code.line(decorator);
      }
    }

    pythonParams.unshift(
      slugifyAsNeeded(
        this.implicitParameter,
        pythonParams.map((param) => param.split(':')[0].trim()),
      ),
    );

    openSignature(
      code,
      'def',
      this.pythonName,
      pythonParams,
      false,
      returnType,
    );
    this.generator.emitDocString(code, this.docs, {
      arguments: documentableArgs,
      documentableItem: `method-${this.pythonName}`,
    });
    this.emitBody(
      code,
      context,
      renderAbstract,
      forceEmitBody,
      liftedPropNames,
      pythonParams[0],
      returnType,
    );
    code.closeBlock();
  }

  private emitBody(
    code: CodeMaker,
    context: EmitContext,
    renderAbstract: boolean,
    forceEmitBody: boolean,
    liftedPropNames: Set<string>,
    implicitParameter: string,
    returnType: string,
  ) {
    if (
      (!this.shouldEmitBody && !forceEmitBody) ||
      (renderAbstract && this.abstract)
    ) {
      code.line('...');
    } else {
      if (this.liftedProp !== undefined) {
        this.emitAutoProps(code, context, liftedPropNames);
      }

      this.emitJsiiMethodCall(
        code,
        context,
        liftedPropNames,
        implicitParameter,
        returnType,
      );
    }
  }

  private emitAutoProps(
    code: CodeMaker,
    context: EmitContext,
    liftedPropNames: Set<string>,
  ) {
    const lastParameter = this.parameters.slice(-1)[0];
    const argName = toPythonParameterName(lastParameter.name, liftedPropNames);
    const typeName = toTypeName(lastParameter.type).pythonType({
      ...context,
      typeAnnotation: false,
    });

    // We need to build up a list of properties, which are mandatory, these are the
    // ones we will specifiy to start with in our dictionary literal.
    const liftedProps = this.getLiftedProperties(context.resolver).map(
      (p) => new StructField(this.generator, p),
    );
    const assignments = liftedProps
      .map((p) => p.pythonName)
      .map((v) => `${v}=${v}`);

    assignCallResult(code, argName, typeName, assignments);
    code.line();
  }

  private emitJsiiMethodCall(
    code: CodeMaker,
    context: EmitContext,
    liftedPropNames: Set<string>,
    implicitParameter: string,
    returnType: string,
  ) {
    const methodPrefix: string = this.returnFromJSIIMethod ? 'return ' : '';

    const jsiiMethodParams: string[] = [];
    if (this.classAsFirstParameter) {
      if (this.parent === undefined) {
        throw new Error('Parent not known.');
      }
      jsiiMethodParams.push(
        toTypeName(this.parent).pythonType({
          ...context,
          typeAnnotation: false,
        }),
      );
    }
    jsiiMethodParams.push(implicitParameter);
    if (this.jsName !== undefined) {
      jsiiMethodParams.push(`"${this.jsName}"`);
    }

    // If the last arg is variadic, expand the tuple
    const params: string[] = [];
    for (const param of this.parameters) {
      let expr = toPythonParameterName(param.name, liftedPropNames);
      if (param.variadic) {
        expr = `*${expr}`;
      }
      params.push(expr);
    }

    const value = `jsii.${this.jsiiMethod}(${jsiiMethodParams.join(
      ', ',
    )}, [${params.join(', ')}])`;
    code.line(
      `${methodPrefix}${
        this.returnFromJSIIMethod && returnType
          ? `typing.cast(${returnType}, ${value})`
          : value
      }`,
    );
  }

  private getLiftedProperties(resolver: TypeResolver): spec.Property[] {
    const liftedProperties: spec.Property[] = [];

    const stack = [this.liftedProp];
    const knownIfaces = new Set<string>();
    const knownProps = new Set<string>();
    for (
      let current = stack.shift();
      current != null;
      current = stack.shift()
    ) {
      knownIfaces.add(current.fqn);

      // Add any interfaces that this interface depends on, to the list.
      if (current.interfaces !== undefined) {
        for (const iface of current.interfaces) {
          if (knownIfaces.has(iface)) {
            continue;
          }
          stack.push(resolver.dereference(iface) as spec.InterfaceType);
          knownIfaces.add(iface);
        }
      }

      // Add all of the properties of this interface to our list of properties.
      if (current.properties !== undefined) {
        for (const prop of current.properties) {
          if (knownProps.has(prop.name)) {
            continue;
          }
          liftedProperties.push(prop);
          knownProps.add(prop.name);
        }
      }
    }

    return liftedProperties;
  }
}

interface BasePropertyOpts {
  abstract?: boolean;
  immutable?: boolean;
  isStatic?: boolean;
  parent: spec.NamedTypeReference;
}

interface BasePropertyEmitOpts {
  renderAbstract?: boolean;
  forceEmitBody?: boolean;
}

abstract class BaseProperty implements PythonBase {
  public readonly abstract: boolean;
  public readonly isStatic: boolean;

  protected abstract readonly decorator: string;
  protected abstract readonly implicitParameter: string;
  protected readonly jsiiGetMethod!: string;
  protected readonly jsiiSetMethod!: string;
  protected readonly shouldEmitBody: boolean = true;

  private readonly immutable: boolean;

  public constructor(
    private readonly generator: PythonGenerator,
    public readonly pythonName: string,
    private readonly jsName: string,
    private readonly type: spec.OptionalValue,
    public readonly docs: spec.Docs | undefined,
    opts: BasePropertyOpts,
  ) {
    const { abstract = false, immutable = false, isStatic = false } = opts;

    this.abstract = abstract;
    this.immutable = immutable;
    this.isStatic = isStatic;
  }

  public requiredImports(context: EmitContext): PythonImports {
    return toTypeName(this.type).requiredImports(context);
  }

  public emit(
    code: CodeMaker,
    context: EmitContext,
    opts?: BasePropertyEmitOpts,
  ) {
    const { renderAbstract = true, forceEmitBody = false } = opts ?? {};
    const pythonType = toTypeName(this.type).pythonType(context);

    // "# type: ignore[misc]" is needed because mypy cannot check decorated things
    code.line(`@${this.decorator} # type: ignore[misc]`);
    code.line(`@jsii.member(jsii_name="${this.jsName}")`);
    if (renderAbstract && this.abstract) {
      code.line('@abc.abstractmethod');
    }
    openSignature(
      code,
      'def',
      this.pythonName,
      [this.implicitParameter],
      true,
      pythonType,
    );
    this.generator.emitDocString(code, this.docs, {
      documentableItem: `prop-${this.pythonName}`,
    });
    if (
      (this.shouldEmitBody || forceEmitBody) &&
      (!renderAbstract || !this.abstract)
    ) {
      code.line(
        `return typing.cast(${pythonType}, jsii.${this.jsiiGetMethod}(${this.implicitParameter}, "${this.jsName}"))`,
      );
    } else {
      code.line('...');
    }
    code.closeBlock();

    if (!this.immutable) {
      code.line();
      code.line(
        `@${this.pythonName}.setter${
          this.isStatic ? ' # type: ignore[no-redef]' : ''
        }`,
      );
      if (renderAbstract && this.abstract) {
        code.line('@abc.abstractmethod');
      }
      openSignature(
        code,
        'def',
        this.pythonName,
        [this.implicitParameter, `value: ${pythonType}`],
        false,
        'None',
      );
      if (
        (this.shouldEmitBody || forceEmitBody) &&
        (!renderAbstract || !this.abstract)
      ) {
        code.line(
          `jsii.${this.jsiiSetMethod}(${this.implicitParameter}, "${this.jsName}", value)`,
        );
      } else {
        code.line('...');
      }
      code.closeBlock();
    }
  }
}

class Interface extends BasePythonClassType {
  public emit(code: CodeMaker, context: EmitContext) {
    context = nestedContext(context, this.fqn);
    emitList(code, '@jsii.interface(', [`jsii_type="${this.fqn}"`], ')');

    // First we do our normal class logic for emitting our members.
    super.emit(code, context);

    code.line();
    code.line();

    // Then, we have to emit a Proxy class which implements our proxy interface.
    const proxyBases: string[] = this.bases.map(
      (b) =>
        // "# type: ignore[misc]" because MyPy cannot check dynamic base classes (naturally)
        `jsii.proxy_for(${toTypeName(b).pythonType({
          ...context,
          typeAnnotation: false,
        })}) # type: ignore[misc]`,
    );
    openSignature(code, 'class', this.proxyClassName, proxyBases);
    this.generator.emitDocString(code, this.docs, {
      documentableItem: `class-${this.pythonName}`,
      trailingNewLine: true,
    });
    code.line(`__jsii_type__: typing.ClassVar[str] = "${this.fqn}"`);

    if (this.members.length > 0) {
      for (const member of this.members) {
        if (this.separateMembers) {
          code.line();
        }
        member.emit(code, context, { forceEmitBody: true });
      }
    } else {
      code.line('pass');
    }

    code.closeBlock();
    code.line();
    code.line(
      '# Adding a "__jsii_proxy_class__(): typing.Type" function to the interface',
    );
    code.line(
      `typing.cast(typing.Any, ${this.pythonName}).__jsii_proxy_class__ = lambda : ${this.proxyClassName}`,
    );

    if (this.fqn != null) {
      context.emittedTypes.add(this.fqn);
    }
  }

  protected getClassParams(context: EmitContext): string[] {
    const params: string[] = this.bases.map((b) =>
      toTypeName(b).pythonType({ ...context, typeAnnotation: false }),
    );

    params.push('typing_extensions.Protocol');

    return params;
  }

  private get proxyClassName(): string {
    return `_${this.pythonName}Proxy`;
  }
}

class InterfaceMethod extends BaseMethod {
  protected readonly implicitParameter: string = 'self';
  protected readonly jsiiMethod: string = 'invoke';
  protected readonly shouldEmitBody: boolean = false;
}

class InterfaceProperty extends BaseProperty {
  protected readonly decorator: string = 'builtins.property';
  protected readonly implicitParameter: string = 'self';
  protected readonly jsiiGetMethod: string = 'get';
  protected readonly jsiiSetMethod: string = 'set';
  protected readonly shouldEmitBody: boolean = false;
}

class Struct extends BasePythonClassType {
  protected directMembers = new Array<StructField>();

  public addMember(member: PythonBase): void {
    if (!(member instanceof StructField)) {
      throw new Error('Must add StructField to Struct');
    }
    this.directMembers.push(member);
  }

  public emit(code: CodeMaker, context: EmitContext) {
    context = nestedContext(context, this.fqn);
    const baseInterfaces = this.getClassParams(context);

    code.indent('@jsii.data_type(');
    code.line(`jsii_type=${JSON.stringify(this.fqn)},`);
    emitList(code, 'jsii_struct_bases=[', baseInterfaces, '],');
    assignDictionary(code, 'name_mapping', this.propertyMap(), ',', true);
    code.unindent(')');
    openSignature(code, 'class', this.pythonName, baseInterfaces);
    this.emitConstructor(code, context);

    for (const member of this.allMembers) {
      code.line();
      this.emitGetter(member, code, context);
    }

    this.emitMagicMethods(code);

    code.closeBlock();

    if (this.fqn != null) {
      context.emittedTypes.add(this.fqn);
    }
  }

  public requiredImports(context: EmitContext) {
    return mergePythonImports(
      super.requiredImports(context),
      ...this.allMembers.map((mem) => mem.requiredImports(context)),
    );
  }

  protected getClassParams(context: EmitContext): string[] {
    return this.bases.map((b) =>
      toTypeName(b).pythonType({ ...context, typeAnnotation: false }),
    );
  }

  /**
   * Find all fields (inherited as well)
   */
  private get allMembers(): StructField[] {
    return this.thisInterface.allProperties.map(
      (x) => new StructField(this.generator, x.spec),
    );
  }

  private get thisInterface() {
    if (this.fqn == null) {
      throw new Error('FQN not set');
    }
    return this.generator.reflectAssembly.system.findInterface(this.fqn);
  }

  private emitConstructor(code: CodeMaker, context: EmitContext) {
    const members = this.allMembers;

    const kwargs = members.map((m) => m.constructorDecl(context));

    const implicitParameter = slugifyAsNeeded(
      'self',
      members.map((m) => m.pythonName),
    );
    const constructorArguments =
      kwargs.length > 0
        ? [implicitParameter, '*', ...kwargs]
        : [implicitParameter];

    openSignature(code, 'def', '__init__', constructorArguments, false, 'None');
    this.emitConstructorDocstring(code);

    // Re-type struct arguments that were passed as "dict"
    for (const member of members.filter((m) => m.isStruct(this.generator))) {
      // Note that "None" is NOT an instance of dict (that's convenient!)
      const typeName = toTypeName(member.type.type).pythonType({
        ...context,
        typeAnnotation: false,
      });
      code.openBlock(`if isinstance(${member.pythonName}, dict)`);
      code.line(`${member.pythonName} = ${typeName}(**${member.pythonName})`);
      code.closeBlock();
    }

    // Required properties, those will always be put into the dict
    assignDictionary(
      code,
      `${implicitParameter}._values: typing.Dict[str, typing.Any]`,
      members
        .filter((m) => !m.optional)
        .map(
          (member) =>
            `${JSON.stringify(member.pythonName)}: ${member.pythonName}`,
        ),
    );

    // Optional properties, will only be put into the dict if they're not None
    for (const member of members.filter((m) => m.optional)) {
      code.openBlock(`if ${member.pythonName} is not None`);
      code.line(
        `${implicitParameter}._values["${member.pythonName}"] = ${member.pythonName}`,
      );
      code.closeBlock();
    }

    code.closeBlock();
  }

  private emitConstructorDocstring(code: CodeMaker) {
    const args: DocumentableArgument[] = this.allMembers.map((m) => ({
      name: m.pythonName,
      docs: m.docs,
    }));
    this.generator.emitDocString(code, this.docs, {
      arguments: args,
      documentableItem: `class-${this.pythonName}`,
    });
  }

  private emitGetter(
    member: StructField,
    code: CodeMaker,
    context: EmitContext,
  ) {
    const pythonType = member.typeAnnotation(context);

    code.line('@builtins.property');
    openSignature(code, 'def', member.pythonName, ['self'], true, pythonType);
    member.emitDocString(code);
    code.line(
      `result = self._values.get(${JSON.stringify(member.pythonName)})`,
    );
    if (!member.optional) {
      // Add an assertion to maye MyPY happy!
      code.line(
        `assert result is not None, "Required property '${member.pythonName}' is missing"`,
      );
    }
    code.line(`return typing.cast(${pythonType}, result)`);
    code.closeBlock();
  }

  private emitMagicMethods(code: CodeMaker) {
    code.line();
    code.openBlock('def __eq__(self, rhs: typing.Any) -> builtins.bool');
    code.line(
      'return isinstance(rhs, self.__class__) and rhs._values == self._values',
    );
    code.closeBlock();

    code.line();
    code.openBlock('def __ne__(self, rhs: typing.Any) -> builtins.bool');
    code.line('return not (rhs == self)');
    code.closeBlock();

    code.line();
    code.openBlock('def __repr__(self) -> str');
    code.indent(`return "${this.pythonName}(%s)" % ", ".join(`);
    code.line('k + "=" + repr(v) for k, v in self._values.items()');
    code.unindent(')');
    code.closeBlock();
  }

  private propertyMap() {
    const ret = new Array<string>();
    for (const member of this.allMembers) {
      ret.push(
        `${JSON.stringify(member.pythonName)}: ${JSON.stringify(
          member.jsiiName,
        )}`,
      );
    }
    return ret;
  }
}

class StructField implements PythonBase {
  public readonly pythonName: string;
  public readonly jsiiName: string;
  public readonly docs?: spec.Docs;
  public readonly type: spec.OptionalValue;

  public constructor(
    private readonly generator: PythonGenerator,
    public readonly prop: spec.Property,
  ) {
    this.pythonName = toPythonPropertyName(prop.name);
    this.jsiiName = prop.name;
    this.type = prop;
    this.docs = prop.docs;
  }

  public get optional(): boolean {
    return !!this.type.optional;
  }

  public requiredImports(context: EmitContext): PythonImports {
    return toTypeName(this.type).requiredImports(context);
  }

  public isStruct(generator: PythonGenerator): boolean {
    return isStruct(generator.reflectAssembly.system, this.type.type);
  }

  public constructorDecl(context: EmitContext) {
    const opt = this.optional ? ' = None' : '';
    return `${this.pythonName}: ${this.typeAnnotation({
      ...context,
      parameterType: true,
    })}${opt}`;
  }

  /**
   * Return the Python type annotation for this type
   */
  public typeAnnotation(context: EmitContext) {
    return toTypeName(this.type).pythonType(context);
  }

  public emitDocString(code: CodeMaker) {
    this.generator.emitDocString(code, this.docs, {
      documentableItem: `prop-${this.pythonName}`,
    });
  }

  public emit(code: CodeMaker, context: EmitContext) {
    const resolvedType = this.typeAnnotation(context);
    code.line(`${this.pythonName}: ${resolvedType}`);
    this.emitDocString(code);
  }
}

interface ClassOpts extends PythonTypeOpts {
  abstract?: boolean;
  interfaces?: spec.NamedTypeReference[];
  abstractBases?: spec.ClassType[];
}

class Class extends BasePythonClassType implements ISortableType {
  private readonly abstract: boolean;
  private readonly abstractBases: spec.ClassType[];
  private readonly interfaces: spec.NamedTypeReference[];

  public constructor(
    generator: PythonGenerator,
    name: string,
    fqn: string,
    opts: ClassOpts,
    docs: spec.Docs | undefined,
  ) {
    super(generator, name, fqn, opts, docs);

    const { abstract = false, interfaces = [], abstractBases = [] } = opts;

    this.abstract = abstract;
    this.interfaces = interfaces;
    this.abstractBases = abstractBases;
  }

  public dependsOn(resolver: TypeResolver): PythonType[] {
    const dependencies: PythonType[] = super.dependsOn(resolver);
    const parent = resolver.getParent(this.fqn!);

    // We need to return any ifaces that are in the same module at the same level of
    // nesting.
    const seen = new Set<string>();
    for (const iface of this.interfaces) {
      if (resolver.isInModule(iface)) {
        // Given a iface, we need to locate the ifaces's parent that is the same
        // as our parent, because we only care about dependencies that are at the
        // same level of our own.
        // TODO: We might need to recurse into our members to also find their
        //       dependencies.
        let ifaceItem = resolver.getType(iface);
        let ifaceParent = resolver.getParent(iface);
        while (ifaceParent !== parent) {
          ifaceItem = ifaceParent;
          ifaceParent = resolver.getParent(ifaceItem.fqn!);
        }

        if (!seen.has(ifaceItem.fqn!)) {
          dependencies.push(ifaceItem);
          seen.add(ifaceItem.fqn!);
        }
      }
    }

    return dependencies;
  }

  public requiredImports(context: EmitContext): PythonImports {
    return mergePythonImports(
      super.requiredImports(context), // Takes care of base & members
      ...this.interfaces.map((base) =>
        toTypeName(base).requiredImports(context),
      ),
    );
  }

  public emit(code: CodeMaker, context: EmitContext) {
    // First we emit our implments decorator
    if (this.interfaces.length > 0) {
      const interfaces: string[] = this.interfaces.map((b) =>
        toTypeName(b).pythonType({ ...context, typeAnnotation: false }),
      );
      code.line(`@jsii.implements(${interfaces.join(', ')})`);
    }

    // Then we do our normal class logic for emitting our members.
    super.emit(code, context);

    // Then, if our class is Abstract, we have to go through and redo all of
    // this logic, except only emiting abstract methods and properties as non
    // abstract, and subclassing our initial class.
    if (this.abstract) {
      context = nestedContext(context, this.fqn);

      const proxyBases = [this.pythonName];
      for (const base of this.abstractBases) {
        // "# type: ignore[misc]" because MyPy cannot check dynamic base classes (naturally)
        proxyBases.push(
          `jsii.proxy_for(${toTypeName(base).pythonType({
            ...context,
            typeAnnotation: false,
          })}) # type: ignore[misc]`,
        );
      }

      code.line();
      code.line();
      openSignature(code, 'class', this.proxyClassName, proxyBases);

      // Filter our list of members to *only* be abstract members, and not any
      // other types.
      const abstractMembers = this.members.filter(
        (m) =>
          (m instanceof BaseMethod || m instanceof BaseProperty) && m.abstract,
      );
      if (abstractMembers.length > 0) {
        let first = true;
        for (const member of abstractMembers) {
          if (this.separateMembers) {
            if (first) {
              first = false;
            } else {
              code.line();
            }
          }
          member.emit(code, context, { renderAbstract: false });
        }
      } else {
        code.line('pass');
      }

      code.closeBlock();
      code.line();
      code.line(
        '# Adding a "__jsii_proxy_class__(): typing.Type" function to the abstract class',
      );
      code.line(
        `typing.cast(typing.Any, ${this.pythonName}).__jsii_proxy_class__ = lambda : ${this.proxyClassName}`,
      );
    }
  }

  protected getClassParams(context: EmitContext): string[] {
    const params: string[] = this.bases.map((b) =>
      toTypeName(b).pythonType({ ...context, typeAnnotation: false }),
    );
    const metaclass: string = this.abstract ? 'JSIIAbstractClass' : 'JSIIMeta';

    params.push(`metaclass=jsii.${metaclass}`);
    params.push(`jsii_type="${this.fqn}"`);

    return params;
  }

  private get proxyClassName(): string {
    return `_${this.pythonName}Proxy`;
  }
}

class StaticMethod extends BaseMethod {
  protected readonly decorator?: string = 'builtins.classmethod';
  protected readonly implicitParameter: string = 'cls';
  protected readonly jsiiMethod: string = 'sinvoke';
}

class Initializer extends BaseMethod {
  protected readonly implicitParameter: string = 'self';
  protected readonly jsiiMethod: string = 'create';
  protected readonly classAsFirstParameter: boolean = true;
  protected readonly returnFromJSIIMethod: boolean = false;
}

class Method extends BaseMethod {
  protected readonly implicitParameter: string = 'self';
  protected readonly jsiiMethod: string = 'invoke';
}

class AsyncMethod extends BaseMethod {
  protected readonly implicitParameter: string = 'self';
  protected readonly jsiiMethod: string = 'ainvoke';
}

class StaticProperty extends BaseProperty {
  protected readonly decorator: string = 'jsii.python.classproperty';
  protected readonly implicitParameter: string = 'cls';
  protected readonly jsiiGetMethod: string = 'sget';
  protected readonly jsiiSetMethod: string = 'sset';
}

class Property extends BaseProperty {
  protected readonly decorator: string = 'builtins.property';
  protected readonly implicitParameter: string = 'self';
  protected readonly jsiiGetMethod: string = 'get';
  protected readonly jsiiSetMethod: string = 'set';
}

class Enum extends BasePythonClassType {
  protected readonly separateMembers = false;

  public emit(code: CodeMaker, context: EmitContext) {
    context = nestedContext(context, this.fqn);
    emitList(code, '@jsii.enum(', [`jsii_type="${this.fqn}"`], ')');
    return super.emit(code, context);
  }

  protected getClassParams(_context: EmitContext): string[] {
    return ['enum.Enum'];
  }

  public requiredImports(context: EmitContext): PythonImports {
    return super.requiredImports(context);
  }
}

class EnumMember implements PythonBase {
  public constructor(
    private readonly generator: PythonGenerator,
    public readonly pythonName: string,
    private readonly value: string,
    public readonly docs: spec.Docs | undefined,
  ) {
    this.pythonName = pythonName;
    this.value = value;
  }

  public dependsOnModules() {
    return new Set<string>();
  }

  public emit(code: CodeMaker, _context: EmitContext) {
    code.line(`${this.pythonName} = "${this.value}"`);
    this.generator.emitDocString(code, this.docs, {
      documentableItem: `enum-${this.pythonName}`,
    });
  }

  public requiredImports(_context: EmitContext): PythonImports {
    return {};
  }
}

interface ModuleOpts {
  readonly assembly: spec.Assembly;
  readonly assemblyFilename: string;
  readonly loadAssembly?: boolean;
  readonly package?: Package;

  /**
   * The docstring to emit at the top of this module, if any.
   */
  readonly moduleDocumentation?: string;
}

/**
 * Python module
 *
 * Will be called for jsii submodules and namespaces.
 */
class PythonModule implements PythonType {
  /**
   * Converted to put on the module
   *
   * The format is in markdown, with code samples converted from TS to Python.
   */
  public readonly moduleDocumentation?: string;

  private readonly assembly: spec.Assembly;
  private readonly assemblyFilename: string;
  private readonly loadAssembly: boolean;
  private readonly members = new Array<PythonBase>();

  public constructor(
    public readonly pythonName: string,
    public readonly fqn: string | undefined,
    opts: ModuleOpts,
  ) {
    this.assembly = opts.assembly;
    this.assemblyFilename = opts.assemblyFilename;
    this.loadAssembly = !!opts.loadAssembly;
    this.moduleDocumentation = opts.moduleDocumentation;
  }

  public addMember(member: PythonBase) {
    this.members.push(member);
  }

  public requiredImports(context: EmitContext): PythonImports {
    return mergePythonImports(
      ...this.members.map((mem) => mem.requiredImports(context)),
    );
  }

  public emit(code: CodeMaker, context: EmitContext) {
    this.emitModuleDocumentation(code);

    const resolver = this.fqn
      ? context.resolver.bind(this.fqn, this.pythonName)
      : context.resolver;
    context = {
      ...context,
      submodule: this.fqn ?? context.submodule,
      resolver,
    };

    // Before we write anything else, we need to write out our module headers, this
    // is where we handle stuff like imports, any required initialization, etc.
    code.line('import abc');
    code.line('import builtins');
    code.line('import datetime');
    code.line('import enum');
    code.line('import typing');
    code.line();
    code.line('import jsii');
    code.line('import publication');
    code.line('import typing_extensions');

    // Determine if we need to write out the kernel load line.
    if (this.loadAssembly) {
      this.emitDependencyImports(code);

      code.line();
      emitList(
        code,
        '__jsii_assembly__ = jsii.JSIIAssembly.load(',
        [
          JSON.stringify(this.assembly.name),
          JSON.stringify(this.assembly.version),
          '__name__[0:-6]',
          `${JSON.stringify(this.assemblyFilename)}`,
        ],
        ')',
      );
    } else {
      // Then we must import the ._jsii subpackage.
      code.line();
      let distanceFromRoot = 0;
      for (
        let curr = this.fqn!;
        curr !== this.assembly.name;
        curr = curr.substring(0, curr.lastIndexOf('.'))
      ) {
        distanceFromRoot++;
      }
      code.line(`from ${'.'.repeat(distanceFromRoot + 1)}_jsii import *`);

      this.emitRequiredImports(code, context);
    }

    // Emit all of our members.
    for (const member of prepareMembers(this.members, resolver)) {
      code.line();
      code.line();
      member.emit(code, context);
    }

    // Whatever names we've exported, we'll write out our __all__ that lists them.
    const exportedMembers = this.members.map((m) => `"${m.pythonName}"`);
    if (this.loadAssembly) {
      exportedMembers.push('"__jsii_assembly__"');
    }

    // Declare the list of "public" members this module exports
    if (this.members.length > 0) {
      code.line();
    }
    code.line();

    if (exportedMembers.length > 0) {
      code.indent('__all__ = [');
      for (const member of exportedMembers.sort()) {
        // Writing one by line might be _a lot_ of lines, but it'll make reviewing changes to the list easier. Trust me.
        code.line(`${member},`);
      }
      code.unindent(']');
    } else {
      code.line('__all__: typing.List[typing.Any] = []');
    }

    // Finally, we'll use publication to ensure that all of the non-public names
    // get hidden from dir(), tab-complete, etc.
    code.line();
    code.line('publication.publish()');
  }

  /**
   * Emit the bin scripts if bin section defined.
   */
  public emitBinScripts(code: CodeMaker): string[] {
    const scripts = new Array<string>();
    if (this.loadAssembly) {
      if (this.assembly.bin != null) {
        for (const name of Object.keys(this.assembly.bin)) {
          const script_file = path.join(
            'src',
            pythonModuleNameToFilename(this.pythonName),
            'bin',
            name,
          );
          code.openFile(script_file);
          code.line('#!/usr/bin/env python');
          code.line();
          code.line('import jsii');
          code.line('import sys');
          code.line();
          emitList(
            code,
            '__jsii_assembly__ = jsii.JSIIAssembly.load(',
            [
              JSON.stringify(this.assembly.name),
              JSON.stringify(this.assembly.version),
              JSON.stringify(this.pythonName.replace('._jsii', '')),
              `${JSON.stringify(this.assemblyFilename)}`,
            ],
            ')',
          );
          code.line();
          emitList(
            code,
            '__jsii_assembly__.invokeBinScript(',
            [
              JSON.stringify(this.assembly.name),
              JSON.stringify(name),
              'sys.argv[1:]',
            ],
            ')',
          );
          code.closeFile(script_file);
          scripts.push(script_file.replace(/\\/g, '/'));
        }
      }
    }
    return scripts;
  }

  /**
   * Emit the README as module docstring if this is the entry point module (it loads the assembly)
   */
  private emitModuleDocumentation(code: CodeMaker) {
    if (this.moduleDocumentation) {
      code.line(DOCSTRING_QUOTES);
      code.line(this.moduleDocumentation);
      code.line(DOCSTRING_QUOTES);
    }
  }

  private emitDependencyImports(code: CodeMaker) {
    // Collect all the (direct) dependencies' ._jsii packages.
    const deps = Object.keys(this.assembly.dependencies ?? {})
      .map(
        (dep) =>
          this.assembly.dependencyClosure?.[dep]?.targets?.python?.module ??
          die(`No Python target was configrued for the dependency "${dep}".`),
      )
      .map((mod) => `${mod}._jsii`)
      .sort();

    // Now actually write the import statements...
    if (deps.length > 0) {
      code.line();
      for (const moduleName of deps) {
        code.line(`import ${moduleName}`);
      }
    }
  }

  private emitRequiredImports(code: CodeMaker, context: EmitContext) {
    const requiredImports = this.requiredImports(context);
    const statements = Object.entries(requiredImports)
      .map(([sourcePackage, items]) => toImportStatements(sourcePackage, items))
      .reduce(
        (acc, elt) => [...acc, ...elt],
        new Array<{ emit: () => void; comparisonBase: string }>(),
      )
      .sort(importComparator);

    if (statements.length > 0) {
      code.line();
    }
    for (const statement of statements) {
      statement.emit(code);
    }

    function toImportStatements(
      sourcePkg: string,
      items: ReadonlySet<string>,
    ): Array<{ emit: (code: CodeMaker) => void; comparisonBase: string }> {
      const result = new Array<{
        emit: (code: CodeMaker) => void;
        comparisonBase: string;
      }>();
      if (items.has('')) {
        result.push({
          comparisonBase: `import ${sourcePkg}`,
          emit(code) {
            code.line(this.comparisonBase);
          },
        });
      }
      const pieceMeal = Array.from(items)
        .filter((i) => i !== '')
        .sort();
      if (pieceMeal.length > 0) {
        result.push({
          comparisonBase: `from ${sourcePkg} import`,
          emit: (code) =>
            emitList(code, `from ${sourcePkg} import `, pieceMeal, '', {
              ifMulti: ['(', ')'],
            }),
        });
      }
      return result;
    }

    function importComparator(
      left: { comparisonBase: string },
      right: { comparisonBase: string },
    ) {
      if (
        left.comparisonBase.startsWith('import') ===
        right.comparisonBase.startsWith('import')
      ) {
        return left.comparisonBase.localeCompare(right.comparisonBase);
      }
      // We want "from .foo import (...)" to be *after* "import bar"
      return right.comparisonBase.localeCompare(left.comparisonBase);
    }
  }
}

interface PackageData {
  filename: string;
  data: string | undefined;
}

class Package {
  /**
   * The PythonModule that represents the root module of the package
   */
  public rootModule?: PythonModule;

  public readonly name: string;
  public readonly version: string;
  public readonly metadata: spec.Assembly;

  private readonly modules = new Map<string, PythonModule>();
  private readonly data = new Map<string, PackageData[]>();

  public constructor(name: string, version: string, metadata: spec.Assembly) {
    this.name = name;
    this.version = version;
    this.metadata = metadata;
  }

  public addModule(module: PythonModule) {
    this.modules.set(module.pythonName, module);

    // This is the module that represents the assembly
    if (module.fqn === this.metadata.name) {
      this.rootModule = module;
    }
  }

  public addData(
    module: PythonModule,
    filename: string,
    data: string | undefined,
  ) {
    if (!this.data.has(module.pythonName)) {
      this.data.set(module.pythonName, []);
    }

    this.data.get(module.pythonName)!.push({ filename, data });
  }

  public write(code: CodeMaker, context: EmitContext) {
    const modules = [...this.modules.values()].sort((a, b) =>
      a.pythonName.localeCompare(b.pythonName),
    );

    const scripts = new Array<string>();

    // Iterate over all of our modules, and write them out to disk.
    for (const mod of modules) {
      const filename = path.join(
        'src',
        pythonModuleNameToFilename(mod.pythonName),
        '__init__.py',
      );

      code.openFile(filename);
      mod.emit(code, context);
      code.closeFile(filename);

      scripts.push(...mod.emitBinScripts(code));
    }

    // Handle our package data.
    const packageData: { [key: string]: string[] } = {};
    for (const [mod, pdata] of this.data) {
      for (const data of pdata) {
        if (data.data != null) {
          const filepath = path.join(
            'src',
            pythonModuleNameToFilename(mod),
            data.filename,
          );

          code.openFile(filepath);
          code.line(data.data);
          code.closeFile(filepath);
        }
      }

      packageData[mod] = pdata.map((pd) => pd.filename);
    }

    // Compute our list of dependencies
    const dependencies: string[] = [];
    for (const [depName, version] of Object.entries(
      this.metadata.dependencies ?? {},
    )) {
      const depInfo = this.metadata.dependencyClosure![depName];
      dependencies.push(
        `${depInfo.targets!.python!.distName}${toPythonVersionRange(version)}`,
      );
    }

    // Need to always write this file as the build process depends on it.
    // Make up some contents if we don't have anything useful to say.
    code.openFile('README.md');
    code.line(
      this.rootModule?.moduleDocumentation ??
        `${this.name}\n${'='.repeat(this.name.length)}`,
    );
    code.closeFile('README.md');

    // Strip " (build abcdef)" from the jsii version
    const jsiiVersionSimple = this.metadata.jsiiVersion.replace(/ .*$/, '');

    const setupKwargs = {
      name: this.name,
      version: this.version,
      description: this.metadata.description,
      license: this.metadata.license,
      url: this.metadata.homepage,
      long_description_content_type: 'text/markdown',
      author:
        this.metadata.author.name +
        (this.metadata.author.email !== undefined
          ? `<${this.metadata.author.email}>`
          : ''),
      bdist_wheel: {
        universal: true,
      },
      project_urls: {
        Source: this.metadata.repository.url,
      },
      package_dir: { '': 'src' },
      packages: modules.map((m) => m.pythonName),
      package_data: packageData,
      python_requires: '>=3.6',
      install_requires: [
        `jsii${toPythonVersionRange(`^${jsiiVersionSimple}`)}`,
        'publication>=0.0.3',
      ]
        .concat(dependencies)
        .sort(),
      classifiers: [
        'Intended Audience :: Developers',
        'Operating System :: OS Independent',
        'Programming Language :: JavaScript',
        'Programming Language :: Python :: 3 :: Only',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Typing :: Typed',
      ],
      scripts,
    };

    switch (this.metadata.docs?.stability) {
      case spec.Stability.Experimental:
        setupKwargs.classifiers.push('Development Status :: 4 - Beta');
        break;
      case spec.Stability.Stable:
        setupKwargs.classifiers.push(
          'Development Status :: 5 - Production/Stable',
        );
        break;
      case spec.Stability.Deprecated:
        setupKwargs.classifiers.push('Development Status :: 7 - Inactive');
        break;
      default:
      // No 'Development Status' trove classifier for you!
    }

    if (spdxLicenseList[this.metadata.license]?.osiApproved) {
      setupKwargs.classifiers.push('License :: OSI Approved');
    }

    const additionalClassifiers = this.metadata.targets?.python?.classifiers;
    if (additionalClassifiers != null) {
      if (!Array.isArray(additionalClassifiers)) {
        throw new Error(
          `The "jsii.targets.python.classifiers" value must be an array of strings if provided, but found ${JSON.stringify(
            additionalClassifiers,
            null,
            2,
          )}`,
        );
      }
      // We discourage using those since we automatically set a value for them
      for (let classifier of additionalClassifiers.sort()) {
        if (typeof classifier !== 'string') {
          throw new Error(
            `The "jsii.targets.python.classifiers" value can only contain strings, but found ${JSON.stringify(
              classifier,
              null,
              2,
            )}`,
          );
        }
        // We'll split on `::` and re-join later so classifiers are "normalized" to a standard spacing
        const parts = classifier.split('::').map((part) => part.trim());
        const reservedClassifiers = [
          'Development Status',
          'License',
          'Operating System',
          'Typing',
        ];
        if (reservedClassifiers.includes(parts[0])) {
          warn(
            `Classifiers starting with ${reservedClassifiers
              .map((x) => `"${x} ::"`)
              .join(
                ', ',
              )} are automatically set and should not be manually configured`,
          );
        }
        classifier = parts.join(' :: ');
        if (setupKwargs.classifiers.includes(classifier)) {
          continue;
        }
        setupKwargs.classifiers.push(classifier);
      }
    }

    // We Need a setup.py to make this Package, actually a Package.
    code.openFile('setup.py');
    code.line('import json');
    code.line('import setuptools');
    code.line();
    code.line('kwargs = json.loads(');
    code.line('    """');
    code.line(JSON.stringify(setupKwargs, null, 4));
    code.line('"""');
    code.line(')');
    code.line();
    code.openBlock('with open("README.md", encoding="utf8") as fp');
    code.line('kwargs["long_description"] = fp.read()');
    code.closeBlock();
    code.line();
    code.line();
    code.line('setuptools.setup(**kwargs)');
    code.closeFile('setup.py');

    // Because we're good citizens, we're going to go ahead and support pyproject.toml
    // as well.
    // TODO: Might be easier to just use a TOML library to write this out.
    code.openFile('pyproject.toml');
    code.line('[build-system]');
    const buildTools = fs
      .readFileSync(requirementsFile, { encoding: 'utf-8' })
      .split('\n')
      .map((line) => /^\s*(.+)\s*#\s*build-system\s*$/.exec(line)?.[1]?.trim())
      .reduce(
        (buildTools, entry) => (entry ? [...buildTools, entry] : buildTools),
        new Array<string>(),
      );
    code.line(`requires = [${buildTools.map((x) => `"${x}"`).join(', ')}]`);
    code.line('build-backend = "setuptools.build_meta"');
    code.closeFile('pyproject.toml');

    // We also need to write out a MANIFEST.in to ensure that all of our required
    // files are included.
    code.openFile('MANIFEST.in');
    code.line('include pyproject.toml');
    code.closeFile('MANIFEST.in');
  }
}

type FindModuleCallback = (fqn: string) => spec.AssemblyConfiguration;
type FindTypeCallback = (fqn: string) => spec.Type;

class TypeResolver {
  private readonly types: Map<string, PythonType>;
  private readonly boundTo?: string;
  private readonly boundRe!: RegExp;
  private readonly moduleName?: string;
  private readonly moduleRe!: RegExp;
  private readonly findModule: FindModuleCallback;
  private readonly findType: FindTypeCallback;

  public constructor(
    types: Map<string, PythonType>,
    findModule: FindModuleCallback,
    findType: FindTypeCallback,
    boundTo?: string,
    moduleName?: string,
  ) {
    this.types = types;
    this.findModule = findModule;
    this.findType = findType;
    this.moduleName = moduleName;
    this.boundTo = boundTo !== undefined ? this.toPythonFQN(boundTo) : boundTo;

    if (this.moduleName !== undefined) {
      this.moduleRe = new RegExp(
        `^(${escapeStringRegexp(this.moduleName)})\\.(.+)$`,
      );
    }

    if (this.boundTo !== undefined) {
      this.boundRe = new RegExp(
        `^(${escapeStringRegexp(this.boundTo)})\\.(.+)$`,
      );
    }
  }

  public bind(fqn: string, moduleName?: string): TypeResolver {
    return new TypeResolver(
      this.types,
      this.findModule,
      this.findType,
      fqn,
      moduleName !== undefined
        ? moduleName.startsWith('.')
          ? `${this.moduleName}${moduleName}`
          : moduleName
        : this.moduleName,
    );
  }

  public isInModule(typeRef: spec.NamedTypeReference | string): boolean {
    const pythonType =
      typeof typeRef !== 'string' ? this.toPythonFQN(typeRef.fqn) : typeRef;
    return this.moduleRe.test(pythonType);
  }

  public isInNamespace(typeRef: spec.NamedTypeReference | string): boolean {
    const pythonType =
      typeof typeRef !== 'string' ? this.toPythonFQN(typeRef.fqn) : typeRef;
    return this.boundRe.test(pythonType);
  }

  public getParent(typeRef: spec.NamedTypeReference | string): PythonType {
    const fqn = typeof typeRef !== 'string' ? typeRef.fqn : typeRef;
    const matches = /^(.+)\.[^.]+$/.exec(fqn);
    if (matches == null || !Array.isArray(matches)) {
      throw new Error(`Invalid FQN: ${fqn}`);
    }
    const [, parentFQN] = matches;
    const parent = this.types.get(parentFQN);

    if (parent === undefined) {
      throw new Error(`Could not find parent:  ${parentFQN}`);
    }

    return parent;
  }

  public getDefiningPythonModule(
    typeRef: spec.NamedTypeReference | string,
  ): string {
    const fqn = typeof typeRef !== 'string' ? typeRef.fqn : typeRef;
    const parent = this.types.get(fqn);

    if (parent) {
      let mod = parent;
      while (!(mod instanceof PythonModule)) {
        mod = this.getParent(mod.fqn!);
      }
      return mod.pythonName;
    }

    const matches = /^([^.]+)\./.exec(fqn);
    if (matches == null || !Array.isArray(matches)) {
      throw new Error(`Invalid FQN: ${fqn}`);
    }
    const [, assm] = matches;
    return this.findModule(assm).targets!.python!.module;
  }

  public getType(typeRef: spec.NamedTypeReference): PythonType {
    const type = this.types.get(typeRef.fqn);

    if (type === undefined) {
      throw new Error(`Could not locate type: "${typeRef.fqn}"`);
    }

    return type;
  }

  public dereference(typeRef: string | spec.NamedTypeReference): spec.Type {
    if (typeof typeRef !== 'string') {
      typeRef = typeRef.fqn;
    }
    return this.findType(typeRef);
  }

  private toPythonFQN(fqn: string): string {
    const [assemblyName, ...qualifiedIdentifiers] = fqn.split('.');
    const fqnParts: string[] = [
      this.findModule(assemblyName).targets!.python!.module,
    ];

    for (const part of qualifiedIdentifiers) {
      fqnParts.push(toPythonIdentifier(part));
    }

    return fqnParts.join('.');
  }
}

class PythonGenerator extends Generator {
  private package!: Package;
  private readonly types: Map<string, PythonType>;

  public constructor(
    private readonly rosetta: Rosetta,
    options: GeneratorOptions = {},
  ) {
    super(options);

    this.code.openBlockFormatter = (s) => `${s}:`;
    this.code.closeBlockFormatter = (_s) => false;

    this.types = new Map();
  }

  // eslint-disable-next-line complexity
  public emitDocString(
    code: CodeMaker,
    docs: spec.Docs | undefined,
    options: {
      arguments?: DocumentableArgument[];
      documentableItem?: string;
      trailingNewLine?: boolean;
    } = {},
  ) {
    if ((!docs || Object.keys(docs).length === 0) && !options.arguments) {
      return;
    }
    if (!docs) {
      docs = {};
    }

    const lines = new Array<string>();

    if (docs.summary) {
      lines.push(md2rst(renderSummary(docs)));
      brk();
    } else {
      lines.push('');
    }

    function brk() {
      if (lines.length > 0 && lines[lines.length - 1].trim() !== '') {
        lines.push('');
      }
    }

    function block(heading: string, content: string, doBrk = true) {
      if (doBrk) {
        brk();
      }
      const contentLines = md2rst(content).split('\n');
      if (contentLines.length <= 1) {
        lines.push(`:${heading}: ${contentLines.join('')}`.trim());
      } else {
        lines.push(`:${heading}:`);
        brk();
        for (const line of contentLines) {
          lines.push(line.trim());
        }
      }
      if (doBrk) {
        brk();
      }
    }

    if (docs.remarks) {
      brk();
      lines.push(
        ...md2rst(this.convertMarkdown(docs.remarks ?? '')).split('\n'),
      );
      brk();
    }

    if (options.arguments?.length ?? 0 > 0) {
      brk();
      for (const param of options.arguments!) {
        // Add a line for every argument. Even if there is no description, we need
        // the docstring so that the Sphinx extension can add the type annotations.
        lines.push(
          `:param ${toPythonParameterName(param.name)}: ${onelineDescription(
            param.docs,
          )}`,
        );
      }
      brk();
    }

    if (docs.default) {
      block('default', docs.default);
    }
    if (docs.returns) {
      block('return', docs.returns);
    }
    if (docs.deprecated) {
      block('deprecated', docs.deprecated);
    }
    if (docs.see) {
      block('see', docs.see, false);
    }
    if (docs.stability && shouldMentionStability(docs.stability)) {
      block('stability', docs.stability, false);
    }
    if (docs.subclassable) {
      block('subclassable', 'Yes');
    }

    for (const [k, v] of Object.entries(docs.custom ?? {})) {
      block(k, v, false);
    }

    if (docs.example) {
      brk();
      lines.push('Example::');
      lines.push('');
      const exampleText = this.convertExample(docs.example);

      for (const line of exampleText.split('\n')) {
        lines.push(`    ${line}`);
      }
      brk();
    }

    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    if (lines.length === 0) {
      return;
    }

    if (lines.length === 1) {
      code.line(`${DOCSTRING_QUOTES}${lines[0]}${DOCSTRING_QUOTES}`);
    } else {
      code.line(`${DOCSTRING_QUOTES}${lines[0]}`);
      lines.splice(0, 1);

      for (const line of lines) {
        code.line(line);
      }

      code.line(DOCSTRING_QUOTES);
    }
    if (options.trailingNewLine) {
      code.line();
    }
  }

  public convertExample(example: string): string {
    const snippet = typeScriptSnippetFromSource(
      example,
      'example',
      enforcesStrictMode(this.assembly),
    );
    const translated = this.rosetta.translateSnippet(snippet, 'python');
    if (!translated) {
      return example;
    }
    return this.prefixDisclaimer(translated);
  }

  public convertMarkdown(markdown: string): string {
    return this.rosetta.translateSnippetsInMarkdown(
      markdown,
      'python',
      enforcesStrictMode(this.assembly),
      (trans) => ({
        language: trans.language,
        source: this.prefixDisclaimer(trans),
      }),
    );
  }

  private prefixDisclaimer(translated: Translation) {
    if (translated.didCompile && INCOMPLETE_DISCLAIMER_COMPILING) {
      return `# ${INCOMPLETE_DISCLAIMER_COMPILING}\n${translated.source}`;
    }
    if (!translated.didCompile && INCOMPLETE_DISCLAIMER_NONCOMPILING) {
      return `# ${INCOMPLETE_DISCLAIMER_NONCOMPILING}\n${translated.source}`;
    }
    return translated.source;
  }

  public getPythonType(fqn: string): PythonType {
    const type = this.types.get(fqn);

    if (type === undefined) {
      throw new Error(`Could not locate type: "${fqn}"`);
    }

    return type;
  }

  protected getAssemblyOutputDir(assm: spec.Assembly) {
    return path.join(
      'src',
      pythonModuleNameToFilename(this.getAssemblyModuleName(assm)),
    );
  }

  protected onBeginAssembly(assm: spec.Assembly, _fingerprint: boolean) {
    this.package = new Package(
      assm.targets!.python!.distName,
      toReleaseVersion(assm.version, TargetName.PYTHON),
      assm,
    );

    // This is the '<packagename>._jsii' module for this assembly
    const assemblyModule = new PythonModule(
      this.getAssemblyModuleName(assm),
      undefined,
      {
        assembly: assm,
        assemblyFilename: this.getAssemblyFileName(),
        loadAssembly: true,
        package: this.package,
      },
    );

    this.package.addModule(assemblyModule);
    this.package.addData(assemblyModule, this.getAssemblyFileName(), undefined);
  }

  protected onEndAssembly(assm: spec.Assembly, _fingerprint: boolean) {
    const resolver = new TypeResolver(
      this.types,
      (fqn: string) => this.findModule(fqn),
      (fqn: string) => this.findType(fqn),
    );
    this.package.write(this.code, {
      assembly: assm,
      emittedTypes: new Set(),
      resolver,
      submodule: assm.name,
    });
  }

  /**
   * Will be called for assembly root, namespaces and submodules (anything that contains other types, based on its FQN)
   */
  protected onBeginNamespace(ns: string) {
    // 'ns' contains something like '@scope/jsii-calc-base-of-base'
    const submoduleLike =
      ns === this.assembly.name
        ? this.assembly
        : this.assembly.submodules?.[ns];

    const module = new PythonModule(toPackageName(ns, this.assembly), ns, {
      assembly: this.assembly,
      assemblyFilename: this.getAssemblyFileName(),
      package: this.package,
      moduleDocumentation: submoduleLike?.readme
        ? this.convertMarkdown(submoduleLike.readme?.markdown).trim()
        : undefined,
    });

    this.package.addModule(module);
    this.types.set(ns, module);
    if (ns === this.assembly.name) {
      // This applies recursively to submodules, so no need to duplicate!
      this.package.addData(module, 'py.typed', '');
    }
  }

  protected onBeginClass(cls: spec.ClassType, abstract: boolean | undefined) {
    const klass = new Class(
      this,
      toPythonIdentifier(cls.name),
      cls.fqn,
      {
        abstract,
        bases: cls.base ? [this.findType(cls.base)] : undefined,
        interfaces: cls.interfaces?.map((base) => this.findType(base)),
        abstractBases: abstract ? this.getAbstractBases(cls) : [],
      },
      cls.docs,
    );

    if (cls.initializer !== undefined) {
      const { parameters = [] } = cls.initializer;

      klass.addMember(
        new Initializer(
          this,
          '__init__',
          undefined,
          parameters,
          undefined,
          cls.initializer.docs,
          { liftedProp: this.getliftedProp(cls.initializer), parent: cls },
        ),
      );
    }

    this.addPythonType(klass);
  }

  protected onStaticMethod(cls: spec.ClassType, method: spec.Method) {
    const { parameters = [] } = method;

    this.getPythonType(cls.fqn).addMember(
      new StaticMethod(
        this,
        toPythonMethodName(method.name),
        method.name,
        parameters,
        method.returns,
        method.docs,
        {
          abstract: method.abstract,
          liftedProp: this.getliftedProp(method),
          parent: cls,
        },
      ),
    );
  }

  protected onStaticProperty(cls: spec.ClassType, prop: spec.Property) {
    this.getPythonType(cls.fqn).addMember(
      new StaticProperty(
        this,
        toPythonPropertyName(prop.name, prop.const),
        prop.name,
        prop,
        prop.docs,
        {
          abstract: prop.abstract,
          immutable: prop.immutable,
          isStatic: prop.static,
          parent: cls,
        },
      ),
    );
  }

  protected onMethod(cls: spec.ClassType, method: spec.Method) {
    const { parameters = [] } = method;

    if (method.async) {
      this.getPythonType(cls.fqn).addMember(
        new AsyncMethod(
          this,
          toPythonMethodName(method.name, method.protected),
          method.name,
          parameters,
          method.returns,
          method.docs,
          {
            abstract: method.abstract,
            liftedProp: this.getliftedProp(method),
            parent: cls,
          },
        ),
      );
    } else {
      this.getPythonType(cls.fqn).addMember(
        new Method(
          this,
          toPythonMethodName(method.name, method.protected),
          method.name,
          parameters,
          method.returns,
          method.docs,
          {
            abstract: method.abstract,
            liftedProp: this.getliftedProp(method),
            parent: cls,
          },
        ),
      );
    }
  }

  protected onProperty(cls: spec.ClassType, prop: spec.Property) {
    this.getPythonType(cls.fqn).addMember(
      new Property(
        this,
        toPythonPropertyName(prop.name, prop.const, prop.protected),
        prop.name,
        prop,
        prop.docs,
        {
          abstract: prop.abstract,
          immutable: prop.immutable,
          isStatic: prop.static,
          parent: cls,
        },
      ),
    );
  }

  protected onUnionProperty(
    cls: spec.ClassType,
    prop: spec.Property,
    _union: spec.UnionTypeReference,
  ) {
    this.onProperty(cls, prop);
  }

  protected onBeginInterface(ifc: spec.InterfaceType) {
    let iface: Interface | Struct;

    if (ifc.datatype) {
      iface = new Struct(
        this,
        toPythonIdentifier(ifc.name),
        ifc.fqn,
        { bases: ifc.interfaces?.map((base) => this.findType(base)) },
        ifc.docs,
      );
    } else {
      iface = new Interface(
        this,
        toPythonIdentifier(ifc.name),
        ifc.fqn,
        { bases: ifc.interfaces?.map((base) => this.findType(base)) },
        ifc.docs,
      );
    }

    this.addPythonType(iface);
  }

  protected onEndInterface(_ifc: spec.InterfaceType) {
    return;
  }

  protected onInterfaceMethod(ifc: spec.InterfaceType, method: spec.Method) {
    const { parameters = [] } = method;

    this.getPythonType(ifc.fqn).addMember(
      new InterfaceMethod(
        this,
        toPythonMethodName(method.name, method.protected),
        method.name,
        parameters,
        method.returns,
        method.docs,
        { liftedProp: this.getliftedProp(method), parent: ifc },
      ),
    );
  }

  protected onInterfaceProperty(ifc: spec.InterfaceType, prop: spec.Property) {
    let ifaceProperty: InterfaceProperty | StructField;

    if (ifc.datatype) {
      ifaceProperty = new StructField(this, prop);
    } else {
      ifaceProperty = new InterfaceProperty(
        this,
        toPythonPropertyName(prop.name, prop.const, prop.protected),
        prop.name,
        prop,
        prop.docs,
        { immutable: prop.immutable, isStatic: prop.static, parent: ifc },
      );
    }

    this.getPythonType(ifc.fqn).addMember(ifaceProperty);
  }

  protected onBeginEnum(enm: spec.EnumType) {
    this.addPythonType(
      new Enum(this, toPythonIdentifier(enm.name), enm.fqn, {}, enm.docs),
    );
  }

  protected onEnumMember(enm: spec.EnumType, member: spec.EnumMember) {
    this.getPythonType(enm.fqn).addMember(
      new EnumMember(
        this,
        toPythonIdentifier(member.name),
        member.name,
        member.docs,
      ),
    );
  }

  protected onInterfaceMethodOverload(
    _ifc: spec.InterfaceType,
    _overload: spec.Method,
    _originalMethod: spec.Method,
  ) {
    throw new Error('Unhandled Type: InterfaceMethodOverload');
  }

  protected onMethodOverload(
    _cls: spec.ClassType,
    _overload: spec.Method,
    _originalMethod: spec.Method,
  ) {
    throw new Error('Unhandled Type: MethodOverload');
  }

  protected onStaticMethodOverload(
    _cls: spec.ClassType,
    _overload: spec.Method,
    _originalMethod: spec.Method,
  ) {
    throw new Error('Unhandled Type: StaticMethodOverload');
  }

  private getAssemblyModuleName(assm: spec.Assembly): string {
    return `${assm.targets!.python!.module}._jsii`;
  }

  private getParentFQN(fqn: string): string {
    const m = /^(.+)\.[^.]+$/.exec(fqn);

    if (m == null) {
      throw new Error(`Could not determine parent FQN of: ${fqn}`);
    }

    return m[1];
  }

  private getParent(fqn: string): PythonType {
    return this.getPythonType(this.getParentFQN(fqn));
  }

  private addPythonType(type: PythonType) {
    if (type.fqn == null) {
      throw new Error('Cannot add a Python type without a FQN.');
    }

    this.getParent(type.fqn).addMember(type);
    this.types.set(type.fqn, type);
  }

  private getliftedProp(
    method: spec.Method | spec.Initializer,
  ): spec.InterfaceType | undefined {
    // If there are parameters to this method, and if the last parameter's type is
    // a datatype interface, then we want to lift the members of that last paramter
    // as keyword arguments to this function.
    if (method.parameters?.length ?? 0 >= 1) {
      const lastParameter = method.parameters!.slice(-1)[0];
      if (
        !lastParameter.variadic &&
        spec.isNamedTypeReference(lastParameter.type)
      ) {
        const lastParameterType = this.findType(lastParameter.type.fqn);
        if (
          spec.isInterfaceType(lastParameterType) &&
          lastParameterType.datatype
        ) {
          return lastParameterType;
        }
      }
    }

    return undefined;
  }

  private getAbstractBases(cls: spec.ClassType): spec.ClassType[] {
    const abstractBases: spec.ClassType[] = [];

    if (cls.base !== undefined) {
      const base = this.findType(cls.base);

      if (!spec.isClassType(base)) {
        throw new Error("Class inheritence that isn't a class?");
      }

      if (base.abstract) {
        abstractBases.push(base);
      }
    }

    return abstractBases;
  }
}

/**
 * Positional argument or keyword parameter
 */
interface DocumentableArgument {
  name: string;
  docs?: spec.Docs;
}

/**
 * Render a one-line description of the given docs, used for method arguments and inlined properties
 */
function onelineDescription(docs: spec.Docs | undefined) {
  // Only consider a subset of fields here, we don't have a lot of formatting space
  if (!docs || Object.keys(docs).length === 0) {
    return '-';
  }

  const parts = [];
  if (docs.summary) {
    parts.push(md2rst(renderSummary(docs)));
  }
  if (docs.remarks) {
    parts.push(md2rst(docs.remarks));
  }
  if (docs.default) {
    parts.push(`Default: ${md2rst(docs.default)}`);
  }
  return parts.join(' ').replace(/\s+/g, ' ');
}

function shouldMentionStability(s: spec.Stability) {
  // Don't render "stable" or "external", those are both stable by implication.
  return s === spec.Stability.Deprecated || s === spec.Stability.Experimental;
}

function isStruct(
  typeSystem: reflect.TypeSystem,
  ref: spec.TypeReference,
): boolean {
  if (!spec.isNamedTypeReference(ref)) {
    return false;
  }
  const type = typeSystem.tryFindFqn(ref.fqn);
  return !!(type?.isInterfaceType() && type?.isDataType());
}

/**
 * Appends `_` at the end of `name` until it no longer conflicts with any of the
 * entries in `inUse`.
 *
 * @param name  the name to be slugified.
 * @param inUse the names that are already being used.
 *
 * @returns the slugified name.
 */
function slugifyAsNeeded(name: string, inUse: readonly string[]): string {
  const inUseSet = new Set(inUse);
  while (inUseSet.has(name)) {
    name = `${name}_`;
  }
  return name;
}

////////////////////////////////////////////////////////////////////////////////
// BEHOLD: Helpers to output code that looks like what Black would format into...
//
// @see https://black.readthedocs.io/en/stable/the_black_code_style.html

const TARGET_LINE_LENGTH = 88;

function openSignature(
  code: CodeMaker,
  keyword: 'class',
  name: string,
  params: readonly string[],
): void;
function openSignature(
  code: CodeMaker,
  keyword: 'def',
  name: string,
  params: readonly string[],
  trailingComma: boolean,
  returnType: string,
): void;
function openSignature(
  code: CodeMaker,
  keyword: 'class' | 'def',
  name: string,
  params: readonly string[],
  trailingComma = false,
  returnType?: string,
) {
  const prefix = `${keyword} ${name}`;
  const suffix = returnType ? ` -> ${returnType}` : '';
  if (params.length === 0) {
    code.openBlock(`${prefix}${returnType ? '()' : ''}${suffix}`);
    return;
  }

  const join = ', ';
  const { elementsSize, joinSize } = totalSizeOf(params, join);

  const hasComments = !params.some((param) => /# .+$/.exec(param));

  if (
    hasComments &&
    TARGET_LINE_LENGTH >
      code.currentIndentLength +
        prefix.length +
        elementsSize +
        joinSize +
        suffix.length +
        2
  ) {
    code.openBlock(`${prefix}(${params.join(join)})${suffix}`);
    return;
  }

  code.indent(`${prefix}(`);
  if (
    !hasComments &&
    TARGET_LINE_LENGTH >
      code.currentIndentLength +
        elementsSize +
        joinSize +
        (trailingComma ? 1 : 0)
  ) {
    code.line(`${params.join(join)}${trailingComma ? ',' : ''}`);
  } else {
    for (const param of params) {
      code.line(param.replace(/(\s*# .+)?$/, ',$1'));
    }
  }
  code.unindent(false);
  code.openBlock(`)${suffix}`);
}

function assignCallResult(
  code: CodeMaker,
  variable: string,
  funct: string,
  params: readonly string[],
) {
  const prefix = `${variable} = ${funct}(`;
  const suffix = ')';

  if (params.length === 0) {
    code.line(`${prefix}${suffix}`);
    return;
  }

  const join = ', ';
  const { elementsSize, joinSize } = totalSizeOf(params, join);

  if (
    TARGET_LINE_LENGTH >
    code.currentIndentLength +
      prefix.length +
      elementsSize +
      joinSize +
      suffix.length
  ) {
    code.line(`${prefix}${params.join(join)}${suffix}`);
    return;
  }

  code.indent(prefix);
  if (TARGET_LINE_LENGTH > code.currentIndentLength + elementsSize + joinSize) {
    code.line(params.join(join));
  } else {
    for (const param of params) {
      code.line(`${param},`);
    }
  }
  code.unindent(suffix);
}

function assignDictionary(
  code: CodeMaker,
  variable: string,
  elements: readonly string[],
  trailing?: string,
  compact = false,
): void {
  const space = compact ? '' : ' ';

  const prefix = `${variable}${space}=${space}{`;
  const suffix = `}${trailing ?? ''}`;

  if (elements.length === 0) {
    code.line(`${prefix}${suffix}`);
    return;
  }

  if (compact) {
    const join = ', ';
    const { elementsSize, joinSize } = totalSizeOf(elements, join);
    if (
      TARGET_LINE_LENGTH >
      prefix.length +
        code.currentIndentLength +
        elementsSize +
        joinSize +
        suffix.length
    ) {
      code.line(`${prefix}${elements.join(join)}${suffix}`);
      return;
    }
  }

  code.indent(prefix);
  for (const elt of elements) {
    code.line(`${elt},`);
  }
  code.unindent(suffix);
}

function emitList(
  code: CodeMaker,
  prefix: string,
  elements: readonly string[],
  suffix: string,
  opts?: { ifMulti: [string, string] },
) {
  if (elements.length === 0) {
    code.line(`${prefix}${suffix}`);
    return;
  }

  const join = ', ';
  const { elementsSize, joinSize } = totalSizeOf(elements, join);
  if (
    TARGET_LINE_LENGTH >
    code.currentIndentLength +
      prefix.length +
      elementsSize +
      joinSize +
      suffix.length
  ) {
    code.line(`${prefix}${elements.join(join)}${suffix}`);
    return;
  }

  const [before, after] = opts?.ifMulti ?? ['', ''];

  code.indent(`${prefix}${before}`);
  if (elements.length === 1) {
    code.line(elements[0]);
  } else {
    if (
      TARGET_LINE_LENGTH >
      code.currentIndentLength + elementsSize + joinSize
    ) {
      code.line(elements.join(join));
    } else {
      for (const elt of elements) {
        code.line(`${elt},`);
      }
    }
  }
  code.unindent(`${after}${suffix}`);
}

function totalSizeOf(strings: readonly string[], join: string) {
  return {
    elementsSize: strings
      .map((str) => str.length)
      .reduce((acc, elt) => acc + elt, 0),
    joinSize: strings.length > 1 ? join.length * (strings.length - 1) : 0,
  };
}

function nestedContext(
  context: EmitContext,
  fqn: string | undefined,
): EmitContext {
  return {
    ...context,
    surroundingTypeFqns:
      fqn != null
        ? [...(context.surroundingTypeFqns ?? []), fqn]
        : context.surroundingTypeFqns,
  };
}

const isDeprecated = (x: PythonBase) => x.docs?.deprecated !== undefined;
