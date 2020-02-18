import { blue, bold, gray, green, inverse, italic, red, underline, yellow } from 'chalk';
import * as block from '../block';
import * as inline from '../inline';
import { Renderer } from '../renderer';

export class ConsoleRenderer implements Renderer<string> {
  public renderCodeBlock(element: inline.CodeBlock): string {
    return inverse(`\`\`\`\n${element.text}\`\`\`\n`);
  }

  public renderCode(element: inline.Code): string {
    return inverse(`\`${element.text}\``);
  }

  public renderHtmlBlock(element: inline.HtmlBlock): string {
    return `${red(element.constructor.name)}()`;
  }

  public renderHtmlInline(element: inline.HtmlInline): string {
    return `${red(element.constructor.name)}()`;
  }

  public renderLineBreak(): string {
    return `${gray('\\')}\n`;
  }

  public renderSoftBreak(): string {
    return `\n`;
  }

  public renderText(element: inline.Text): string {
    return element.text;
  }

  public renderThematicBreak(): string {
    return gray('---');
  }

  public renderBlockQuote(element: block.BlockQuote): string {
    const lines = element.children.map(elt => elt.render(this)).join('').trim().split('\n');
    return `\n${yellow(lines.map(line => `> ${line}`).join('\n'))}\n`;
  }

  public renderCustomBlock(element: block.CustomBlock): string {
    return `${red(element.constructor.name)}()`;
  }

  public renderCustomInline(element: block.CustomInline): string {
    return `${red(element.constructor.name)}()`;
  }

  public renderDocument(element: block.Document): string {
    return element.children.map(elt => elt.render(this)).join('');
  }

  public renderEmph(element: block.Emph): string {
    return italic(`*${element.children.map(elt => elt.render(this)).join('')}*`);
  }

  public renderHeading(element: block.Heading): string {
    const title = element.children.map(elt => elt.render(this)).join('');
    const prefix = element.depth <= 2 ? '\n\n' : '\n';
    return `${prefix}${green.bold(`${'#'.repeat(element.depth)} ${title}`)}\n`;
  }

  public renderImage(element: block.Image): string {
    const alt = element.children.map(elt => elt.render(this)).join('');
    return yellow(`![${alt}](${underline(element.url)})`);
  }

  public renderItem(element: block.Item): string {
    const prefix = element.ordered ? '1.' : '-';
    const [head, ...lines] = element.children.map(elt => elt.render(this)).join('').trim().split('\n');

    return [
      `${bold(prefix)} ${head}`,
      ...lines.map(line => `${' '.repeat(prefix.length)} ${line}`)
    ].join('\n');
  }

  public renderLink(element: block.Link): string {
    const title = element.children.map(elt => elt.render(this)).join('');
    return blue(`[${title}](${underline(element.destination)})`);
  }

  public renderList(element: block.List): string {
    return `\n${element.children.map(elt => elt.render(this)).join('\n')}\n`;
  }

  public renderParagraph(element: block.Paragraph): string {
    const text = element.children.map(elt => elt.render(this)).join('');
    return `\n${text}\n`;
  }

  public renderStrong(element: block.Strong): string {
    return bold(`**${element.children.map(elt => elt.render(this)).join('')}**`);
  }
}
