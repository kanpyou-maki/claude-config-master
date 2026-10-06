'use strict';

/**
 * フックをプロセスとして起動し、Claude Code との入出力の約束（ADR-005）を検証する。
 *   - 検出結果をモデルに伝えるときは stderr + 終了コード 2
 *   - 受け取った入力を stdout に書き戻さない
 *   - 作業ディレクトリがプロジェクト直下でなくても動く
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HOOKS_DIR = path.join(ROOT, '.claude', 'hooks');
const AGENT_DEFINITION = '---\nname: some-agent\ndescription: test\n---\ncontent';

function makeTmpDir() {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'hook-contract-')));
}

function writeFile(dir, rel, content = '') {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return abs;
}

/** フックを起動する。projectDir を省略すると CLAUDE_PROJECT_DIR なしで起動する */
function runHook(name, input, { cwd, projectDir } = {}) {
  const { CLAUDE_PROJECT_DIR: _inherited, ...baseEnv } = process.env;
  const env = projectDir ? { ...baseEnv, CLAUDE_PROJECT_DIR: projectDir } : baseEnv;
  const stdin = typeof input === 'string' ? input : JSON.stringify(input);
  return spawnSync(process.execPath, [path.join(HOOKS_DIR, name)], { input: stdin, cwd, env, encoding: 'utf8' });
}

describe('arch-lint.js: 違反をモデルに伝える', () => {
  test('違反があれば stderr に書いて終了コード 2 で終わる', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/some-agent.md', AGENT_DEFINITION);
    const result = runHook('arch-lint.js', { tool_input: { file_path: file } }, { cwd: root, projectDir: root });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /ARCH-001/);
    assert.equal(result.stdout, '');
  });

  test('違反がなければ何も出力せず終了コード 0 で終わる', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'src/a.js', '// ok');
    const result = runHook('arch-lint.js', { tool_input: { file_path: file } }, { cwd: root, projectDir: root });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  });

  test('作業ディレクトリがサブディレクトリでも CLAUDE_PROJECT_DIR を基準に検査する', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/some-agent.md', AGENT_DEFINITION);
    const backend = path.join(root, 'backend');
    fs.mkdirSync(backend);
    const result = runHook('arch-lint.js', { tool_input: { file_path: file } }, { cwd: backend, projectDir: root });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /ARCH-001/);
  });

  test('CLAUDE_PROJECT_DIR がなければ作業ディレクトリを基準にする', () => {
    const root = makeTmpDir();
    const file = writeFile(root, '.claude/some-agent.md', AGENT_DEFINITION);
    const result = runHook('arch-lint.js', { tool_input: { file_path: file } }, { cwd: root });
    assert.equal(result.status, 2);
  });

  test('入力が空でも全体の検査を実行する', () => {
    const root = makeTmpDir();
    writeFile(root, 'CLAUDE.md', 'line\n'.repeat(101));
    const result = runHook('arch-lint.js', '{}', { cwd: root, projectDir: root });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /ARCH-005/);
  });
});

describe('post-edit-typecheck.js: 型エラーをモデルに伝える', () => {
  /** tscOutput を 1 行出力するだけの偽の tsc を置いたプロジェクトを作る */
  function setupProject(tscOutput) {
    const root = makeTmpDir();
    writeFile(root, 'tsconfig.json', '{}');
    const tsc = writeFile(root, 'node_modules/.bin/tsc', `#!/bin/sh\necho "${tscOutput}"\n`);
    fs.chmodSync(tsc, 0o755);
    return { root, file: writeFile(root, 'src/a.ts', 'const n: number = "x";') };
  }

  test('編集したファイルに型エラーがあれば stderr に書いて終了コード 2 で終わる', () => {
    const { root, file } = setupProject("src/a.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.");
    const result = runHook('post-edit-typecheck.js', { tool_input: { file_path: file } }, { cwd: root, projectDir: root });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /TS2322/);
    assert.equal(result.stdout, '');
  });

  test('ほかのファイルのエラーだけなら何も出力せず終了コード 0 で終わる', () => {
    const { root, file } = setupProject('src/other.ts(1,7): error TS2322: unrelated');
    const result = runHook('post-edit-typecheck.js', { tool_input: { file_path: file } }, { cwd: root, projectDir: root });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  });
});

describe('quality-gate.js: 入力を書き戻さない', () => {
  test('整形の対象外のファイルでは何も出力しない', () => {
    const root = makeTmpDir();
    const file = writeFile(root, 'image.png');
    const result = runHook('quality-gate.js', { tool_input: { file_path: file } }, { cwd: root, projectDir: root });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });
});

describe('pre-bash-git-push-reminder.js: git push のときだけモデルに注意を渡す', () => {
  test('git push なら additionalContext を JSON で返す（ブロックはしない）', () => {
    const result = runHook('pre-bash-git-push-reminder.js', { tool_input: { command: 'npm test && git push -u origin feat/x' } });
    assert.equal(result.status, 0);
    const output = JSON.parse(result.stdout);
    assert.equal(output.hookSpecificOutput.hookEventName, 'PreToolUse');
    assert.match(output.hookSpecificOutput.additionalContext, /review-loop/);
    assert.equal(output.hookSpecificOutput.permissionDecision, undefined);
  });

  test('git push 以外のコマンドでは何も出力しない', () => {
    const result = runHook('pre-bash-git-push-reminder.js', { tool_input: { command: 'git status' } });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  });

  test('JSON でない入力は無視する', () => {
    const result = runHook('pre-bash-git-push-reminder.js', 'not json');
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });
});

describe('master の .claude/settings.json', () => {
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf8'));
  const handlers = Object.values(settings.hooks).flat().flatMap(group => group.hooks);

  test('すべてのフックを $CLAUDE_PROJECT_DIR 起点で起動する', () => {
    for (const handler of handlers) {
      assert.match(handler.command, /^node "\$CLAUDE_PROJECT_DIR"\/\.claude\/hooks\/[\w-]+\.js$/);
    }
  });

  test('git push の注意は git push を含むコマンドのときだけ起動する', () => {
    const reminder = handlers.find(handler => handler.command.includes('pre-bash-git-push-reminder.js'));
    assert.equal(reminder.if, 'Bash(git push*)');
  });
});
