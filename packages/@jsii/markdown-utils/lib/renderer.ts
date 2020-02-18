import { BlockQuote, CustomBlock, CustomInline, Document, Emph, Heading, Image, Item, Link, List, Paragraph, Strong } from './block';
import { CodeBlock, Code, HtmlBlock, HtmlInline, LineBreak, SoftBreak, Text, ThematicBreak } from './inline';

export interface Renderer<T> {
  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderCodeBlock(element: CodeBlock): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderCode(element: Code): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderHtmlBlock(element: HtmlBlock): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderHtmlInline(element: HtmlInline): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderLineBreak(element: LineBreak): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderSoftBreak(element: SoftBreak): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderText(element: Text): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderThematicBreak(element: ThematicBreak): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderBlockQuote(element: BlockQuote): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderCustomBlock(element: CustomBlock): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderCustomInline(element: CustomInline): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderDocument(element: Document): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderEmph(element: Emph): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderHeading(element: Heading): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderImage(element: Image): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderItem(element: Item): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderLink(element: Link): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderList(element: List): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderParagraph(element: Paragraph): T;

  /**
   * Renders a Markdown element.
   *
   * @param element the element to be rendered.
   *
   * @returns the rendered result.
   */
  renderStrong(element: Strong): T;
}

