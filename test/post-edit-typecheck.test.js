'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { findTsconfigDir, planTypecheck } = require('../.claude/hooks/post-edit-typecheck');

function makeTmpDir() {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'post-edit-typecheck-')));
}

function writeFile(dir, rel, content = '') {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return abs;
}

describe('findTsconfigDir: 最寄りの tsconfig.json を探す', () => {
  test('上位ディレクトリの tsconfig.json を見つける', () => {
    const root = makeTmpDir();
    writeFile(root, 'frontend/tsconfig.json', '{}');
    const file = writeFile(root, 'frontend/src/deep/a.ts');
    assert.equal(findTsconfigDir(file), path.join(root, 'frontend'));
  });

  test('見つからなければ null を返す', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'a.ts');
    assert.equal(findTsconfigDir(file, root), null);
  });
});

describe('planTypecheck: tsconfig の形に応じて型チェックのコマンドを決める', () => {
  test('通常の tsconfig なら tsc --noEmit を 1 回実行する', () => {
    const root = makeTmpDir();
    writeFile(root, 'tsconfig.json', '{ "compilerOptions": { "strict": true } }');
    assert.deepEqual(planTypecheck(root), [
      { command: 'npx', args: ['tsc', '--noEmit', '--pretty', 'false'], cwd: root },
    ]);
  });

  test('references を持つソリューション形式なら参照先ごとに -p で実行する', () => {
    const root = makeTmpDir();
    writeFile(root, 'tsconfig.json', `{
  // Vite のテンプレートと同じ形
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}`);
    writeFile(root, 'node_modules/.bin/tsc');
    const tsc = path.join(root, 'node_modules/.bin/tsc');
    assert.deepEqual(planTypecheck(root), [
      { command: tsc, args: ['--noEmit', '--pretty', 'false', '-p', path.join(root, 'tsconfig.app.json')], cwd: root },
      { command: tsc, args: ['--noEmit', '--pretty', 'false', '-p', path.join(root, 'tsconfig.node.json')], cwd: root },
    ]);
  });

  test('ディレクトリを指す参照は tsconfig.json を補う', () => {
    const root = makeTmpDir();
    writeFile(root, 'tsconfig.json', '{ "files": [], "references": [{ "path": "./packages/core" }] }');
    const [plan] = planTypecheck(root);
    assert.equal(plan.args.at(-1), path.join(root, 'packages/core/tsconfig.json'));
  });
});
