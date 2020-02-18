import { NodeType } from 'commonmark';
import { BlockElement } from '../element';

export class Heading extends BlockElement {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'heading';

  public get depth(): number {
    return this.node.level;
  }
}
