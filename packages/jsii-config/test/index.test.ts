import * as fs from 'fs';
import * as inquirer from 'inquirer';
import jsiiConfig from '../lib';
import { packageJsonObject, findQuestions, findQuestion } from './util';

describe('jsii-config', () => {
  const promptMock = jest.fn();
  const readJsonMock = jest.fn();

  beforeEach(() => {
    // eslint-disable-next-line no-import-assign
    Object.defineProperty(fs, 'readFile', { value: readJsonMock });
    // eslint-disable-next-line no-import-assign
    Object.defineProperty(inquirer, 'prompt', { value: promptMock });
  });

  afterEach(() => {
    promptMock.mockClear();
    readJsonMock.mockClear();
  });

  afterAll(() => {
    promptMock.mockRestore();
    readJsonMock.mockRestore();
  });

  describe('errors', () => {
    it('throws when no readFile fails', async () => {
      const message = 'Err Message';
      readJsonMock.mockImplementation((_path, cb) => {
        cb(new Error(message));
      });
      await expect(jsiiConfig('unknown.json')).rejects.toThrow(message);
    });

    it('throws when package.json is invalid', async () => {
      readJsonMock.mockImplementation((_path, cb) => {
        cb(null, Buffer.from('INVALID JSON STRING'));
      });

      await expect(jsiiConfig('package.json')).rejects.toThrow(
        'Unexpected token I in JSON at position 0',
      );
    });
  });

  describe('missing top level package fields', () => {
    const mockMissingField = (field: string) =>
      readJsonMock.mockImplementation((_path, cb) => {
        cb(
          null,
          Buffer.from(
            JSON.stringify({
              ...packageJsonObject,
              [field]: undefined,
            }),
          ),
        );
      });

    const requiredNpmFields = [
      'name',
      'version',
      'repository',
      'main',
      'author',
    ];

    requiredNpmFields.forEach((field) => {
      it(`warns user on missing ${field} in package.json and exits`, async () => {
        mockMissingField(field);
        await expect(jsiiConfig('./package.json')).rejects.toThrow(
          `package.json is missing required fields:${'\n'}- ${field}${'\n'}run "npm init" or configure manually and retry jsii-config`,
        );
      });
    });
  });

  describe('no existing jsii configuration', () => {
    const configAnswers = {
      stability: 'experimental',
      types: 'index.d.ts',
      jsii: {
        outdir: 'dist',
        versionFormat: 'short',
        targets: {
          java: {
            package: 'software.amazon.module.core',
            maven: {
              groupId: 'software.amazon.module',
              artifactId: 'core',
              versionSuffix: '',
            },
          },
          dotnet: {
            namespace: 'Amazon.Module',
            packageId: 'Amazon.Module',
            iconUrl: undefined,
            versionSuffix: '',
            signAssembly: false,
          },
        },
      },
    };

    beforeEach(() => {
      promptMock
        .mockResolvedValueOnce({
          jsiiTargets: [],
          ...configAnswers,
        })
        .mockResolvedValueOnce({
          confirm: true,
        });

      readJsonMock.mockImplementation((_path, cb) => {
        cb(null, Buffer.from(JSON.stringify(packageJsonObject)));
      });
    });

    it('prompts user for top level jsii config and language targets', async () => {
      await jsiiConfig('./package.json');
      const questions = promptMock.mock.calls[0][0];
      const [stability, types, outdir, versionFormat, targets] = findQuestions(
        [
          'stability',
          'types',
          'jsii.outdir',
          'jsii.versionFormat',
          'jsiiTargets',
        ],
        questions,
      );
      expect(stability).toHaveProperty('type', 'list');
      expect(stability).toHaveProperty('choices', [
        'deprecated',
        'experimental',
        'stable',
        'external',
      ]);
      expect(stability).toHaveProperty('default', 'experimental');

      expect(types).toHaveProperty('type', 'input');
      expect(types).not.toHaveProperty('default');

      expect(outdir).toHaveProperty('type', 'input');
      expect(outdir).toHaveProperty('default', 'dist');

      expect(versionFormat).toHaveProperty('type', 'list');
      expect(versionFormat.choices).toContain('full');
      expect(versionFormat.choices).toContain('short');

      expect(targets).toHaveProperty('type', 'checkbox');
      expect(targets).toHaveProperty('choices', ['java', 'python', 'dotnet']);
    });

    it('prompts for java specific values when only target enabled', async () => {
      await jsiiConfig('./package.json');
      const enabled = { jsiiTargets: ['java'] };
      const disabled = { jsiiTargets: [] };
      const questions = promptMock.mock.calls[0][0];
      const subject = findQuestions(
        [
          'jsii.targets.java.package',
          'jsii.targets.java.maven.groupId',
          'jsii.targets.java.maven.artifactId',
          'jsii.targets.java.maven.versionSuffix',
        ],
        questions,
      );

      subject.forEach((question: any) => {
        expect(question.when(enabled)).toBe(true);
      });

      subject.forEach((question: any) => {
        expect(question.when(disabled)).toBe(false);
      });
    });

    it('prompts for python specific values only when target enabled', async () => {
      await jsiiConfig('./package.json');
      const enabled = { jsiiTargets: ['python'] };
      const disabled = { jsiiTargets: [] };
      const questions = promptMock.mock.calls[0][0];
      const subject = findQuestions(
        ['jsii.targets.python.module', 'jsii.targets.python.distName'],
        questions,
      );

      subject.forEach((question: any) => {
        expect(question.when(enabled)).toBe(true);
      });

      subject.forEach((question: any) => {
        expect(question.when(disabled)).toBe(false);
      });
    });

    it('prompts for dotnet specific values only when target enabled', async () => {
      await jsiiConfig('./package.json');
      const enabled = { jsiiTargets: ['dotnet'] };
      const disabled = { jsiiTargets: [] };
      const questions = promptMock.mock.calls[0][0];
      const subject = findQuestions(
        [
          'jsii.targets.dotnet.namespace',
          'jsii.targets.dotnet.packageId',
          'jsii.targets.dotnet.iconUrl',
          'jsii.targets.dotnet.versionSuffix',
          'jsii.targets.dotnet.signAssembly',
        ],
        questions,
      );

      subject.forEach((question: any) => {
        expect(question.when(enabled)).toBe(true);
      });

      subject.forEach((question: any) => {
        expect(question.when(disabled)).toBe(false);
      });
    });

    it('prompts for dotnet assembly originator file when target and signAssembly are enabled', async () => {
      await jsiiConfig('./package.json');
      const questions = promptMock.mock.calls[0][0];
      const subject = findQuestion(
        'jsii.targets.dotnet.assemblyOriginatorKeyFile',
        questions,
      );
      const enabled = {
        jsiiTargets: ['dotnet'],
        jsii: {
          targets: {
            dotnet: {
              signAssembly: true,
            },
          },
        },
      };

      const disabled = {
        jsiiTargets: ['dotnet'],
        jsii: {
          targets: {
            dotnet: {
              signAssembly: false,
            },
          },
        },
      };

      expect(subject.when(enabled)).toBe(true);
      expect(subject.when(disabled)).toBe(false);
    });

    it('returns new config with empty values removed', async () => {
      const subject = await jsiiConfig('./package.json');
      const expected: DeepPartial<typeof configAnswers> = { ...configAnswers };
      delete expected.jsii?.targets?.dotnet?.iconUrl;
      delete expected.jsii?.targets?.dotnet?.signAssembly;
      delete expected.jsii?.targets?.dotnet?.versionSuffix;
      delete expected.jsii?.targets?.java?.maven?.versionSuffix;

      expect(subject).toEqual({
        ...packageJsonObject,
        ...expected,
      });
    });

    [
      'types',
      'jsii.outdir',
      'jsii.targets.java.package',
      'jsii.targets.java.maven.groupId',
      'jsii.targets.java.maven.artifactId',
      'jsii.targets.python.distName',
      'jsii.targets.python.module',
      'jsii.targets.dotnet.namespace',
      'jsii.targets.dotnet.packageId',
      'jsii.targets.dotnet.assemblyOriginatorKeyFile',
    ].forEach((field) => {
      it(`shows error message when empty ${field} is submitted`, async () => {
        await jsiiConfig('./package.json');
        const questions = promptMock.mock.calls[0][0];
        const subject = findQuestion(field, questions);

        expect(subject.validate()).toEqual('Please enter a value');
        expect(subject.validate('')).toEqual('Please enter a value');
      });
    });

    it('shows error message when dotnet version suffix is submitted empty or without a "-"', async () => {
      await jsiiConfig('./package.json');
      const questions = promptMock.mock.calls[0][0];
      const subject = findQuestion(
        'jsii.targets.dotnet.versionSuffix',
        questions,
      );

      expect(subject.validate('xxx')).toEqual(
        'versionSuffix must begin with "-"',
      );
      expect(subject.validate('-xxx')).toEqual(true);
    });
  });

  describe('existing configuration', () => {
    const existingConfig = {
      stability: 'experimental',
      types: 'TYPES',
      jsii: {
        outdir: 'OUTDIR',
        versionFormat: 'short',
        targets: {
          java: {
            package: 'JAVA_PACKAGE',
            maven: {
              groupId: 'JAVA_MAVEN_GROUPID',
              artifactId: 'JAVA_MAVEN_ARTIFACTID',
            },
          },
          dotnet: {
            namespace: 'DOTNET_NAMESPACE',
            packageId: 'DOTNET_PACKAGEID',
            iconUrl: 'DOTNET_ICONURL',
          },
          python: {
            distName: 'PYTHON_DISTNAME',
            module: 'PYTHON_MODULE',
          },
        },
        metadata: {
          'jsii:boolean': true,
          'jsii:number': 1337,
        },
      },
    };

    const configAnswers = {
      stability: 'stable',
      types: 'new_types.d.ts',
      jsii: {
        outdir: 'dist',
        versionFormat: 'short',
      },
    };

    beforeEach(() => {
      promptMock.mockResolvedValueOnce(configAnswers).mockResolvedValueOnce({
        confirm: true,
      });

      readJsonMock.mockImplementation((_path, cb) => {
        cb(
          null,
          Buffer.from(
            JSON.stringify({
              ...packageJsonObject,
              ...existingConfig,
            }),
          ),
        );
      });
    });

    it('uses existing values as prompt defaults', async () => {
      await jsiiConfig('./package.json');
      const defaultMap: { [key: string]: any } = {
        jsiiTargets: ['java', 'dotnet', 'python'],
        stability: 'experimental',
        types: 'TYPES',
        ['jsii.outdir']: 'OUTDIR',
        ['jsii.versionFormat']: 'short',
        ['jsii.targets.java.package']: 'JAVA_PACKAGE',
        ['jsii.targets.java.maven.groupId']: 'JAVA_MAVEN_GROUPID',
        ['jsii.targets.java.maven.artifactId']: 'JAVA_MAVEN_ARTIFACTID',
        ['jsii.targets.python.distName']: 'PYTHON_DISTNAME',
        ['jsii.targets.python.module']: 'PYTHON_MODULE',
        ['jsii.targets.dotnet.namespace']: 'DOTNET_NAMESPACE',
        ['jsii.targets.dotnet.packageId']: 'DOTNET_PACKAGEID',
        ['jsii.targets.dotnet.iconUrl']: 'DOTNET_ICONURL',
      };
      const questions = promptMock.mock.calls[0][0];

      Object.entries(defaultMap).forEach((entry: [string, any]) => {
        const [name, defaultVal] = entry;
        const subject = findQuestion(name, questions);

        expect(subject).toHaveProperty('default', defaultVal);
      });
    });

    it('preserves existing jsii metadata fields', async () => {
      const subject = await jsiiConfig('./package.json');
      expect(subject).toEqual({
        ...packageJsonObject,
        ...configAnswers,
        jsii: {
          ...configAnswers.jsii,
          metadata: {
            'jsii:boolean': true,
            'jsii:number': 1337,
          },
        },
      });
    });
  });

  describe('edit config', () => {
    const answers = {
      jsiiTargets: ['python'],
      jsii: {
        outdir: 'OUTDIR',
        versionFormat: 'short',
        targets: {
          python: {
            distName: 'PYTHON_DISTNAME',
            module: 'PYTHON_MODULE',
          },
        },
      },
    };

    beforeEach(() => {
      promptMock
        .mockResolvedValueOnce(answers)
        .mockResolvedValueOnce({
          confirm: false,
        })
        .mockResolvedValueOnce(answers)
        .mockResolvedValueOnce({
          confirm: true,
        });

      readJsonMock.mockImplementation((_path, cb) => {
        cb(null, Buffer.from(JSON.stringify(packageJsonObject)));
      });
    });

    it('prompts user again with previous answers if confirmation is declined', async () => {
      await jsiiConfig('./package.json');
      const defaultMap: { [key: string]: any } = {
        jsiiTargets: ['python'],
        ['jsii.outdir']: 'OUTDIR',
        ['jsii.versionFormat']: 'short',
        ['jsii.targets.python.distName']: 'PYTHON_DISTNAME',
        ['jsii.targets.python.module']: 'PYTHON_MODULE',
      };
      const questions = promptMock.mock.calls[2][0];

      Object.entries(defaultMap).forEach((entry: [string, any]) => {
        const [name, defaultVal] = entry;
        const subject = findQuestion(name, questions);

        expect(subject).toHaveProperty('default', defaultVal);
      });
    });
  });
});

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends object // eslint-disable-line @typescript-eslint/ban-types
    ? DeepPartial<T[P]>
    : T[P];
};
