import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { formatDiagnostic, parseConfigFileTextToJson, sys } from 'typescript';

import type { TsConfig } from './tsconfig';
import { validate } from './validate';

/**
 * Loads and validates the contents of tsconfig.json in the provided
 * `projectRoot`. If the file is not present, returns `undefined`.
 *
 * @param projectRoot the directory that would contain the tsconfig.json file.
 *
 * @returns the parsed and validated content of the tsconfig.json file, or
 *          `undefined` if no such file exists.
 *
 * @throws if the contents of tsconfig.json is not valid.
 */
export function load(projectRoot: string): TsConfig | undefined {
  const tsconfig = resolve(projectRoot, 'tsconfig.json');

  if (!existsSync(tsconfig)) {
    return undefined;
  }

  // Using parseConfigFileTextToJson instead of JSON.parse because this is a
  // JSON-with-comments file, and JSON.parse doesn't do that...
  const { config, error } = parseConfigFileTextToJson(
    tsconfig,
    readFileSync(tsconfig, { encoding: 'utf-8' }),
  );

  if (error != null) {
    // There was a syntax error in the provided file...
    throw new Error(
      formatDiagnostic(error, {
        getCanonicalFileName: sys.resolvePath,
        getCurrentDirectory: () => projectRoot,
        getNewLine: () => sys.newLine,
      }),
    );
  }

  return validate(config);
}
