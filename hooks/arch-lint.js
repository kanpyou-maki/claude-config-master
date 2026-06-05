'use strict';

/**
 * arch-lint.js — アーキテクチャリンタ (PostToolUse: Edit | Write)
 *
 * 規則:
 *   ARCH-001 エージェント定義は agents/ にのみ配置する
 *   ARCH-002 フック実装は hooks/ にのみ配置する（test/ は除く）
 *   ARCH-003 rules/ のファイルは {lang}/{category}.md 形式に従う
 *   ARCH-004 settings.json が参照するフックファイルが実在する
 *   ARCH-005 CLAUDE.md は 100行以内
 */

const fs = require('fs');
const path = require('path');

// ─── 個別チェック関数（root を受け取りテスト可能にする） ─────────────────────

/**
 * ARCH-001: エージェント定義 (.md with `name:` frontmatter) は agents/ のみ
 * @param {string} filePath - 絶対パス
 * @param {string} [root]   - リポジトリルート（省略時は process.cwd()）
 */
function checkArch001(filePath, root = process.cwd()) {
  if (!filePath.endsWith('.md')) return null;

  const agentsDir = path.join(root, 'agents') + path.sep;
  if (filePath.startsWith(agentsDir)) return null;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  // frontmatter 内に `name: <value>` があるかチェック
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return null;
  const frontmatter = content.slice(0, end);
  if (!/^name:\s+\S/m.test(frontmatter)) return null;

  const rel = path.relative(root, filePath);
  return {
    rule: 'ARCH-001',
    file: rel,
    message: 'エージェント定義 (.md with name: frontmatter) は agents/ 以外に配置できません',
    fix: `agents/ ディレクトリへ移動してください: mv ${rel} agents/${path.basename(filePath)}`,
  };
}

/**
 * ARCH-002: フック実装 (.js) は hooks/ のみ（test/ 内および .test.js は除く）
 * @param {string} filePath
 * @param {string} [root]
 */
function checkArch002(filePath, root = process.cwd()) {
  if (!filePath.endsWith('.js')) return null;
  if (filePath.endsWith('.test.js')) return null;

  const hooksDir = path.join(root, 'hooks') + path.sep;
  const testDir = path.join(root, 'test') + path.sep;
  if (filePath.startsWith(hooksDir)) return null;
  if (filePath.startsWith(testDir)) return null;

  const rel = path.relative(root, filePath);
  return {
    rule: 'ARCH-002',
    file: rel,
    message: 'フック実装 (.js) は hooks/ 以外に配置できません（test/ は除く）',
    fix: `hooks/ ディレクトリへ移動してください: mv ${rel} hooks/${path.basename(filePath)}`,
  };
}

/**
 * ARCH-003: rules/ のファイルは rules/{lang}/{category}.md 形式
 * @param {string} filePath
 * @param {string} [root]
 */
function checkArch003(filePath, root = process.cwd()) {
  const rulesDir = path.join(root, 'rules');
  if (!filePath.startsWith(rulesDir + path.sep)) return null;

  const rel = path.relative(rulesDir, filePath);
  const parts = rel.split(path.sep);
  if (parts.length === 2 && parts[1].endsWith('.md')) return null;

  return {
    rule: 'ARCH-003',
    file: path.relative(root, filePath),
    message: `rules/ のファイルは {lang}/{category}.md 形式に従う必要があります（現在: rules/${rel}）`,
    fix: '正しい形式の例: rules/typescript/coding-style.md',
  };
}

/**
 * ARCH-004: settings.json が参照するフックファイルが実在する
 * @param {string} [root]
 * @returns {Array<{rule, file, message, fix}>}
 */
function checkArch004(root = process.cwd()) {
  const settingsPath = path.join(root, 'settings.json');
  if (!fs.existsSync(settingsPath)) return [];

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return [];
  }

  const violations = [];
  const hookEvents = settings.hooks || {};

  for (const hookList of Object.values(hookEvents)) {
    for (const entry of hookList) {
      for (const hook of entry.hooks || []) {
        const cmd = String(hook.command || '');
        const match = cmd.match(/node\s+(\S+\.js)/);
        if (!match) continue;
        const hookFile = path.join(root, match[1]);
        if (!fs.existsSync(hookFile)) {
          violations.push({
            rule: 'ARCH-004',
            file: 'settings.json',
            message: `settings.json が存在しないフックを参照しています: ${match[1]}`,
            fix: `${match[1]} を作成するか、settings.json から該当エントリを削除してください`,
          });
        }
      }
    }
  }

  return violations;
}

/**
 * ARCH-005: CLAUDE.md は 100行以内
 * @param {string} [root]
 */
function checkArch005(root = process.cwd()) {
  const claudePath = path.join(root, 'CLAUDE.md');
  if (!fs.existsSync(claudePath)) return null;

  const content = fs.readFileSync(claudePath, 'utf8');
  // ファイル末尾の改行は行数に含めない（wc -l と同じ挙動）
  const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
  if (lines <= 100) return null;

  return {
    rule: 'ARCH-005',
    file: 'CLAUDE.md',
    message: `CLAUDE.md が 100行を超えています（現在 ${lines} 行）`,
    fix: 'CLAUDE.md の詳細情報を docs/ 配下のファイルへ移動し、地図として簡素化してください',
  };
}

/**
 * ARCH-006: Markdown ファイル内の相対リンクが実在する
 * @param {string} filePath
 * @param {string} [root]
 * @returns {Array<{rule, file, message, fix}>}
 */
function checkArch006(filePath, root = process.cwd()) {
  if (!filePath.endsWith('.md')) return [];

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const violations = [];
  // コードブロック内のリンクは検査対象外
  const stripped = content.replace(/```[\s\S]*?```/g, '');
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  const dir = path.dirname(filePath);
  let match;

  while ((match = linkRegex.exec(stripped)) !== null) {
    const href = match[2].trim();

    // 絶対 URL・アンカーのみ・mailto は無視
    if (/^https?:\/\//.test(href) || href.startsWith('#') || href.startsWith('mailto:')) continue;

    // フラグメント部分を除いたファイルパスを取得
    const filePart = href.split('#')[0];
    if (!filePart) continue;

    const linkedFile = path.resolve(dir, filePart);
    if (!fs.existsSync(linkedFile)) {
      violations.push({
        rule: 'ARCH-006',
        file: path.relative(root, filePath),
        message: `Markdown リンクの参照先が存在しません: ${filePart}`,
        fix: `${filePart} を作成するか、リンクを修正してください`,
      });
    }
  }

  return violations;
}

// ─── 出力フォーマット ────────────────────────────────────────────────────────

function formatViolation(v) {
  return `[arch-lint] ${v.rule} 違反: ${v.message}\n  ファイル: ${v.file}\n  修復手順: ${v.fix}`;
}

// ─── 全チェック実行 ──────────────────────────────────────────────────────────

function runChecks(filePath, root = process.cwd()) {
  const violations = [];

  if (filePath) {
    const abs = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
    for (const fn of [checkArch001, checkArch002, checkArch003]) {
      const v = fn(abs, root);
      if (v) violations.push(v);
    }
    violations.push(...checkArch006(abs, root));
  }

  violations.push(...checkArch004(root));
  const v5 = checkArch005(root);
  if (v5) violations.push(v5);

  return violations;
}

// ─── エクスポート ────────────────────────────────────────────────────────────

module.exports = {
  checkArch001,
  checkArch002,
  checkArch003,
  checkArch004,
  checkArch005,
  checkArch006,
  runChecks,
  formatViolation,
};

// ─── メイン実行（Claude Code フックとして） ──────────────────────────────────

if (require.main === module) {
  const MAX_STDIN = 1024 * 1024;
  let raw = '';

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (raw.length < MAX_STDIN) raw += chunk.substring(0, MAX_STDIN - raw.length);
  });

  process.stdin.on('end', () => {
    let filePath = '';
    try {
      const input = JSON.parse(raw);
      filePath = String(input.tool_input?.file_path || '');
    } catch {
      // stdin が空または JSON 以外の場合は無視
    }

    const violations = runChecks(filePath);
    if (violations.length > 0) {
      violations.forEach(v => process.stderr.write(formatViolation(v) + '\n'));
    }

    process.stdout.write(raw);
  });
}
