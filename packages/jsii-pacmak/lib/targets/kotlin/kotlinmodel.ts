import { TypeKind, Stability } from '@jsii/spec';
import {
  ClassType,
  EnumType,
  InterfaceType,
  ReferenceType,
  Property,
  Method,
  Parameter,
  Documentable,
  Type,
  EnumMember,
  TypeMember,
  Callable,
  Initializer,
  OptionalValue,
} from 'jsii-reflect';

import { VERSION_DESC } from '../../version';
import { JvmAbi } from '../jvm/jvmabi';
import { DeclarationNode } from './declarationnode';
import { KDocBuilder } from './kdocbuilder';
import { KotlinCodeMaker } from './kotlincodemaker';
import {
  KotlinGeneratorConfiguration,
  KotlinPlatform,
} from './kotlingeneratorconfiguration';
import { KotlinTypeMapper } from './kotlintypemapper';

export function createDeclaration(
  decl: DeclarationNode,
  isTopLevel: boolean,
): KTypeDeclaration | undefined {
  const type = decl.type;
  if (!type) {
    return undefined;
  }

  const children = createDeclarations(decl.children);

  if (type instanceof ClassType) {
    return new KClass(type, children, isTopLevel);
  } else if (type instanceof InterfaceType) {
    return new KInterface(type, children, isTopLevel);
  } else if (type instanceof EnumType) {
    return new KEnum(type, isTopLevel);
  }

  throw new Error(`Unexpected declaration type: ${type as any}`);
}

function createDeclarations(children: DeclarationNode[]): KDeclaration[] {
  const result = [];
  for (const node of children) {
    const decl = createDeclaration(node, false);

    if (decl) {
      result.push(decl);
    }
  }
  return result;
}

export interface KElement {
  render(code: KotlinCodeMaker, config: KotlinGeneratorConfiguration): void;
}

export abstract class KDeclaration implements KElement {
  protected constructor(private readonly documentable: Documentable) {}

  abstract render(
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ): void;

  protected renderDocumentation(
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    const docs = this.documentable.docs.docs;
    const builder = new KDocBuilder();

    builder.push(docs.summary || docs.default);
    builder.push(docs.remarks);
    builder.push(docs.default, 'Default: ');
    builder.push(docs.example, 'Example: \n');

    builder.push(docs.returns, '@return ');
    builder.push(docs.see, '@see ');

    if (this.documentable instanceof Method) {
      const params = this.documentable.parameters;
      for (const param of params) {
        const summary = this.endWithPeriod(param.docs.summary);
        const name = config.namer.propertyName(param.name);
        builder.push(summary, `@param ${name}`);
      }
    }

    builder.render(code);
  }

  protected joinModifiers(modifiers: string[]): string {
    if (modifiers.length > 0) {
      return `${modifiers.join(' ')} `;
    }

    return '';
  }

  private endWithPeriod(text?: string): string | undefined {
    if (!text) {
      return text;
    }

    if (!text.endsWith('.') && !text.endsWith('?') && !text.endsWith('!')) {
      return `${text}.`;
    }
    return text;
  }

  protected renderStabilityAnnotations(
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    const docs = this.documentable.docs;
    if (docs.stability === Stability.Deprecated || docs.deprecated) {
      const reason = docs.deprecationReason || 'Declaration is deprecated.';
      code.line(`@Deprecated("${escapeString(reason)}")`);
    }

    if (config.platform === KotlinPlatform.JVM && docs.stability) {
      const annotationType = JvmAbi.stabilityAnnotationType;
      const levelName = JvmAbi.getStabilityLevelName(docs.stability);
      const levelConst = `${annotationType}.Level.${levelName}`;
      const target = this instanceof KProperty ? 'get:' : '';
      code.line(`@${target}${annotationType}(${levelConst})`);
    }
  }
}

export abstract class KTypeDeclaration extends KDeclaration {
  protected constructor(
    public readonly type: Type,
    protected readonly isTopLevel: boolean,
  ) {
    super(type);
  }

  protected renderGeneratedAnnotation(
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    if (this.isTopLevel && config.platform === KotlinPlatform.JVM) {
      const annotationName = 'javax.annotation.Generated';
      if (config.fingerprint) {
        const version = `jsii-pacmak/${VERSION_DESC}`;
        const date = new Date().toISOString();
        code.line(`@${annotationName}("${version}", date = "${date}")`);
      } else {
        code.line(`@${annotationName}("jsii-pacmak")`);
      }
    }
  }

  protected renderJsiiAnnotation(
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    const moduleClassName = `${config.packageName}.\`${JvmAbi.moduleName}\``;
    const moduleClassLiteral = `${moduleClassName}::class`;
    const fqn = this.type.fqn;
    code.line(
      `@${JvmAbi.jsiiAnnotation}(module = ${moduleClassLiteral}, fqn = "${fqn}")`,
    );
  }
}

abstract class KReferenceTypeDeclaration extends KTypeDeclaration {
  protected constructor(
    public readonly type: ReferenceType,
    isTopLevel: boolean,
  ) {
    super(type, isTopLevel);
  }

  protected isMutable(property: Property): boolean {
    return !property.immutable;
  }

  protected prepareInitializer(_property: Property): string | undefined {
    return undefined;
  }

  protected shouldGenerateBody(member: TypeMember): boolean {
    return !member.abstract;
  }

  protected renderProperties(
    properties: Property[],
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    const selfType = config.typeMapper.mapReferenceType(this.type);

    function getter(property: Property) {
      return function (
        code: KotlinCodeMaker,
        config: KotlinGeneratorConfiguration,
      ) {
        const name = property.name;
        const returnType = config.typeMapper.mapTypeReference(
          property.type,
          false,
        );
        const returnTypeLiteral = `${returnType}::class.java`;
        const typeCast = prepareCollectionCast(property, config);
        const nullCheck = prepareNullCheck(property, property.name);
        if (property.static) {
          const callElement = `${JvmAbi.jsiiObject.type}.${JvmAbi.jsiiObject.staticCallMethod}`;
          const args = `${selfType}::class.java, "${name}", ${returnTypeLiteral}`;
          code.line(`return ${callElement}(${args})${typeCast}${nullCheck}`);
        } else {
          const callElement = `this.${JvmAbi.jsiiObject.getMethod}`;
          const args = `"${name}", ${returnTypeLiteral}`;
          code.line(`return ${callElement}(${args})${typeCast}${nullCheck}`);
        }
      };
    }

    function setter(property: Property) {
      return function (
        code: KotlinCodeMaker,
        _config: KotlinGeneratorConfiguration,
        newValueName: string,
      ) {
        const name = property.name;
        if (property.static) {
          const callElement = `${JvmAbi.jsiiObject.type}.${JvmAbi.jsiiObject.staticSetMethod}`;
          code.line(
            `${callElement}(${selfType}::class.java, "${name}", ${newValueName})`,
          );
        } else {
          const callElement = `this.${JvmAbi.jsiiObject.setMethod}`;
          code.line(`${callElement}("${name}", ${newValueName})`);
        }
      };
    }

    for (const property of properties) {
      const isMutable = this.isMutable(property);
      const g = this.shouldGenerateBody(property)
        ? getter(property)
        : undefined;
      const s =
        this.shouldGenerateBody(property) && isMutable
          ? setter(property)
          : undefined;
      const initializer = this.prepareInitializer(property);
      new KProperty(property, this, isMutable, initializer, g, s).render(
        code,
        config,
      );
    }
  }

  protected renderMethods(
    methods: Method[],
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    const selfType = config.typeMapper.mapReferenceType(this.type);

    function body(method: Method) {
      return function (
        code: KotlinCodeMaker,
        config: KotlinGeneratorConfiguration,
      ) {
        const name = method.name;
        const returnType = config.typeMapper.mapTypeReference(
          method.returns.type,
          false,
        );
        const returnTypeLiteral = `${returnType}::class.java`;
        const hasArgs = method.parameters.length > 0;

        if (hasArgs) {
          renderJsiiCallArguments(method.parameters, false, true, code, config);
        }

        const argsArg = hasArgs ? ', args' : '';
        const returnKeyword = method.returns.type.void ? '' : 'return ';
        const typeCast = prepareCollectionCast(method.returns, config);
        const nullCheck = method.returns.optional
          ? ''
          : ` ?: error("Method '${name}()' returned null value")`;

        if (method.static) {
          const callElement = `${JvmAbi.jsiiObject.type}.${JvmAbi.jsiiObject.staticCallMethod}`;
          const args = `${selfType}::class.java, "${name}", ${returnTypeLiteral}${argsArg}`;
          code.line(
            `${returnKeyword}${callElement}(${args})${typeCast}${nullCheck}`,
          );
        } else {
          const callElement = `this.${JvmAbi.jsiiObject.callMethod}`;
          const args = `"${name}", ${returnTypeLiteral}${argsArg}`;
          code.line(
            `${returnKeyword}${callElement}(${args})${typeCast}${nullCheck}`,
          );
        }
      };
    }

    for (const method of methods) {
      const b = this.shouldGenerateBody(method) ? body(method) : undefined;
      new KFunction(method, this, b).render(code, config);
    }
  }

  protected renderProxy(
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    if (config.platform === KotlinPlatform.JVM) {
      const proxy = new KProxyClass(this.type);
      proxy.render(code, config);
    }
  }
}

class KEnum extends KTypeDeclaration {
  public constructor(public readonly type: EnumType, isTopLevel: boolean) {
    super(type, isTopLevel);
  }

  public render(code: KotlinCodeMaker, config: KotlinGeneratorConfiguration) {
    code.extraLine();
    this.renderGeneratedAnnotation(code, config);
    this.renderDocumentation(code, config);
    this.renderStabilityAnnotations(code, config);

    const name = config.namer.className(this.type.name);
    code.openBlock(`enum class ${name}`);
    for (const member of this.type.members) {
      const value = new KEnumValue(member);
      value.render(code, config);
    }
    code.closeBlock();
  }
}

class KEnumValue extends KDeclaration {
  public constructor(private readonly value: EnumMember) {
    super(value);
  }

  public render(code: KotlinCodeMaker, config: KotlinGeneratorConfiguration) {
    code.extraLine();
    this.renderDocumentation(code, config);
    this.renderStabilityAnnotations(code, config);

    const name = config.namer.className(this.value.name);
    code.line(`${name},`);
  }
}

class KClass extends KReferenceTypeDeclaration {
  public constructor(
    public readonly type: ClassType,
    private readonly children: KDeclaration[],
    isTopLevel: boolean,
  ) {
    super(type, isTopLevel);
  }

  public get isAbstract(): boolean {
    return this.type.abstract;
  }

  public render(code: KotlinCodeMaker, config: KotlinGeneratorConfiguration) {
    const name = config.namer.className(this.type.name);
    const superTypes = this.prepareSuperTypes(config);

    const [staticMethods, instanceMethods] = partition(
      this.type.ownMethods,
      (m) => m.static,
    );
    const [staticProperties, instanceProperties] = partition(
      this.type.ownProperties,
      (p) => p.static,
    );

    const hasCompanionObject =
      staticMethods.length > 0 || staticProperties.length > 0;

    code.extraLine();
    this.renderDocumentation(code, config);
    this.renderGeneratedAnnotation(code, config);
    this.renderJsiiAnnotation(code, config);
    this.renderStabilityAnnotations(code, config);

    const modifiers = this.type.abstract ? 'abstract' : 'open';
    code.openBlock(`${modifiers} class ${name} : ${superTypes}`);

    if (hasCompanionObject) {
      const obj = new KCompanionObject(
        this.type,
        staticProperties,
        staticMethods,
      );
      obj.render(code, config);
    }

    this.renderJsiiConstructors(code);
    if (this.type.initializer) {
      const initializer = new KInitializer(this.type.initializer);
      initializer.render(code, config);
    }

    this.renderProperties(instanceProperties, code, config);
    this.renderMethods(instanceMethods, code, config);

    for (const child of this.children) {
      child.render(code, config);
    }

    if (this.type.abstract) {
      this.renderProxy(code, config);
    }

    code.closeBlock();
  }

  private prepareSuperTypes(config: KotlinGeneratorConfiguration): string {
    const supertypes = [];
    supertypes.push(this.getSuperClassName(config));

    for (const intf of this.type.interfaces) {
      supertypes.push(config.typeMapper.mapReferenceType(intf));
    }

    return supertypes.join(', ');
  }

  private getSuperClassName(config: KotlinGeneratorConfiguration): string {
    const base = this.type.base;
    if (base) {
      return config.typeMapper.mapReferenceType(base);
    }

    return JvmAbi.jsiiObject.type;
  }

  private renderJsiiConstructors(code: KotlinCodeMaker) {
    code.line(`constructor(objRef: ${JvmAbi.jsiiObject.ref}) : super(objRef)`);
    code.line(
      `constructor(mode: ${JvmAbi.jsiiObject.initializationMode}) : super(mode)`,
    );
  }
}

class KInterface extends KReferenceTypeDeclaration {
  public constructor(
    public readonly type: InterfaceType,
    private readonly children: KDeclaration[],
    isTopLevel: boolean,
  ) {
    super(type, isTopLevel);
  }

  public render(code: KotlinCodeMaker, config: KotlinGeneratorConfiguration) {
    const name = config.namer.className(this.type.name);
    const superTypes = this.getSuperTypeList(config).join(', ');

    code.extraLine();
    this.renderDocumentation(code, config);
    this.renderGeneratedAnnotation(code, config);
    this.renderStabilityAnnotations(code, config);

    code.openBlock(`interface ${name} : ${superTypes}`);

    this.renderProperties(this.type.ownProperties, code, config);
    this.renderMethods(this.type.ownMethods, code, config);

    for (const child of this.children) {
      child.render(code, config);
    }

    if (this.type.datatype) {
      const builder = new KBuilderClass(this.type);
      builder.render(code, config);
    }

    this.renderProxy(code, config);

    code.closeBlock();
  }

  private getSuperTypeList(config: KotlinGeneratorConfiguration): string[] {
    const result = [];
    if (config.platform === KotlinPlatform.JVM) {
      result.push('software.amazon.jsii.JsiiSerializable');
    }

    for (const superIntf of this.type.interfaces) {
      result.push(config.typeMapper.mapReferenceType(superIntf));
    }
    return result;
  }
}

class KBuilderClass extends KReferenceTypeDeclaration {
  public constructor(public readonly type: InterfaceType) {
    super(type, false);
  }

  protected isMutable(_property: Property): boolean {
    return true;
  }

  protected prepareInitializer(_property: Property): string | undefined {
    return 'null';
  }

  public render(code: KotlinCodeMaker, config: KotlinGeneratorConfiguration) {
    const properties = this.type.allProperties;

    code.declarationBlock('class Builder');
    this.renderProperties(properties, code, config);
    this.renderBuild(properties, code, config);
    code.closeBlock();
  }

  private renderBuild(
    properties: Property[],
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    const selfType = config.typeMapper.mapReferenceType(this.type);
    code.declarationBlock(`fun build(): ${selfType}`);
    this.renderBuilderLocalAssignments(properties, code, config);
    this.renderProxyConstructorCall(properties, code, config);
    code.closeBlock();
  }

  private renderBuilderLocalAssignments(
    properties: Property[],
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    for (const property of properties) {
      const name = config.namer.propertyName(property.name);
      if (property.optional) {
        code.line(`val ${name} = this.${name}`);
      } else {
        code.line(
          `val ${name} = this.${name} ?: kotlin.error("Value for property '${name}' must be specified")`,
        );
      }
    }
  }

  private renderProxyConstructorCall(
    properties: Property[],
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    const args = properties
      .map((p) => config.namer.propertyName(p.name))
      .join(', ');

    code.line(`return \`${JvmAbi.proxyName}\`(${args})`);
  }
}

class KCompanionObject extends KReferenceTypeDeclaration {
  public constructor(
    type: ReferenceType,
    private readonly properties: Property[],
    private readonly methods: Method[],
  ) {
    super(type, false);
  }

  public render(code: KotlinCodeMaker, config: KotlinGeneratorConfiguration) {
    code.declarationBlock('companion object');
    this.renderProperties(this.properties, code, config);
    this.renderMethods(this.methods, code, config);
    code.closeBlock();
  }
}

class KProxyClass extends KReferenceTypeDeclaration {
  public constructor(type: ReferenceType) {
    super(type, false);
  }

  public shouldGenerateBody(member: TypeMember) {
    if (member instanceof Method) {
      return true;
    } else if (member instanceof Property) {
      return !this.type.isDataType();
    }

    return false;
  }

  public render(code: KotlinCodeMaker, config: KotlinGeneratorConfiguration) {
    const selfType = config.typeMapper.mapReferenceType(this.type);
    const superTypes =
      this.type.kind === TypeKind.Class
        ? selfType
        : `${JvmAbi.jsiiObject.type}, ${selfType}`;

    const properties = this.type.allProperties;

    code.extraLine();
    code.openBlock(`class \`${JvmAbi.proxyName}\` : ${superTypes}`);

    this.renderProperties(properties, code, config);
    this.renderRefConstructor(properties, code, config);

    if (this.type.isDataType()) {
      this.renderDataConstructor(properties, code, config);
      this.renderDataEquals(properties, code, config);
      this.renderDataHashCode(properties, code, config);
      this.renderDataToJson(properties, code, config);
    } else if (
      this.type.isInterfaceType() ||
      (this.type.isClassType() && this.type.abstract)
    ) {
      this.renderMethods(this.type.allMethods, code, config);
    }

    code.closeBlock();
  }

  private renderRefConstructor(
    properties: Property[],
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    code.declarationBlock(
      `protected constructor(objRef: ${JvmAbi.jsiiObject.ref}) : super(objRef)`,
    );

    if (this.type.isDataType()) {
      for (const property of properties) {
        const rawName = property.name;
        const name = config.namer.propertyName(rawName);
        const rawType = config.typeMapper.mapTypeReference(
          property.type,
          false,
        );
        const classLiteral = `${rawType}::class.java`;
        const nullCheck = prepareNullCheck(property, rawName, false);
        const typeCast = prepareCollectionCast(property, config);
        const args = `"${rawName}", ${classLiteral}`;
        code.line(
          `this.${name} = this.${JvmAbi.jsiiObject.callMethod}(${args})${typeCast}${nullCheck}`,
        );
      }
    }

    code.closeBlock();
  }

  private renderDataConstructor(
    properties: Property[],
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    const initMode = `${JvmAbi.jsiiObject.initializationMode}.JSII`;
    const params = this.prepareDataConstructorParams(properties, config);

    code.declarationBlock(`constructor(${params}) : super(${initMode})`);

    for (const property of properties) {
      const name = config.namer.propertyName(property.name);
      code.line(`this.${name} = ${name}`);
    }

    code.closeBlock();
  }

  private prepareDataConstructorParams(
    properties: Property[],
    config: KotlinGeneratorConfiguration,
  ): string {
    const params = [];
    for (const property of properties) {
      const name = config.namer.propertyName(property.name);
      const type = config.typeMapper.mapOptional(property);
      params.push(`${name}: ${type}`);
    }
    return params.join(', ');
  }

  private renderDataHashCode(
    properties: Property[],
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    code.declarationBlock('override fun hashCode(): Int');

    function getHashCode(property: Property) {
      const name = config.namer.propertyName(property.name);
      if (property.optional) {
        return `this.${name}?.hashCode() ?: 0`;
      }

      return `this.${name}.hashCode()`;
    }

    if (properties.length === 1) {
      code.line(`return ${getHashCode(properties[0])}`);
    } else if (properties.length > 0) {
      const [first, ...remaining] = properties;
      code.line(`var result = ${getHashCode(first)}`);
      for (const property of remaining) {
        code.line(`result = 31 * result + (${getHashCode(property)})`);
      }
      code.line('return result');
    } else {
      code.line('return 0');
    }

    code.closeBlock();
  }

  private renderDataEquals(
    properties: Property[],
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    code.declarationBlock('override fun equals(other: Any?): Boolean');

    code.line('if (this === other) return true');
    code.line('if (javaClass != other?.javaClass) return false');

    if (properties.length > 0) {
      const selfName = config.typeMapper.mapReferenceType(this.type);
      code.line(`other as ${selfName}`);

      for (const property of properties) {
        const name = config.namer.propertyName(property.name);
        code.line(`if (${name} != other.${name}) return false`);
      }
    }

    code.line('return true');

    code.closeBlock();
  }

  private renderDataToJson(
    properties: Property[],
    code: KotlinCodeMaker,
    config: KotlinGeneratorConfiguration,
  ) {
    const methodName = config.namer.methodName(
      JvmAbi.jsiiObjectMapper.toJsonMethod,
    );

    code.declarationBlock(
      `override fun ${methodName}(): ${JvmAbi.jackson.jsonNode}`,
    );
    code.line(`val om = ${JvmAbi.jsiiObjectMapper.instance}`);
    code.line(`val obj = ${JvmAbi.jackson.newObjectNode}()`);

    for (const property of properties) {
      const rawName = property.name;
      const name = config.namer.propertyName(rawName);
      code.line(
        `obj.set<${JvmAbi.jackson.jsonNode}>("${name}", om.valueToTree(this.${name}))`,
      );
    }

    code.line('return obj');
    code.closeBlock();
  }
}

abstract class KCallableDeclaration extends KDeclaration {
  protected constructor(private readonly callable: Callable) {
    super(callable);
  }

  protected prepareValueParameters(
    config: KotlinGeneratorConfiguration,
  ): string {
    const result = [];
    for (const param of this.callable.parameters) {
      result.push(this.prepareValueParameter(param, config));
    }
    return result.join(', ');
  }

  private prepareValueParameter(
    param: Parameter,
    config: KotlinGeneratorConfiguration,
  ): string {
    const name = config.namer.propertyName(param.name);
    const vararg = param.variadic ? 'vararg ' : '';
    const type = config.typeMapper.mapOptional(param);
    return `${vararg}${name}: ${type}`;
  }
}

class KInitializer extends KCallableDeclaration {
  public constructor(private readonly initializer: Initializer) {
    super(initializer);
  }

  public render(code: KotlinCodeMaker, config: KotlinGeneratorConfiguration) {
    const modifiers = this.joinModifiers(this.prepareModifiers());
    const valueParameters = this.prepareValueParameters(config);
    const hasArgs = this.initializer.parameters.length > 0;

    code.extraLine();
    this.renderDocumentation(code, config);

    code.openBlock(
      `${modifiers}constructor(${valueParameters}) : super(${JvmAbi.jsiiObject.initializationMode}.JSII)`,
    );

    if (hasArgs) {
      renderJsiiCallArguments(
        this.initializer.parameters,
        false,
        true,
        code,
        config,
      );
    }

    const argsArg = hasArgs ? ', args' : '';
    code.line(
      `${JvmAbi.jsiiEngine}.getInstance().createNewObject(this${argsArg})`,
    );

    code.closeBlock();
  }

  private prepareModifiers(): string[] {
    if (this.initializer.protected) {
      return ['protected'];
    }

    return [];
  }
}

class KFunction extends KCallableDeclaration {
  public constructor(
    private readonly method: Method,
    private readonly owner: KTypeDeclaration,
    private readonly body:
      | ((code: KotlinCodeMaker, config: KotlinGeneratorConfiguration) => void)
      | undefined = undefined,
  ) {
    super(method);
  }

  public render(code: KotlinCodeMaker, config: KotlinGeneratorConfiguration) {
    const name = config.namer.methodName(this.method.name);
    const modifiers = this.joinModifiers(this.prepareModifiers(config));
    const valueParameters = this.prepareValueParameters(config);
    const returnType = this.prepareReturnType(config);
    const text = `${modifiers}fun ${name}(${valueParameters})${returnType}`;

    code.extraLine();
    this.renderDocumentation(code, config);
    this.renderStabilityAnnotations(code, config);

    if (this.body) {
      code.openBlock(text);
      this.body(code, config);
      code.closeBlock();
    } else {
      code.line(text);
    }
  }

  private prepareModifiers(config: KotlinGeneratorConfiguration): string[] {
    const modifiers = [];

    if (this.method.protected) {
      modifiers.push('protected');
    }

    const isAnyMemberOverride = this.isKotlinAnyMemberOverride(config);

    if (this.owner instanceof KClass) {
      const modifier = this.method.abstract ? 'abstract' : 'open';
      modifiers.push(modifier);
    }

    const needsOverride =
      this.method.overrides ||
      this.owner instanceof KProxyClass ||
      isAnyMemberOverride;

    if (needsOverride) {
      modifiers.push('override');
    }

    return modifiers;
  }

  private isKotlinAnyMemberOverride(
    config: KotlinGeneratorConfiguration,
  ): boolean {
    if (this.method.name === 'toString') {
      const returnType = config.typeMapper.mapOptional(this.method.returns);
      return (
        this.method.parameters.length === 0 && returnType === 'kotlin.String'
      );
    } else if (this.method.name === 'hashCode') {
      const returnType = config.typeMapper.mapOptional(this.method.returns);
      return this.method.parameters.length === 0 && returnType === 'kotlin.Int';
    } else if (this.method.name === 'equals') {
      const returnType = config.typeMapper.mapOptional(this.method.returns);
      if (
        returnType === 'kotlin.Boolean' &&
        this.method.parameters.length === 1
      ) {
        const parameter = this.method.parameters[0];
        const parameterType = config.typeMapper.mapOptional(parameter, false);
        return parameterType === 'kotlin.Any';
      }
    }

    return false;
  }

  private prepareReturnType(
    config: KotlinGeneratorConfiguration,
  ): string | undefined {
    const returns = this.method.returns;

    if (returns.type.void) {
      return '';
    }

    const type = config.typeMapper.mapOptional(returns);
    return type ? `: ${type}` : '';
  }
}

class KProperty extends KDeclaration {
  public constructor(
    private readonly property: Property,
    private readonly owner: KTypeDeclaration,
    private readonly isMutable: boolean,
    private readonly initializer?: string,
    private readonly getter?: (
      code: KotlinCodeMaker,
      config: KotlinGeneratorConfiguration,
    ) => void,
    private readonly setter?: (
      code: KotlinCodeMaker,
      config: KotlinGeneratorConfiguration,
      newValueName: string,
    ) => void,
  ) {
    super(property);
  }

  public render(code: KotlinCodeMaker, config: KotlinGeneratorConfiguration) {
    const modifiers = this.joinModifiers(this.prepareModifiers());
    const keyword = this.isMutable ? 'var' : 'val';
    const name = config.namer.propertyName(this.property.name);
    const isNullable =
      this.property.optional || this.owner instanceof KBuilderClass;
    const type = config.typeMapper.mapOptional(this.property, isNullable);
    const initializerText = this.initializer ? ` = ${this.initializer}` : '';
    const text = `${modifiers}${keyword} ${name}: ${type}${initializerText}`;

    const hasGetter = this.getter;
    const hasSetter = hasGetter && this.isMutable && this.setter;
    const hasAccessors = hasGetter || hasSetter;

    code.extraLine();
    this.renderDocumentation(code, config);
    this.renderStabilityAnnotations(code, config);

    if (!hasAccessors) {
      code.line(text);
      return;
    }

    code.indent(text);

    if (this.getter) {
      code.openBlock('get()');
      this.getter(code, config);
      code.closeBlock();
    }

    if (this.isMutable && this.getter && this.setter) {
      code.openBlock('set(v)');
      this.setter(code, config, 'v');
      code.closeBlock();
    }

    code.unindent();
    code.clearLineStatus();
  }

  private prepareModifiers(): string[] {
    const modifiers = [];

    if (this.property.protected) {
      modifiers.push('protected');
    }

    if (this.owner instanceof KClass) {
      const modifier = this.property.abstract ? 'abstract' : 'open';
      modifiers.push(modifier);
    }

    if (this.property.overrides || this.owner instanceof KProxyClass) {
      modifiers.push('override');
    }

    return modifiers;
  }
}

function renderJsiiCallArguments(
  parameters: Parameter[],
  isProperty: boolean,
  inverNullCheck: boolean,
  code: KotlinCodeMaker,
  config: KotlinGeneratorConfiguration,
) {
  code.indent('val args: kotlin.Array<kotlin.Any?> = kotlin.arrayOf(');
  let remainingParamCount = parameters.length;
  for (const parameter of parameters) {
    const rawName = parameter.name;
    const name = config.namer.propertyName(rawName);

    remainingParamCount -= 1;
    const nullCheck = prepareNullCheck(
      parameter,
      parameter.name,
      inverNullCheck,
    );
    const comma = remainingParamCount === 0 ? '' : ',';
    const receiver = isProperty ? 'this.' : '';
    code.line(`${receiver}${name}${nullCheck}${comma}`);
  }
  code.unindent(')');
}

function escapeString(literal: string): string {
  let result = '';
  for (const character of literal) {
    if (character === '"') {
      result += '\\"';
    } else if (character === '\\') {
      result += '\\\\';
    } else {
      result += character;
    }
  }
  return result;
}

function prepareCollectionCast(
  value: OptionalValue,
  config: KotlinGeneratorConfiguration,
): string {
  const type = value.type;
  if (!KotlinTypeMapper.isCollectionType(type)) {
    return '';
  }

  const actualType = config.typeMapper.mapOptional(value);
  return ` as? ${actualType}`;
}

function prepareNullCheck(
  value: OptionalValue,
  name: string,
  invert = false,
): string {
  const generate = invert ? value.optional : !value.optional;
  return generate ? ` ?: error("'${name}' should be present")` : '';
}

function partition<T>(
  array: T[],
  predicate: (element: T) => boolean,
): [T[], T[]] {
  const fst = [];
  const snd = [];
  for (const element of array) {
    if (predicate(element)) {
      fst.push(element);
    } else {
      snd.push(element);
    }
  }
  return [fst, snd];
}
