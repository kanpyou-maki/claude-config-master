# Skill: sync-downstream — マスターの更新をプロジェクトへ反映

`claude-config-master` の最新改善をこのプロジェクトの `.claude/` へ取り込む。

## トリガー

「マスターの更新を取り込んで」「マスターと同期して」と言われたとき

---

## 前提: マスターパスの設定

```bash
# 一度だけ設定する（全プロジェクト共通）
echo "/absolute/path/to/claude-config-master" > ~/.claude/master-path
```

**または** install.sh の update サブコマンドで機械的に新規ファイルのみ取り込む（エージェント不要）:
```bash
cd /path/to/claude-config-master
./install.sh update typescript /path/to/this-project
```

---

## 手順

### 1. マスターパスを確認する

```bash
MASTER=$(cat ~/.claude/master-path 2>/dev/null || echo "")
if [[ -z "$MASTER" || ! -d "$MASTER" ]]; then
  echo "ERROR: ~/.claude/master-path が未設定または無効です"
  exit 1
fi
echo "Master: $MASTER"
```

### 2. 差分を確認する

```bash
MASTER=$(cat ~/.claude/master-path)

for dir in agents hooks rules skills; do
  echo "=== .claude/$dir vs $MASTER/$dir ==="
  diff -rq ".claude/$dir/" "$MASTER/$dir/" 2>/dev/null || true
done
```

差分を次の3種類に分類する:

| 種類 | 見分け方 | 対処 |
|------|---------|------|
| **新規** | マスターに存在するがプロジェクトにない | コピーして取り込む |
| **変更** | 両方に存在して内容が異なる | カスタマイズを保持しつつマージ（下記参照）|
| **プロジェクト固有** | プロジェクトにのみ存在する | スキップ |

### 3. 新規ファイルを取り込む

```bash
MASTER=$(cat ~/.claude/master-path)

# 例: 新しいスキルをコピー
# cp -r "$MASTER/skills/new-skill/" ".claude/skills/"

# 例: 新しいエージェントをコピー
# cp "$MASTER/agents/new-agent.md" ".claude/agents/"
```

### 4. 変更ファイルをマージする

変更があるファイルについて、以下の手順でマージする:

1. マスター版とプロジェクト版の両方を Read する
2. プロジェクト固有のカスタマイズ（app 名・固有フロー・tech stack 固有の設定等）を特定する
3. マスターの改善部分を取り込み、プロジェクト固有部分を保持した新バージョンを作成する
4. **変更内容を人間に提示して確認を求める**こと

**hooks/*.js の扱い:**
hooks はプロジェクト固有のカスタマイズをほとんど含まないため、
マスター版で上書きしてよい。ただし確認は求めること。

### 5. コミットする

```bash
git add -A
git commit -m "$(cat <<EOF
chore: sync from master $(date +%Y-%m-%d)

Co-Authored-By: sync-downstream-skill <noreply@anthropic.com>
EOF
)"
```

---

## 注意事項

- CLAUDE.md / ARCHITECTURE.md / PROJECT_STATUS.md はプロジェクト固有ファイルのため**スキップ**する
- マージ判断が難しい場合は人間に委ねること
- hooks は通常上書き可能だが、プロジェクト固有の改造がある場合は手動マージする
