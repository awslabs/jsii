import { NodeType } from 'commonmark';
import { Element } from '../element';

export class HtmlBlock extends Element {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'html_block';

  public get text() {
    return this.node.literal!;
  }
}
