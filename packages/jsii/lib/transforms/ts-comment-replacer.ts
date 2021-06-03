import * as ts from 'typescript';

/**
 * Machinery to replace physical doc comments in the AST with synthetic ones
 *
 * We use this to slightly tweak the comment blocks that we emit to the .js
 * and .d.ts files.
 *
 * The process is as follows:
 *
 * - Iterate over all nodes of the AST. Do the analysis that we require, remember
 *   the Nodes we want to replace the comments of in a table.
 * - When we're ready to emit JS/DTS, use transforms to replace the physical with
 *   synthetic comments by looking up the visited Nodes in the table.
 * - During transformation, we are given a "shadow copy" (?) of the actual node,
 *   so we need to resolve it to the OriginalNode (which is the one that the assembler
 *   saw) -- note that only _original_ nodes have SourceFiles attached.
 *
 * It must be done this way because:
 *
 * - Comments don't have a node in the AST. Instead, comments are called "trivia"
 *   and are discovered by _scanning the source file between two token positions_
 *   in an on-demand fashion.
 * - The only way to "add" comments to a node is to call addSyntheticComment,
 *   which remembers the comment we'd like to emit on the EmitNode of the corresponding
 *   AST Node (the printer will respect this SyntheticComment when printing everything
 *   back out again).
 * - EmitNodes are used for bookkeeping, and are cleared between different passes of
 *   the compiler. We can therefore not add the synthetic comments in the assembler
 *   pass, we have to be able to do it on-demand in a special "transform" pass.
 */
export class TsCommentReplacer {
  private readonly nodes = new Map<ts.Node, NodeDocs>();

  /**
   * Override the doc comment of an AST node
   */
  public overrideNodeDocComment(node: ts.Node, docstring: string): void {
    this.nodes.set(node, { contents: docstring });
  }

  /**
   * Return the set of Transformers to be used in TSC's program.emit()
   */
  public makeTransformers(): ts.CustomTransformers {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    const transformerFactory = (ctx: ts.TransformationContext) => {
      return <T extends ts.Bundle | ts.SourceFile>(input: T): T => {
        if (ts.isSourceFile(input)) {
          return replaceSourceFile(input) as T;
        }
        // I don't know what a Bundle is but seems we don't need it
        return input;
      };

      function replaceSourceFile(source: ts.SourceFile): ts.SourceFile {
        return ts.visitEachChild(source, visitor, ctx);

        function visitor(node: ts.Node): ts.Node {
          const handled = self.handleNode(node, source);
          return ts.visitEachChild(handled, visitor, ctx);
        }
      }
    };

    return {
      // This needs to be here to properly transform .js generation
      before: [transformerFactory],
      // This needs to be here to properly transform .d.ts generation
      afterDeclarations: [transformerFactory],
    };
  }

  private handleNode<T extends ts.Node>(node: T, source: ts.SourceFile): T {
    const original = ts.getOriginalNode(node);
    const doOverride = this.nodes.get(original);

    if (doOverride) {
      whiteoutLeadingComments(original, source);
      this.addTsdocComment(node, doOverride.contents);
    }
    return node;
  }

  /**
   * Add a synthetic comment formatted like a TSDoc block
   *
   * A multiline trivia comment looks like "/ * (...content...) * / (newline?)".
   *
   * The TypeScript printer will take care of indentation.
   */
  private addTsdocComment(node: ts.Node, text: string) {
    const lines = text.trim().split('\n');

    // eslint-disable-next-line prettier/prettier
    const commentContents = ['*\n', ...lines.map((l) => ` * ${l}\n`), ` `].join(
      '',
    );

    ts.addSyntheticLeadingComment(
      node,
      ts.SyntaxKind.MultiLineCommentTrivia,
      commentContents,
      true,
    );
  }
}

interface NodeDocs {
  readonly contents: string;
}

/**
 * In the given source file, replace the extent of the trivia with whitespace
 *
 * This will make it invisible when the printer calls getLeadingTrivia(),
 * which will make it not render it out again. The only comments that
 * will be rendered after this will be synthetic comments.
 */
function whiteoutLeadingComments(node: ts.Node, source: ts.SourceFile) {
  let text = source.getFullText();
  ts.forEachLeadingCommentRange(text, node.getFullStart(), (pos, end, kind) => {
    if (kind === ts.SyntaxKind.MultiLineCommentTrivia) {
      text = text.slice(0, pos).padEnd(end, ' ') + text.slice(end);
    }
  });
  if (source.text !== text) {
    source.text = text;
    (source as any).lineMap = (ts as any).computeLineStarts(text);
  }
}
