#!/bin/bash
# install.sh — Copy rules, skills, hooks, and settings from claude-config-master to a target project
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

echo "[1/5] Copying common rules..."
cp "$RULES_DIR/common/"*.md "$RULES_DEST/"
echo "      ✓ coding-style.md"
echo "      ✓ development-workflow.md"
echo "      ✓ git-workflow.md"
echo "      ✓ patterns.md"
echo "      ✓ security.md"
echo "      ✓ testing.md"

echo "[2/5] Copying language rules ($LANG)..."

install_lang_rules() {
  local lang="$1"
  cp "$RULES_DIR/$lang/"*.md "$RULES_DEST/"
  for f in "$RULES_DIR/$lang/"*.md; do
    echo "      ✓ $lang/$(basename "$f")"
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

echo "[3/5] Copying skills..."

install_skill() {
  local skill="$1"
  mkdir -p "$SKILLS_DEST/$skill"
  cp "$SKILLS_DIR/$skill/SKILL.md" "$SKILLS_DEST/$skill/"
  echo "      ✓ $skill"
}

# Always-installed skills
install_skill "verification-loop"
install_skill "database-migrations"

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

echo "[4/5] Copying hooks..."
cp "$HOOKS_DIR/"*.js "$HOOKS_DEST/"
for f in "$HOOKS_DIR/"*.js; do
  echo "      ✓ $(basename "$f")"
done

# -----------------------------------------------------------------------
# Settings
# -----------------------------------------------------------------------
SETTINGS_DEST="$TARGET/.claude/settings.json"

echo "[5/5] Copying settings.json..."
if [[ -f "$SETTINGS_DEST" ]]; then
  echo "      ⚠ .claude/settings.json already exists — skipping (merge manually if needed)"
else
  cp "$SCRIPT_DIR/settings.json" "$SETTINGS_DEST"
  echo "      ✓ settings.json"
fi

# -----------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------
echo ""
echo "Done."
echo ""
echo "Next steps:"
echo "  1. Copy CLAUDE.md and PROJECT_STATUS.md to your project root (if not done yet)"
echo "  2. Copy agents/ to .claude/agents/ or ~/.claude/agents/"
echo "  3. Edit CLAUDE.md to add your project's tech stack and test commands"
echo "  4. Review .claude/settings.json and adjust hooks as needed"
