#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const tjs = require('typescript-json-schema');

const outDir = path.resolve(__dirname, '..', 'schema');

try {
  fs.mkdirSync(outDir);
} catch (err) {
  if (err.code !== 'EEXIST') {
    throw err;
  }
}

const inFiles = {
  PackageJson: path.join('package-json', 'package-json.ts'),
  TsConfig: path.join('tsconfig', 'tsconfig.ts'),
};

for (const [rootType, inFile] of Object.entries(inFiles)) {
  const input = path.resolve(__dirname, '..', 'src', inFile);
  const output = path.resolve(outDir, `${rootType}.schema.json`);

  tjs.exec(input, rootType, {
    out: output,
    refs: true,
    required: true,
    strictNullChecks: true,
    topRef: true,
  });
}
