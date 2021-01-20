import { readFileSync } from 'fs';
import { Schema, Validator } from 'jsonschema';

import type { TsConfig } from './tsconfig';

const SCHEMA = require.resolve('../../schema/TsConfig.schema.json');

/**
 * Validates a tsconfig.json file with jsii extensions using the bundled JSON
 * schema for those.
 *
 * @param config the configuration to be validated.
 *
 * @returns the validated configuration.
 */
export function validate(config: any): TsConfig {
  const schema: Schema = JSON.parse(
    readFileSync(SCHEMA, { encoding: 'utf-8' }),
  );

  const validator = new Validator();
  validator.addSchema(schema);

  const result = validator.validate(config, schema, { nestedErrors: true });
  if (!result.valid) {
    throw new Error(`Invalid tsconfig.json content: ${result.toString()}`);
  }

  return config;
}
