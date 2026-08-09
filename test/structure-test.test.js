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
  checkDocGraph,
} = require('../.claude/hooks/structure-test');

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

describe('checkSettingsJson: .claude/settings.json が有効な JSON', () => {
  test('有効な JSON の場合は通過する', () => {
    const root = makeTmpDir();
    writeFile(root, '.claude/settings.json', '{"hooks": {}}');
    assert.equal(checkSettingsJson(root), null);
  });

  test('無効な JSON の場合は違反を返す', () => {
    const root = makeTmpDir();
    writeFile(root, '.claude/settings.json', '{invalid json}');
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

describe('checkHookSyntax: .claude/hooks/ のフックに構文エラーがない', () => {
  test('有効な JS の場合は通過する', () => {
    const root = makeTmpDir();
    writeFile(root, '.claude/hooks/valid.js', "'use strict';\nmodule.exports = {};");
    const results = checkHookSyntax(root);
    assert.equal(results.length, 0);
  });

  test('構文エラーがある JS の場合は違反を返す', () => {
    const root = makeTmpDir();
    writeFile(root, '.claude/hooks/invalid.js', 'const x = {{{broken');
    const results = checkHookSyntax(root);
    assert.equal(results.length, 1);
    assert.ok(results[0].message.length > 0);
  });

  test('.claude/hooks/ が存在しない場合は空配列を返す', () => {
    const root = makeTmpDir();
    const results = checkHookSyntax(root);
    assert.equal(results.length, 0);
  });

  test('複数のフックがある場合、エラーのあるものだけ違反を返す', () => {
    const root = makeTmpDir();
    writeFile(root, '.claude/hooks/valid.js', 'module.exports = {};');
    writeFile(root, '.claude/hooks/invalid.js', 'const = broken;');
    const results = checkHookSyntax(root);
    assert.equal(results.length, 1);
  });
});

// ─── checkDocLinks ────────────────────────────────────────────────────────────

describe('checkDocLinks: docs/ + ルート + .claude/ の相対リンク整合性', () => {
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

  test('ルート直下の .md のリンク切れも検出する', () => {
    const root = makeTmpDir();
    writeFile(root, 'CLAUDE.md', '[missing](./does-not-exist.md)');
    const results = checkDocLinks(root);
    assert.equal(results.length, 1);
  });

  test('.claude/ 配下の .md のリンク切れも検出する', () => {
    const root = makeTmpDir();
    writeFile(root, '.claude/agents/foo.md', '[missing](../../docs/does-not-exist.md)');
    const results = checkDocLinks(root);
    assert.equal(results.length, 1);
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

// ─── checkDocGraph ────────────────────────────────────────────────────────────

describe('checkDocGraph: CLAUDE.md を根とする知識グラフの到達性', () => {
  test('CLAUDE.md から全 docs/ に到達できる場合は警告なし', () => {
    const root = makeTmpDir();
    writeFile(root, 'CLAUDE.md', '[design](./docs/design.md)');
    writeFile(root, 'docs/design.md', '[detail](./detail.md)');
    writeFile(root, 'docs/detail.md', '# 詳細');
    const results = checkDocGraph(root);
    assert.equal(results.length, 0);
  });

  test('CLAUDE.md から辿れない docs/ の .md は孤立として警告する', () => {
    const root = makeTmpDir();
    writeFile(root, 'CLAUDE.md', '[design](./docs/design.md)');
    writeFile(root, 'docs/design.md', '# 設計');
    writeFile(root, 'docs/orphan.md', '# 誰からもリンクされていない');
    const results = checkDocGraph(root);
    assert.equal(results.length, 1);
    assert.ok(results[0].message.includes('orphan.md'));
  });

  test('間接的に到達できるノードは孤立にならない（推移的到達）', () => {
    const root = makeTmpDir();
    writeFile(root, 'CLAUDE.md', '[a](./docs/a.md)');
    writeFile(root, 'docs/a.md', '[b](./b.md)');
    writeFile(root, 'docs/b.md', '[c](./c.md)');
    writeFile(root, 'docs/c.md', '# 3ホップ先');
    const results = checkDocGraph(root);
    assert.equal(results.length, 0);
  });

  test('ディレクトリへのリンクは配下の .md を到達済みとして展開する', () => {
    const root = makeTmpDir();
    writeFile(root, 'CLAUDE.md', '[adr 一覧](./docs/adr/)');
    writeFile(root, 'docs/adr/ADR-001-x.md', '# ADR');
    const results = checkDocGraph(root);
    assert.equal(results.length, 0);
  });

  test('循環リンクがあっても停止しない', () => {
    const root = makeTmpDir();
    writeFile(root, 'CLAUDE.md', '[a](./docs/a.md)');
    writeFile(root, 'docs/a.md', '[b](./b.md)');
    writeFile(root, 'docs/b.md', '[a](./a.md)');
    const results = checkDocGraph(root);
    assert.equal(results.length, 0);
  });

  test('CLAUDE.md が存在しない場合は警告なし（グラフ検査をスキップ）', () => {
    const root = makeTmpDir();
    writeFile(root, 'docs/orphan.md', '# orphan');
    const results = checkDocGraph(root);
    assert.equal(results.length, 0);
  });
});
