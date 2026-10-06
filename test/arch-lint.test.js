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
  runChecks,
} = require('../.claude/hooks/arch-lint');

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

describe('ARCH-001: エージェント定義は .claude/agents/ にのみ配置する', () => {
  test('.claude/agents/ 内のエージェント定義は通過する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/agents/my-agent.md',
      '---\nname: my-agent\ndescription: test\n---\ncontent');
    assert.equal(checkArch001(file, root), null);
  });

  test('frontmatter のない .md は .claude/ 内でも通過する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/rules/common/style.md', '# hello');
    assert.equal(checkArch001(file, root), null);
  });

  test('.claude/ 配下の agents/ 外に name: frontmatter を持つ .md があると違反を返す', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/some-agent.md',
      '---\nname: some-agent\ndescription: test\n---\ncontent');
    const result = checkArch001(file, root);
    assert.notEqual(result, null);
    assert.equal(result.rule, 'ARCH-001');
    assert.ok(result.message.length > 0);
    assert.ok(result.fix.length > 0);
  });

  test('.claude/ 外の .md はプロジェクト固有ファイルとして無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'content/post.md',
      '---\nname: my-blog-post\ndescription: test\n---\ncontent');
    assert.equal(checkArch001(file, root), null);
  });

  test('SKILL.md は frontmatter があっても無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/skills/foo/SKILL.md',
      '---\nname: foo\ndescription: skill\n---\ncontent');
    assert.equal(checkArch001(file, root), null);
  });

  test('.md 以外のファイルは無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/hooks/my-hook.js', '// hook');
    assert.equal(checkArch001(file, root), null);
  });
});

// ─── ARCH-002 ────────────────────────────────────────────────────────────────

describe('ARCH-002: .claude/ 配下のフック実装は .claude/hooks/ にのみ配置する', () => {
  test('.claude/hooks/ 内の .js は通過する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/hooks/my-hook.js', '// hook');
    assert.equal(checkArch002(file, root), null);
  });

  test('.test.js は .claude/ 内の hooks/ 外でも通過する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/my.test.js', '// test');
    assert.equal(checkArch002(file, root), null);
  });

  test('.claude/ 外の .js はプロジェクトソースとして無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'src/app.js', '// app code');
    assert.equal(checkArch002(file, root), null);
  });

  test('.claude/ 配下の hooks/ 外の .js は違反を返す', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/scripts/my-hook.js', '// hook');
    const result = checkArch002(file, root);
    assert.notEqual(result, null);
    assert.equal(result.rule, 'ARCH-002');
    assert.ok(result.fix.length > 0);
  });

  test('.js 以外のファイルは無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/agents/design.md', '# design');
    assert.equal(checkArch002(file, root), null);
  });
});

// ─── ARCH-003 ────────────────────────────────────────────────────────────────

describe('ARCH-003: .claude/rules/ のファイルは {lang}/{category}.md 形式に従う', () => {
  test('.claude/rules/{lang}/{category}.md は通過する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/rules/typescript/coding-style.md', '# style');
    assert.equal(checkArch003(file, root), null);
  });

  test('.claude/rules/ 外の .md は無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'docs/design.md', '# design');
    assert.equal(checkArch003(file, root), null);
  });

  test('.claude/rules/ 直下の .md は違反を返す（lang ディレクトリなし）', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/rules/coding-style.md', '# style');
    const result = checkArch003(file, root);
    assert.notEqual(result, null);
    assert.equal(result.rule, 'ARCH-003');
  });

  test('.claude/rules/{lang}/{sub}/{category}.md は違反を返す（深すぎる）', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/rules/typescript/nested/coding-style.md', '# style');
    const result = checkArch003(file, root);
    assert.notEqual(result, null);
    assert.equal(result.rule, 'ARCH-003');
  });
});

// ─── ARCH-004 ────────────────────────────────────────────────────────────────

describe('ARCH-004: .claude/settings.json のフック参照先が実在し、$CLAUDE_PROJECT_DIR 起点で書かれている', () => {
  function writeSettings(root, command) {
    writeFile(root, '.claude/settings.json', JSON.stringify({
      hooks: { PostToolUse: [{ hooks: [{ type: 'command', command }] }] },
    }));
  }

  test('$CLAUDE_PROJECT_DIR 起点で、参照先フックファイルが存在する場合は通過する', () => {
    const root = makeTmpDir();
    writeFile(root, '.claude/hooks/my-hook.js', '// hook');
    writeSettings(root, 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/my-hook.js');
    assert.deepEqual(checkArch004(root), []);
  });

  test('${CLAUDE_PROJECT_DIR} と書いた場合や全体を引用符で囲んだ場合も通過する', () => {
    const root = makeTmpDir();
    writeFile(root, '.claude/hooks/my-hook.js', '// hook');
    writeSettings(root, 'node "${CLAUDE_PROJECT_DIR}/.claude/hooks/my-hook.js"');
    assert.deepEqual(checkArch004(root), []);
  });

  test('参照先フックファイルが存在しない場合は違反を返す', () => {
    const root = makeTmpDir();
    writeSettings(root, 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/missing-hook.js');
    const results = checkArch004(root);
    assert.equal(results.length, 1);
    assert.equal(results[0].rule, 'ARCH-004');
    assert.ok(results[0].message.includes('.claude/hooks/missing-hook.js'));
  });

  test('相対パスのフックコマンドは、ファイルが存在しても違反を返す', () => {
    const root = makeTmpDir();
    writeFile(root, '.claude/hooks/my-hook.js', '// hook');
    writeSettings(root, 'node .claude/hooks/my-hook.js');
    const results = checkArch004(root);
    assert.equal(results.length, 1);
    assert.equal(results[0].rule, 'ARCH-004');
    assert.ok(results[0].fix.includes('node "$CLAUDE_PROJECT_DIR"/.claude/hooks/my-hook.js'));
  });

  test('master 自身の settings.json は違反しない', () => {
    assert.deepEqual(checkArch004(path.resolve(__dirname, '..')), []);
  });

  test('.claude/settings.json がない場合は空配列を返す', () => {
    const root = makeTmpDir();
    const results = checkArch004(root);
    assert.equal(results.length, 0);
  });

  test('node コマンド以外のフック参照は無視する', () => {
    const root = makeTmpDir();
    writeFile(root, '.claude/settings.json', JSON.stringify({
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
    const file = writeFile(root, '.claude/hooks/my-hook.js', '// [link](./missing.md)');
    assert.deepEqual(checkArch006(file, root), []);
  });

  test('コードブロック内のリンクは無視する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'docs/design.md', '```markdown\n[broken](./does-not-exist.md)\n```');
    assert.deepEqual(checkArch006(file, root), []);
  });
});

// ─── runChecks ───────────────────────────────────────────────────────────────

describe('runChecks: 編集したファイルに関係する規則だけを検査する', () => {
  function makeRootWithGlobalViolations() {
    const root = makeTmpDir();
    writeFile(root, 'CLAUDE.md', 'line\n'.repeat(101));
    writeFile(root, '.claude/settings.json', JSON.stringify({
      hooks: { PostToolUse: [{ hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/missing.js' }] }] },
    }));
    return root;
  }

  const rulesOf = violations => violations.map(v => v.rule).sort();

  test('ファイルの指定がなければ全体の規則（ARCH-004・005）を検査する', () => {
    const root = makeRootWithGlobalViolations();
    assert.deepEqual(rulesOf(runChecks('', root)), ['ARCH-004', 'ARCH-005']);
  });

  test('関係のないファイルの編集では全体の規則を報告しない', () => {
    const root = makeRootWithGlobalViolations();
    const file = writeFile(root, 'src/a.js', '// ok');
    assert.deepEqual(runChecks(file, root), []);
  });

  test('CLAUDE.md の編集では ARCH-005 を検査する', () => {
    const root = makeRootWithGlobalViolations();
    assert.deepEqual(rulesOf(runChecks(path.join(root, 'CLAUDE.md'), root)), ['ARCH-005']);
  });

  test('settings.json やフックの編集では ARCH-004 を検査する', () => {
    const root = makeRootWithGlobalViolations();
    const hook = writeFile(root, '.claude/hooks/other.js', '// hook');
    assert.deepEqual(rulesOf(runChecks(path.join(root, '.claude/settings.json'), root)), ['ARCH-004']);
    assert.deepEqual(rulesOf(runChecks(hook, root)), ['ARCH-004']);
  });

  test('相対パスで渡されたファイルは root を基準に解決する', () => {
    const root = makeTmpDir();
    writeFile(root, '.claude/some-agent.md', '---\nname: some-agent\ndescription: test\n---\ncontent');
    assert.deepEqual(rulesOf(runChecks('.claude/some-agent.md', root)), ['ARCH-001']);
  });
});
