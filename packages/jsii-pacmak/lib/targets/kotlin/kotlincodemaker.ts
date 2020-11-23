import { CodeMaker } from 'codemaker';

export class KotlinCodeMaker extends CodeMaker {
  private hasLinesOnCurrentIndent = false;

  public openFile(filePath: string): void {
    super.openFile(filePath);
    this.hasLinesOnCurrentIndent = false;
  }

  public clearLineStatus() {
    this.hasLinesOnCurrentIndent = false;
  }

  public declarationBlock(text: string) {
    this.extraLine();
    super.openBlock(text);
  }

  public block(text: string, block: () => void) {
    this.openBlock(text);
    block();
    this.closeBlock();
  }

  /**
   * Inserts an extra line if at least one line at the current (or higher)
   * indentation level was added.
   */
  public extraLine() {
    if (this.hasLinesOnCurrentIndent) {
      this.line();
    }
  }

  public line(fmt?: string, ...args: string[]) {
    super.line(fmt, ...args);
    this.hasLinesOnCurrentIndent = true;
  }

  public open(textBefore?: string) {
    super.open(textBefore);
    this.hasLinesOnCurrentIndent = false;
  }

  public close(textAfter?: string) {
    super.close(textAfter);
    this.hasLinesOnCurrentIndent = true;
  }
}
