import { NodeType } from 'commonmark';
import { Element } from '../element';

export class LineBreak extends Element {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'linebreak';

  public get text() {
    return '\n\n';
  }
}
