# claude-config-master

Claude Code のハーネスエンジニアリング設定テンプレート集です。
エージェントファースト開発に最適化されたエージェント・フック・スキル・ルールを管理しています。

## このリポジトリの目的

新しいプロジェクトを始めるとき、このリポジトリから設定一式をインストールするだけで Claude Code の環境が整います。
毎回ゼロから設定を書く手間をなくし、ハーネスエンジニアリングのベストプラクティスを一箇所で維持することが目的です。

**設計の中核（ADR-004）:** master 自身が配布先プロジェクトと同一レイアウト（`.claude/` 配下）で動きます。
master で書かれたパス・コマンドは配布先でもそのまま成立し、master 自身が配布物のドッグフーディング環境になります。

## ファイル構成

```
claude-config-master/
├── CLAUDE.md               # Claude Code へのナビゲーション地図（≤100行）
├── ARCHITECTURE.md         # ディレクトリ構造・依存ルール・知識グラフ・配布の仕組み
├── PROJECT_STATUS.md       # プロジェクト状態トラッキング
├── dist-manifest.json      # 配布マニフェスト（配布対象・除外・言語別の唯一の定義）
├── install.sh              # dist-manifest.json に従った配布・更新スクリプト
├── package.json            # テストランナー設定（node:test）
├── .claude/                # ★ 配布物の原本 = master 自身のハーネス（同型レイアウト）
│   ├── agents/             # 専門エージェント定義（13体）
│   ├── hooks/              # 自動実行フックスクリプト（5種・全て汎用）
│   ├── rules/              # 常時適用ガードレール（common / typescript / python）
│   ├── skills/             # 再利用可能なスキル集（9種）
│   ├── settings.json       # フック・パーミッション設定（配布先へそのままコピー）
│   └── harness.json        # このリポジトリのコマンド定義（配布先では言語別に生成）
├── templates/              # 配布用ルートテンプレート（CLAUDE.md 等の雛形）
├── test/                   # フック・install.sh の単体テスト
└── docs/                   # 知識ベース（一部は docsSkeleton として配布）
    ├── adr/                # アーキテクチャ決定レコード
    ├── design-docs/        # コンポーネント設計・中核的信念
    ├── exec-plans/         # 実行プラン（active/ / completed/）
    ├── friction-log.md     # 摩擦ログ（ハーネス自己改善の入力）
    ├── golden-rules.md     # 黄金原則（配布対象）
    └── references/         # テンプレート集
```

## 3つのエンジニアリング

| 領域 | 実装 |
|------|------|
| **ハーネス** | hooks による機械的強制（ARCH-001〜006）・rules・settings.json・harness.json（コマンドの一元定義） |
| **ループ** | TDD（内側）→ review-loop（Ralph Wiggum）→ verification-loop → GC → improve-harness（外側）の入れ子ループ |
| **グラフ** | CLAUDE.md を根とするドキュメント有向グラフ。ARCH-006 がエッジ（リンク）を、structure-test が到達可能性（孤立ノード）を検証 |

## ハーネスの自己改善ループ

エージェント設定そのものをエージェントが改善する閉ループを備えています。

```
作業中の摩擦（繰り返す BLOCK・手戻り）
  ↓ review-loop / gc-agent が記録
docs/friction-log.md
  ↓ improve-harness スキルが消費
.claude/ 配下の設定改善（hooks への昇格・agents の具体化 等）
  ↓ 汎用的な改善なら
sync-upstream → master へ PR → マージ後 install.sh update で全プロジェクトへ
```

## 新しいプロジェクトへの導入手順

### 1. install.sh を実行する

```bash
cd /path/to/claude-config-master

# 対話形式（言語を選ぶ）
./install.sh

# 言語と対象パスを直接指定
./install.sh typescript /path/to/your-project
./install.sh python     /path/to/your-project
./install.sh both       /path/to/your-project

# 既存プロジェクトを master の最新版で更新
./install.sh update typescript /path/to/your-project
```

スクリプトは `dist-manifest.json` に従って agents・hooks・rules・skills・settings.json・harness.json・
ルートテンプレート・docs スケルトン（golden-rules.md / friction-log.md 含む）を展開し、
双方向同期用に `.claude/master-path` を書き込みます。
`update` モードでは新規ファイルの追加と hooks の上書きのみ行い、カスタマイズ済みファイルは報告してスキップします。

### 2. Bootstrap スキルで初期化する

Claude に以下を伝えることで、スキャフォールドをプロジェクト固有の内容に自律的にカスタマイズします:

```
このプロジェクトの初期化を行ってください
```

Claude が `.claude/skills/bootstrap/SKILL.md` の手順に従い、CLAUDE.md・ARCHITECTURE.md・
PROJECT_STATUS.md・harness.json をこのプロジェクト向けに書き換えます。

### 3. 確認する

```bash
node .claude/hooks/structure-test.js
```

## エージェント一覧

### 開発サポートエージェント

| エージェント | 役割 | 使うタイミング |
|-------------|------|--------------|
| `architect` | システム設計・ADR 起草 | Phase 1 — 設計上の意思決定 |
| `planner` | タスク分解・実行プラン作成 | Phase 1 — 方針合意後 |
| `doc-updater` | PRD・Design Doc・ADR の作成・更新 | Phase 2 — ドキュメント化 |
| `tdd-guide` | TDD サイクル（RED→GREEN→REFACTOR）| Phase 3 — すべてのコーディング |
| `code-reviewer` | コード品質・パターン確認（アドバイザリ）| Phase 3 — 参考意見 |
| `refactor-cleaner` | 技術負債・重複除去 | Phase 4 — メンテナンス |
| `gc-agent` | 黄金原則逸脱検知・摩擦検出・修正 PR 作成 | Phase 4 — 週次定期実行 |

### レビュアーエージェント（Ralph Wiggum ループ）

PR 作成前に `.claude/skills/review-loop/SKILL.md` の手順で全員を通過させること。

| エージェント | ステージ | 審査観点 |
|-------------|---------|---------|
| `self-reviewer` | Stage 0 | 実装の自己批判的評価 |
| `arch-reviewer` | Stage 1 | アーキテクチャ規則（ARCH-001〜006）|
| `style-reviewer` | Stage 1 | コーディングスタイル・命名・debug コード |
| `test-reviewer` | Stage 1 | テストカバレッジ≥80%・独立性・フレーク判定 |
| `security-reviewer` | Stage 2 | OWASP Top 10・シークレット漏洩 |
| `docs-reviewer` | Stage 2 | 実装↔ドキュメント整合性・ADR 最新性 |

## スキル一覧

| スキル | 用途 |
|--------|------|
| `review-loop` | Ralph Wiggum ループ — PR 作成前の全レビュアー通過手順 |
| `bootstrap` | 新規プロジェクトの自律的初期化（install.sh 後に実行）|
| `improve-harness` | 摩擦ログを設定改善に変換するハーネス自己改善ループ |
| `sync-upstream` | プロジェクトの改善を master へ PR として反映 |
| `sync-downstream` | master の更新をプロジェクトへ取り込む |
| `verification-loop` | PR 前の品質ゲート（ビルド・型チェック・lint・テスト）|
| `database-migrations` | DB マイグレーション安全パターン |
| `python-patterns` | Python イディオム・並行処理・パッケージ構成 |
| `python-testing` | pytest 詳細パターン（fixture・mock・async）|

## hooks 一覧（すべて汎用 — 配布先でもそのまま動作）

| スクリプト | タイミング | 動作 |
|-----------|-----------|------|
| `arch-lint.js` | Edit / Write 後 | ARCH-001〜006 検証（`.claude/` スコープ・修復手順付き）|
| `structure-test.js` | 単体実行 / CI | 構造整合性・リンク・知識グラフ（孤立ドキュメント）検証 |
| `quality-gate.js` | Edit / Write / MultiEdit 後 | TypeScript/JS: Biome or Prettier、Python: ruff |
| `post-edit-typecheck.js` | .ts/.tsx 編集後 | `tsc --noEmit` で型チェック |
| `pre-bash-git-push-reminder.js` | git push 前 | 確認メッセージを表示 |

```bash
# テスト実行
npm test

# 構造テスト単体実行
node .claude/hooks/structure-test.js
```

## rules / skills / agents / hooks の違い

| | rules | skills | agents | hooks |
|--|-------|--------|--------|-------|
| **動き方** | 常時適用（呼び出し不要）| エージェントから参照 | 明示的に呼び出して使う | ツール使用イベントで自動実行 |
| **用途** | ガードレール（規約・セキュリティ・テスト方針）| 詳細手順集 | 専門作業（設計・TDD・レビュー等）| フォーマット・型チェック・規則検証 |
| **配置先** | `.claude/rules/` | `.claude/skills/` | `.claude/agents/` | `.claude/hooks/` |

## このリポジトリの更新方針

エージェントの改善や新しいテンプレートが生まれたらこのリポジトリに反映します。

- 改善の起点: `docs/friction-log.md` の摩擦・`gc-agent` の週次 GC・`review-loop` の摩擦シグナル
- 改善の実行: `improve-harness` スキル
- 配布物を追加・除外するときは必ず `dist-manifest.json` を更新すること（G-15）
