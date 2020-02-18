import { Node } from 'commonmark';
import { BlockElement, Element } from '../element';

export * from './block-quote';
export * from './custom-block';
export * from './custom-inline';
export * from './document';
export * from './emph';
export * from './heading';
export * from './image';
export * from './item';
export * from './link';
export * from './list';
export * from './paragraph';
export * from './strong';

type BlockConstructor<T extends BlockElement> = new (node: Node, children: readonly Element[]) => T;

const constructors: Record<string, BlockConstructor<BlockElement>> = {};
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
export const blocks: { readonly [commonMarkType: string]: BlockConstructor<BlockElement> } = constructors;
