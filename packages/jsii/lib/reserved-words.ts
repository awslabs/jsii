// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
export function isReservedName(name: string): string[] | undefined {
  const reserved = new Array<string>();
  if (CSHARP_RESERVED.has(name)) {
    reserved.push('C#');
  }
  if (JAVA_RESERVED.has(name)) {
    reserved.push('Java');
  }
  if (PYTHON_RESERVED.has(name)) {
    reserved.push('Python');
  }
  return reserved.length > 0 ? reserved : undefined;
}

export const CSHARP_RESERVED = new Set([
  'abstract',
  'as',
  'base',
  'bool',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'checked',
  'class',
  'const',
  'continue',
  'decimal',
  'default',
  'delegate',
  'do',
  'double',
  'else',
  'enum',
  'event',
  'explicit',
  'extern',
  'false',
  'finally',
  'fixed',
  'float',
  'for',
  'foreach',
  'goto',
  'if',
  'implicit',
  'in',
  'int',
  'interface',
  'internal',
  'is',
  'lock',
  'long',
  'namespace',
  'new',
  'null',
  'object',
  'operator',
  'out',
  'override',
  'params',
  'private',
  'protected',
  'public',
  'readonly',
  'ref',
  'return',
  'sbyte',
  'sealed',
  'short',
  'sizeof',
  'stackalloc',
  'static',
  'string',
  'struct',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'uint',
  'ulong',
  'unchecked',
  'unsafe',
  'ushort',
  'using',
  'virtual',
  'void',
  'volatile',
  'while',
]);

export const JAVA_RESERVED = new Set([
  'abstract',
  'continue',
  'for',
  'new',
  'switch',
  'assert',
  'default',
  'goto',
  'package',
  'synchronized',
  'boolean',
  'do',
  'if',
  'private',
  'this',
  'break',
  'double',
  'implements',
  'protected',
  'throw',
  'byte',
  'else',
  'import',
  'public',
  'throws',
  'case',
  'enum',
  'instanceof',
  'return',
  'transient',
  'catch',
  'extends',
  'int',
  'short',
  'try',
  'char',
  'final',
  'interface',
  'static',
  'void',
  'class',
  'finally',
  'long',
  'strictfp',
  'volatile',
  'const',
  'float',
  'native',
  'super',
  'while',
  'true',
  'false',
  'null',
]);

export const PYTHON_RESERVED = new Set([
  'False',
  'class',
  'finally',
  'is',
  'return',
  'None',
  'continue',
  'for',
  'lambda',
  'try',
  'True',
  'def',
  'from',
  'nonlocal',
  'while',
  'and',
  'del',
  'global',
  'not',
  'with',
  'as',
  'elif',
  'if',
  'or',
  'yield',
  'assert',
  'else',
  'import',
  'pass',
  'break',
  'except',
  'in',
  'raise',
  'self',
]);
