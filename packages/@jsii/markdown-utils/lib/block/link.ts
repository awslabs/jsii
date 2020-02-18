import { NodeType } from 'commonmark';
import { BlockElement } from '../element';

export class Link extends BlockElement {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'link';

  public get destination(): string {
    return this.node.destination!;
  }
}
