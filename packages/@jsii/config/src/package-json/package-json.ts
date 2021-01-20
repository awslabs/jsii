import type { JsiiExtension } from '../jsii-extension';

/**
 * Interesting parts of a package.json file.
 */
export interface PackageJson {
  /**
   * The jsii extension.
   */
  readonly jsii?: JsiiExtension & JsiiTypeScriptConfig;

  /**
   * The name of the npm package for this jsii project.
   */
  readonly name: string;

  /**
   * Other fields, which are not of interest to us in this context.
   */
  readonly [key: string]: unknown;
}

/**
 * TypeScript compiler configuration embedded in the package.json file.
 */
interface JsiiTypeScriptConfig {
  /**
   * A list of files or glob patters to exclude from the TypeScript input.
   */
  readonly excludeTypescript?: readonly string[];

  /**
   * Whether to enable generation of project references for this project or not.
   */
  readonly projectReferences?: boolean;

  /**
   * Additional TypeScript compilation options.
   */
  readonly tsc?: {
    /**
     * The directory in which to place the TypeScript compiler outputs.
     */
    outDir?: string;

    /**
     * The root directory of the TypeScript source files.
     */
    rootDir?: string;

    /**
     * Unsupported configuration entries.
     */
    readonly [key: string]: unknown;
  };
}
