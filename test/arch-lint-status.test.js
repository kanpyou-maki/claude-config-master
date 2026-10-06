'use strict';

/**
 * ARCH-007: 状態ファイル（PROJECT_STATUS.md）の大きさの上限（ADR-006）
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { checkArch007, runChecks, formatViolation } = require('../.claude/hooks/arch-lint');

const ROOT = path.resolve(__dirname, '..');
const LIMIT_BYTES = 6 * 1024;

function makeTmpDir() {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'arch-lint-status-')));
}

function writeFile(dir, rel, content) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return abs;
}

describe('ARCH-007: PROJECT_STATUS.md は 6KB 以内', () => {
  test('6,144 バイトちょうどは通過する', () => {
    const root = makeTmpDir();
    writeFile(root, 'PROJECT_STATUS.md', 'a'.repeat(LIMIT_BYTES));
    assert.equal(checkArch007(root), null);
  });

  test('6,145 バイトは違反を返し、現在の大きさと行き先を伝える', () => {
    const root = makeTmpDir();
    writeFile(root, 'PROJECT_STATUS.md', 'a'.repeat(LIMIT_BYTES + 1));
    const result = checkArch007(root);
    assert.equal(result.rule, 'ARCH-007');
    assert.equal(result.file, 'PROJECT_STATUS.md');
    assert.ok(result.message.includes('6,145'));
    assert.ok(result.fix.includes('docs/adr/'));
  });

  test('文字数ではなくバイト数で測る', () => {
    const root = makeTmpDir();
    // 日本語 2,049 文字 = 6,147 バイト。文字数なら上限の 3 分の 1
    writeFile(root, 'PROJECT_STATUS.md', 'あ'.repeat(2049));
    assert.equal(checkArch007(root).rule, 'ARCH-007');
  });

  test('1 行が長くても行数に関係なく違反になる', () => {
    const root = makeTmpDir();
    writeFile(root, 'PROJECT_STATUS.md', `# 状態\n${'x'.repeat(LIMIT_BYTES)}\n`);
    assert.equal(checkArch007(root).rule, 'ARCH-007');
  });

  test('PROJECT_STATUS.md が存在しない場合は通過する', () => {
    assert.equal(checkArch007(makeTmpDir()), null);
  });

  test('修復手順は切り詰められずにモデルへ渡る', () => {
    const root = makeTmpDir();
    writeFile(root, 'PROJECT_STATUS.md', 'a'.repeat(LIMIT_BYTES + 1));
    assert.ok(!formatViolation(checkArch007(root)).includes('…'));
  });
});

describe('runChecks: ARCH-007 を検査する場面', () => {
  function makeRootWithLargeStatus() {
    const root = makeTmpDir();
    writeFile(root, 'PROJECT_STATUS.md', 'a'.repeat(LIMIT_BYTES + 1));
    return root;
  }

  const rulesOf = violations => violations.map(v => v.rule);

  test('PROJECT_STATUS.md の編集で検査する', () => {
    const root = makeRootWithLargeStatus();
    assert.deepEqual(rulesOf(runChecks(path.join(root, 'PROJECT_STATUS.md'), root)), ['ARCH-007']);
  });

  test('ファイルの指定がなければ検査する', () => {
    const root = makeRootWithLargeStatus();
    assert.deepEqual(rulesOf(runChecks('', root)), ['ARCH-007']);
  });

  test('関係のないファイルの編集では報告しない', () => {
    const root = makeRootWithLargeStatus();
    const file = writeFile(root, 'src/a.js', '// ok');
    assert.deepEqual(runChecks(file, root), []);
  });

  test('settings.json のフック定義が壊れていても、ほかの規則の検査を続ける', () => {
    const root = makeRootWithLargeStatus();
    writeFile(root, '.claude/settings.json', JSON.stringify({ hooks: { PostToolUse: null, PreToolUse: [null, { hooks: 'x' }] } }));
    assert.deepEqual(rulesOf(runChecks('', root)), ['ARCH-007']);

    writeFile(root, '.claude/settings.json', 'null');
    assert.deepEqual(rulesOf(runChecks('', root)), ['ARCH-007']);
  });

  test('サブディレクトリにある同名のファイルは対象にしない', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'packages/app/PROJECT_STATUS.md', 'a'.repeat(LIMIT_BYTES + 1));
    assert.deepEqual(runChecks(file, root), []);
  });
});

describe('master 自身', () => {
  test('全体検査（ARCH-004・005・007）に違反しない', () => {
    assert.deepEqual(runChecks('', ROOT), []);
  });

  test('状態ファイルは、引き継ぎメモの 4 節だけを持つ', () => {
    const headings = fs.readFileSync(path.join(ROOT, 'PROJECT_STATUS.md'), 'utf8').match(/^## .+$/gm);
    assert.deepEqual(headings, ['## 現在のフェーズ', '## 進行中', '## 次にやること', '## 人間待ち'], '節は ADR-006 の 4 つ。変えるときは ADR を更新する');
  });
});
