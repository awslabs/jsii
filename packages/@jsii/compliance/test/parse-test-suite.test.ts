import { readFileSync } from 'fs-extra';
import { resolve } from 'path';
import { parseTestSuite, MessageDirection } from '../lib';

test('with an empty input, returns undefined', () => {
  expect(parseTestSuite(readSource('empty.md'))).toBeUndefined();
});

test('whit an input containing no test suite, returns undefined', () => {
  expect(parseTestSuite(readSource('no-test-suite.md'))).toBeUndefined();
});

test('returns correct test suites', () => {
  const testSuite = parseTestSuite(readSource('complete.md'));
  expect(testSuite).toEqual({
    'Category 1': {
      testCases: {
        'Test A': {
          description: [
            'This test verifies that we can correcly parse test cases when they\'re written',
            'in the canonical way (canonical form, then kernel trace).',
          ].join('\n'),
          canonicalForm: 'expect(\'canonical-form\').toBeTruthy();',
          kernelTrace: [{ direction: MessageDirection.KernelToHost, message: { hello: 'world!' } }]
        },
        'Test B': {
          description: [
            'Here, we verify that we\'re totally able to parse multiple tests within the same',
            'category... It\'d be a lot less useful if categories could only ever contain a',
            'single test case!',
            '',
            'We\'re also intentionally switching the canonical form and the kernel trace',
            'here. Why? Because we can.',
          ].join('\n'),
          canonicalForm: 'expect(category(\'Category 1\').testCases.length).toBe(2);',
          kernelTrace: [{ direction: MessageDirection.KernelToHost, message: { hello: 'world!' } }]
        },
      },
    },
    'Category 2': {
      testCases: {
        'Test A': {
          description: [
            'We also check that we can use the same test name within different categories.',
            'Naming is hard, so naming in a global namespace is nearly impossible!',
          ].join('\n'),
          canonicalForm: 'expect(false).not.toBeTruthy();',
          kernelTrace: [{ direction: MessageDirection.KernelToHost, message: { hello: 'It\'s me...' } }]
        },
      },
    },
  });
});

test('returns an empty test suite if no test case is found', () => {
  const testSuite = parseTestSuite(readSource('no-test-case.md'));
  expect(testSuite).toEqual({
    'Category': { /* Move along, nothing to see here! */}
  });
});

test('throws if a test case contains a sub-heading', () => {
  expect(() => parseTestSuite(readSource('invalid-heading-depth.md')))
    .toThrow(/H5 heading is deeper than the supported maximum of 4/);
});

test('throws if a test case contains invalid kernel trace elements', () => {
  expect(() => parseTestSuite(readSource('invalid-kernel-trace.md')))
    .toThrow(/Illegal kernel trace entry: Yeah, no\./);
});

test('throws if a test case is not within a category', () => {
  expect(() => parseTestSuite(readSource('invalid-test-outside-category.md')))
    .toThrow(/Encountered a test case outside of a category: Bad Test/);
});


function readSource(name: string): string {
  return readFileSync(resolve(__dirname, 'md', name), { encoding: 'utf-8' });
}
