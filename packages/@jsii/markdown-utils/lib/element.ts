import { Node } from 'commonmark';
import { Renderer } from './renderer';

/**
 * A Markdown document element.
 */
export abstract class Element {
  /**
   * Creates a new element.
   *
   * @param node the CommonMark node corresponding to this element.
   *
   * @internal
   */
  public constructor(protected readonly node: Node) {
  }

  /**
   * Retrieves the (un-decorated) text for this element.
   */
  public abstract get text(): string;

  /**
   * Renders this element.
   *
   * @param renderer the renderer to use.
   *
   * @returns the rendered result.
   */
  public render<T>(renderer: Renderer<T>): T {
    const handler = `render${this.constructor.name}`;
    if (handler in renderer) {
      return ((renderer as any)[handler])(this);
    }
    throw new Error(`Not implemented: ${renderer.constructor.name}#${handler}`);
  }
}

/**
 * A Markdown document block element.
 */
export abstract class BlockElement extends Element {
  /**
   * Creates a new block element.
   *
   * @param node the CommonMark node corresponding to this block element.
   * @param children the children of this block element.
   *
   * @internal
   */
  public constructor(node: Node, public readonly children: readonly Element[]) {
    super(node);
  }

  public get text() {
    return this.children.map(elt => elt.text).join('');
  }
}
