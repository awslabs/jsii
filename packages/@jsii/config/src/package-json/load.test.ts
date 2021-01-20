import { mkdtempSync, removeSync, writeFileSync } from 'fs-extra';
import { tmpdir } from 'os';
import { basename, join } from 'path';

import { DiagnosticCategory } from '../jsii-config';
import { load } from './load';
import { PackageJson } from './package-json';

// Managed by before/after hooks, will point to a directory.
let projectRoot = '';

describe('without extension', () => {
  test('correctly loads project', () => {
    // GIVEN
    writeFileSync(
      join(projectRoot, 'package.json'),
      JSON.stringify(
        { name: '@phony/test-name', version: '0.0.0', private: true },
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
        "name": "@phony/test-name",
        "private": true,
        "version": "0.0.0",
      }
    `);
  });
});

describe('with exntension', () => {
  const extension: NonNullable<PackageJson['jsii']> = {
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
      join(projectRoot, 'package.json'),
      JSON.stringify(
        {
          name: '@phony/test-name',
          version: '0.0.0',
          private: true,
          jsii: extension,
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
        "jsii": Object {
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
        "name": "@phony/test-name",
        "private": true,
        "version": "0.0.0",
      }
    `);
  });

  test('without targets', () => {
    // GIVEN
    writeFileSync(
      join(projectRoot, 'package.json'),
      JSON.stringify(
        {
          name: '@phony/test-name',
          version: '0.0.0',
          private: true,
          jsii: { ...extension, targets: undefined },
        },
        null,
        2,
      ),
      { encoding: 'utf-8' },
    );

    // THEN
    expect(() => load(projectRoot)).toThrowErrorMatchingInlineSnapshot(`
      "Invalid package.json content: 0: instance.jsii does not match allOf schema <#/definitions/JsiiExtension> with 1 error[s]:
      1: instance.jsii requires property \\"targets\\"
      "
    `);
  });

  test('with bad diagnostic value', () => {
    // GIVEN
    writeFileSync(
      join(projectRoot, 'package.json'),
      JSON.stringify(
        {
          name: '@phony/test-name',
          version: '0.0.0',
          private: true,
          jsii: { ...extension, diagnostics: { foo: 'bar' } },
        },
        null,
        2,
      ),
      { encoding: 'utf-8' },
    );

    // THEN
    expect(() => load(projectRoot)).toThrowErrorMatchingInlineSnapshot(`
      "Invalid package.json content: 0: instance.jsii does not match allOf schema <#/definitions/JsiiExtension> with 1 error[s]:
      1: instance.jsii.diagnostics.foo is not one of enum values: error,message,suggestion,warning
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
