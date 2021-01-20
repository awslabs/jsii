import type { JsiiExtension } from '../jsii-extension';

/**
 * Interesting parts of the tsconfig.json file.
 */
export interface TsConfig {
  /**
   * The jsii extension.
   */
  readonly 'x-jsii'?: JsiiExtension;

  /**
   * Other fields, which are not of interest to us in this context.
   */
  readonly [key: string]: unknown;
}
