import { NodeType } from 'commonmark';
import { Element } from '../element';

export class HtmlInline extends Element {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'html_inline';

  public get text() {
    return this.node.literal!;
  }
}
