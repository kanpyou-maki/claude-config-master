# プロジェクト状態

> Claude Code が自律的に管理するファイル。タスク完了・フェーズ移行のたびに更新すること。
> セッション開始時は必ずこのファイルを読んで状態を復元すること。

## 現在のフェーズ

<!-- 選択肢: 議論中 | ドキュメント作成中 | 実装中 | レビュー中 | メンテナンス中 | 完了 -->
レビュー中

## 概要

配布可能な Claude Code ハーネス設定の原本（claude-config-master）。
2026-10-06 のハーネスレビュー（vid-cut の使用実績の集計）を受けて、改善を順に進めている。
1 本目（PR #7、ブランチ `improve/hooks-reach-model`）がレビュー待ち。内訳は「進行中」を参照。

## 完了済み

- [x] ハーネスエンジニアリング基盤（ARCH-001〜006・レビュアー体系・GC）
- [x] 同型配布レイアウトへの再構成（`.claude/` 配下へ移動、ADR-004）
- [x] dist-manifest.json による配布定義の一元化（golden-rules.md 配布漏れ解消）
- [x] harness.json によるコマンドの言語非依存化（npm test ハードコード解消）
- [x] 知識グラフ検証（structure-test.js checkDocGraph・孤立ドキュメント検出）
- [x] ハーネス自己改善ループ（friction-log + improve-harness スキル）
- [x] 双方向同期の強化（.claude/master-path・同型 diff 化した sync スキル）
- [x] feat/harness-engineering のマージ（PR #1）と、vid-cut 発の改善の取り込み（PR #2〜#6）

## 進行中

- [ ] `improve/hooks-reach-model` のレビュー・マージ（ADR-005 は「提案中」。承認ならマージ時に「承認済み」へ）
  - フックの検出結果がモデルに届くようにした（終了コード 2 / `additionalContext`）
  - 起動コマンドを `$CLAUDE_PROJECT_DIR` 起点にし、相対パスを ARCH-004 違反にした
  - スキル 5 本に frontmatter を付け、structure-test で欠落を検出するようにした
  - `quality-gate` は、整形ツールの設定があるプロジェクトだけを整形するようにした
  - 摩擦ログの雛形を `templates/docs/` に分け、master 自身の摩擦を `docs/friction-log.md` に記録できるようにした（FRIC-001〜004）
  - 違反メッセージの長さと改行を制限し、リンク検査が巨大な .md で遅くなる点を直した

## 次にやること

ハーネスレビューの残り。レビュアーの置き換え・状態ファイルの上限・エージェント等の削除の 3 つは、ADR-003（2 ステージ 6 エージェント）と配布物の構成を変えるので、ADR を起草して承認を得てから進める。

- [ ] マージ後、配布先で `install.sh update` を実行し、表示される ARCH-004 の指示どおり `settings.json` の起動コマンドを書き換える（vid-cut から）
- [ ] Stage 1 の 3 レビュアー（arch / style / test。vid-cut で 72 回すべて PASS）を `harness.json` の `commands.verify` 1 本に置き換える
- [ ] 状態ファイル（`PROJECT_STATUS.md` 等）に大きさの上限を設け、履歴を `docs/exec-plans/completed/` へ移す運用にする
- [ ] 使われていないエージェント・スキル・rules の削除と、残すレビュアーのモデル指定の見直し
- [ ] 文書どうしの食い違いの解消（行数の上限・フェーズの数・ADR ステータスの表記）
- [ ] gc-agent の定期実行運用の開始

## 決定事項

| # | 決定内容 | 理由 | ADR |
|---|----------|------|-----|
| 1 | CLAUDE.md は地図・詳細は docs/ | コンテキスト効率 | ADR-001 |
| 2 | アーキテクチャ規則は機械的強制 | ドキュメントは腐敗する | ADR-002 |
| 3 | 2ステージ6エージェントのレビューパイプライン | ゲートキーパー型の品質担保 | ADR-003 |
| 4 | master を配布先と同一の `.claude/` レイアウトにする | パス齟齬の構造的解消・dogfooding | ADR-004 |
| 5 | フックの検出結果は終了コード 2 でモデルに渡し、起動は `$CLAUDE_PROJECT_DIR` 起点にする（提案中） | 終了コード 0 の出力はモデルに届かず、相対パスはサブディレクトリで起動に失敗する | ADR-005 |

## ブロッカー

_なし_

## メモ

- 配布物の追加・除外は `dist-manifest.json` に宣言する（G-15）
- エージェント・スキルはコマンドを `.claude/harness.json` から読む（G-14）
- `docs/friction-log.md` は master 自身の摩擦ログ。配布されるのは `templates/docs/friction-log.md` の空の雛形（`dist-manifest.json` の `docsTemplates`）。記録ルールやエントリ形式を変えるときは両方を直す
- `quality-gate` は Biome か Prettier の設定があるときだけ整形する。master には設定がないので整形されない
