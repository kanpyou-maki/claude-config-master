# ARCHITECTURE.md — claude-config-master

リポジトリのドメイン・パッケージ階層を示すトップレベルマップ。
エージェントはこのファイルを参照してリポジトリ構造を把握すること。

## ディレクトリ責務

| パス | 責務 | 主な変更者 |
|-----|------|----------|
| `CLAUDE.md` | エージェントへのナビゲーション地図（≤100行） | 人間 |
| `ARCHITECTURE.md` | このファイル。構造マップ | 人間 |
| `PROJECT_STATUS.md` | 現在の進捗状態 | Claude / 人間 |
| `agents/` | サブエージェント定義 (`.md`、frontmatter 必須) | 人間 |
| `hooks/` | Claude Code フック実装 (`.js`) | TDD で追加 |
| `rules/` | コーディングルール (`{lang}/{category}.md`) | 人間 |
| `skills/` | 再利用スキル (`{name}/SKILL.md`) | 人間 |
| `docs/` | 知識ベース全体 | Claude / 人間 |
| `docs/adr/` | アーキテクチャ決定レコード | `doc-updater` |
| `docs/exec-plans/active/` | 進行中の実行プラン | `planner` |
| `docs/exec-plans/completed/` | 完了済みの実行プラン | `planner` |
| `docs/design-docs/` | コンポーネント別詳細設計・中核的信念 | `doc-updater` |
| `docs/product-specs/` | 機能仕様 | `doc-updater` |
| `docs/references/` | 外部参照・テンプレート集 | 人間 |
| `docs/generated/` | 自動生成ドキュメント（スキーマ等）| CI / エージェント |
| `settings.json` | Claude Code フック・パーミッション設定 | 人間 |
| `install.sh` | target project への設定配布 | 人間 |
| `package.json` | テストランナー設定 | 人間 |
| `test/` | フックの単体テスト | TDD で追加 |

## 依存方向ルール

```
agents/   →  tools のみ利用。agents/ 間の相互依存禁止
hooks/    →  Node.js 標準ライブラリのみ（外部 npm 依存禁止）
rules/    →  独立。他ファイルへの依存は Markdown リンクのみ
skills/   →  独立。他ファイルへの依存は Markdown リンクのみ
docs/     →  自由にリンク可。docs/ 外への参照は相対パスで
settings.json  →  hooks/*.js のみ参照（ARCH-004 で整合性検証）
install.sh     →  agents/, hooks/, rules/, skills/ を読み込み配布
```

## アーキテクチャ規則（`hooks/arch-lint.js` が機械的に強制）

| 規則 ID | 検査内容 |
|---------|---------|
| ARCH-001 | エージェント定義 (`.md` with `name:` frontmatter) は `agents/` 以外に配置しない |
| ARCH-002 | フック実装 (`.js`) は `hooks/` 以外に配置しない（`test/` は除く） |
| ARCH-003 | `rules/` 配下のファイルは `{lang}/{category}.md` の命名規則に従う |
| ARCH-004 | `settings.json` が参照するフックファイルが実在する |
| ARCH-005 | `CLAUDE.md` は常に 100行以内 |
| ARCH-006 | `.md` ファイル内の相対リンクが実在するファイルを指している（コードブロック内は除外）|

詳細: [docs/design.md § 3.3](./docs/design.md)

## install.sh の配布対象

target project の `.claude/` へ以下を展開:

```
.claude/
├── rules/        ← rules/ から
├── skills/       ← skills/ から
├── hooks/        ← hooks/ から
└── settings.json
```

agents/ は `~/.claude/agents/` または `.claude/agents/` へ手動でコピー。
