# ARCHITECTURE.md — claude-config-master

リポジトリのドメイン・パッケージ階層を示すトップレベルマップ。
エージェントはこのファイルを参照してリポジトリ構造を把握すること。

**中核原則（[ADR-004](./docs/adr/ADR-004-isomorphic-distribution-layout.md)）:** master は配布先プロジェクトと**同一レイアウト**（`.claude/` 配下）を持つ。
master で書かれたパスは配布先でもそのまま成立する。配布対象は `dist-manifest.json` が唯一の定義。

## ディレクトリ責務

| パス | 責務 | 主な変更者 |
|-----|------|----------|
| `CLAUDE.md` | エージェントへのナビゲーション地図（≤100行） | 人間 / Claude |
| `ARCHITECTURE.md` | このファイル。構造マップ | 人間 / Claude |
| `PROJECT_STATUS.md` | 現在の進捗状態 | Claude / 人間 |
| `.claude/agents/` | サブエージェント定義 (`.md`、frontmatter 必須)【配布】 | improve-harness |
| `.claude/hooks/` | Claude Code フック実装 (`.js`)【配布】 | TDD で追加 |
| `.claude/rules/` | コーディングルール (`{lang}/{category}.md`)【配布】 | 人間 / Claude |
| `.claude/skills/` | 再利用スキル (`{name}/SKILL.md`)【配布】 | 人間 / Claude |
| `.claude/settings.json` | フック・パーミッション設定【配布】 | 人間 |
| `.claude/harness.json` | ハーネスコマンド定義【self 専用・配布先では生成】 | bootstrap / 人間 |
| `dist-manifest.json` | 配布マニフェスト（配布対象・除外・言語別の唯一の定義） | improve-harness / 人間 |
| `install.sh` | dist-manifest.json に従って target project へ配布 | TDD で追加 |
| `templates/` | 配布用ルートテンプレート（CLAUDE.md 等の雛形） | 人間 / Claude |
| `docs/` | 知識ベース全体（一部は docsSkeleton として配布） | Claude / 人間 |
| `docs/adr/` | アーキテクチャ決定レコード | `doc-updater` |
| `docs/exec-plans/` | 実行プラン（active/ / completed/） | `planner` |
| `docs/design-docs/` | コンポーネント別詳細設計・中核的信念 | `doc-updater` |
| `docs/friction-log.md` | 摩擦ログ（ハーネス自己改善ループの入力） | 全エージェント |
| `package.json` | テストランナー設定 | 人間 |
| `test/` | フック・install.sh の単体テスト | TDD で追加 |

## 依存方向ルール

```
.claude/agents/   →  tools のみ利用。agents/ 間の相互依存禁止
.claude/hooks/    →  Node.js 標準ライブラリのみ（外部 npm 依存禁止）
.claude/rules/    →  独立。他ファイルへの依存は Markdown リンクのみ
.claude/skills/   →  独立。他ファイルへの依存は Markdown リンクのみ
docs/             →  自由にリンク可。docs/ 外への参照は相対パスで
.claude/settings.json  →  .claude/hooks/*.js のみ参照（ARCH-004 で整合性検証）
install.sh        →  dist-manifest.json と .claude/, docs/, templates/ を読み込み配布
```

## アーキテクチャ規則（`.claude/hooks/arch-lint.js` が機械的に強制）

| 規則 ID | 検査内容 |
|---------|---------|
| ARCH-001 | エージェント定義 (`.md` with `name:` frontmatter) は `.claude/agents/` 以外に配置しない |
| ARCH-002 | `.claude/` 配下のフック実装 (`.js`) は `.claude/hooks/` 以外に配置しない |
| ARCH-003 | `.claude/rules/` 配下のファイルは `{lang}/{category}.md` の命名規則に従う |
| ARCH-004 | `.claude/settings.json` が参照するフックファイルが実在する |
| ARCH-005 | `CLAUDE.md` は常に 100行以内 |
| ARCH-006 | `.md` ファイル内の相対リンクが実在するファイルを指している（コードブロック内は除外）|

詳細: [docs/design.md § 3.3](./docs/design.md)

## 知識グラフ（グラフエンジニアリング）

ドキュメントは CLAUDE.md を根とする有向グラフを構成する（ノード = `.md`、エッジ = 相対リンク）。

- **エッジの有効性**: ARCH-006 が強制（リンク切れ = 違反）
- **ノードの到達可能性**: `structure-test.js` の `checkDocGraph` が検証（CLAUDE.md から辿れない docs/ = 孤立ノード警告）
- エージェントのコンテキストから辿れないドキュメントは存在しないのと同じ。新しいドキュメントは必ずグラフに接続すること

## 配布の仕組み

`install.sh [update] <lang> <target>` が `dist-manifest.json` に従って展開する:

```
target/
├── .claude/            ← master の .claude/ と同型コピー（exclude 対象を除く）
│   ├── agents/ hooks/ rules/ skills/ settings.json
│   ├── harness.json    ← 言語別に生成（テスト等のコマンド定義）
│   └── master-path     ← master の場所（双方向同期用）
├── CLAUDE.md 等        ← templates/ から（既存なら保持）
└── docs/               ← docsSkeleton（golden-rules.md・friction-log.md 等）
```

改善の還流: プロジェクト → `sync-upstream` → master → `install.sh update` / `sync-downstream` → 全プロジェクト
