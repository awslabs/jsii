import { BlockElement, CodeBlock, Document, Element, Heading, Renderer, Paragraph } from '@jsii/markdown-utils';
import { TestSuite, KernelTraceEntry, MessageDirection } from './test-suite';

/**
 * Parses a test suite from it's standard Markdown representation.
 *
 * @param source the source of the Markdown document
 *
 * @returns the parsed test suite.
 */
export function parseTestSuite(source: string): TestSuite | undefined {
  const document = Document.parse(source);
  return document.render(new TestSuiteRenderer());
}

class TestSuiteRenderer implements Renderer<TestSuite | undefined> {
  private testSuite?: TestSuite = undefined;
  private inTestSuite = false;
  private category?: string;
  private testName?: string;

  public renderHeading(heading: Heading) {
    if (heading.depth < 2) {
      this.inTestSuite = false;
      delete this.category;
      delete this.testName;
      return this.testSuite;
    } else if (heading.depth === 2) {
      this.inTestSuite = heading.text.trim() === 'Test Suite';
    }
    if (!this.inTestSuite || heading.depth <= 2) {
      return this.testSuite;
    }
    if (this.testSuite == null) {
      this.testSuite = {};
      delete this.category;
      delete this.testName;
    }
    if (heading.depth === 3) {
      this.category = heading.text.trim();
      this.testSuite[this.category] = this.testSuite[this.category] ?? {};
      delete this.testName;
    } else if (heading.depth === 4) {
      if (!this.category) {
        throw new Error(`Encountered a test case outside of a category: ${heading.text}`);
      }
      this.testName = heading.text;
      this.testSuite[this.category].testCases = this.testSuite[this.category].testCases ?? {};
      this.testSuite[this.category].testCases[this.testName] = this.testSuite[this.category].testCases[this.testName] ?? {};
    } else {
      throw new Error(`H${heading.depth} heading is deeper than the supported maximum of 4`);
    }
    return this.testSuite;
  }

  public renderCodeBlock(codeBlock: CodeBlock) {
    if (this.testSuite && this.category && this.testName) {
      const testCase = this.testSuite[this.category].testCases[this.testName];
      if (codeBlock.language !== '') {
        testCase.canonicalForm = codeBlock.text.trim();
      } else {
        testCase.kernelTrace = parseKernelTrace(codeBlock.text.trim());
      }
    }
    return this.testSuite;

    function parseKernelTrace(text: string) {
      const trace = new Array<KernelTraceEntry>();
      for (const line of text.split('\n')) {
        if (line.trim() === '' || /^\s*#/.test(line)) { continue; }
        const parts = /^([><])\s*(.+)$/.exec(line);
        if (!parts) {
          throw new Error(`Illegal kernel trace entry: ${line}`);
        }
        const [, directionChar, messageJson] = parts;
        trace.push({
          direction: directionChar === '>' ? MessageDirection.KernelToHost : MessageDirection.HostToKernel,
          message: JSON.parse(messageJson),
        });
      }
      return trace;
    }
  }

  public renderParagraph(paragraph: Paragraph) {
    if (this.testSuite && this.category && this.testName) {
      const testCase = this.testSuite[this.category].testCases[this.testName];
      if (!testCase.description) {
        testCase.description = paragraph.text.trim();
      } else {
        testCase.description += `\n\n${paragraph.text.trim()}`;
      }
    }
    return this.testSuite;
  }

  /* eslint-disable @typescript-eslint/member-ordering */
  public readonly renderBlockQuote = this.ignore;
  public readonly renderCode = this.ignore;
  public readonly renderHtmlBlock = this.ignore;
  public readonly renderHtmlInline = this.ignore;
  public readonly renderLineBreak = this.ignore;
  public readonly renderSoftBreak = this.ignore;
  public readonly renderText = this.ignore;
  public readonly renderThematicBreak = this.ignore;
  public readonly renderCustomBlock = this.ignore;
  public readonly renderCustomInline = this.ignore;
  public readonly renderDocument = this.ignore;
  public readonly renderEmph = this.ignore;
  public readonly renderImage = this.ignore;
  public readonly renderItem = this.ignore;
  public readonly renderLink = this.ignore;
  public readonly renderList = this.ignore;
  public readonly renderStrong = this.ignore;
  /* eslint-enable @typescript-eslint/member-ordering */

  private ignore(element: Element) {
    if (element instanceof BlockElement) {
      element.children.forEach(elt => elt.render(this));
    }
    return this.testSuite;
  }
}
