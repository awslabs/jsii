import { NodeType } from 'commonmark';
import { BlockElement } from '../element';

export class CustomInline extends BlockElement {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'custom_inline';
}
