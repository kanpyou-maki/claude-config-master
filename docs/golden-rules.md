# 黄金原則 (Golden Rules)

リポジトリが常に満たすべき不変の原則。
`agents/gc-agent.md` はこのファイルを参照して逸脱を検知し、修正 PR を作成する。

## 構造ルール

| # | 原則 | 検証方法 |
|---|------|---------|
| G-01 | `CLAUDE.md` は 100行以内 | ARCH-005 (arch-lint.js) |
| G-02 | すべてのフックが `settings.json` に登録されている | ARCH-004 (arch-lint.js) |
| G-03 | `docs/adr/` に記録のないアーキテクチャ変更をコミットしない | 構造テスト |
| G-04 | `agents/` 以外にエージェント定義を置かない | ARCH-001 (arch-lint.js) |
| G-05 | `hooks/` 以外にフック実装を置かない（`test/` は除く）| ARCH-002 (arch-lint.js) |

## 品質ルール

| # | 原則 | 検証方法 |
|---|------|---------|
| G-06 | フックのテストカバレッジは 80% 以上 | `npm test` |
| G-07 | フックは Node.js 標準ライブラリのみ使用（外部 npm 依存禁止）| package.json 確認 |
| G-08 | `console.log` をフック実装に残さない | コードレビュー |
| G-09 | `rules/` のファイルは `{lang}/{category}.md` 形式 | ARCH-003 (arch-lint.js) |

## ドキュメントルール

| # | 原則 | 検証方法 |
|---|------|---------|
| G-10 | ADR は「承認済み」「提案中」「非推奨」のいずれかのステータスを持つ | 構造テスト |
| G-11 | `docs/exec-plans/active/` のプランは完了後 `completed/` へ移動する | GC エージェント |
| G-12 | `QUALITY_SCORE.md` はフェーズ完了時または GC 実行時に更新する | GC エージェント |

## GC エージェントの逸脱検知スコープ

GC エージェントは以下を定期的に確認する:
1. 上記ルールへの違反を全ファイルスキャンで検出
2. `QUALITY_SCORE.md` のスコアを最新状態に更新
3. 逸脱があれば修正差分を作成して PR をオープンする

詳細: [agents/gc-agent.md](../agents/gc-agent.md)
