import { mkdtemp, remove, writeFile, readFile } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';

import { Compiler } from '../lib/compiler';
import { ProjectInfo } from '../lib/project-info';

describe(Compiler, () => {
  test('"watch" mode', async () => {
    // This can be a little slow, allowing 15 seconds maximum here (default is 5 seconds)
    jest.setTimeout(15_000);

    const sourceDir = await mkdtemp(
      join(tmpdir(), 'jsii-compiler-watch-mode-'),
    );

    try {
      await writeFile(join(sourceDir, 'index.ts'), 'export class MarkerA {}');
      // Intentionally using lower case name - it should be case-insensitive
      await writeFile(join(sourceDir, 'readme.md'), '# Test Package');

      const compiler = new Compiler({
        projectInfo: _makeProjectInfo(sourceDir, 'index.d.ts'),
        failOnWarnings: true,
        projectReferences: false,
      });

      let firstCompilation = true;
      let onWatchClosed: () => void;
      let onWatchFailed: (err: Error) => void;
      const watchClosed = new Promise((ok, ko) => {
        onWatchClosed = ok;
        onWatchFailed = ko;
      });
      const watch = await compiler.watch({
        nonBlocking: true,
        // Ignore diagnostics reporting (not to pollute test console output)
        reportDiagnostics: () => null,
        // Ignore watch status reporting (not to pollute test console output)
        reportWatchStatus: () => null,
        // Verify everything goes according to plan
        compilationComplete: async (emitResult) => {
          try {
            expect(emitResult.emitSkipped).toBeFalsy();
            const output = await readFile(join(sourceDir, '.jsii'), {
              encoding: 'utf-8',
            });
            if (firstCompilation) {
              firstCompilation = false;
              expect(output).toContain('"MarkerA"');
              await writeFile(
                join(sourceDir, 'index.ts'),
                'export class MarkerB {}',
              );
              return;
            }
            expect(output).toContain('"MarkerB"');
            watch.close();
            // Tell the test suite we're done here!
            onWatchClosed();
          } catch (e) {
            watch.close();
            onWatchFailed(e);
          }
        },
      });
      await watchClosed;
    } finally {
      await remove(sourceDir);
    }
  });
});

function _makeProjectInfo(sourceDir: string, types: string): ProjectInfo {
  return {
    projectRoot: sourceDir,
    packageJson: undefined,
    types,
    main: types.replace(/(?:\.d)?\.ts(x?)/, '.js$1'),
    name: 'jsii', // That's what package.json would tell if we look up...
    version: '0.0.1',
    jsiiVersionFormat: 'short',
    license: 'Apache-2.0',
    author: { name: 'John Doe', roles: ['author'] },
    repository: { type: 'git', url: 'https://github.com/aws/jsii.git' },
    dependencies: {},
    peerDependencies: {},
    dependencyClosure: [],
    bundleDependencies: {},
    targets: {},
    excludeTypescript: [],
    managedTsconfig: true,
  };
}
