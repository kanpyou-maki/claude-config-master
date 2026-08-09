# PLAN-20260605-harness-engineering

**ステータス:** completed
**作成日:** 2026-06-05
**完了日:** 2026-06-05

## 目標

claude-config-master に OpenAI ハーネスエンジニアリングの概念を導入する。
エージェントが「リポジトリ自体から推論できる」構造を実現し、アーキテクチャ規則を機械的に強制する。

## タスク一覧

### Phase 1: 知識ベース再構築
- [x] CLAUDE.md を ≤100行の地図ファイルに簡素化
- [x] ARCHITECTURE.md 作成
- [x] docs/golden-rules.md 作成
- [x] docs/QUALITY_SCORE.md 作成
- [x] docs/PLANS.md 作成
- [x] docs/exec-plans/ 構造作成（active/, completed/, _template.md）
- [x] docs/design-docs/core-beliefs.md 作成
- [x] docs/references/doc-templates.md 作成
- [x] agents/gc-agent.md 作成
- [x] agents/planner.md 拡張（exec-plans 出力対応）

### Phase 2: アーキテクチャ強制 (TDD)
- [x] package.json 作成（node:test ランナー設定）
- [x] hooks/arch-lint.js 実装（ARCH-001〜006、54テスト通過）
- [x] hooks/structure-test.js 実装（checkDocLinks 含む）
- [x] settings.json に arch-lint.js フックを追加

### Phase 3〜5: 実行プラン・黄金原則・エージェント強化
- [x] install.sh 更新（docs/ 構造配布・フックパス変換）
- [x] docs/golden-rules.md + agents/gc-agent.md
- [x] レビュアー体系（Ralph Wiggum ループ）: 6エージェント + skills/review-loop/
- [x] skills/bootstrap/SKILL.md（自律的初期化）
- [x] test/install.test.js（install.sh の smoke test）

### PDF 全章レビュー
- [x] 最初は空の Git リポジトリから
- [x] エンジニアの役割の再定義
- [x] アプリケーションの可読性向上
- [x] リポジトリの知識を記録システムの基盤に
- [x] エージェントの認識可能性が目標
- [x] アーキテクチャと好みの適用
- [x] スループットがマージの考え方を変える
- [x] エージェント生成が実際に意味するもの + 自律性レベルの向上
- [x] エントロピーとガベージコレクション
- [x] 私たちが今なお学んでいること

## 完了条件

- [x] `npm test` が全テストを通過する（54/54）
- [x] `hooks/arch-lint.js` のカバレッジが ≥80%
- [x] `CLAUDE.md` が ≤100行
- [x] `docs/QUALITY_SCORE.md` の主要ギャップが解消
- [x] PDF の全章をレビューし、見落としを補完

## 進捗メモ

- 2026-06-05: 全フェーズ完了。PDF 全章レビュー完了。
- Node.js v24.10.0 で `node:test` を使用。
- PROJECT_STATUS.md をクリーンテンプレートに戻すことで完了とする。
