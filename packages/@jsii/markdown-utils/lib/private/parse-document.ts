import { Node, Parser } from 'commonmark';
import * as FrontMatter from 'front-matter';
import { blocks, Document } from '../block';
import { BlockElement, Element } from '../element';
import { inlines } from '../inline';

export function parseDocument(source: string): Document {
  const frontMatter = FrontMatter(source);
  const walker = new Parser().parse(frontMatter.body).walker();

  const stack = new Array<Element | Node>();
  for (let event = walker.next(); event != null; event = walker.next()) {
    const node = event.node;
    if (node.isContainer) {
      (event.entering ? onEnterBlock : onExitBlock)(node);
    } else {
      onInline(node);
    }
  }
  const [document, ...rest] = stack;
  if (rest.length > 0) {
    throw new Error(`${rest.length} extraneous elements were left in the stack after parsing!`);
  }
  if (document == null) {
    throw new Error('No element found while parsing document!');
  }
  if (!(document instanceof Document)) {
    throw new Error(`The result of parsing the document is not a Document instance (it is: ${document.constructor.name})`);
  }
  return document;

  function onEnterBlock(node: Node): void {
    stack.push(node);
  }

  function onExitBlock(node: Node): void {
    const elements = new Array<Element>();
    while (stack.length > 0 && stack[stack.length - 1] !== node) {
      const child = stack.pop()!;
      if (!(child instanceof Element)) {
        throw new Error(`Encountered unexpected child element: ${child.constructor.name}`);
      }
      elements.push(child);
    }
    // DIscard the placeholder element!
    stack.pop();

    stack.push(createElement(elements.reverse()));

    function createElement(children: readonly Element[]): BlockElement {
      const ctor = blocks[node.type];
      if (!ctor) {
        throw new Error(`Unsupported block element type: ${node.type}`);
      }
      return new ctor(node, children);
    }
  }

  function onInline(node: Node): void {
    stack.push(createElement());

    function createElement(): Element {
      const ctor = inlines[node.type];
      if (!ctor) {
        throw new Error(`Unsupported inline element type: ${node.type}`);
      }
      return new ctor(node);
    }
  }
}
