import { mkdtempSync, removeSync, writeJsonSync } from 'fs-extra';
import { tmpdir } from 'os';
import { basename, join, resolve } from 'path';

import { DiagnosticCategory, JsiiConfig, JsiiConfigStyle } from './jsii-config';
import type { PackageJson } from './package-json/package-json';
import type { TsConfig } from './tsconfig/tsconfig';

import { load } from './index';

const examples: readonly Example[] = [
  //----------------------------------------------------------------------------
  {
    name: 'not a jsii project',
    packageJson: { name: '@mock/dummy' },
    tsconfig: {},
    result: /is not a jsii project/,
  },
  //----------------------------------------------------------------------------
  {
    name: 'not a jsii project (and return-undefined handling)',
    packageJson: { name: '@mock/dummy' },
    tsconfig: {},
    result: undefined,
  },
  //----------------------------------------------------------------------------
  {
    name: 'configured in both package.json and tsconfig.json',
    packageJson: {
      name: '@mock/dummy',
      jsii: { targets: { foo: { bar: 'baz' } } },
    },
    tsconfig: {
      'x-jsii': {
        targets: { foo: { bar: 'baz' } },
      },
    },
    result: /has jsii configuration in both package.json and tsconfig.json/,
  },
  //----------------------------------------------------------------------------
  {
    name: 'configured in package.json',
    packageJson: {
      name: '@mock/dummy',
      jsii: {
        diagnostics: { 1337: DiagnosticCategory.Warning },
        excludeTypescript: ['excluded'],
        jsiiVersionFormat: 'short',
        metadata: { key: 'value' },
        outdir: 'output-directory',
        projectReferences: true,
        targets: { foo: { bar: 'baz' } },
        tsc: {
          outDir: 'tsc-outDir',
          rootDir: 'tsc-rootDir',
        },
      },
    },
    tsconfig: undefined,
    result: {
      configStyle: JsiiConfigStyle.PACKAGE_JSON,
      diagnostics: { 1337: DiagnosticCategory.Warning },
      metadata: { key: 'value' },
      outdir: 'output-directory',
      projectRoot: '<TBD>',
      targets: { foo: { bar: 'baz' }, js: { npm: '@mock/dummy' } },
      tsconfig: {
        compilerOptions: {
          outDir: 'tsc-outDir',
          rootDir: 'tsc-rootDir',
        },
        exclude: ['excluded'],
        references: true,
      },
      versionFormat: 'short',
    },
  },
  //----------------------------------------------------------------------------
  {
    name: 'configured in package.json (without tsc settings)',
    packageJson: {
      name: '@mock/dummy',
      jsii: {
        diagnostics: { 1337: DiagnosticCategory.Warning },
        jsiiVersionFormat: 'short',
        metadata: { key: 'value' },
        outdir: 'output-directory',
        targets: { foo: { bar: 'baz' } },
      },
    },
    tsconfig: undefined,
    result: {
      configStyle: JsiiConfigStyle.PACKAGE_JSON,
      diagnostics: { 1337: DiagnosticCategory.Warning },
      metadata: { key: 'value' },
      outdir: 'output-directory',
      projectRoot: '<TBD>',
      targets: { foo: { bar: 'baz' }, js: { npm: '@mock/dummy' } },
      versionFormat: 'short',
    },
  },
  //----------------------------------------------------------------------------
  {
    name: 'configured in tsconfig.json',
    packageJson: {
      name: '@mock/dummy',
    },
    tsconfig: {
      'x-jsii': {
        diagnostics: { 1337: DiagnosticCategory.Warning },
        excludeTypescript: ['excluded'],
        jsiiVersionFormat: 'short',
        metadata: { key: 'value' },
        outdir: 'output-directory',
        targets: { foo: { bar: 'baz' } },
      },
    },
    result: {
      configStyle: JsiiConfigStyle.TSCONFIG_JSON,
      diagnostics: { 1337: DiagnosticCategory.Warning },
      metadata: { key: 'value' },
      outdir: 'output-directory',
      projectRoot: '<TBD>',
      targets: { foo: { bar: 'baz' }, js: { npm: '@mock/dummy' } },
      versionFormat: 'short',
    },
  },
  //----------------------------------------------------------------------------
];

for (const example of examples) {
  test(example.name, () => {
    const projectRoot = mkdtempSync(join(tmpdir(), basename(__filename)));
    try {
      // GIVEN
      writeJsonSync(join(projectRoot, 'package.json'), example.packageJson, {
        spaces: 2,
      });
      if (example.tsconfig != null) {
        writeJsonSync(join(projectRoot, 'tsconfig.json'), example.tsconfig, {
          spaces: 2,
        });
      }

      if (example.result == null) {
        // THEN
        expect(
          load(projectRoot, { nonJsiiHandling: 'return-undefined' }),
        ).toBeUndefined();
      } else if (example.result instanceof RegExp) {
        // THEN
        expect(() => load(projectRoot)).toThrow(example.result);
      } else {
        // WHEN
        const config = load(projectRoot);

        // THEN
        expect(config).toEqual({
          ...example.result,
          outdir: resolve(projectRoot, example.result.outdir),
          projectRoot,
        });
      }
    } finally {
      removeSync(projectRoot);
    }
  });
}

interface Example {
  readonly name: string;
  readonly packageJson: PackageJson;
  readonly tsconfig?: TsConfig;
  /**
   * Type-dependent interpretation:
   *
   * - RegExp means an error is expected (it should match the RegExp)
   * - JsiiConfig means a particular config is expected (projectRoot will be
   *   substituted, and outdir will be resolved relative to projectRoot)
   * - undefined means `undefined` should be returned and `nonJsiiHandling` be
   *   set to `return-undefined`.
   */
  readonly result: RegExp | JsiiConfig | undefined;
}
