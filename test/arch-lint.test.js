'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  checkArch001,
  checkArch002,
  checkArch003,
  checkArch004,
  checkArch005,
  checkArch006,
} = require('../hooks/arch-lint');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'arch-lint-test-'));
}

function writeFile(dir, rel, content) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return abs;
}

// ─── ARCH-001 ────────────────────────────────────────────────────────────────

describe('ARCH-001: エージェント定義は agents/ にのみ配置する', () => {
  test('agents/ 内のエージェント定義は通過する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'agents/my-agent.md',
      '---\nname: my-agent\ndescription: test\n---\ncontent');
    assert.equal(checkArch001(file, root), null);
  });

  test('frontmatter のない .md は agents/ 外でも通過する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'README.md', '# hello');
    assert.equal(checkArch001(file, root), null);
  });

  test('agents/ 外に name: frontmatter を持つ .md があると違反を返す', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'some-agent.md',
      '---\nname: some-agent\ndescription: test\n---\ncontent');
    const result = checkArch001(file, root);
    assert.notEqual(result, null);
    assert.equal(result.rule, 'ARCH-001');
    assert.ok(result.message.length > 0);
    assert.ok(result.fix.length > 0);
  });

  test('.md 以外のファイルは無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'hooks/my-hook.js', '// hook');
    assert.equal(checkArch001(file, root), null);
  });
});

// ─── ARCH-002 ────────────────────────────────────────────────────────────────

describe('ARCH-002: フック実装は hooks/ にのみ配置する', () => {
  test('hooks/ 内の .js は通過する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'hooks/my-hook.js', '// hook');
    assert.equal(checkArch002(file, root), null);
  });

  test('.test.js は hooks/ 外でも通過する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'test/my.test.js', '// test');
    assert.equal(checkArch002(file, root), null);
  });

  test('test/ 内の .js は通過する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'test/helpers.js', '// helper');
    assert.equal(checkArch002(file, root), null);
  });

  test('hooks/ 外のテスト以外の .js は違反を返す', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'scripts/my-hook.js', '// hook');
    const result = checkArch002(file, root);
    assert.notEqual(result, null);
    assert.equal(result.rule, 'ARCH-002');
    assert.ok(result.fix.length > 0);
  });

  test('.js 以外のファイルは無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'docs/design.md', '# design');
    assert.equal(checkArch002(file, root), null);
  });
});

// ─── ARCH-003 ────────────────────────────────────────────────────────────────

describe('ARCH-003: rules/ のファイルは {lang}/{category}.md 形式に従う', () => {
  test('rules/{lang}/{category}.md は通過する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'rules/typescript/coding-style.md', '# style');
    assert.equal(checkArch003(file, root), null);
  });

  test('rules/ 外の .md は無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'docs/design.md', '# design');
    assert.equal(checkArch003(file, root), null);
  });

  test('rules/ 直下の .md は違反を返す（lang ディレクトリなし）', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'rules/coding-style.md', '# style');
    const result = checkArch003(file, root);
    assert.notEqual(result, null);
    assert.equal(result.rule, 'ARCH-003');
  });

  test('rules/{lang}/{sub}/{category}.md は違反を返す（深すぎる）', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'rules/typescript/nested/coding-style.md', '# style');
    const result = checkArch003(file, root);
    assert.notEqual(result, null);
    assert.equal(result.rule, 'ARCH-003');
  });
});

// ─── ARCH-004 ────────────────────────────────────────────────────────────────

describe('ARCH-004: settings.json のフック参照先ファイルが実在する', () => {
  test('参照先フックファイルが存在する場合は通過する', () => {
    const root = makeTmpDir();
    writeFile(root, 'hooks/my-hook.js', '// hook');
    writeFile(root, 'settings.json', JSON.stringify({
      hooks: {
        PostToolUse: [{ hooks: [{ type: 'command', command: 'node hooks/my-hook.js' }] }],
      },
    }));
    const results = checkArch004(root);
    assert.equal(results.length, 0);
  });

  test('参照先フックファイルが存在しない場合は違反を返す', () => {
    const root = makeTmpDir();
    writeFile(root, 'settings.json', JSON.stringify({
      hooks: {
        PostToolUse: [{ hooks: [{ type: 'command', command: 'node hooks/missing-hook.js' }] }],
      },
    }));
    const results = checkArch004(root);
    assert.equal(results.length, 1);
    assert.equal(results[0].rule, 'ARCH-004');
  });

  test('settings.json がない場合は空配列を返す', () => {
    const root = makeTmpDir();
    const results = checkArch004(root);
    assert.equal(results.length, 0);
  });

  test('node コマンド以外のフック参照は無視する', () => {
    const root = makeTmpDir();
    writeFile(root, 'settings.json', JSON.stringify({
      hooks: {
        PostToolUse: [{ hooks: [{ type: 'command', command: 'echo hello' }] }],
      },
    }));
    const results = checkArch004(root);
    assert.equal(results.length, 0);
  });
});

// ─── ARCH-005 ────────────────────────────────────────────────────────────────

describe('ARCH-005: CLAUDE.md は 100行以内', () => {
  test('100行ちょうどは通過する', () => {
    const root = makeTmpDir();
    writeFile(root, 'CLAUDE.md', 'line\n'.repeat(99) + 'last');
    assert.equal(checkArch005(root), null);
  });

  test('101行は違反を返す', () => {
    const root = makeTmpDir();
    writeFile(root, 'CLAUDE.md', 'line\n'.repeat(101));
    const result = checkArch005(root);
    assert.notEqual(result, null);
    assert.equal(result.rule, 'ARCH-005');
    assert.ok(result.message.includes('101'));
  });

  test('CLAUDE.md が存在しない場合は通過する', () => {
    const root = makeTmpDir();
    assert.equal(checkArch005(root), null);
  });
});

// ─── ARCH-006 ────────────────────────────────────────────────────────────────

describe('ARCH-006: Markdown 相対リンクが存在する', () => {
  test('リンクのない .md は通過する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'docs/design.md', '# 設計\n内容');
    assert.deepEqual(checkArch006(file, root), []);
  });

  test('有効な相対リンクは通過する', () => {
    const root = makeTmpDir();
    writeFile(root, 'docs/target.md', '# target');
    const file = writeFile(root, 'docs/design.md', '[リンク](./target.md)');
    assert.deepEqual(checkArch006(file, root), []);
  });

  test('親ディレクトリへの有効な相対リンクは通過する', () => {
    const root = makeTmpDir();
    writeFile(root, 'ARCHITECTURE.md', '# arch');
    const file = writeFile(root, 'docs/design.md', '[arch](../ARCHITECTURE.md)');
    assert.deepEqual(checkArch006(file, root), []);
  });

  test('絶対 URL は無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'docs/design.md', '[外部](https://example.com)');
    assert.deepEqual(checkArch006(file, root), []);
  });

  test('アンカーのみのリンクは無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'docs/design.md', '[セクション](#section-1)');
    assert.deepEqual(checkArch006(file, root), []);
  });

  test('存在しない相対リンクは ARCH-006 違反を返す', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'docs/design.md', '[missing](./missing.md)');
    const results = checkArch006(file, root);
    assert.equal(results.length, 1);
    assert.equal(results[0].rule, 'ARCH-006');
    assert.ok(results[0].message.includes('missing.md'));
  });

  test('フラグメント付きリンクはファイル部分のみチェックする', () => {
    const root = makeTmpDir();
    writeFile(root, 'docs/target.md', '# target');
    const file = writeFile(root, 'docs/design.md', '[section](./target.md#section)');
    assert.deepEqual(checkArch006(file, root), []);
  });

  test('.md 以外のファイルは無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'hooks/my-hook.js', '// [link](./missing.md)');
    assert.deepEqual(checkArch006(file, root), []);
  });

  test('コードブロック内のリンクは無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'docs/design.md', '```markdown\n[broken](./does-not-exist.md)\n```');
    assert.deepEqual(checkArch006(file, root), []);
  });
});
