# ADR-004: 同型配布レイアウト — master を配布先と同一の `.claude/` レイアウトにする

**ステータス:** 承認済み  
**作成日:** 2026-08-05  
**決定者:** プロジェクトオーナー

---

## Context（背景）

従来、master リポジトリは配布物を `agents/` `hooks/` `rules/` `skills/`（リポジトリ直下）に置き、install.sh がそれらを配布先の `.claude/` 配下へコピーしていた。この「master と配布先でレイアウトが異なる」構造が、以下の問題を生んでいた。

1. **パス前提の齟齬**: レビュアーエージェント等が `node hooks/arch-lint.js` のようにリポジトリ直下パスを前提としており、配布先（`.claude/hooks/`）では動作しない。エージェント定義が master 内でしか成立しなかった
2. **参照ドキュメントの配布漏れ**: エージェントが必須参照する `docs/golden-rules.md` が install.sh の配布対象から漏れていた
3. **言語固定**: `npm test` のハードコードにより Python プロジェクトで動作しない
4. **配布物と self 専用物の混在**: master 専用のフックが無選別に配布先へコピーされ、除外は人力に依存していた
5. **区別の構造的欠如**: 「どのプロジェクトにも配れるもの」と「master 専用のもの」を機械的に見分ける手段がなかった

## Decision（決定）

### 1. master 自身を配布先と同一レイアウトにする（同型配布 / dogfooding）

master の配布物を `.claude/agents|hooks|rules|skills` と `.claude/settings.json` に配置する。
これにより:

- エージェント・スキル・settings.json 内のすべてのパス表記が master と配布先で**同一**になり、パス変換・パス齟齬が構造的に消滅する
- master 自身が配布物と同じハーネスで動く（dogfooding）。master で動かないものは配布前に master で壊れる
- 同期（sync-upstream / sync-downstream）は同型ツリーの 1:1 diff になる

### 2. 配布内容は `dist-manifest.json` で宣言する

配布対象・除外ファイル（`claude.exclude`）・言語別スキル・docs スケルトン・言語別コマンド既定値を機械可読なマニフェストに一元化する。install.sh と sync スキルはマニフェストのみを参照する。「配布用」と「self 専用」の区別はこのファイルが唯一の正。

### 3. コマンドは `.claude/harness.json` に定義する

テスト等のコマンドはプロジェクトごとに `.claude/harness.json` に定義し、エージェント・スキルは
`node -pe "require('./.claude/harness.json').commands.test"` で取得する。ハードコード禁止。
install.sh が言語選択に応じて生成し、bootstrap スキルが実プロジェクトに合わせて調整する。

### 4. フックは配布先でも安全なスコープに限定する

arch-lint.js の ARCH-001（エージェント定義の配置）と ARCH-002（フック実装の配置）は `.claude/` 配下のみを検査し、配布先プロジェクト固有のソースコードには干渉しない。全フックが汎用となり、無選別コピー問題が解消する。

### 5. 知識グラフの機械的検証

ドキュメントを CLAUDE.md を根とする有向グラフ（ノード = `.md`、エッジ = 相対リンク）として扱い、
ARCH-006（エッジの有効性 = リンク切れ検出）に加えて structure-test.js が到達可能性（孤立ドキュメント検出）を警告として検証する。

## Consequences（帰結）

**良くなること:**

- エージェント定義が master・配布先の両方で無修正で動作する
- `install.sh update` と sync スキルによる双方向同期が同型 diff で単純化される
- 新しい配布物の追加はマニフェストへの 1 行追加で完結し、配布漏れが起きにくい
- master 自身の運用でハーネスの不具合が早期に露見する

**トレードオフ:**

- ARCH-001/002 のスコープ限定により、`.claude/` 外に置かれたエージェント定義・フック実装は検出できなくなる（誤配置は structure-test / レビュアーの目視で補完する）
- ルートの CLAUDE.md / ARCHITECTURE.md は master 用と配布用テンプレート（`templates/`）の二重管理になる（master 固有の記述を配布しないための意図的な分離）

## 関連

- [ADR-002](./ADR-002-architecture-enforcement.md) — アーキテクチャ規則の機械的強制
- [docs/design-docs/core-beliefs.md](../design-docs/core-beliefs.md) — エージェントファースト原則
- [dist-manifest.json](../../dist-manifest.json) — 配布マニフェスト本体
