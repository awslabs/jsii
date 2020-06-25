// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { PythonVisitor } from './python';
import { AstHandler } from '../renderer';
import { CSharpVisitor } from './csharp';
import { JavaVisitor } from './java';

export type TargetLanguage = 'python' | 'csharp' | 'java';
export type VisitorFactory = () => AstHandler<any>;

export const TARGET_LANGUAGES: { [key in TargetLanguage]: VisitorFactory } = {
  python: () => new PythonVisitor(),
  csharp: () => new CSharpVisitor(),
  java: () => new JavaVisitor(),
};
