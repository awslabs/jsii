import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Document, JsonRenderer } from '../lib';

const asJson = new JsonRenderer();

describe(Document, () => {
  describe(Document.parse, () => {
    test('with an empty document', () => {
      const parsed = Document.parse('');
      expect(parsed.render(asJson)).toMatchSnapshot();
    });

    test('with nested lists', () => {
      const parsed = Document.parse(readSource('nested-list.md'));
      expect(parsed.render(asJson)).toMatchSnapshot();
    });

    test('with everything', () => {
      const parsed = Document.parse(readSource('everything.md'));
      expect(parsed.render(asJson)).toMatchSnapshot();
    });
  });
});

function readSource(name: string): string {
  return readFileSync(resolve(__dirname, 'md', name), { encoding: 'utf-8' });
}
