import { NodeType } from 'commonmark';
import { BlockElement } from '../element';

export class List extends BlockElement {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'list';
 }
