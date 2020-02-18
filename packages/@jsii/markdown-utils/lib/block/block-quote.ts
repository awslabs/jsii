import { NodeType } from 'commonmark';
import { BlockElement } from '../element';

export class BlockQuote extends BlockElement {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'block_quote';
}
