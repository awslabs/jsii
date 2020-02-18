import { NodeType } from 'commonmark';
import { BlockElement } from '../element';

export class Item extends BlockElement {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'item';

  public get ordered() {
    return this.node.listType === 'ordered';
  }
}
