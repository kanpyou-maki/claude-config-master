#!/bin/bash
# install.sh — Claude Code ハーネスエンジニアリング設定を target project へ展開する
#
# 配布内容は dist-manifest.json が唯一の定義。master は配布先と同一レイアウト
# （.claude/ 配下に agents/hooks/rules/skills/settings.json）なので、
# コピーはパス変換なしの同型コピーになる。
#
# Usage:
#   ./install.sh                                 # interactive install
#   ./install.sh typescript /path/to/app         # non-interactive install
#   ./install.sh python     /path/to/app
#   ./install.sh both       /path/to/app
#   ./install.sh update typescript /path/to/app  # update existing installation
#
# update mode の動作:
#   - 新規ファイル（agents・skills・rules）: コピーして追加
#   - 変更ファイル（agents・skills・rules）: スキップして報告（sync-downstream skill でマージ）
#   - hooks/*.js: 常に最新版で上書き（インフラのため）
#   - settings.json / harness.json / docs/ / ルートテンプレート: スキップ

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_CLAUDE="$SCRIPT_DIR/.claude"
MANIFEST="$SCRIPT_DIR/dist-manifest.json"

# --- Manifest reader（node は必須依存。hooks 実行にも必要） ---
mlist() {
  # マニフェスト内の配列を 1行1要素で出力する。例: mlist "m.claude.skills.always"
  node -e "const m=require('$MANIFEST'); for (const x of ($1 || [])) console.log(x)"
}

mkeys() {
  # マニフェスト内のオブジェクトのキーを 1行1要素で出力する
  node -e "const m=require('$MANIFEST'); for (const k of Object.keys($1 || {})) console.log(k)"
}

mget() {
  # マニフェスト内の値を出力する。例: mget "m.rootTemplates['CLAUDE.md']"
  node -e "const m=require('$MANIFEST'); process.stdout.write(String($1))"
}

# --- Mode detection ---
MODE="install"
if [[ "${1:-}" == "update" ]]; then
  MODE="update"
  shift
fi

# --- Arguments ---
LANG_CHOICE="${1:-}"
TARGET="${2:-}"

# changed files tracker (update mode)
CHANGED_FILES=()

# --- Interactive prompts ---
if [[ -z "$LANG_CHOICE" ]]; then
  echo "Select language rules to install:"
  echo "  1) typescript"
  echo "  2) python"
  echo "  3) both"
  read -rp "Choice [1-3]: " choice
  case "$choice" in
    1) LANG_CHOICE="typescript" ;;
    2) LANG_CHOICE="python" ;;
    3) LANG_CHOICE="both" ;;
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

case "$LANG_CHOICE" in
  typescript|python|both) ;;
  *) echo "Error: Unknown language '$LANG_CHOICE'. Use: typescript, python, both." && exit 1 ;;
esac

echo ""
echo "Mode  : $MODE"
echo "Target: $TARGET"
echo ""

# --- Exclusion list (.claude/ からの相対パス) ---
EXCLUDES=()
while IFS= read -r line; do
  [[ -n "$line" ]] && EXCLUDES+=("$line")
done < <(mlist "m.claude.exclude")

is_excluded() {
  local rel="$1"
  for e in "${EXCLUDES[@]}"; do
    [[ "$rel" == "$e" ]] && return 0
  done
  return 1
}

# --- 共通コピー関数（update: 新規→追加、変更→スキップして報告） ---
copy_managed() {
  local src="$1" dest="$2" label="$3"
  if [[ "$MODE" == "update" ]]; then
    if [[ ! -f "$dest" ]]; then
      mkdir -p "$(dirname "$dest")"
      cp "$src" "$dest"
      echo "      + NEW: $label"
    elif ! diff -q "$src" "$dest" > /dev/null 2>&1; then
      echo "      ~ CHANGED (skipped): $label"
      CHANGED_FILES+=("$label")
    fi
  else
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
  fi
}

# -----------------------------------------------------------------------
# [1/7] Agents
# -----------------------------------------------------------------------
echo "[1/7] Copying agents..."
for agent in "$SRC_CLAUDE/agents/"*.md; do
  name=$(basename "$agent")
  is_excluded "agents/$name" && continue
  copy_managed "$agent" "$TARGET/.claude/agents/$name" ".claude/agents/$name"
done

# -----------------------------------------------------------------------
# [2/7] Hooks — 常に最新版で上書き（インフラのため）
# -----------------------------------------------------------------------
echo "[2/7] Copying hooks..."
mkdir -p "$TARGET/.claude/hooks"
for hook in "$SRC_CLAUDE/hooks/"*.js; do
  hook_name=$(basename "$hook")
  is_excluded "hooks/$hook_name" && continue
  dest="$TARGET/.claude/hooks/$hook_name"
  if [[ "$MODE" == "update" && -f "$dest" ]] && ! diff -q "$hook" "$dest" > /dev/null 2>&1; then
    cp "$hook" "$dest"
    echo "      ~ UPDATED: $hook_name"
  else
    cp "$hook" "$dest"
  fi
done

# -----------------------------------------------------------------------
# [3/7] Rules（common + 選択言語）
# -----------------------------------------------------------------------
echo "[3/7] Copying rules ($LANG_CHOICE)..."

install_lang_rules() {
  local lang="$1"
  for rule in "$SRC_CLAUDE/rules/$lang/"*.md; do
    local name
    name=$(basename "$rule")
    is_excluded "rules/$lang/$name" && continue
    copy_managed "$rule" "$TARGET/.claude/rules/$lang/$name" ".claude/rules/$lang/$name"
  done
}

install_lang_rules common
case "$LANG_CHOICE" in
  typescript) install_lang_rules typescript ;;
  python)     install_lang_rules python ;;
  both)       install_lang_rules typescript; install_lang_rules python ;;
esac

# -----------------------------------------------------------------------
# [4/7] Skills（manifest の always + 言語別）
# -----------------------------------------------------------------------
echo "[4/7] Copying skills..."

install_skill() {
  local skill="$1"
  is_excluded "skills/$skill" && return 0
  copy_managed "$SRC_CLAUDE/skills/$skill/SKILL.md" \
    "$TARGET/.claude/skills/$skill/SKILL.md" ".claude/skills/$skill/SKILL.md"
}

while IFS= read -r skill; do
  [[ -n "$skill" ]] && install_skill "$skill"
done < <(mlist "m.claude.skills.always")

install_lang_skills() {
  while IFS= read -r skill; do
    [[ -n "$skill" ]] && install_skill "$skill"
  done < <(mlist "m.claude.skills['$1']")
}

case "$LANG_CHOICE" in
  typescript) install_lang_skills typescript ;;
  python)     install_lang_skills python ;;
  both)       install_lang_skills typescript; install_lang_skills python ;;
esac

# -----------------------------------------------------------------------
# [5/7] settings.json / harness.json / master-path
# -----------------------------------------------------------------------
echo "[5/7] Generating settings.json / harness.json / master-path..."

SETTINGS_DEST="$TARGET/.claude/settings.json"
if [[ "$MODE" == "update" ]]; then
  echo "      settings.json — skipped in update mode (manage manually or via sync-downstream)"
elif [[ -f "$SETTINGS_DEST" ]]; then
  echo "      ⚠ .claude/settings.json already exists — skipping (merge manually if needed)"
else
  # master と配布先はレイアウト同型のため、パス変換なしでそのままコピーできる
  cp "$SRC_CLAUDE/settings.json" "$SETTINGS_DEST"
  echo "      ✓ settings.json"
fi

HARNESS_DEST="$TARGET/.claude/harness.json"
if [[ -f "$HARNESS_DEST" ]]; then
  echo "      ⚠ harness.json already exists — skipping (project-specific commands preserved)"
else
  node -e "
    const m = require('$MANIFEST');
    const harness = {
      \$comment: 'このプロジェクトのハーネスコマンド定義。エージェント・スキルはテスト等のコマンドをハードコードせず、このファイルから読むこと。',
      language: '$LANG_CHOICE',
      commands: {
        ...m.harnessCommands['$LANG_CHOICE'],
        structure: 'node .claude/hooks/structure-test.js',
        archLint: \"echo '{}' | node .claude/hooks/arch-lint.js\",
      },
    };
    require('fs').writeFileSync('$HARNESS_DEST', JSON.stringify(harness, null, 2) + '\n');
  "
  echo "      ✓ harness.json ($LANG_CHOICE) — bootstrap スキルが実プロジェクトに合わせて調整します"
fi

# 双方向同期（sync-upstream / sync-downstream）用に master の場所を記録する
echo "$SCRIPT_DIR" > "$TARGET/.claude/master-path"
echo "      ✓ master-path → $SCRIPT_DIR"

# -----------------------------------------------------------------------
# [6/7] ルートテンプレート（CLAUDE.md / ARCHITECTURE.md / PROJECT_STATUS.md）
# -----------------------------------------------------------------------
if [[ "$MODE" == "update" ]]; then
  echo "[6/7] Root templates — skipped in update mode"
else
  echo "[6/7] Copying root templates (if missing)..."
  while IFS= read -r name; do
    [[ -z "$name" ]] && continue
    src="$SCRIPT_DIR/$(mget "m.rootTemplates['$name']")"
    dest="$TARGET/$name"
    if [[ -f "$dest" ]]; then
      echo "      ⚠ $name already exists — skipping"
    else
      cp "$src" "$dest"
      echo "      ✓ $name"
    fi
  done < <(mkeys "m.rootTemplates")
fi

# -----------------------------------------------------------------------
# [7/7] Docs skeleton
# -----------------------------------------------------------------------
DOCS_DEST="$TARGET/docs"

if [[ "$MODE" == "update" ]]; then
  echo "[7/7] docs/ skeleton — skipped in update mode"
else
  echo "[7/7] Creating docs/ skeleton..."

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
      mkdir -p "$(dirname "$dst")"
      cp "$src" "$dst"
      echo "      ✓ $(basename "$dst")"
    else
      echo "      ⚠ $(basename "$dst") already exists — skipping"
    fi
  }

  # manifest に列挙された docs ファイル（golden-rules.md・friction-log.md 等）
  while IFS= read -r doc; do
    [[ -n "$doc" ]] && copy_if_missing "$SCRIPT_DIR/$doc" "$TARGET/$doc"
  done < <(mlist "m.docsSkeleton")

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

新規プランは [exec-plans/active/_template.md](./exec-plans/active/_template.md) を複製して作成する。
ドキュメント（PRD・Design Doc・ADR）のテンプレートは [references/doc-templates.md](./references/doc-templates.md) を参照。

## 進行中

_（なし）_

## 完了済み

_（なし）_
EOF
    echo "      ✓ PLANS.md"
  fi

  # ADR-000: ハーネス採用の記録（adr/ が空の場合のみ生成）
  if ! ls "$DOCS_DEST/adr/"*.md > /dev/null 2>&1; then
    cat > "$DOCS_DEST/adr/ADR-000-adopt-claude-harness.md" << EOF
# ADR-000: claude-config-master ハーネスの採用

**ステータス:** 承認済み
**作成日:** $(date +%Y-%m-%d)

## Context（背景）

Claude Code によるエージェントファースト開発を行うにあたり、
ハーネス（hooks / rules / agents / skills）をゼロから構築するコストを避けたい。

## Decision（決定）

claude-config-master のハーネス設定一式を install.sh で導入する。

- 設定は \`.claude/\` 配下に同型レイアウトで配置される
- コマンド定義は \`.claude/harness.json\` に集約する
- master への改善還元は sync-upstream、master からの更新取り込みは install.sh update / sync-downstream で行う

## Consequences（帰結）

- アーキテクチャ規則（ARCH-001〜006）が機械的に強制される
- 以降のアーキテクチャ判断はこのディレクトリに ADR として記録すること
EOF
    echo "      ✓ ADR-000-adopt-claude-harness.md"
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
    echo "Changed files (not overwritten — merge with sync-downstream skill):"
    for f in "${CHANGED_FILES[@]}"; do
      echo "  ⚠ $f"
    done
    echo ""
    echo "  → Tell Claude: 'マスターの更新を取り込んで'"
    echo "    Claude will read .claude/skills/sync-downstream/SKILL.md"
  fi
else
  echo "Done."
  echo ""
  echo "Next steps:"
  echo "  1. Run the bootstrap skill to let Claude autonomously initialize the scaffold:"
  echo "     → Tell Claude: 'このプロジェクトの初期化を行ってください'"
  echo "       Claude will read .claude/skills/bootstrap/SKILL.md and self-configure"
  echo "       (CLAUDE.md / ARCHITECTURE.md / harness.json をプロジェクトに合わせて調整)"
  echo "  2. Verify: node .claude/hooks/structure-test.js"
fi
