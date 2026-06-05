#!/bin/bash
# install.sh — Claude Code ハーネスエンジニアリング設定を target project へ展開する
#
# Usage:
#   ./install.sh                          # interactive mode
#   ./install.sh typescript /path/to/app  # non-interactive
#   ./install.sh python     /path/to/app
#   ./install.sh both       /path/to/app

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULES_DIR="$SCRIPT_DIR/rules"
SKILLS_DIR="$SCRIPT_DIR/skills"
HOOKS_DIR="$SCRIPT_DIR/hooks"
DOCS_DIR="$SCRIPT_DIR/docs"

# --- Arguments ---
LANG="${1:-}"
TARGET="${2:-}"

# --- Interactive prompts ---
if [[ -z "$LANG" ]]; then
  echo "Select language rules to install:"
  echo "  1) typescript"
  echo "  2) python"
  echo "  3) both"
  read -rp "Choice [1-3]: " choice
  case "$choice" in
    1) LANG="typescript" ;;
    2) LANG="python" ;;
    3) LANG="both" ;;
    *) echo "Invalid choice. Exiting." && exit 1 ;;
  esac
fi

if [[ -z "$TARGET" ]]; then
  read -rp "Target project path [default: current directory]: " TARGET
  TARGET="${TARGET:-$(pwd)}"
fi

# --- Validate ---
if [[ ! -d "$TARGET" ]]; then
  echo "Error: Target directory '$TARGET' does not exist." && exit 1
fi

case "$LANG" in
  typescript|python|both) ;;
  *) echo "Error: Unknown language '$LANG'. Use: typescript, python, both." && exit 1 ;;
esac

echo ""
echo "Target: $TARGET"
echo ""

# -----------------------------------------------------------------------
# Rules
# -----------------------------------------------------------------------
RULES_DEST="$TARGET/.claude/rules"
mkdir -p "$RULES_DEST"

echo "[1/6] Copying common rules..."
cp "$RULES_DIR/common/"*.md "$RULES_DEST/"

echo "[2/6] Copying language rules ($LANG)..."

install_lang_rules() {
  local lang="$1"
  cp "$RULES_DIR/$lang/"*.md "$RULES_DEST/"
}

case "$LANG" in
  typescript) install_lang_rules typescript ;;
  python)     install_lang_rules python ;;
  both)       install_lang_rules typescript; install_lang_rules python ;;
esac

# -----------------------------------------------------------------------
# Skills
# -----------------------------------------------------------------------
SKILLS_DEST="$TARGET/.claude/skills"
mkdir -p "$SKILLS_DEST"

echo "[3/6] Copying skills..."

install_skill() {
  local skill="$1"
  mkdir -p "$SKILLS_DEST/$skill"
  cp "$SKILLS_DIR/$skill/SKILL.md" "$SKILLS_DEST/$skill/"
}

# Always-installed skills
install_skill "verification-loop"
install_skill "database-migrations"
install_skill "review-loop"
install_skill "bootstrap"

# Python-specific skills
if [[ "$LANG" == "python" || "$LANG" == "both" ]]; then
  install_skill "python-patterns"
  install_skill "python-testing"
fi

# -----------------------------------------------------------------------
# Hooks
# -----------------------------------------------------------------------
HOOKS_DEST="$TARGET/.claude/hooks"
mkdir -p "$HOOKS_DEST"

echo "[4/6] Copying hooks..."
cp "$HOOKS_DIR/"*.js "$HOOKS_DEST/"

# -----------------------------------------------------------------------
# Settings (フックパスを .claude/hooks/ へ変換して配布)
# -----------------------------------------------------------------------
SETTINGS_DEST="$TARGET/.claude/settings.json"

echo "[5/6] Generating settings.json..."
if [[ -f "$SETTINGS_DEST" ]]; then
  echo "      ⚠ .claude/settings.json already exists — skipping (merge manually if needed)"
else
  # テンプレートの "node hooks/" を "node .claude/hooks/" へ変換
  sed 's|"node hooks/|"node .claude/hooks/|g' "$SCRIPT_DIR/settings.json" > "$SETTINGS_DEST"
  echo "      ✓ settings.json (hook paths adapted for installed context)"
fi

# -----------------------------------------------------------------------
# Docs skeleton (知識ベース構造を target project に展開)
# -----------------------------------------------------------------------
DOCS_DEST="$TARGET/docs"

echo "[6/6] Creating docs/ skeleton..."

# 必須ディレクトリ
for dir in \
  "$DOCS_DEST/adr" \
  "$DOCS_DEST/exec-plans/active" \
  "$DOCS_DEST/exec-plans/completed" \
  "$DOCS_DEST/design-docs" \
  "$DOCS_DEST/product-specs" \
  "$DOCS_DEST/references" \
  "$DOCS_DEST/generated"; do
  mkdir -p "$dir"
done

# テンプレートファイルのみコピー（既存ファイルは上書きしない）
copy_if_missing() {
  local src="$1" dst="$2"
  if [[ ! -f "$dst" ]]; then
    cp "$src" "$dst"
    echo "      ✓ $(basename "$dst")"
  else
    echo "      ⚠ $(basename "$dst") already exists — skipping"
  fi
}

copy_if_missing "$DOCS_DIR/exec-plans/active/_template.md" \
  "$DOCS_DEST/exec-plans/active/_template.md"

copy_if_missing "$DOCS_DIR/references/doc-templates.md" \
  "$DOCS_DEST/references/doc-templates.md"

copy_if_missing "$DOCS_DIR/design-docs/core-beliefs.md" \
  "$DOCS_DEST/design-docs/core-beliefs.md"

# QUALITY_SCORE.md: 空のスキャフォールドを生成
QUALITY_DEST="$DOCS_DEST/QUALITY_SCORE.md"
if [[ ! -f "$QUALITY_DEST" ]]; then
  cat > "$QUALITY_DEST" << 'EOF'
# 品質スコア (Quality Score)

**最終更新:** （未記入）

## スコアサマリー

| 領域 | スコア | 主なギャップ |
|------|--------|------------|
| ドキュメント整合性 | —/100 | — |
| テストカバレッジ | —/100 | — |
| アーキテクチャ規則遵守 | —/100 | — |

詳細は [docs/golden-rules.md](./golden-rules.md) を参照。
EOF
  echo "      ✓ QUALITY_SCORE.md"
fi

# PLANS.md: 空のインデックス
PLANS_DEST="$DOCS_DEST/PLANS.md"
if [[ ! -f "$PLANS_DEST" ]]; then
  cat > "$PLANS_DEST" << 'EOF'
# 実行プラン一覧

## 進行中

_（なし）_

## 完了済み

_（なし）_
EOF
  echo "      ✓ PLANS.md"
fi

# -----------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------
echo ""
echo "Done."
echo ""
echo "Next steps:"
echo "  1. Copy CLAUDE.md, ARCHITECTURE.md, PROJECT_STATUS.md to your project root"
echo "  2. Copy agents/ to .claude/agents/ or ~/.claude/agents/"
echo "  3. Run the bootstrap skill to let Claude autonomously initialize the scaffold:"
echo "     → Tell Claude: 'このプロジェクトの初期化を行ってください'"
echo "       Claude will read .claude/skills/bootstrap/SKILL.md and self-configure."
echo "  4. (Manual fallback) Edit CLAUDE.md and ARCHITECTURE.md for your project"
echo "  5. Run: node .claude/hooks/structure-test.js (verify installation)"
