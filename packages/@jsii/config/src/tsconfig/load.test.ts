import { mkdtempSync, removeSync, writeFileSync } from 'fs-extra';
import { tmpdir } from 'os';
import { basename, join } from 'path';

import { DiagnosticCategory } from '../jsii-config';
import { load } from './load';
import { TsConfig } from './tsconfig';

// Managed by before/after hooks, will point to a directory.
let projectRoot = '';

test('without a tsconfig.json file', () => {
  // WHEN
  const config = load(projectRoot);

  // THEN
  expect(config).toBeUndefined();
});

test('with a syntax error', () => {
  // GIVEN
  writeFileSync(
    join(projectRoot, 'tsconfig.json'),
    '{ "missing": "closing-brace" ',
    { encoding: 'utf-8' },
  );

  // THEN
  expect(() => load(projectRoot)).toThrowErrorMatchingInlineSnapshot(`
    "tsconfig.json(1,30): error TS1005: '}' expected.
    "
  `);
});

describe('without extension', () => {
  test('correctly loads plain JSON', () => {
    // GIVEN
    writeFileSync(
      join(projectRoot, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'ES2018' } }, null, 2),
      { encoding: 'utf-8' },
    );

    // WHEN
    const config = load(projectRoot);

    // THEN
    expect(config).toMatchInlineSnapshot(`
      Object {
        "compilerOptions": Object {
          "target": "ES2018",
        },
      }
    `);
  });

  test('correctly loads JSON with comments and trailing commas', () => {
    // GIVEN
    writeFileSync(
      join(projectRoot, 'tsconfig.json'),
      '{ "compilerOptions": { /* none */ }, }',
      { encoding: 'utf-8' },
    );

    // WHEN
    const config = load(projectRoot);

    // THEN
    expect(config).toMatchInlineSnapshot(`
      Object {
        "compilerOptions": Object {},
      }
    `);
  });
});

describe('with exntension', () => {
  const extension: NonNullable<TsConfig['x-jsii']> = {
    // Required
    targets: { foo: { bar: 'baz' } },
    // Optional
    diagnostics: {
      1: DiagnosticCategory.Error,
      2: DiagnosticCategory.Warning,
      3: DiagnosticCategory.Suggestion,
      4: DiagnosticCategory.Message,
    },
    excludeTypescript: ['exclude'],
    jsiiVersionFormat: 'short',
    metadata: { key: 'value' },
    outdir: 'output-directory',
    projectReferences: true,
    tsc: {
      outDir: 'tsc-out-dir',
      rootDir: 'tsc-root-dir',
    },
  };

  test('with all properties', () => {
    // GIVEN
    writeFileSync(
      join(projectRoot, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: { target: 'ES2018' },
          'x-jsii': extension,
        },
        null,
        2,
      ),
      { encoding: 'utf-8' },
    );

    // WHEN
    const config = load(projectRoot);

    // THEN
    expect(config).toMatchInlineSnapshot(`
      Object {
        "compilerOptions": Object {
          "target": "ES2018",
        },
        "x-jsii": Object {
          "diagnostics": Object {
            "1": "error",
            "2": "warning",
            "3": "suggestion",
            "4": "message",
          },
          "excludeTypescript": Array [
            "exclude",
          ],
          "jsiiVersionFormat": "short",
          "metadata": Object {
            "key": "value",
          },
          "outdir": "output-directory",
          "projectReferences": true,
          "targets": Object {
            "foo": Object {
              "bar": "baz",
            },
          },
          "tsc": Object {
            "outDir": "tsc-out-dir",
            "rootDir": "tsc-root-dir",
          },
        },
      }
    `);
  });

  test('without targets', () => {
    // GIVEN
    writeFileSync(
      join(projectRoot, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: { target: 'ES2018' },
          'x-jsii': { ...extension, targets: undefined },
        },
        null,
        2,
      ),
      { encoding: 'utf-8' },
    );

    // THEN
    expect(() => load(projectRoot)).toThrowErrorMatchingInlineSnapshot(`
      "Invalid tsconfig.json content: 0: instance.x-jsii requires property \\"targets\\"
      "
    `);
  });

  test('with bad diagnostic value', () => {
    // GIVEN
    writeFileSync(
      join(projectRoot, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: { target: 'ES2018' },
          'x-jsii': { ...extension, diagnostics: { foo: 'bar' } },
        },
        null,
        2,
      ),
      { encoding: 'utf-8' },
    );

    // THEN
    expect(() => load(projectRoot)).toThrowErrorMatchingInlineSnapshot(`
      "Invalid tsconfig.json content: 0: instance.x-jsii.diagnostics.foo is not one of enum values: error,message,suggestion,warning
      "
    `);
  });
});

//#region Set-up and tear-down

beforeEach(
  () => (projectRoot = mkdtempSync(join(tmpdir(), basename(__filename)))),
);

afterEach(() => {
  if (!projectRoot) {
    return;
  }
  removeSync(projectRoot);
  projectRoot = '';
});

//#endregion
