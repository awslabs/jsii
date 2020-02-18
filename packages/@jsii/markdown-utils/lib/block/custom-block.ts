import { NodeType } from 'commonmark';
import { BlockElement } from '../element';

export class CustomBlock extends BlockElement {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'custom_block';
}
