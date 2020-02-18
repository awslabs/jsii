import { NodeType } from 'commonmark';
import { BlockElement } from '../element';

export class Strong extends BlockElement {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'strong';
}
