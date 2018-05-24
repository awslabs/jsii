import * as fs from 'fs-extra';
import * as path from 'path';
import * as ts from 'typescript';

export function getCompilerOptions(): ts.CompilerOptions {
    return {
        target: ts.ScriptTarget.ES2018,
        lib: [ 'es2016', 'es2017.object', 'es2017.string' ],
        module: ts.ModuleKind.CommonJS,
        strict: true,
        strictPropertyInitialization: true,
        noImplicitAny: true,
        strictNullChecks: true,
        noImplicitThis: true,
        alwaysStrict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        inlineSourceMap: true,
        experimentalDecorators: true,
        jsx: ts.JsxEmit.React,
        jsxFactory: 'jsx.create',
    };
}

export async function saveCompilerOptions(packageDir: string) {
    const options: any = { compilerOptions: getCompilerOptions() };

    // HACK: convert a couple of things to strings
    options._generated_by_jsii_ = 'generated by jsii - you can delete, and ideally add to your .gitignore';
    options.compilerOptions.target = ts.ScriptTarget[options.compilerOptions.target].toString().toLocaleLowerCase();
    options.compilerOptions.module = ts.ModuleKind[options.compilerOptions.module].toString().toLocaleLowerCase();
    options.compilerOptions.jsx = ts.JsxEmit[options.compilerOptions.jsx].toString().toLocaleLowerCase();

    const tsconfigPath = path.join(packageDir, 'tsconfig.json');
    if (await fs.pathExists(tsconfigPath)) {
        const actual = await fs.readJson(tsconfigPath);
        if (!actual._generated_by_jsii_) {
            // tslint:disable-next-line:max-line-length
            throw new Error('Local tsconfig.json must be generated by jsii.\nIn order to maintain cross-language compatibility, jsII needs to control those options, but it would generate a local tsconfig.json file for IDE support. Bottom line, you should delete the file: ' + tsconfigPath);
        }
    } else {
        // tslint:disable-next-line:no-console
        console.error('tsconfig.json created for seamless IDE experience (no need to commit)');
    }

    // overwrite!
    await fs.writeJson(tsconfigPath, options);
}
