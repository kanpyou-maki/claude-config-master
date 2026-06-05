'use strict';

/**
 * structure-test.js — リポジトリ構造整合性チェック（単体実行 / CI 用）
 *
 * チェック項目:
 *   - docs/adr/ に ADR ファイルが存在する
 *   - settings.json が有効な JSON である
 *   - hooks/ 内の全 .js ファイルに構文エラーがない
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ─── 個別チェック関数 ────────────────────────────────────────────────────────

/**
 * docs/adr/ ディレクトリに ADR ファイル (.md) が存在するか検証する
 * @param {string} [root]
 * @returns {{ message: string, fix: string } | null}
 */
function checkAdrExists(root = process.cwd()) {
  const adrDir = path.join(root, 'docs', 'adr');

  if (!fs.existsSync(adrDir)) {
    return {
      message: 'docs/adr/ ディレクトリが存在しません',
      fix: 'docs/adr/ を作成し、最低 1 つの ADR ファイル（ADR-NNN-title.md）を追加してください',
    };
  }

  const adrFiles = fs.readdirSync(adrDir).filter(f => f.endsWith('.md'));
  if (adrFiles.length === 0) {
    return {
      message: 'docs/adr/ に ADR ファイルが存在しません',
      fix: 'アーキテクチャ上の決定を ADR-001-title.md 形式で記録してください',
    };
  }

  return null;
}

/**
 * settings.json が有効な JSON であるか検証する
 * @param {string} [root]
 * @returns {{ message: string, fix: string } | null}
 */
function checkSettingsJson(root = process.cwd()) {
  const settingsPath = path.join(root, 'settings.json');
  if (!fs.existsSync(settingsPath)) return null;

  try {
    JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return null;
  } catch (err) {
    return {
      message: `settings.json が有効な JSON ではありません: ${err.message}`,
      fix: 'settings.json の構文エラーを修正してください（JSON バリデーターで確認を推奨）',
    };
  }
}

/**
 * hooks/ 内の全 .js ファイルに構文エラーがないか検証する
 * @param {string} [root]
 * @returns {Array<{ message: string, fix: string }>}
 */
function checkHookSyntax(root = process.cwd()) {
  const hooksDir = path.join(root, 'hooks');
  if (!fs.existsSync(hooksDir)) return [];

  const violations = [];
  const jsFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith('.js'));

  for (const file of jsFiles) {
    const filePath = path.join(hooksDir, file);
    try {
      execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
    } catch (err) {
      const stderr = err.stderr ? err.stderr.toString().trim() : String(err.message);
      violations.push({
        message: `hooks/${file} に構文エラーがあります: ${stderr.split('\n')[0]}`,
        fix: `hooks/${file} の構文エラーを修正してください`,
      });
    }
  }

  return violations;
}

/**
 * docs/ 配下の全 .md ファイルで相対リンクの整合性を検証する
 * @param {string} [root]
 * @returns {Array<{ message: string, fix: string }>}
 */
function checkDocLinks(root = process.cwd()) {
  const docsDir = path.join(root, 'docs');
  if (!fs.existsSync(docsDir)) return [];

  const violations = [];
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;

  // docs/ 配下の .md ファイルを再帰的に収集
  function collectMdFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...collectMdFiles(abs));
      else if (entry.name.endsWith('.md')) files.push(abs);
    }
    return files;
  }

  for (const filePath of collectMdFiles(docsDir)) {
    // コードブロック内のリンクは検査対象外
    const raw = fs.readFileSync(filePath, 'utf8');
    const content = raw.replace(/```[\s\S]*?```/g, '');
    const dir = path.dirname(filePath);
    let match;
    linkRegex.lastIndex = 0;

    while ((match = linkRegex.exec(content)) !== null) {
      const href = match[2].trim();
      if (/^https?:\/\//.test(href) || href.startsWith('#') || href.startsWith('mailto:')) continue;

      const filePart = href.split('#')[0];
      if (!filePart) continue;

      const linkedFile = path.resolve(dir, filePart);
      if (!fs.existsSync(linkedFile)) {
        violations.push({
          message: `リンク切れ: ${path.relative(root, filePath)} → ${filePart}`,
          fix: `${filePart} を作成するか、リンクを修正してください`,
        });
      }
    }
  }

  return violations;
}

// ─── 全チェック実行 ──────────────────────────────────────────────────────────

function runAll(root = process.cwd()) {
  const violations = [];

  const adr = checkAdrExists(root);
  if (adr) violations.push({ check: 'adr-exists', ...adr });

  const settings = checkSettingsJson(root);
  if (settings) violations.push({ check: 'settings-json', ...settings });

  violations.push(
    ...checkHookSyntax(root).map(v => ({ check: 'hook-syntax', ...v }))
  );

  violations.push(
    ...checkDocLinks(root).map(v => ({ check: 'doc-links', ...v }))
  );

  return violations;
}

// ─── エクスポート ────────────────────────────────────────────────────────────

module.exports = {
  checkAdrExists,
  checkSettingsJson,
  checkHookSyntax,
  checkDocLinks,
  runAll,
};

// ─── メイン実行 ──────────────────────────────────────────────────────────────

if (require.main === module) {
  const violations = runAll();

  if (violations.length === 0) {
    process.stdout.write('[structure-test] すべてのチェックが通過しました\n');
    process.exit(0);
  }

  violations.forEach(v => {
    process.stderr.write(`[structure-test] 違反: ${v.message}\n  修復手順: ${v.fix}\n`);
  });
  process.exit(1);
}
