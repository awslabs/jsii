import { PrimitiveType } from '@jsii/spec';
import { sourceToAssemblyHelper } from '../lib';

// ----------------------------------------------------------------------
test('test parsing aliased union', async () => {
  const assembly = await sourceToAssemblyHelper(`
    /** A fancy type union */
    export type StringOrNumber = string | number;
  `);

  expect(assembly.types?.['testpkg.StringOrNumber']).toEqual({
    assembly: 'testpkg',
    docs: { summary: 'A fancy type union.' },
    fqn: 'testpkg.StringOrNumber',
    kind: 'union',
    types: [
      { primitive: PrimitiveType.String },
      { primitive: PrimitiveType.Number },
    ],
    locationInModule: { filename: 'index.ts', line: 3 },
    name: 'StringOrNumber',
  });
});

// ----------------------------------------------------------------------
test('test using aliased union', async () => {
  const assembly = await sourceToAssemblyHelper(`
    export namespace submodule {
      export type StringOrNumber = string | number;
    }

    export class Foo {
      public constructor(public readonly stringOrNumber?: submodule.StringOrNumber) {}

      public method(defaultValue: submodule.StringOrNumber): submodule.StringOrNumber {
        return this.stringOrNumber ?? defaultValue;
      }
    }
  `);

  expect(assembly.types?.['testpkg.Foo']).toEqual({
    assembly: 'testpkg',
    fqn: 'testpkg.Foo',
    kind: 'class',
    initializer: {
      locationInModule: { filename: 'index.ts', line: 7 },
      parameters: [
        {
          name: 'stringOrNumber',
          optional: true,
          type: { fqn: 'testpkg.submodule.StringOrNumber' },
        },
      ],
    },
    methods: [
      {
        locationInModule: { filename: 'index.ts', line: 9 },
        name: 'method',
        parameters: [
          {
            name: 'defaultValue',
            type: { fqn: 'testpkg.submodule.StringOrNumber' },
          },
        ],
        returns: { type: { fqn: 'testpkg.submodule.StringOrNumber' } },
      },
    ],
    properties: [
      {
        immutable: true,
        locationInModule: { filename: 'index.ts', line: 7 },
        name: 'stringOrNumber',
        optional: true,
        type: { fqn: 'testpkg.submodule.StringOrNumber' },
      },
    ],
    locationInModule: { filename: 'index.ts', line: 6 },
    name: 'Foo',
  });
});
