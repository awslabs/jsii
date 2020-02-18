import { Node, NodeType } from 'commonmark';
import { BlockElement, Element } from '../element';
import { parseDocument } from '../private/parse-document';

export class Document extends BlockElement {
  /** @internal */
  public static readonly commonMarkType: NodeType = 'document';

  /**
   * Parses a Markdown document, which may contain a front-matter.
   *
   * @param source the Markdown document's source.
   *
   * @returns a new Document.
   */
  public static parse(source: string): Document {
    return parseDocument(source);
  }

  /**
   * @internal
   */
  public constructor(node: Node, children: readonly Element[]) {
    super(node, children);
  }
}
