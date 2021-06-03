import * as path from 'path';

/**
 * Buffers the text of a file for later saving.
 */
export default class FileBuffer {
  public readonly filePath: string;
  private buffer = '';

  public constructor(filePath: string) {
    this.filePath = filePath;
  }

  public write(s: string) {
    this.buffer += s;
  }

  public async save(rootDir: string) {
    // just-in-time require so that this file can be loaded in browsers as well.
    // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
    const fs = require('fs-extra');

    const fullPath = path.join(rootDir, this.filePath);
    await fs.mkdirs(path.dirname(fullPath));
    await fs.writeFile(fullPath, this.buffer);
    return fullPath;
  }
}
