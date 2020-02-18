import { NodeType } from 'commonmark';
import { BlockElement } from '../element';

export class Emph extends BlockElement {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'emph';
}
