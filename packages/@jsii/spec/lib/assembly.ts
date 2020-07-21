export const SPEC_FILE_NAME = '.jsii';

/**
 * A JSII assembly specification.
 */
export interface Assembly extends AssemblyConfiguration, Documentable {
  /**
   * The version of the spec schema
   */
  schema: SchemaVersion.LATEST;

  /**
   * The name of the assembly
   *
   * @minLength 1
   */
  name: string;

  /**
   * Description of the assembly, maps to "description" from package.json
   * This is required since some package managers (like Maven) require it.
   */
  description: string;

  /**
   * The url to the project homepage. Maps to "homepage" from package.json.
   */
  homepage: string;

  /**
   * The module repository, maps to "repository" from package.json
   * This is required since some package managers (like Maven) require it.
   */
  repository: {
    /**
     * The type of the repository (``git``, ``svn``, ...)
     */
    type: string;

    /**
     * The URL of the repository.
     */
    url: string;

    /**
     * If the package is not in the root directory (for example, when part
     * of a monorepo), you should specify the directory in which it lives.
     *
     * @default the root of the repository
     */
    directory?: string;
  };

  /**
   * The main author of this package.
   */
  author: Person;

  /**
   * Additional contributors to this package.
   *
   * @default none
   */
  contributors?: Person[];

  /**
   * A fingerprint that can be used to determine if the specification has
   * changed.
   *
   * @minLength 1
   */
  fingerprint: string;

  /**
   * The version of the assembly
   * @minLength 1
   */
  version: string;

  /**
   * The version of the jsii compiler that was used to produce this Assembly.
   * @minLength 1
   */
  jsiiVersion: string;

  /**
   * The SPDX name of the license this assembly is distributed on.
   */
  license: string;

  /**
   * Arbitrary key-value pairs of metadata, which the maintainer chose to
   * document with the assembly. These entries do not carry normative
   * semantics and their interpretation is up to the assembly maintainer.
   *
   * @default none
   */
  metadata?: { [key: string]: any };

  /**
   * Keywords that help discover or identify this packages with respects to it's
   * intended usage, audience, etc... Where possible, this will be rendered in
   * the corresponding metadata section of idiomatic package manifests, for
   * example NuGet package tags.
   */
  keywords?: string[];

  /**
   * Direct dependencies on other assemblies (with semver), the key is the JSII
   * assembly name, and the value is a SemVer expression..
   *
   * @default none
   */
  dependencies?: { [assembly: string]: string };

  /**
   * Target configuration for all the assemblies that are direct or transitive
   * dependencies of this assembly. This is needed to generate correct native
   * type names for any transitively inherited member, in certain languages.
   *
   * @default none
   */
  dependencyClosure?: { [assembly: string]: AssemblyConfiguration };

  /**
   * List if bundled dependencies (these are not expected to be jsii
   * assemblies).
   *
   * @default none
   */
  bundled?: { [module: string]: string };

  /**
   * All types in the assembly, keyed by their fully-qualified-name
   *
   * @default none
   */
  types?: { [fqn: string]: Type };

  /**
   * The top-level readme document for this assembly (if any).
   *
   * @default none
   */
  readme?: { markdown: string };
}

/**
 * Shareable configuration of a jsii Assembly.
 */
export interface AssemblyConfiguration extends Targetable {
  /**
   * Submodules declared in this assembly.
   *
   * @default none
   */
  submodules?: { [fqn: string]: SourceLocatable & Targetable };
}

/**
 * An entity on which targets may be configured.
 */
export interface Targetable {
  /**
   * Submodules defined in this assembly, if any, associated with their
   * designated targets configuration.
   *
   * @default none
   */
  submodules?: { [fqn: string]: { targets?: AssemblyTargets } };

  /**
   * A map of target name to configuration, which is used when generating
   * packages for various languages.
   *
   * @default none
   */
  targets?: AssemblyTargets;
}

/**
 * Versions of the JSII Assembly Specification.
 */
export enum SchemaVersion {
  LATEST = 'jsii/0.10.0',
}

/**
 * Fully Qualified Name
 */
export type FQN = string;

/**
 * Metadata about people or organizations associated with the project that
 * resulted in the Assembly. Some of this metadata is required in order to
 * publish to certain package repositories (for example, Maven Central), but is
 * not normalized, and the meaning of fields (role, for example), is up to each
 * project maintainer.
 */
export interface Person {
  /**
   * The name of the person
   */
  name: string;

  /**
   * A list of roles this person has in the project, for example `maintainer`,
   * `contributor`, `owner`, ...
   */
  roles: string[];

  /**
   * The email of the person
   *
   * @default none
   */
  email?: string;

  /**
   * The URL for the person
   *
   * @default none
   */
  url?: string;

  /**
   * If true, this person is, in fact, an organization
   *
   * @default false
   */
  organization?: boolean;
}

/**
 * Configurable targets for an asembly.
 */
export interface AssemblyTargets {
  /**
   * Information about a particular language's targets
   */
  [language: string]: { [key: string]: any } | undefined;
}

/**
 * Where in the module source the definition for this API item was found
 */
export interface SourceLocation {
  /**
   * Relative filename
   */
  filename: string;

  /**
   * 1-based line number in the indicated file
   */
  line: number;
}

/**
 * Key value pairs of documentation nodes.
 * Based on TSDoc.
 */
export interface Docs {
  /**
   * Summary documentation for an API item.
   *
   * The first part of the documentation before hitting a `@remarks` tags, or
   * the first line of the doc comment block if there is no `@remarks` tag.
   *
   * @default none
   */
  summary?: string;

  /**
   * Detailed information about an API item.
   *
   * Either the explicitly tagged `@remarks` section, otherwise everything
   * past the first paragraph if there is no `@remarks` tag.
   *
   * @default none
   */
  remarks?: string;

  /**
   * If present, this block indicates that an API item is no longer supported
   * and may be removed in a future release.  The `@deprecated` tag must be
   * followed by a sentence describing the recommended alternative.
   * Deprecation recursively applies to members of a container. For example,
   * if a class is deprecated, then so are all of its members.
   *
   * @default none
   */
  deprecated?: string;

  /**
   * The `@returns` block for this doc comment, or undefined if there is not
   * one.
   *
   * @default none
   */
  returns?: string;

  /**
   * Whether the API item is beta/experimental quality
   */
  stability?: Stability;

  /**
   * Example showing the usage of this API item
   *
   * Starts off in running text mode, may switch to code using fenced code
   * blocks.
   *
   * @default none
   */
  example?: string;

  /**
   * A `@see` link with more information
   *
   * @default none
   */
  see?: string;

  /**
   * Whether this class or interface was intended to be subclassed/implemented
   * by library users.
   *
   * Classes intended for subclassing, and interfaces intended to be
   * implemented by consumers, are held to stricter standards of API
   * compatibility.
   *
   * @default false
   */
  subclassable?: boolean;

  /**
   * Description of the default
   *
   * @default none
   */
  default?: string;

  /**
   * Custom tags that are not any of the default ones
   *
   * @default none
   */
  custom?: { [tag: string]: string };
}

/**
 * API Stability levels. These are modeled after the `node` stability index.
 *
 * @see https://nodejs.org/api/documentation.html#documentation_stability_index.
 */
export enum Stability {
  /**
   * The API may emit warnings. Backward compatibility is not guaranteed.
   *
   * More information about the deprecation can usually be found in the
   * `deprecated` field.
   */
  Deprecated = 'deprecated',

  /**
   * This API is still under active development and subject to non-backward
   * compatible changes or removal in any future version. Use of the API is
   * not recommended in production environments. Experimental APIs are not
   * subject to the Semantic Versioning model.
   */
  Experimental = 'experimental',

  /**
   * This API is subject to the Semantic Versioning model and may not change
   * in breaking ways in a subsequent minor or patch version.
   */
  Stable = 'stable',

  /**
   * This API is an representation of an API managed elsewhere and follows
   * the other API's versioning model.
   */
  External = 'external',
}

/**
 * Indicates that an entity is documentable.
 */
export interface Documentable {
  /**
   * Documentation for this entity.
   *
   * @default none
   */
  docs?: Docs;
}

/**
 * Indicates that an entity has a source location
 */
export interface SourceLocatable {
  /**
   * Where in the module this definition was found
   *
   * Why is this not `locationInAssembly`? Because the assembly is the JSII
   * file combining compiled code and its manifest, whereas this is referring
   * to the location of the source in the module the assembly was built from.
   *
   * @default none
   */
  locationInModule?: SourceLocation;
}

/**
 * Kinds of collections.
 */
export enum CollectionKind {
  /**
   * An array, or a list of some element type.
   */
  Array = 'array',
  /**
   * A map of a string to some element type.
   */
  Map = 'map',
}

/**
 * Kinds of primitive types.
 */
export enum PrimitiveType {
  /**
   * A JSON date (represented as it's ISO-8601 string form).
   */
  Date = 'date',

  /**
   * A plain string.
   */
  String = 'string',

  /**
   * A number (integer or float).
   */
  Number = 'number',

  /**
   * A boolean value.
   */
  Boolean = 'boolean',

  /**
   * A JSON object
   */
  Json = 'json',

  /**
   * Value with "any" or "unknown" type (aka Object). Values typed `any` may
   * be `null` or `undefined`.
   */
  Any = 'any',
}

/**
 * A value that can possibly be optional.
 */
export interface OptionalValue {
  /**
   * Determines whether the value is, indeed, optional.
   *
   * @default false
   */
  optional?: boolean;

  /**
   * The declared type of the value, when it's present.
   */
  type: TypeReference;
}

/**
 * A reference to a type (primitive, collection or fqn).
 */
export type TypeReference =
  | NamedTypeReference
  | PrimitiveTypeReference
  | CollectionTypeReference
  | UnionTypeReference;

/**
 * The standard representation of the `any` type (includes optionality marker).
 */
export const CANONICAL_ANY: Readonly<PrimitiveTypeReference> = {
  primitive: PrimitiveType.Any,
};

/**
 * Reference to a named type, defined by this assembly or one of its
 * dependencies.
 */
export interface NamedTypeReference {
  /**
   * The fully-qualified-name of the type (can be located in the
   * ``spec.types[fqn]``` of the assembly that defines the type).
   */
  fqn: FQN;
}

export function isNamedTypeReference(
  ref: TypeReference | undefined,
): ref is NamedTypeReference {
  return !!(ref as NamedTypeReference)?.fqn;
}

/**
 * Reference to a primitive type.
 */
export interface PrimitiveTypeReference {
  /**
   * If this is a reference to a primitive type, this will include the
   * primitive type kind.
   */
  primitive: PrimitiveType;
}
export function isPrimitiveTypeReference(
  ref: TypeReference | undefined,
): ref is PrimitiveTypeReference {
  return !!(ref as PrimitiveTypeReference)?.primitive;
}

/**
 * Reference to a collection type.
 */
export interface CollectionTypeReference {
  collection: {
    /**
     * The kind of collection.
     */
    kind: CollectionKind;

    /**
     * The type of an element (map keys are always strings).
     */
    elementtype: TypeReference;
  };
}
export function isCollectionTypeReference(
  ref: TypeReference | undefined,
): ref is CollectionTypeReference {
  return !!(ref as CollectionTypeReference)?.collection;
}

/**
 * Reference to a union type.
 */
export interface UnionTypeReference {
  /**
   * Indicates that this is a union type, which means it can be one of a set
   * of types.
   */
  union: {
    /**
     * All the possible types (including the primary type).
     *
     * @minItems 2
     */
    types: TypeReference[];
  };
}
export function isUnionTypeReference(
  ref: TypeReference | undefined,
): ref is UnionTypeReference {
  return !!(ref as UnionTypeReference)?.union;
}

/**
 * Methods and properties can be overridden from parent classes or implemented
 * from interfaces.
 */
export interface Overridable {
  /**
   * The FQN of the parent type (class or interface) that this entity
   * overrides or implements. If undefined, then this entity is the first in
   * it's hierarchy to declare this entity.
   *
   * @default this member is not overriding anything
   */
  overrides?: FQN;
}

/**
 * A class property.
 */
export interface Property
  extends Documentable,
    OptionalValue,
    Overridable,
    SourceLocatable {
  /**
   * The name of the property.
   *
   * @minLength 1
   */
  name: string;

  /**
   * Indicates if this property only has a getter (immutable).
   *
   * @default false
   */
  immutable?: boolean;

  /**
   * Indicates if this property is protected (otherwise it is public)
   *
   * @default false
   */
  protected?: boolean;

  /**
   * Indicates if this property is abstract
   *
   * @default false
   */
  abstract?: boolean;

  /**
   * Indicates if this is a static property.
   *
   * @default false
   */
  static?: boolean;

  /**
   * A hint that indicates that this static, immutable property is initialized
   * during startup. This allows emitting "const" idioms in different target
   * languages. Implies `static` and `immutable`.
   *
   * @default false
   */
  const?: boolean;
}

/**
 * Represents a method parameter.
 */
export interface Parameter extends Documentable, OptionalValue {
  /**
   * The name of the parameter.
   *
   * @minLength 1
   */
  name: string;

  /**
   * Whether this is the last parameter of a variadic method. In such cases,
   * the `#type` attribute is the type of each individual item of the variadic
   * arguments list (as opposed to some array type, as for example TypeScript
   * would model it).
   *
   * @default false
   */
  variadic?: boolean;
}

/**
 * An Initializer or a Method.
 */
export interface Callable extends Documentable, Overridable, SourceLocatable {
  /**
   * The parameters of the Initializer or Method.
   *
   * @default none
   */
  parameters?: Parameter[];

  /**
   * Indicates if this Initializer or Method is protected (otherwise it is
   * public, since private members are not modeled).
   *
   * @default false
   */
  protected?: boolean;

  /**
   * Indicates whether this Initializer or Method is variadic or not. When
   * ``true``, the last element of ``#parameters`` will also be flagged
   * ``#variadic``.
   *
   * @default false
   */
  variadic?: boolean;
}

/**
 * An initializer.
 */
export type Initializer = Callable;

/**
 * A method with a name (i.e: not an initializer).
 */
export interface Method extends Callable {
  /**
   * The name of the method. Undefined if this method is a initializer.
   */
  name: string;

  /**
   * The return type of the method (`undefined` if `void`)
   *
   * @default void
   */
  returns?: OptionalValue;

  /**
   * Is this method an abstract method (this means the class will also be an abstract class)
   *
   * @default false
   */
  abstract?: boolean;

  /**
   * Indicates if this is an asynchronous method (it will return a promise).
   *
   * @default false
   */
  async?: boolean;

  /**
   * Indicates if this is a static method.
   *
   * @default false
   */
  static?: boolean;
}
/**
 * Determines whether a Callable is a Method or not.
 *
 * @param callable the callable to be checked.
 */
export function isMethod(callable: Callable): callable is Method {
  return !!(callable as Method).name;
}

/**
 * Represents a type definition (not a type reference).
 */
export type Type = TypeBase &
  (ClassType | EnumType | InterfaceType | NamedUnionType);

/**
 * Common attributes of a type definition.
 */
export interface TypeBase extends Documentable, SourceLocatable {
  /**
   * The fully qualified name of the type (``<assembly>.<namespace>.<name>``)
   *
   * @minLength 3
   */
  fqn: FQN;

  /**
   * The name of the assembly the type belongs to.
   *
   * @minLength 1
   */
  assembly: string;

  /**
   * The namespace of the type (``foo.bar.baz``). When undefined, the type is located at the root of the assembly
   * (it's ``fqn`` would be like ``<assembly>.<name>``). If the `namespace` corresponds to an existing type's
   * namespace-qualified (e.g: ``<namespace>.<name>``), then the current type is a nested type.
   *
   * @default none
   */
  namespace?: string;

  /**
   * The simple name of the type (MyClass).
   *
   * @minLength 1
   */
  name: string;

  /**
   * The kind of the type.
   */
  kind: TypeKind;
}

/**
 * Kinds of types.
 */
export enum TypeKind {
  Class = 'class',
  Enum = 'enum',
  Interface = 'interface',
  NamedUnion = 'union',
}

/**
 * Represents classes.
 */
export interface ClassType extends TypeBase {
  kind: TypeKind.Class;

  /**
   * The FQN of the base class of this class, if it has one.
   *
   * @default no base class
   */
  base?: FQN;

  /**
   * Initializer (constructor) method.
   *
   * @default no initializer
   */
  initializer?: Initializer;

  /**
   * List of properties.
   *
   * @default none
   */
  properties?: Property[];

  /**
   * List of methods.
   *
   * @default none
   */
  methods?: Method[];

  /**
   * Indicates if this class is an abstract class.
   *
   * @default false
   */
  abstract?: boolean;

  /**
   * The FQNs of the interfaces this class implements, if any.
   *
   * @default none
   * @uniqueItems true
   */
  interfaces?: FQN[];
}

export function isClassType(type: Type | undefined): type is ClassType {
  return type?.kind === TypeKind.Class;
}

export interface InterfaceType extends TypeBase {
  kind: TypeKind.Interface;

  /**
   * The FQNs of the interfaces this interface extends, if any.
   *
   * @default none
   * @uniqueItems true
   */
  interfaces?: FQN[];

  /**
   * List of methods.
   *
   * @default none
   */
  methods?: Method[];

  /**
   * List of properties.
   *
   * @default none
   */
  properties?: Property[];

  /**
   * True if this interface only contains properties. Different backends might
   * have idiomatic ways to allow defining concrete instances such interfaces.
   * For example, in Java, the generator will produce a PoJo and a builder
   * which will allow users to create a concrete object with data which
   * adheres to this interface.
   *
   * @default false
   */
  datatype?: boolean;
}

export function isInterfaceType(type: Type | undefined): type is InterfaceType {
  return type?.kind === TypeKind.Interface;
}

/**
 * Represents a member of an enum.
 */
export interface EnumMember extends Documentable {
  /**
   * The name/symbol of the member.
   */
  name: string;
}

/**
 * Represents an enum type.
 */
export interface EnumType extends TypeBase {
  kind: TypeKind.Enum;

  /**
   * Members of the enum.
   */
  members: EnumMember[];
}

export function isEnumType(type: Type | undefined): type is EnumType {
  return type?.kind === TypeKind.Enum;
}

/**
 * Represents a named type union.
 */
export interface NamedUnionType extends TypeBase {
  kind: TypeKind.NamedUnion;

  /**
   * Candidate types for the union.
   */
  types: TypeReference[];
}

export function isNamedUnionType(
  type: Type | undefined,
): type is NamedUnionType {
  return type?.kind === TypeKind.NamedUnion;
}

/**
 * Return whether this type is a class or interface type
 */
export function isClassOrInterfaceType(
  type: Type | undefined,
): type is InterfaceType | ClassType {
  return isClassType(type) || isInterfaceType(type);
}

/**
 * Return a string representation of the given type reference.
 */
export function describeTypeReference(type?: TypeReference): string {
  if (type === undefined) {
    return 'void';
  }

  if (isNamedTypeReference(type)) {
    return type.fqn;
  }

  if (isPrimitiveTypeReference(type)) {
    return type.primitive;
  }

  if (isCollectionTypeReference(type)) {
    return `${type.collection.kind}<${describeTypeReference(
      type.collection.elementtype,
    )}>`;
  }

  if (isUnionTypeReference(type)) {
    const unionType = type.union.types.map(describeTypeReference).join(' | ');
    return unionType;
  }

  throw new Error('Unrecognized type reference');
}

/**
 * Determines whether an entity is deprecated.
 *
 * @param entity the entity to be checked.
 *
 * @returns true if the entity is marked as deprecated.
 */
export function isDeprecated(entity: Documentable): boolean {
  return entity?.docs?.stability === Stability.Deprecated;
}
