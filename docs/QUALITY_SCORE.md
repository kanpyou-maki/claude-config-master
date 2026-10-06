# 品質スコア (Quality Score)

各ドメイン・アーキテクチャ層の品質状態を追跡するファイル。
`.claude/agents/gc-agent.md` がフェーズ完了時および定期実行時に更新する。

**最終更新:** 2026-10-06（テストカバレッジの節のみ。ほかの節は 2026-06-05 時点のままで、原則の数などが古い）

---

## スコアサマリー

| 領域 | スコア | 前回比 | 主なギャップ |
|------|--------|--------|------------|
| ドキュメント整合性 | 98/100 | +3 | Q-05〜08 は長期観察中 |
| テストカバレッジ | 95/100 | +5 | 全フックが行カバレッジ 80% 以上。フックの入出力はプロセスとして検証（ADR-005）|
| アーキテクチャ規則遵守 | 100/100 | 0 | ARCH-001〜006 全自動検証済み |
| 黄金原則達成率 | 11/12 | +1 | G-12（QUALITY_SCORE 更新運用）は GC 初回実行後に達成 |

---

## 領域別詳細

### ドキュメント整合性 (98/100)

| 項目 | 状態 | 備考 |
|------|------|------|
| PRD 作成済み | ✅ | `docs/prd.md` |
| Design Doc 作成済み | ✅ | `docs/design.md`（セクション7まで） |
| ADR 作成済み | ✅ | ADR-001, ADR-002, ADR-003 |
| ARCHITECTURE.md 作成済み | ✅ | ARCH-001〜006 掲載 |
| exec-plans 運用済み | ✅ | PLAN-20260605 完了・completed/ に移動済み |
| golden-rules.md 作成済み | ✅ | G-01〜G-12 定義済み |
| core-beliefs.md 作成済み | ✅ | 原則 1〜9 定義済み |
| QUALITY_SCORE.md 更新運用 | ✅ | 本ファイル |
| 長期オープンクエスチョン | ⚠️ | Q-05〜08 は実運用を通じて学習中 |

### テストカバレッジ (95/100)

行カバレッジは `node --test --experimental-test-coverage 'test/**/*.test.js'` の実測値（2026-10-06）。

| 対象 | テストファイル（件数） | 行カバレッジ | 目標 | 状態 |
|------|----------------------|-------------|------|------|
| `.claude/hooks/arch-lint.js` | `arch-lint.test.js`（46） | 97% | 80% | ✅ 達成 |
| `.claude/hooks/structure-test.js` | `structure-test.test.js`（32） | 86% | 80% | ✅ 達成 |
| `.claude/hooks/quality-gate.js` | `quality-gate.test.js`（14） | 97% | 80% | ✅ 達成 |
| `.claude/hooks/post-edit-typecheck.js` | `post-edit-typecheck.test.js`（5） | 97% | 80% | ✅ 達成 |
| `.claude/hooks/pre-bash-git-push-reminder.js` | `hook-contract.test.js` | 100% | 80% | ✅ 達成 |
| フックの入出力規約（ADR-005） | `hook-contract.test.js`（13） | — | — | ✅ 達成 |
| `install.sh` (smoke test) | `install.test.js`（28） | — | — | ✅ 達成 |

**合計: 138/138 テスト通過**

### アーキテクチャ規則遵守 (100/100)

| 規則 | 遵守状況 | 備考 |
|------|---------|------|
| ARCH-001 (エージェント配置) | ✅ 自動検証 | arch-lint.js でフック済み |
| ARCH-002 (フック配置) | ✅ 自動検証 | arch-lint.js でフック済み |
| ARCH-003 (rules 命名) | ✅ 自動検証 | arch-lint.js でフック済み |
| ARCH-004 (settings.json 参照) | ✅ 自動検証 | arch-lint.js でフック済み |
| ARCH-005 (CLAUDE.md 行数) | ✅ 自動検証 | 74行（ARCH-005 通過）|
| ARCH-006 (Markdown リンク) | ✅ 自動検証 | arch-lint.js + checkDocLinks |

### 黄金原則達成率 (11/12)

| 原則 | 状態 | 備考 |
|------|------|------|
| G-01 CLAUDE.md ≤100行 | ✅ | 74行 |
| G-02 全フックが settings.json に登録 | ✅ | arch-lint, structure-test 含む |
| G-03 ADR なしのアーキテクチャ変更禁止 | ✅ | ADR-001〜003 運用中 |
| G-04 agents/ 以外にエージェント定義なし | ✅ | 自動検証 |
| G-05 hooks/ 以外にフック実装なし | ✅ | 自動検証 |
| G-06 テストカバレッジ ≥80% | ✅ | 54/54 通過 |
| G-07 外部 npm 依存なし | ✅ | Node.js 標準ライブラリのみ |
| G-08 console.log 禁止 | ✅ | hooks/ にデバッグコードなし |
| G-09 rules/ 命名規則 | ✅ | 自動検証 |
| G-10 ADR ステータス管理 | ✅ | 全 ADR が有効なステータス |
| G-11 完了プランは completed/ へ | ✅ | PLAN-20260605 移動済み |
| G-12 QUALITY_SCORE 更新運用 | ⚠️ | 本更新が初回。GC 週次実行で継続的に更新予定 |

---

## ギャップ追跡

| # | ギャップ | 優先度 | 備考 |
|---|---------|--------|------|
| GAP-01 | この文書のテストカバレッジ以外の節が 2026-06-05 のまま（ADR は 005 まで、黄金原則は G-16 まである） | 低 | gc-agent の実行時に全体を更新する |
