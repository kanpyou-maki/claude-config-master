#!/bin/bash
# install.sh — Claude Code ハーネスエンジニアリング設定を target project へ展開する
#
# Usage:
#   ./install.sh                                 # interactive install
#   ./install.sh typescript /path/to/app         # non-interactive install
#   ./install.sh python     /path/to/app
#   ./install.sh both       /path/to/app
#   ./install.sh update typescript /path/to/app  # update existing installation
#
# update mode の動作:
#   - 新規ファイル（スキル・ルール）: コピーして追加
#   - 変更ファイル（スキル・ルール）: スキップして報告（sync-downstream skill で手動マージ）
#   - hooks/*.js: 常に最新版で上書き（インフラのため）
#   - settings.json / docs/: スキップ

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULES_DIR="$SCRIPT_DIR/rules"
SKILLS_DIR="$SCRIPT_DIR/skills"
HOOKS_DIR="$SCRIPT_DIR/hooks"
DOCS_DIR="$SCRIPT_DIR/docs"

# --- Mode detection ---
MODE="install"
if [[ "${1:-}" == "update" ]]; then
  MODE="update"
  shift
fi

# --- Arguments ---
LANG="${1:-}"
TARGET="${2:-}"

# changed files tracker (update mode)
CHANGED_FILES=()

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
echo "Mode  : $MODE"
echo "Target: $TARGET"
echo ""

# -----------------------------------------------------------------------
# Rules
# -----------------------------------------------------------------------
RULES_DEST="$TARGET/.claude/rules"
mkdir -p "$RULES_DEST"

echo "[1/6] Copying common rules..."

copy_rule() {
  local src="$1"
  local rule_name
  rule_name=$(basename "$src")
  local dest="$RULES_DEST/$rule_name"

  if [[ "$MODE" == "update" ]]; then
    if [[ ! -f "$dest" ]]; then
      cp "$src" "$dest"
      echo "      + NEW: $rule_name"
    elif ! diff -q "$src" "$dest" > /dev/null 2>&1; then
      echo "      ~ CHANGED (skipped): $rule_name"
      CHANGED_FILES+=("rules/$rule_name")
    fi
  else
    cp "$src" "$dest"
  fi
}

for rule in "$RULES_DIR/common/"*.md; do
  copy_rule "$rule"
done

echo "[2/6] Copying language rules ($LANG)..."

install_lang_rules() {
  local lang="$1"
  for rule in "$RULES_DIR/$lang/"*.md; do
    copy_rule "$rule"
  done
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
  local src="$SKILLS_DIR/$skill/SKILL.md"
  local dest="$SKILLS_DEST/$skill/SKILL.md"

  if [[ "$MODE" == "update" ]]; then
    if [[ ! -f "$dest" ]]; then
      mkdir -p "$SKILLS_DEST/$skill"
      cp "$src" "$dest"
      echo "      + NEW: skills/$skill"
    elif ! diff -q "$src" "$dest" > /dev/null 2>&1; then
      echo "      ~ CHANGED (skipped): skills/$skill"
      CHANGED_FILES+=("skills/$skill/SKILL.md")
    fi
  else
    mkdir -p "$SKILLS_DEST/$skill"
    cp "$src" "$dest"
  fi
}

# Always-installed skills
install_skill "verification-loop"
install_skill "database-migrations"
install_skill "review-loop"
install_skill "bootstrap"
install_skill "sync-upstream"
install_skill "sync-downstream"

# Python-specific skills
if [[ "$LANG" == "python" || "$LANG" == "both" ]]; then
  install_skill "python-patterns"
  install_skill "python-testing"
fi

# -----------------------------------------------------------------------
# Hooks — 常に最新版で上書き（インフラのため）
# -----------------------------------------------------------------------
HOOKS_DEST="$TARGET/.claude/hooks"
mkdir -p "$HOOKS_DEST"

echo "[4/6] Copying hooks..."
for hook in "$HOOKS_DIR/"*.js; do
  hook_name=$(basename "$hook")
  dest="$HOOKS_DEST/$hook_name"
  if [[ "$MODE" == "update" && -f "$dest" ]] && ! diff -q "$hook" "$dest" > /dev/null 2>&1; then
    cp "$hook" "$dest"
    echo "      ~ UPDATED: $hook_name"
  else
    cp "$hook" "$dest"
  fi
done

# -----------------------------------------------------------------------
# Settings (update mode ではスキップ)
# -----------------------------------------------------------------------
SETTINGS_DEST="$TARGET/.claude/settings.json"

if [[ "$MODE" == "update" ]]; then
  echo "[5/6] settings.json — skipped in update mode (manage manually or via sync-downstream)"
else
  echo "[5/6] Generating settings.json..."
  if [[ -f "$SETTINGS_DEST" ]]; then
    echo "      ⚠ .claude/settings.json already exists — skipping (merge manually if needed)"
  else
    # テンプレートの "node hooks/" を "node .claude/hooks/" へ変換
    sed 's|"node hooks/|"node .claude/hooks/|g' "$SCRIPT_DIR/settings.json" > "$SETTINGS_DEST"
    echo "      ✓ settings.json (hook paths adapted for installed context)"
  fi
fi

# -----------------------------------------------------------------------
# Docs skeleton (update mode ではスキップ)
# -----------------------------------------------------------------------
DOCS_DEST="$TARGET/docs"

if [[ "$MODE" == "update" ]]; then
  echo "[6/6] docs/ skeleton — skipped in update mode"
else
  echo "[6/6] Creating docs/ skeleton..."

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
fi

# -----------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------
echo ""

if [[ "$MODE" == "update" ]]; then
  echo "Update complete."
  if [[ ${#CHANGED_FILES[@]} -gt 0 ]]; then
    echo ""
    echo "Changed files (not overwritten — merge manually with sync-downstream skill):"
    for f in "${CHANGED_FILES[@]}"; do
      echo "  ⚠ .claude/$f"
    done
    echo ""
    echo "  → Tell Claude: 'マスターの更新を取り込んで'"
    echo "    Claude will read .claude/skills/sync-downstream/SKILL.md"
  fi
else
  echo "Done."
  echo ""
  echo "Next steps:"
  echo "  1. Copy CLAUDE.md, ARCHITECTURE.md, PROJECT_STATUS.md to your project root"
  echo "  2. Copy agents/ to .claude/agents/ or ~/.claude/agents/"
  echo "  3. Set master path (for future sync):"
  echo "     echo \"$(pwd)\" > ~/.claude/master-path"
  echo "  4. Run the bootstrap skill to let Claude autonomously initialize the scaffold:"
  echo "     → Tell Claude: 'このプロジェクトの初期化を行ってください'"
  echo "       Claude will read .claude/skills/bootstrap/SKILL.md and self-configure."
  echo "  5. (Manual fallback) Edit CLAUDE.md and ARCHITECTURE.md for your project"
  echo "  6. Run: node .claude/hooks/structure-test.js (verify installation)"
fi
