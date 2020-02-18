import * as block from '../block';
import * as inline from '../inline';
import { Renderer } from '../renderer';

export class JsonRenderer implements Renderer<any> {
  public renderCodeBlock(element: inline.CodeBlock): any {
    return { codeBlock: { language: element.language, text: element.text.trim } };
  }

  public renderCode(element: inline.Code): any {
    return { code: { text: element.text } };
  }

  public renderHtmlBlock(element: inline.HtmlBlock): any {
    return { htmlBlock: { text: element.text } };
  }

  public renderHtmlInline(element: inline.HtmlInline): any {
    return { htmlInline: { text: element.text } };
  }

  public renderLineBreak(_element: inline.LineBreak): any {
    return { lineBreak: {} };
  }

  public renderSoftBreak(_element: inline.SoftBreak): any {
    return { softBreak: {} };
  }

  public renderText(element: inline.Text): any {
    return { text: { text: element.text } };
  }

  public renderThematicBreak(_element: inline.ThematicBreak): any {
    return { thematicBreak: {} };
  }

  public renderBlockQuote(element: block.BlockQuote): any {
    return { blockQuote: { children: element.children.map(elt => elt.render(this)) } };
  }

  public renderCustomBlock(element: block.CustomBlock): any {
    return { customBlock: { children: element.children.map(elt => elt.render(this)) } };
  }

  public renderCustomInline(element: block.CustomInline): any {
    return { customInline: { children: element.children.map(elt => elt.render(this)) } };
  }

  public renderDocument(element: block.Document): any {
    return { document: { children: element.children.map(elt => elt.render(this)) } };
  }

  public renderEmph(element: block.Emph): any {
    return { emph: { children: element.children.map(elt => elt.render(this)) } };
  }

  public renderHeading(element: block.Heading): any {
    return { heading: { depth: element.depth, children: element.children.map(elt => elt.render(this)) } };
  }

  public renderImage(element: block.Image): any {
    return { image: { url: element.url, children: element.children.map(elt => elt.render(this)) } };
  }

  public renderItem(element: block.Item): any {
    return { item: { ordered: element.ordered, children: element.children.map(elt => elt.render(this)) } };
  }

  public renderLink(element: block.Link): any {
    return { link: { destination: element.destination, children: element.children.map(elt => elt.render(this)) } };
  }

  public renderList(element: block.List): any {
    return { list: { children: element.children.map(elt => elt.render(this)) } };
  }

  public renderParagraph(element: block.Paragraph): any {
    return { parapgraph: { children: element.children.map(elt => elt.render(this)) } };
  }

  public renderStrong(element: block.Strong): any {
    return { strong: { children: element.children.map(elt => elt.render(this)) } };
  }
}
