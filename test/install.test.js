'use strict';

/**
 * install.sh の smoke test
 * install.sh を実際に実行し、インストール後の構造が正しいことを確認する。
 * 配布内容の定義は dist-manifest.json（同型配布 — ADR-004）。
 */

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const INSTALL_SH = path.join(ROOT, 'install.sh');
const MANIFEST = require(path.join(ROOT, 'dist-manifest.json'));

describe('install.sh: typescript インストールの smoke test', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'install-test-'));
    execFileSync('bash', [INSTALL_SH, 'typescript', tmpDir], {
      cwd: ROOT,
      stdio: 'pipe',
    });
  });

  after(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── agents ───────────────────────────────────────────────────────────────

  test('.claude/agents/ に master の全エージェントが存在する', () => {
    const srcAgents = fs.readdirSync(path.join(ROOT, '.claude', 'agents'));
    const destDir = path.join(tmpDir, '.claude', 'agents');
    assert.ok(fs.existsSync(destDir), '.claude/agents/ が存在しない');
    for (const agent of srcAgents) {
      assert.ok(
        fs.existsSync(path.join(destDir, agent)),
        `.claude/agents/${agent} が存在しない`
      );
    }
  });

  // ─── hooks ────────────────────────────────────────────────────────────────

  test('.claude/hooks/ に全フックファイルが存在する', () => {
    const hooksDir = path.join(tmpDir, '.claude', 'hooks');
    assert.ok(fs.existsSync(hooksDir), '.claude/hooks/ が存在しない');

    for (const file of [
      'arch-lint.js',
      'structure-test.js',
      'quality-gate.js',
      'pre-bash-git-push-reminder.js',
      'post-edit-typecheck.js',
    ]) {
      assert.ok(
        fs.existsSync(path.join(hooksDir, file)),
        `.claude/hooks/${file} が存在しない`
      );
    }
  });

  test('インストール済みフックに構文エラーがない', () => {
    const { checkHookSyntax } = require('../.claude/hooks/structure-test');
    const violations = checkHookSyntax(tmpDir);
    assert.equal(
      violations.length,
      0,
      `フックに構文エラー: ${violations.map(v => v.message).join('; ')}`
    );
  });

  // ─── settings.json ────────────────────────────────────────────────────────

  test('.claude/settings.json が master と同一内容でコピーされる（同型レイアウト）', () => {
    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    assert.ok(fs.existsSync(settingsPath), 'settings.json が存在しない');
    const installed = fs.readFileSync(settingsPath, 'utf8');
    const source = fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf8');
    assert.equal(installed, source, 'settings.json がパス変換なしの同一コピーになっていない');
  });

  test('settings.json の全フック参照先ファイルが実在する', () => {
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8')
    );
    const missing = [];
    for (const hookList of Object.values(settings.hooks || {})) {
      for (const entry of hookList) {
        for (const hook of entry.hooks || []) {
          const match = String(hook.command || '').match(/node\s+(\S+\.js)/);
          if (match) {
            const hookFile = path.join(tmpDir, match[1]);
            if (!fs.existsSync(hookFile)) missing.push(match[1]);
          }
        }
      }
    }
    assert.equal(missing.length, 0, `参照先が存在しないフック: ${missing.join(', ')}`);
  });

  // ─── harness.json / master-path ───────────────────────────────────────────

  test('.claude/harness.json が言語別コマンドで生成される', () => {
    const harnessPath = path.join(tmpDir, '.claude', 'harness.json');
    assert.ok(fs.existsSync(harnessPath), 'harness.json が存在しない');
    const harness = JSON.parse(fs.readFileSync(harnessPath, 'utf8'));
    assert.equal(harness.language, 'typescript');
    assert.equal(harness.commands.test, MANIFEST.harnessCommands.typescript.test);
    assert.ok(harness.commands.structure.includes('structure-test.js'));
  });

  test('master の harness.json を上書きコピーしない（exclude 対象・言語別生成）', () => {
    const harness = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.claude', 'harness.json'), 'utf8')
    );
    const masterHarness = JSON.parse(
      fs.readFileSync(path.join(ROOT, '.claude', 'harness.json'), 'utf8')
    );
    // master 自身の harness.json は npm test だが、生成物には structure コマンド等が揃っている
    assert.notDeepEqual(harness, masterHarness, 'master の harness.json がそのままコピーされている');
  });

  test('.claude/master-path に master の場所が記録される', () => {
    const mpPath = path.join(tmpDir, '.claude', 'master-path');
    assert.ok(fs.existsSync(mpPath), 'master-path が存在しない');
    assert.equal(fs.readFileSync(mpPath, 'utf8').trim(), ROOT);
  });

  // ─── rules ────────────────────────────────────────────────────────────────

  test('.claude/rules/ に common と typescript ルールが存在する', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    assert.ok(fs.existsSync(path.join(rulesDir, 'common')), 'rules/common が存在しない');
    assert.ok(fs.existsSync(path.join(rulesDir, 'typescript')), 'rules/typescript が存在しない');
    assert.ok(
      !fs.existsSync(path.join(rulesDir, 'python')),
      'typescript インストールに python ルールが混入している'
    );
  });

  // ─── skills ───────────────────────────────────────────────────────────────

  test('.claude/skills/ に manifest の always スキルが存在する', () => {
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    for (const skill of MANIFEST.claude.skills.always) {
      assert.ok(
        fs.existsSync(path.join(skillsDir, skill, 'SKILL.md')),
        `skills/${skill}/SKILL.md が存在しない`
      );
    }
  });

  test('typescript インストールに python スキルが混入しない', () => {
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    for (const skill of MANIFEST.claude.skills.python) {
      assert.ok(
        !fs.existsSync(path.join(skillsDir, skill)),
        `python 専用スキル ${skill} が混入している`
      );
    }
  });

  // ─── root templates ───────────────────────────────────────────────────────

  test('ルートテンプレート（CLAUDE.md 等）がコピーされる', () => {
    for (const name of Object.keys(MANIFEST.rootTemplates)) {
      assert.ok(
        fs.existsSync(path.join(tmpDir, name)),
        `${name} が存在しない`
      );
    }
  });

  test('配布された CLAUDE.md は 100行以内（ARCH-005）', () => {
    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
    assert.ok(lines <= 100, `配布 CLAUDE.md が ${lines} 行ある`);
  });

  // ─── docs/ skeleton ───────────────────────────────────────────────────────

  test('docs/ ディレクトリ構造が正しく作成されている', () => {
    const docsDir = path.join(tmpDir, 'docs');
    assert.ok(fs.existsSync(docsDir), 'docs/ が存在しない');

    for (const p of [
      'adr',
      'exec-plans/active',
      'exec-plans/completed',
      'design-docs',
      'references',
    ]) {
      assert.ok(
        fs.existsSync(path.join(docsDir, p)),
        `docs/${p} が存在しない`
      );
    }
  });

  test('manifest の docsSkeleton がすべて配布される（golden-rules.md 含む）', () => {
    for (const doc of MANIFEST.docsSkeleton) {
      assert.ok(
        fs.existsSync(path.join(tmpDir, doc)),
        `${doc} が存在しない（配布漏れ）`
      );
    }
  });

  test('生成ファイル（QUALITY_SCORE.md / PLANS.md）が存在する', () => {
    for (const p of ['docs/QUALITY_SCORE.md', 'docs/PLANS.md']) {
      assert.ok(fs.existsSync(path.join(tmpDir, p)), `${p} が存在しない`);
    }
  });
});

describe('install.sh: python インストール', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'install-py-test-'));
    execFileSync('bash', [INSTALL_SH, 'python', tmpDir], {
      cwd: ROOT,
      stdio: 'pipe',
    });
  });

  after(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('harness.json のテストコマンドが pytest になる（npm 固定でない）', () => {
    const harness = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.claude', 'harness.json'), 'utf8')
    );
    assert.equal(harness.language, 'python');
    assert.equal(harness.commands.test, MANIFEST.harnessCommands.python.test);
  });

  test('python スキルとルールが配布される', () => {
    for (const skill of MANIFEST.claude.skills.python) {
      assert.ok(
        fs.existsSync(path.join(tmpDir, '.claude', 'skills', skill, 'SKILL.md')),
        `skills/${skill} が存在しない`
      );
    }
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'rules', 'python')));
  });
});

describe('install.sh: update モード', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'install-update-test-'));
    execFileSync('bash', [INSTALL_SH, 'typescript', tmpDir], { cwd: ROOT, stdio: 'pipe' });
  });

  after(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('カスタマイズ済みスキルは上書きせず CHANGED として報告する', () => {
    const skillPath = path.join(tmpDir, '.claude', 'skills', 'review-loop', 'SKILL.md');
    const customized = '# カスタマイズ済み\n';
    fs.writeFileSync(skillPath, customized);

    const output = execFileSync('bash', [INSTALL_SH, 'update', 'typescript', tmpDir], {
      cwd: ROOT,
      encoding: 'utf8',
    });

    assert.equal(fs.readFileSync(skillPath, 'utf8'), customized, 'カスタマイズが上書きされた');
    assert.ok(output.includes('CHANGED'), 'CHANGED の報告がない');
  });

  test('カスタマイズ済み harness.json は保持される', () => {
    const harnessPath = path.join(tmpDir, '.claude', 'harness.json');
    const custom = JSON.stringify({ language: 'typescript', commands: { test: 'vitest run' } });
    fs.writeFileSync(harnessPath, custom);

    execFileSync('bash', [INSTALL_SH, 'update', 'typescript', tmpDir], { cwd: ROOT, stdio: 'pipe' });

    assert.equal(fs.readFileSync(harnessPath, 'utf8'), custom, 'harness.json が上書きされた');
  });

  test('hooks は常に master 版で上書きされる', () => {
    const hookPath = path.join(tmpDir, '.claude', 'hooks', 'arch-lint.js');
    fs.writeFileSync(hookPath, '// 破損したローカル変更\n');

    execFileSync('bash', [INSTALL_SH, 'update', 'typescript', tmpDir], { cwd: ROOT, stdio: 'pipe' });

    const masterHook = fs.readFileSync(path.join(ROOT, '.claude', 'hooks', 'arch-lint.js'), 'utf8');
    assert.equal(fs.readFileSync(hookPath, 'utf8'), masterHook, 'hooks が最新版に更新されていない');
  });
});
