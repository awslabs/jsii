import { NodeType } from 'commonmark';
import { Element } from '../element';

export class Code extends Element {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'code';

  public get text(): string {
    return this.node.literal!;
  }
}
