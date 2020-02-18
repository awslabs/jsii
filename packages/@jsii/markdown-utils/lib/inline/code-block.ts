import { NodeType } from 'commonmark';
import { Element } from '../element';

export class CodeBlock extends Element {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'code_block';

  public get language(): string | null {
    return this.node.info;
  }

  public get text(): string {
    return this.node.literal!;
  }
}
