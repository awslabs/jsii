import { toPascalCase } from 'codemaker/lib/case-utils';

// Keywords are taken from https://kotlinlang.org/docs/reference/keyword-reference.html
export class KotlinNamer {
  // noinspection SpellCheckingInspection
  private static readonly HARD_KEYWORDS = [
    // hard keywords
    'as',
    'break',
    'class',
    'continue',
    'do',
    'else',
    'false',
    'for',
    'fun',
    'if',
    'in',
    'interface',
    'is',
    'null',
    'object',
    'package',
    'return',
    'super',
    'this',
    'throw',
    'true',
    'try',
    'typealias',
    'typeof',
    'val',
    'var',
    'when',
    'while',
  ];

  // noinspection SpellCheckingInspection
  private static readonly SOFT_KEYWORDS = [
    'by',
    'catch',
    'constructor',
    'delegate',
    'dynamic',
    'field',
    'file',
    'finally',
    'get',
    'import',
    'init',
    'param',
    'property',
    'receiver',
    'set',
    'setparam',
    'where',
  ];

  // noinspection SpellCheckingInspection
  private static readonly MODIFIER_KEYWORDS = [
    'actual',
    'abstract',
    'annotation',
    'companion',
    'const',
    'crossinline',
    'data',
    'enum',
    'expect',
    'external',
    'final',
    'infix',
    'inline',
    'inner',
    'internal',
    'lateinit',
    'noinline',
    'open',
    'operator',
    'out',
    'override',
    'private',
    'protected',
    'public',
    'reified',
    'sealed',
    'suspend',
    'tailrec',
    'vararg',
  ];

  private static readonly SPECIAL_IDENTIFIERS = [
    'field',
    'it',
    'javaClass',
    'kotlin',
  ];

  private static readonly ALL_KEYWORDS = [
    ...KotlinNamer.HARD_KEYWORDS,
    ...KotlinNamer.SOFT_KEYWORDS,
    ...KotlinNamer.MODIFIER_KEYWORDS,
    ...KotlinNamer.SPECIAL_IDENTIFIERS,
  ];

  private static escapeName(name: string): string {
    if (name.includes('$')) {
      return `\`${name}\``;
    }

    return name;
  }

  public className(name: string): string {
    return KotlinNamer.escapeName(name);
  }

  public propertyName(name: string): string {
    if (name && KotlinNamer.ALL_KEYWORDS.includes(name)) {
      return KotlinNamer.escapeName(`${name}Value`);
    }

    return KotlinNamer.escapeName(name);
  }

  public methodName(name: string): string {
    if (name && KotlinNamer.ALL_KEYWORDS.includes(name)) {
      return KotlinNamer.escapeName(`do${toPascalCase(name)}`);
    }

    return KotlinNamer.escapeName(name);
  }
}
