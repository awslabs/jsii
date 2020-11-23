import { shell } from '../../util';

export class KotlinGradleBuilder {
  public constructor(private readonly args: { [name: string]: any }) {}

  public async build(sourceDir: string, outDir: string): Promise<void> {
    const url = `file://${outDir}`;
    const prefix = 'gradle-';
    const gradleArguments = new Array<string>();
    for (const arg of Object.keys(this.args)) {
      if (!arg.startsWith(prefix)) {
        continue;
      }
      gradleArguments.push(`--${arg.slice(prefix.length)}`);
      gradleArguments.push(this.args[arg].toString());
    }

    await shell(
      'gradle',
      ['publish', `-PdeployRepo=${url}`, ...gradleArguments],
      { cwd: sourceDir, retry: { maxAttempts: 5 } },
    );
  }
}
