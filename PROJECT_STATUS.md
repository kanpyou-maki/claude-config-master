# プロジェクト状態

> Claude Code が自律的に管理するファイル。タスク完了・フェーズ移行のたびに更新すること。
> セッション開始時は必ずこのファイルを読んで状態を復元すること。

## 現在のフェーズ

<!-- 選択肢: 議論中 | ドキュメント作成中 | 実装中 | レビュー中 | メンテナンス中 | 完了 -->
レビュー中

## 概要

配布可能な Claude Code ハーネス設定の原本（claude-config-master）。
ADR-004 の同型配布レイアウトへの再構成が完了し、人間のレビュー待ち。

## 完了済み

- [x] ハーネスエンジニアリング基盤（ARCH-001〜006・レビュアー体系・GC）
- [x] 同型配布レイアウトへの再構成（`.claude/` 配下へ移動、ADR-004）
- [x] dist-manifest.json による配布定義の一元化（golden-rules.md 配布漏れ解消）
- [x] harness.json によるコマンドの言語非依存化（npm test ハードコード解消）
- [x] 知識グラフ検証（structure-test.js checkDocGraph・孤立ドキュメント検出）
- [x] ハーネス自己改善ループ（friction-log + improve-harness スキル）
- [x] 双方向同期の強化（.claude/master-path・同型 diff 化した sync スキル）

## 進行中

- [ ] feat/harness-engineering ブランチのレビュー・マージ

## 次にやること

- [ ] 既存の配布先プロジェクト（magpie 等）への `install.sh update` 適用
- [ ] gc-agent の定期実行運用の開始
- [ ] friction-log の運用開始（最初の摩擦が出たら improve-harness を試す）

## 決定事項

| # | 決定内容 | 理由 | ADR |
|---|----------|------|-----|
| 1 | CLAUDE.md は地図・詳細は docs/ | コンテキスト効率 | ADR-001 |
| 2 | アーキテクチャ規則は機械的強制 | ドキュメントは腐敗する | ADR-002 |
| 3 | 2ステージ6エージェントのレビューパイプライン | ゲートキーパー型の品質担保 | ADR-003 |
| 4 | master を配布先と同一の `.claude/` レイアウトにする | パス齟齬の構造的解消・dogfooding | ADR-004 |

## ブロッカー

_なし_

## メモ

- 配布物の追加・除外は `dist-manifest.json` に宣言する（G-15）
- エージェント・スキルはコマンドを `.claude/harness.json` から読む（G-14）
