import type { AssemblyTargets } from '@jsii/spec';

import type { DiagnosticCategory } from './jsii-config';

/**
 * The jsii configuration hosted directly in package.json.
 */
export interface JsiiExtension {
  /**
   * Diagnostic message severity configuration
   */
  readonly diagnostics?: {
    readonly [code: string]: DiagnosticCategory;
  };

  /**
   * What kind of version format to emit in the generated assembly documents.
   *
   * @default "full"
   */
  readonly jsiiVersionFormat?: 'short' | 'full';

  /**
   * Additional metadata to record in the assembly, for application-specific

   * purposes.
   */
  readonly metadata?: { readonly [key: string]: any };
  /**
   * The directory in which the generated artifacts will be placed.
   *
   * @default "dist"
   */
  readonly outdir?: string;

  /**
   * Language target configuration blocks.
   */
  readonly targets: AssemblyTargets;

  readonly [key: string]: unknown;
}
