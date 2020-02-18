import { Node } from 'commonmark';
import { Element } from '../element';

export * from './code-block';
export * from './code';
export * from './html-block';
export * from './html-inline';
export * from './linebreak';
export * from './softbreak';
export * from './text';
export * from './thematic-break';

type Constructor<T extends Element> = new (node: Node) => T;

const constructors: Record<string, Constructor<Element>> = {};
for (const type of Object.values(module.exports)) {
  if (typeof type !== 'function') {
    // Ignore non-constructor exports
    continue;
  }
  if (typeof (type as any).commonMarkType === 'string') {
    const typeName = (type as any).commonMarkType;
    if (typeName in constructors) {
      throw new Error(`Duplicate definition for CommonMark type ${typeName}: ${constructors[typeName]} and ${type}`);
    }
    constructors[typeName] = (type as any);
  }
}

/** @internal */
export const inlines: { readonly [commonMarkType: string]: Constructor<Element> } = constructors;
