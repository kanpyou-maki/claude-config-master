'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { findUp, planFormat, resolveRoot } = require('../.claude/hooks/quality-gate');

function makeTmpDir() {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'quality-gate-')));
}

function writeFile(dir, rel, content = '') {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return abs;
}

describe('findUp: ファイルの位置から上位へ設定ファイルを探す', () => {
  test('最寄りのディレクトリにある設定ファイルを返す', () => {
    const root = makeTmpDir();
    writeFile(root, 'biome.json', '{}');
    writeFile(root, 'frontend/biome.json', '{}');
    const file = writeFile(root, 'frontend/src/App.tsx');
    assert.equal(findUp(path.dirname(file), ['biome.json', 'biome.jsonc'], root), path.join(root, 'frontend'));
  });

  test('root より上は探さない', () => {
    const outer = makeTmpDir();
    writeFile(outer, 'biome.json', '{}');
    const root = path.join(outer, 'project');
    const file = writeFile(root, 'src/a.ts');
    assert.equal(findUp(path.dirname(file), ['biome.json'], root), null);
  });

  test('root 直下の設定ファイルも見つける', () => {
    const root = makeTmpDir();
    writeFile(root, 'biome.jsonc', '{}');
    const file = writeFile(root, 'src/a.ts');
    assert.equal(findUp(path.dirname(file), ['biome.json', 'biome.jsonc'], root), root);
  });
});

describe('planFormat: 編集したファイルに対する整形コマンドを決める', () => {
  test('サブディレクトリの biome.json があればそのディレクトリのローカル Biome で整形する', () => {
    const root = makeTmpDir();
    writeFile(root, 'frontend/biome.json', '{}');
    writeFile(root, 'frontend/node_modules/.bin/biome');
    const file = writeFile(root, 'frontend/src/App.tsx');
    assert.deepEqual(planFormat(file, root), [{
      command: path.join(root, 'frontend/node_modules/.bin/biome'),
      args: ['check', '--write', file],
      cwd: path.join(root, 'frontend'),
    }]);
  });

  test('ローカルの Biome がなければ npx で実行する', () => {
    const root = makeTmpDir();
    writeFile(root, 'biome.json', '{}');
    const file = writeFile(root, 'src/a.ts');
    assert.deepEqual(planFormat(file, root), [{ command: 'npx', args: ['biome', 'check', '--write', file], cwd: root }]);
  });

  test('CSS も Biome の対象にする', () => {
    const root = makeTmpDir();
    writeFile(root, 'web/biome.json', '{}');
    const file = writeFile(root, 'web/src/index.css');
    assert.equal(planFormat(file, root)[0].cwd, path.join(root, 'web'));
  });

  test('biome.json がなければ Prettier で整形する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'docs/readme.md');
    assert.deepEqual(planFormat(file, root), [{ command: 'npx', args: ['prettier', '--write', file], cwd: root }]);
  });

  test('Python は ruff format と ruff check --fix を実行する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'backend/src/app.py');
    assert.deepEqual(planFormat(file, root), [
      { command: 'ruff', args: ['format', file], cwd: root },
      { command: 'ruff', args: ['check', '--fix', file], cwd: root },
    ]);
  });

  test('対象外の拡張子やファイルが存在しない場合は何もしない', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'image.png');
    assert.deepEqual(planFormat(file, root), []);
    assert.deepEqual(planFormat(path.join(root, 'missing.ts'), root), []);
    assert.deepEqual(planFormat('', root), []);
  });
});

describe('resolveRoot: プロジェクトのルートを決める', () => {
  test('CLAUDE_PROJECT_DIR があれば作業ディレクトリより優先する', () => {
    assert.equal(resolveRoot({ CLAUDE_PROJECT_DIR: '/project' }, '/project/backend'), '/project');
  });

  test('CLAUDE_PROJECT_DIR がなければ作業ディレクトリを使う', () => {
    assert.equal(resolveRoot({}, '/project'), '/project');
  });
});
