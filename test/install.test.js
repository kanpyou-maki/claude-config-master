'use strict';

/**
 * install.sh の smoke test
 * install.sh を実際に実行し、インストール後の構造が正しいことを確認する。
 */

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const INSTALL_SH = path.join(ROOT, 'install.sh');

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
    const { checkHookSyntax } = require('../hooks/structure-test');
    // .claude/ を root にすることで .claude/hooks/ を検査
    const violations = checkHookSyntax(path.join(tmpDir, '.claude'));
    assert.equal(
      violations.length,
      0,
      `フックに構文エラー: ${violations.map(v => v.message).join('; ')}`
    );
  });

  // ─── settings.json ────────────────────────────────────────────────────────

  test('.claude/settings.json が有効な JSON である', () => {
    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    assert.ok(fs.existsSync(settingsPath), 'settings.json が存在しない');
    assert.doesNotThrow(
      () => JSON.parse(fs.readFileSync(settingsPath, 'utf8')),
      'settings.json が無効な JSON'
    );
  });

  test('settings.json のフックパスが .claude/hooks/ に変換されている', () => {
    const content = fs.readFileSync(
      path.join(tmpDir, '.claude', 'settings.json'),
      'utf8'
    );
    assert.ok(
      !content.includes('"node hooks/'),
      'テンプレートの "node hooks/" が変換されていない（install.sh の sed が機能していない）'
    );
    assert.ok(
      content.includes('.claude/hooks/'),
      'settings.json に .claude/hooks/ パスが存在しない'
    );
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

  // ─── rules ────────────────────────────────────────────────────────────────

  test('.claude/rules/ に共通ルールが存在する', () => {
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    assert.ok(fs.existsSync(rulesDir), '.claude/rules/ が存在しない');
    assert.ok(fs.readdirSync(rulesDir).length > 0, '.claude/rules/ が空');
  });

  // ─── skills ───────────────────────────────────────────────────────────────

  test('.claude/skills/ に必須スキルが存在する', () => {
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    for (const skill of [
      'verification-loop',
      'database-migrations',
      'review-loop',
      'bootstrap',
    ]) {
      assert.ok(
        fs.existsSync(path.join(skillsDir, skill, 'SKILL.md')),
        `skills/${skill}/SKILL.md が存在しない`
      );
    }
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

  test('docs/ のテンプレートファイルが正しくコピーされている', () => {
    const docsDir = path.join(tmpDir, 'docs');
    for (const p of [
      'QUALITY_SCORE.md',
      'PLANS.md',
      'exec-plans/active/_template.md',
      'references/doc-templates.md',
      'design-docs/core-beliefs.md',
    ]) {
      assert.ok(
        fs.existsSync(path.join(docsDir, p)),
        `docs/${p} が存在しない`
      );
    }
  });
});
