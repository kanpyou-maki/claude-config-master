# CLAUDE.md

Claude Code の作業指示。**常に日本語で応答すること。**
セッション開始時は `PROJECT_STATUS.md` を最初に読んで状態を復元すること。

このリポジトリは **claude-config-master** — 配布可能な Claude Code ハーネス設定の原本。
master 自身が配布先と同一レイアウト（`.claude/` 配下）で動く（ADR-004・dogfooding）。

## ナビゲーション

| ドキュメント | 内容 |
|------------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | ディレクトリ構造・依存ルール・知識グラフ・配布の仕組み |
| [docs/design.md](./docs/design.md) | 設計詳細・コンポーネント仕様・開発フロー詳細 |
| [docs/prd.md](./docs/prd.md) | 要件・ユーザーストーリー |
| [docs/golden-rules.md](./docs/golden-rules.md) | 不変の品質原則（GC エージェントが検証） |
| [docs/friction-log.md](./docs/friction-log.md) | 摩擦ログ（ハーネス自己改善の入力） |
| [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) | 品質スコア・ギャップ追跡 |
| [docs/PLANS.md](./docs/PLANS.md) | 実行プラン一覧 |
| [docs/design-docs/core-beliefs.md](./docs/design-docs/core-beliefs.md) | コーディング原則・エージェントファースト設計思想 |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 次のセッションへの引き継ぎメモ（6KB 以内） |

## 開発ワークフロー

**Discussion → Document → TDD** のサイクルで進める。フェーズのスキップ禁止。

| フェーズ | 内容 | 使用エージェント |
|---------|------|----------------|
| 1. 議論 | 要件整理・方針確定 | `architect`, `planner` |
| 2. ドキュメント | PRD・Design Doc・ADR 作成 | `doc-updater` |
| 3. 実装 | TDD（RED→GREEN→REFACTOR）| `tdd-guide`, `code-reviewer` |
| 4. メンテナンス | 技術負債解消・GC・ハーネス改善 | `refactor-cleaner`, `gc-agent` |

## 標準ツール（Claude が直接実行できる）

コマンドは `.claude/harness.json` の `commands` から読むこと（ハードコード禁止）。

| ツール | 用途 |
|--------|------|
| `npm test` (= harness.json `commands.test`) | 全テスト実行 |
| `node .claude/hooks/arch-lint.js` | ARCH-NNN 検証 |
| `node .claude/hooks/structure-test.js` | 構造整合性・知識グラフ検証 |
| `./install.sh [update] <lang> <target>` | 配布先への展開・更新 |
| `gh pr create` / `gh pr list` | PR の作成・確認 |
| スキル (`.claude/skills/*/SKILL.md`) | review-loop、improve-harness 等の手順 |

## エージェント一覧

### 開発サポート

| エージェント | 役割 | 起動トリガー |
|-------------|------|------------|
| `architect` | システム設計・ADR 起草 | Phase 1 — 設計判断 |
| `planner` | タスク分解・実行プラン作成 | Phase 1 — 方針合意後 |
| `doc-updater` | PRD・Design Doc・ADR 作成 | Phase 2 — ドキュメント化 |
| `tdd-guide` | TDD ワークフロー・テスト設計 | Phase 3 — コーディング |
| `code-reviewer` | コード品質・パターン確認（アドバイザリ）| Phase 3 — 参考意見 |
| `refactor-cleaner` | 技術負債・重複除去 | Phase 4 — メンテナンス |
| `gc-agent` | 黄金原則逸脱検知・摩擦検出・修正 PR 作成 | Phase 4 — 定期実行 |

### レビュアー（Ralph Wiggum ループ）

PR 作成前に `.claude/skills/review-loop/SKILL.md` の手順で全員を通過させること。

| エージェント | ステージ | 審査観点 |
|-------------|---------|---------|
| `self-reviewer` | Stage 0 | 実装の自己批判的評価 |
| `arch-reviewer` | Stage 1 | アーキテクチャ規則（ARCH-NNN）|
| `style-reviewer` | Stage 1 | コーディングスタイル・命名・debug コード |
| `test-reviewer` | Stage 1 | テストカバレッジ≥80%・独立性 |
| `security-reviewer` | Stage 2 | OWASP Top 10・シークレット漏洩 |
| `docs-reviewer` | Stage 2 | 実装↔ドキュメント整合性・ADR 最新性 |

## ハーネスの自己改善ループ

1. 摩擦（繰り返す BLOCK・手戻り・不足）を `docs/friction-log.md` に記録する
2. `improve-harness` スキルで摩擦を `.claude/` 配下の設定改善に変換する
3. 配布物を変更したら `dist-manifest.json` への登録漏れがないか確認する
4. 配布先プロジェクト発の改善は `sync-upstream`、master → 配布先は `install.sh update` / `sync-downstream`

## プロジェクト状態管理

`PROJECT_STATUS.md` は次のセッションへの引き継ぎメモ。PR を作る前とセッションを閉じる前に書き換える（追記しない。終わった項目は消す）。
載せるのは「現在のフェーズ・進行中・次にやること・人間待ち」だけで、上限は 6KB（ARCH-007）。
決定・知見・履歴の置き場所は [ADR-006](./docs/adr/ADR-006-status-file-as-handoff-note.md) を参照。
