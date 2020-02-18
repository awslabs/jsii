import { NodeType } from 'commonmark';
import { BlockElement } from '../element';

export class Paragraph extends BlockElement {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'paragraph';
}
