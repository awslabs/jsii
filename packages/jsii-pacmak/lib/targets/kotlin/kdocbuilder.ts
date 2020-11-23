import { CodeMaker } from 'codemaker';

export class KDocBuilder {
  private readonly chunks: string[] = [];

  public push(chunk?: string, prefix?: string) {
    if (!chunk) {
      return;
    }

    if (prefix) {
      this.chunks.push(`${prefix}${chunk}`);
      return;
    }

    this.chunks.push(chunk);
  }

  private getLines(): string[] {
    const lines = [];
    for (const chunk of this.chunks) {
      if (lines.length > 0) {
        lines.push('');
      }

      const linesForChunk = chunk.split('\n');
      lines.push(...linesForChunk);
    }
    return lines;
  }

  public render(code: CodeMaker) {
    const lines = this.getLines();
    if (lines.length === 0) {
      return;
    }

    code.line('/**');
    for (const line of lines) {
      code.line(` * ${line}`);
    }
    code.line(' */');
  }
}
