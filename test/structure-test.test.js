'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  checkAdrExists,
  checkSettingsJson,
  checkHookSyntax,
  checkDocLinks,
} = require('../hooks/structure-test');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'structure-test-'));
}

function writeFile(dir, rel, content) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return abs;
}

// ─── checkAdrExists ───────────────────────────────────────────────────────────

describe('checkAdrExists: docs/adr/ に ADR ファイルが存在する', () => {
  test('ADR ファイルが存在する場合は通過する', () => {
    const root = makeTmpDir();
    writeFile(root, 'docs/adr/ADR-001-test.md', '# ADR-001');
    assert.equal(checkAdrExists(root), null);
  });

  test('docs/adr/ が空の場合は違反を返す', () => {
    const root = makeTmpDir();
    fs.mkdirSync(path.join(root, 'docs/adr'), { recursive: true });
    const result = checkAdrExists(root);
    assert.notEqual(result, null);
    assert.ok(result.message.length > 0);
  });

  test('docs/adr/ が存在しない場合は違反を返す', () => {
    const root = makeTmpDir();
    const result = checkAdrExists(root);
    assert.notEqual(result, null);
  });
});

// ─── checkSettingsJson ────────────────────────────────────────────────────────

describe('checkSettingsJson: settings.json が有効な JSON', () => {
  test('有効な JSON の場合は通過する', () => {
    const root = makeTmpDir();
    writeFile(root, 'settings.json', '{"hooks": {}}');
    assert.equal(checkSettingsJson(root), null);
  });

  test('無効な JSON の場合は違反を返す', () => {
    const root = makeTmpDir();
    writeFile(root, 'settings.json', '{invalid json}');
    const result = checkSettingsJson(root);
    assert.notEqual(result, null);
    assert.ok(result.message.length > 0);
  });

  test('settings.json が存在しない場合は通過する', () => {
    const root = makeTmpDir();
    assert.equal(checkSettingsJson(root), null);
  });
});

// ─── checkHookSyntax ──────────────────────────────────────────────────────────

describe('checkHookSyntax: フックファイルに構文エラーがない', () => {
  test('有効な JS の場合は通過する', () => {
    const root = makeTmpDir();
    writeFile(root, 'hooks/valid.js', "'use strict';\nmodule.exports = {};");
    const results = checkHookSyntax(root);
    assert.equal(results.length, 0);
  });

  test('構文エラーがある JS の場合は違反を返す', () => {
    const root = makeTmpDir();
    writeFile(root, 'hooks/invalid.js', 'const x = {{{broken');
    const results = checkHookSyntax(root);
    assert.equal(results.length, 1);
    assert.ok(results[0].message.length > 0);
  });

  test('hooks/ が存在しない場合は空配列を返す', () => {
    const root = makeTmpDir();
    const results = checkHookSyntax(root);
    assert.equal(results.length, 0);
  });

  test('複数のフックがある場合、エラーのあるものだけ違反を返す', () => {
    const root = makeTmpDir();
    writeFile(root, 'hooks/valid.js', 'module.exports = {};');
    writeFile(root, 'hooks/invalid.js', 'const = broken;');
    const results = checkHookSyntax(root);
    assert.equal(results.length, 1);
  });
});

// ─── checkDocLinks ────────────────────────────────────────────────────────────

describe('checkDocLinks: docs/ 配下の相対リンク整合性', () => {
  test('全リンクが有効な場合は空配列を返す', () => {
    const root = makeTmpDir();
    writeFile(root, 'docs/target.md', '# target');
    writeFile(root, 'docs/design.md', '[link](./target.md)');
    const results = checkDocLinks(root);
    assert.equal(results.length, 0);
  });

  test('存在しないリンクがある場合は違反を返す', () => {
    const root = makeTmpDir();
    writeFile(root, 'docs/design.md', '[missing](./missing.md)');
    const results = checkDocLinks(root);
    assert.equal(results.length, 1);
    assert.ok(results[0].message.includes('missing.md'));
  });

  test('docs/ がない場合は空配列を返す', () => {
    const root = makeTmpDir();
    const results = checkDocLinks(root);
    assert.equal(results.length, 0);
  });

  test('絶対 URL は無視する', () => {
    const root = makeTmpDir();
    writeFile(root, 'docs/design.md', '[外部](https://example.com/page)');
    const results = checkDocLinks(root);
    assert.equal(results.length, 0);
  });

  test('複数ファイルにまたがる違反をすべて検出する', () => {
    const root = makeTmpDir();
    writeFile(root, 'docs/a.md', '[broken1](./no-exist-1.md)');
    writeFile(root, 'docs/b.md', '[broken2](./no-exist-2.md)');
    const results = checkDocLinks(root);
    assert.equal(results.length, 2);
  });

  test('コードブロック内のリンクは無視する', () => {
    const root = makeTmpDir();
    writeFile(root, 'docs/design.md', '```markdown\n[broken](./does-not-exist.md)\n```');
    const results = checkDocLinks(root);
    assert.equal(results.length, 0);
  });
});
