# claude-config-master

Claude Code のハーネスエンジニアリング設定テンプレート集です。
エージェントファースト開発に最適化されたエージェント・フック・スキル・ルールを管理しています。

## このリポジトリの目的

新しいプロジェクトを始めるとき、このリポジトリから設定一式をインストールするだけで Claude Code の環境が整います。
毎回ゼロから設定を書く手間をなくし、ハーネスエンジニアリングのベストプラクティスを一箇所で維持することが目的です。

## ファイル構成

```
claude-config-master/
├── CLAUDE.md               # Claude Code へのナビゲーション地図（≤100行）
├── ARCHITECTURE.md         # ディレクトリ構造・依存ルール・アーキテクチャ規則
├── PROJECT_STATUS.md       # プロジェクト状態トラッキングテンプレート
├── package.json            # テストランナー設定（node:test）
├── install.sh              # rules・skills・hooks のインストールスクリプト
├── settings.json           # .claude/settings.json テンプレート（hooks 設定込み）
├── agents/                 # 専門エージェント定義（13体）
├── rules/                  # Claude Code ルール（常時適用ガードレール）
│   ├── common/             # 全言語共通（coding-style・git-workflow・security 等）
│   ├── typescript/         # TypeScript / JavaScript 固有
│   └── python/             # Python 固有
├── skills/                 # 再利用可能なスキル集（6種）
├── hooks/                  # 自動実行フックスクリプト（5種）
├── test/                   # フック・install.sh の単体テスト
└── docs/                   # 知識ベース（設計文書・ADR・黄金原則等）
    ├── adr/                # アーキテクチャ決定レコード
    ├── design-docs/        # コンポーネント設計・中核的信念
    ├── exec-plans/         # 実行プラン（active/ / completed/）
    └── references/         # テンプレート集
```

## 前提とする開発スタイル

このテンプレートは以下の 4 フェーズで開発を進めるスタイルを前提としています。

```
Phase 1: 議論
  Claude と要件・設計方針を議論し、合意を得る（architect / planner）

       ↓

Phase 2: ドキュメント作成
  合意内容を元に PRD・Design Doc・ADR を生成する（doc-updater）

       ↓

Phase 3: 実装（TDD）
  ドキュメントを仕様として、テスト先行でコーディングする（tdd-guide）
  実装完了後に Ralph Wiggum ループで全レビュアーを通過させる（review-loop）

       ↓

Phase 4: メンテナンス
  GC エージェントが定期的に品質を維持する（gc-agent）
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
```

スクリプトは rules・skills・hooks・settings.json・docs スケルトンを対象プロジェクトへ展開します。

### 2. テンプレートファイルをコピーする

```bash
cd /path/to/your-project
cp /path/to/claude-config-master/CLAUDE.md .
cp /path/to/claude-config-master/ARCHITECTURE.md .
cp /path/to/claude-config-master/PROJECT_STATUS.md .
```

### 3. エージェントをコピーする

```bash
# プロジェクト固有にする場合
mkdir -p .claude/agents
cp /path/to/claude-config-master/agents/*.md .claude/agents/

# 全プロジェクト共通にする場合
cp /path/to/claude-config-master/agents/*.md ~/.claude/agents/
```

### 4. Bootstrap スキルで初期化する

Claude に以下を伝えることで、スキャフォールドをプロジェクト固有の内容に自律的にカスタマイズします:

```
このプロジェクトの初期化を行ってください
```

Claude が `.claude/skills/bootstrap/SKILL.md` の手順に従い、CLAUDE.md・ARCHITECTURE.md・PROJECT_STATUS.md をこのプロジェクト向けに書き換えます。

### 5. CLAUDE.md を確認・調整する

Bootstrap 後、最低限以下を確認してください:

- 使用技術スタック（言語・フレームワーク・DB など）
- テストコマンド（`npm test` / `pytest` など）
- プロジェクト固有のコーディング規約

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
| `gc-agent` | 黄金原則逸脱検知・修正 PR 作成 | Phase 4 — 週次定期実行 |

### レビュアーエージェント（Ralph Wiggum ループ）

PR 作成前に `skills/review-loop/SKILL.md` の手順で全員を通過させること。

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
| `verification-loop` | PR 前の品質ゲート（ビルド・型チェック・lint・テスト）|
| `database-migrations` | DB マイグレーション安全パターン |
| `python-patterns` | Python イディオム・並行処理・パッケージ構成 |
| `python-testing` | pytest 詳細パターン（fixture・mock・async）|

## hooks 一覧

| スクリプト | タイミング | 動作 |
|-----------|-----------|------|
| `arch-lint.js` | Edit / Write 後 | ARCH-001〜006 アーキテクチャ規則を検証（修復手順付き）|
| `structure-test.js` | 単体実行 / CI | リポジトリ全体の構造整合性チェック・Markdown リンク検証 |
| `quality-gate.js` | Edit / Write / MultiEdit 後 | TypeScript/JS: Biome or Prettier、Python: ruff |
| `post-edit-typecheck.js` | .ts/.tsx 編集後 | `tsc --noEmit` で型チェック |
| `pre-bash-git-push-reminder.js` | git push 前 | 確認メッセージを表示 |

```bash
# テスト実行（54テスト）
npm test

# 構造テスト単体実行
node hooks/structure-test.js
```

## rules / skills / agents / hooks の違い

| | rules | skills | agents | hooks |
|--|-------|--------|--------|-------|
| **動き方** | 常時適用（呼び出し不要）| エージェントから参照 | 明示的に呼び出して使う | ツール使用イベントで自動実行 |
| **用途** | ガードレール（規約・セキュリティ・テスト方針）| 詳細手順集 | 専門作業（設計・TDD・レビュー等）| フォーマット・型チェック・規則検証 |
| **配置先** | `.claude/rules/` | `.claude/skills/` | `.claude/agents/` or `~/.claude/agents/` | `.claude/hooks/` |

## プロジェクト状態の管理

`PROJECT_STATUS.md` は Claude Code が自律的に更新する「状態ファイル」です。

- タスク完了・フェーズ移行のたびに Claude が書き換えます
- セッション開始時に Claude はこのファイルを読んで前回の状態を復元します
- 実行プランの詳細は `docs/exec-plans/active/` で管理します

## このリポジトリの更新方針

エージェントの改善や新しいテンプレートが生まれたらこのリポジトリに反映します。
改善の起点は `agents/gc-agent.md` の週次 GC または `skills/review-loop/SKILL.md` の摩擦シグナルです。
