import { NodeType } from 'commonmark';
import { Element } from '../element';

export class SoftBreak extends Element {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'softbreak';

  public get text() {
    return '\n';
  }
}
