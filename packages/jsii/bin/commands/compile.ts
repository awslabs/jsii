import { Command, flags } from '@oclif/command';
import * as log4js from 'log4js';
import { version as tsVersion } from 'typescript/package.json';

import { compile } from '../../lib';
import * as utils from '../../lib/utils';
import { enabledWarnings } from '../../lib/warnings';

export default class Compile extends Command {
  // This allows the command to be used as the default
  public static aliases = [''];

  public static args = [
    {
      name: 'project',
      default: '.',
      description:
        'path to the jsii/typescript project (root directory or tsconfig.json) to compile',
    },
  ];

  public static description = 'compile a jsii/typescript project';

  public static flags = {
    'fail-on-warnings': flags.boolean({
      description: '(DEPRECATED: use --Werr) treat warnings as errors',
    }),
    'fix-peer-dependencies': flags.boolean({
      char: 'f',
      default: true,
      description:
        'automatically add missing entries in the peerDependencies section of package.json',
    }),
    help: flags.help({ char: 'h' }),
    'project-references': flags.boolean({
      char: 'r',
      description: 'generate typescript project references',
    }),
    'silence-warnings': flags.string({
      default: [],
      description: 'list of warnings to silence',
      options: Object.keys(enabledWarnings),
      multiple: true,
    }),
    verbose: flags.boolean({
      allowNo: false,
      char: 'v',
      description: 'enable verbose output',
      parse: (input, context: Compile) => {
        context.verbosity++;
        return input;
      },
    }),
    version: flags.version(),
    watch: flags.boolean({
      char: 'w',
      description: 'watch for file changes and recompile automatically',
    }),
    Werr: flags.boolean({
      description: 'treat warnings as error',
      exclusive: ['fail-on-warnings'],
    }),
  };

  private verbosity = 0;

  public async run() {
    const { args, flags } = this.parse(Compile);

    for (const silenced of flags['silence-warnings']) {
      enabledWarnings[silenced] = false;
    }

    _configureLog4js(this.verbosity);

    return compile(args.project, {
      failOnWarnings: flags['fail-on-warnings'] || flags.Werr,
      fixPeerDependencies: flags['fix-peer-dependencies'],
      projectReferences: flags['project-references'],
      watch: flags.watch,
    }).then(({ projectRoot, emitResult }) => {
      for (const diagnostic of emitResult.diagnostics) {
        utils.logDiagnostic(diagnostic, projectRoot);
      }
      if (emitResult.emitSkipped) {
        this.exit(1);
      }
    });
  }

  protected async init() {
    await super.init();

    // Make sure to show the TypeScript version, too. It matters.
    this.config.userAgent += ` typescript-v${tsVersion}`;
  }
}

function _configureLog4js(verbosity: number) {
  log4js.configure({
    appenders: {
      console: {
        type: 'stderr',
        layout: { type: 'colored' },
      },
      [utils.DIAGNOSTICS]: {
        type: 'stdout',
        layout: { type: 'messagePassThrough' },
      },
    },
    categories: {
      default: { appenders: ['console'], level: _logLevel() },
      // The diagnostics logger must be set to INFO or more verbose, or watch won't show important messages
      [utils.DIAGNOSTICS]: {
        appenders: ['diagnostics'],
        level: _logLevel(Math.max(verbosity, 1)),
      },
    },
  });

  function _logLevel(verbosityLevel = verbosity): keyof log4js.Levels {
    switch (verbosityLevel) {
      case 0:
        return 'WARN';
      case 1:
        return 'INFO';
      case 2:
        return 'DEBUG';
      case 3:
        return 'TRACE';
      default:
        return 'ALL';
    }
  }
}
