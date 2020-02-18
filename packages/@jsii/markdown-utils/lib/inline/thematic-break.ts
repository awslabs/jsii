import { NodeType } from 'commonmark';
import { Element } from '../element';

export class ThematicBreak extends Element {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'thematic_break';

  public get text() {
    return '\n---\n';
  }
}
