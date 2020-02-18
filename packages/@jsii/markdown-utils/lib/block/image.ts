import { NodeType } from 'commonmark';
import { BlockElement } from '../element';

export class Image extends BlockElement {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'image';

  public get url(): string {
    return this.node.destination!;
  }
}
