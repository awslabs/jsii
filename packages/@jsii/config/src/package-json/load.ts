import { readFileSync } from 'fs';
import { resolve } from 'path';

import type { PackageJson } from './package-json';
import { validate } from './validate';

/**
 * Loads and validates the contents of package.json in the provided
 * `projectRoot`.
 *
 * @param projectRoot the directory that would contain the package.json file.
 *
 * @returns the parsed and validated content of the package.json file.
 *
 * @throws if the contents of package.json is not valid.
 */
export function load(projectRoot: string): PackageJson {
  return validate(
    JSON.parse(
      readFileSync(resolve(projectRoot, 'package.json'), { encoding: 'utf-8' }),
    ),
  );
}
