import { isAbsolute, resolve } from 'path';
import { cwd } from 'process';

import { JsiiConfig, JsiiConfigStyle, TypeScriptConfig } from './jsii-config';
import { load as loadPackageJson } from './package-json';
import { load as loadTsconfig } from './tsconfig';

/**
 * Reads the jsii configuration of the project rooted at `projectRoot`.
 *
 * @param projectRoot the root of a jsii project (the directory that contains
 *                    the package.json and tsconfig.json files).
 * @param opts        determines how to under projects that have no jsii
 *                    configuration at all.
 *
 * @returns the parsed configuration.
 *
 * @throws if the `projectRoot` does not contain a jsii project, or if the
 *         project is mis-configured.
 */
export function load(
  projectRoot: string,
  opts?: { nonJsiiHandling?: 'throw' },
): JsiiConfig;

/**
 * Reads the jsii configuration of the project rooted at `projectRoot`.
 *
 * @param projectRoot the root of a jsii project (the directory that contains
 *                    the package.json and tsconfig.json files).
 * @param opts        determines how to under projects that have no jsii
 *                    configuration at all.
 *
 * @returns the parsed configuration, or `undefined` if no jsii configuration
 *          exists for this project.
 *
 * @throws if the `projectRoot` contains a mis-configured project.
 */
export function load(
  projectRoot: string,
  opts: { nonJsiiHandling: 'return-undefined' },
): JsiiConfig | undefined;

export function load(
  projectRoot: string,
  {
    nonJsiiHandling = 'throw',
  }: { nonJsiiHandling?: 'return-undefined' | 'throw' } = {},
): JsiiConfig | undefined {
  const packageJson = loadPackageJson(projectRoot);
  const tsconfig = loadTsconfig(projectRoot);

  if (packageJson.jsii != null && tsconfig?.['x-jsii'] != null) {
    // There is jsii configuration in both files, this is illegal!
    throw new Error(
      `The project in ${projectRoot} has jsii configuration in both package.json and tsconfig.json!`,
    );
  }

  const jsiiExtension = packageJson.jsii ?? tsconfig?.['x-jsii'];
  if (jsiiExtension == null) {
    if (nonJsiiHandling === 'return-undefined') {
      return undefined;
    }
    // There is no jsii configuration, so that's not a jsii project!
    throw new Error(`The project in ${projectRoot} is not a jsii project!`);
  }

  projectRoot = isAbsolute(projectRoot)
    ? projectRoot
    : resolve(cwd(), projectRoot);

  const managedTsconfig = tsconfig?.['x-jsii'] == null;

  return {
    configStyle: managedTsconfig
      ? JsiiConfigStyle.PACKAGE_JSON
      : JsiiConfigStyle.TSCONFIG_JSON,
    diagnostics: jsiiExtension.diagnostics,
    metadata: jsiiExtension.metadata,
    outdir: resolve(projectRoot, jsiiExtension.outdir ?? 'dist'),
    projectRoot,
    targets: {
      js: { npm: packageJson.name },
      ...jsiiExtension.targets,
    },
    tsconfig: managedTsconfig ? toTsconfig(packageJson.jsii!) : undefined,
    versionFormat: jsiiExtension.jsiiVersionFormat ?? 'full',
  };
}

function toTsconfig(
  jsii: NonNullable<ReturnType<typeof loadPackageJson>['jsii']>,
): TypeScriptConfig | undefined {
  if (
    jsii.tsc == null &&
    jsii.excludeTypescript == null &&
    !jsii.projectReferences
  ) {
    return undefined;
  }
  return {
    compilerOptions: jsii.tsc,
    exclude: jsii.excludeTypescript,
    references: jsii.projectReferences,
  };
}
