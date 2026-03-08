# claude-config-master

Claude Code の設定テンプレート集です。
「議論 → ドキュメント → TDD」という開発スタイルに最適化されたエージェント・設定ファイルを管理しています。

## このリポジトリの目的

新しいプロジェクトを始めるとき、このリポジトリから必要なファイルをコピーするだけで Claude Code の環境が整います。
毎回ゼロから設定を書く手間をなくし、ベストプラクティスを一箇所で維持することが目的です。

## ファイル構成

```
claude-config-master/
├── CLAUDE.md               # Claude Code へのプロジェクト指示テンプレート
├── PROJECT_STATUS.md       # プロジェクト状態トラッキングテンプレート
├── install.sh              # rules・skills・hooks のインストールスクリプト
├── settings.json           # .claude/settings.json テンプレート（hooks 設定込み）
├── agents/                 # 専門エージェント定義
│   ├── architect.md        # システム設計・ADR作成
│   ├── planner.md          # 実装ステップの詳細化
│   ├── doc-updater.md      # PRD / Design Doc / ADR の作成・更新
│   ├── tdd-guide.md        # TDD サイクルの実施
│   ├── code-reviewer.md    # コード品質レビュー
│   ├── security-reviewer.md # セキュリティレビュー
│   └── refactor-cleaner.md # デッドコード除去・リファクタリング
├── rules/                  # Claude Code ルール（常時適用ガードレール）
│   ├── common/             # 全言語共通
│   │   ├── coding-style.md
│   │   ├── development-workflow.md
│   │   ├── git-workflow.md
│   │   ├── patterns.md
│   │   ├── security.md
│   │   └── testing.md
│   ├── typescript/         # TypeScript / JavaScript 固有
│   │   ├── coding-style.md
│   │   ├── patterns.md
│   │   ├── security.md
│   │   └── testing.md
│   └── python/             # Python 固有
│       ├── coding-style.md
│       ├── patterns.md
│       ├── security.md
│       └── testing.md
├── skills/                 # 詳細リファレンス（エージェントから参照）
│   ├── verification-loop/  # PR前の品質ゲート（全言語）
│   ├── database-migrations/ # DBマイグレーション安全パターン（全言語）
│   ├── python-patterns/    # Python イディオム・並行処理・パッケージ構成
│   └── python-testing/     # pytest 詳細パターン（fixture・mock・async）
└── hooks/                  # 自動実行フックスクリプト
    ├── quality-gate.js          # Edit/Write 後にフォーマット・Lint を実行
    ├── post-edit-typecheck.js   # .ts/.tsx 編集後に型チェックを実行
    └── pre-bash-git-push-reminder.js # git push 前に確認メッセージを表示
```

## 前提とする開発スタイル

このテンプレートは以下の 3 フェーズで開発を進めるスタイルを前提としています。

```
Phase 1: 議論
  AI と要件・設計方針を議論し、合意を得る

       ↓

Phase 2: ドキュメント作成
  合意内容を元に PRD・Design Doc・ADR を生成する

       ↓

Phase 3: 実装（TDD）
  ドキュメントを仕様として、テスト先行でコーディングする
```

フェーズをスキップした実装は行いません。

## 新しいプロジェクトへの導入手順

### 1. CLAUDE.md と PROJECT_STATUS.md をコピーする

```bash
cd /path/to/your-project

cp /path/to/claude-config-master/CLAUDE.md .
cp /path/to/claude-config-master/PROJECT_STATUS.md .
```

### 2. エージェントをコピーする

```bash
# プロジェクト固有にする場合（.claude/agents/）
mkdir -p .claude/agents
cp /path/to/claude-config-master/agents/*.md .claude/agents/

# 全プロジェクト共通にする場合（~/.claude/agents/）
cp /path/to/claude-config-master/agents/*.md ~/.claude/agents/
```

### 3. rules をインストールする

```bash
cd /path/to/claude-config-master

# 対話形式（言語を選ぶ）
./install.sh

# 言語と対象パスを直接指定
./install.sh typescript /path/to/your-project
./install.sh python     /path/to/your-project
./install.sh both       /path/to/your-project
```

スクリプトは rules・skills・hooks を対象プロジェクトの `.claude/` 以下にコピーし、`.claude/settings.json` を生成します。

### 4. CLAUDE.md をプロジェクトに合わせて編集する

最低限、以下を追記・修正してください。

- 使用技術スタック（言語・フレームワーク・DB など）
- テストコマンド（`npm test` / `pytest` など）
- プロジェクト固有のコーディング規約

### 5. PROJECT_STATUS.md の「概要」を書く

プロジェクトの目的を 1〜2 文で記入します。以降は Claude Code が自律的に更新します。

## hooks 一覧

| スクリプト | タイミング | 動作 | 前提ツール |
|-----------|-----------|------|-----------|
| `quality-gate.js` | Edit / Write / MultiEdit 後 | TypeScript/JS: Biome or Prettier で自動フォーマット<br>Python: ruff format + ruff check | npx（TS）/ ruff（Python） |
| `post-edit-typecheck.js` | .ts/.tsx 編集後 | tsconfig を探して `tsc --noEmit` を実行し、編集ファイル関連のエラーを表示 | npx + typescript |
| `pre-bash-git-push-reminder.js` | git push 前 | 確認メッセージを表示（push は止めない） | なし |

hooks は `settings.json` で設定されています。`install.sh` を実行すると `.claude/settings.json` として自動配置されます。

## エージェント一覧

| エージェント | 役割 | 使うタイミング |
|-------------|------|--------------|
| `architect` | システム設計、トレードオフ分析、ADR 作成 | Phase 1 — 設計上の意思決定が必要なとき |
| `planner` | 機能を実装ステップへ詳細化 | Phase 1 — 方針合意後、実装計画を立てるとき |
| `doc-updater` | PRD / Design Doc / ADR の生成・更新 | Phase 2 — ドキュメントを作成・改訂するとき |
| `tdd-guide` | TDD サイクル（RED→GREEN→REFACTOR）の実施 | Phase 3 — すべてのコーディング作業 |
| `code-reviewer` | コード品質・パターン・ベストプラクティスの確認 | Phase 3 — コード変更のたびに |
| `security-reviewer` | OWASP Top 10・機密情報・認証の確認 | Phase 3 — 認証・API・ユーザー入力を扱うとき |
| `refactor-cleaner` | デッドコード除去・重複排除・依存関係整理 | メンテナンス時（機能開発中は使わない） |

## rules / skills / agents / hooks の違い

| | rules | skills | agents | hooks |
|--|-------|--------|--------|-------|
| **動き方** | 常時適用（呼び出し不要） | エージェントから参照・必要時に読む | 明示的に呼び出して使う | ツール使用イベントで自動実行 |
| **用途** | ガードレール（規約・セキュリティ・テスト方針） | 詳細リファレンス（パターン集・チェックリスト） | 専門作業（設計・TDD・レビューなど） | フォーマット・型チェックなど副作用処理 |
| **配置先** | `.claude/rules/` | `.claude/skills/` | `.claude/agents/` または `~/.claude/agents/` | `.claude/hooks/`（設定は `.claude/settings.json`） |
| **言語対応** | `paths:` で特定ファイル種別に絞り込める | ファイル単位で選択 | 言語非依存 | スクリプト内で拡張子判定 |

rules は書いた内容が Claude に常に読み込まれ、呼ばなくても守られます。
skills はエージェントが「詳細は〇〇を参照」と指示したときに読まれる詳細資料です。
エージェントはタスクの種類に応じて意図的に使い分けます。
hooks はファイル編集などのイベントに自動反応し、人手を介さずに品質チェックを行います。

## プロジェクト状態の管理

`PROJECT_STATUS.md` は Claude Code が自律的に更新する「状態ファイル」です。

- タスク完了・フェーズ移行のたびに Claude が書き換えます
- セッション開始時に Claude はこのファイルを読んで前回の状態を復元します
- 人間はこのファイルを見るだけで「今何をしていて、次は何をすべきか」を把握できます

## このリポジトリの更新方針

エージェントの改善や新しいテンプレートが生まれたらこのリポジトリに反映します。
