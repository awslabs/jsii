import { NodeType } from 'commonmark';
import { Element } from '../element';

export class Text extends Element {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'text';

  /**
   * @returns the string represented by this Text element.
   */
  public get text(): string {
    return this.node.literal!;
  }
}
