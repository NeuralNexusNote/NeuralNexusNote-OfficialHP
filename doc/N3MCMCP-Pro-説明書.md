# N3MemoryCore MCP — Pro（永続型）

> A NeuralNexusNote™ product

🛡️ AI-Native Development Policy
本プロジェクトは静的コードよりも指示書を優先します。AI に実行環境を生成させる理由については [開発理念](./PHILOSOPHY.md) をご覧ください。

> コードが書けなくても、使えるものを作りたい人のために。

N3MemoryCore は、Claude Code に長期記憶を与える仕組みです。
**セットアップは Claude Code に任せるだけ。コードを書く必要はありません。**

---

> **N3MC-MCP-Pro は、Claude Code / Cursor / Windsurf などの
> MCP 対応エディタが利用する "外部メモリサーバー" です。**
> MCP Server として動作し、AI が会話やコード文脈を**セッションを跨いで永続的に**
> 保存・検索できます。

> NeuralNexusNote™ プロダクト — **Pro（永続型）** 版：SQLite + sqlite-vec を使った
> 永続ハイブリッド（ベクトル + BM25）メモリを Model Context Protocol サーバーとして
> 提供します。TTL はありません。既定で `retention_days = 365`（1 年）を超えた古い
> 記憶のみサーバー起動時に自動 GC されます。

> 🇺🇸 **[English README](./README.md)**
> 🛡️ **[開発ポリシー](./PHILOSOPHY.md)**

---

## 特徴

- 💾 **完全ローカル** — 会話データは自分の PC に保存。クラウドに送りません
- 🔍 **意味で検索** — キーワードが違っても、関連する過去の会話を引き出します
- 🔄 **セッションをまたいで記憶** — 翌日開いても、先週の続きから話せます（**永続・TTL なし**）
- ⚡ **自動で動く** — 保存も検索もすべて自動。MCP の `initialize` 応答で配信される振る舞い指示により、ユーザーの指示は不要です
- 🤖 **マルチエージェント対応** — 複数の AI エージェントが 1 つの記憶 DB を共有。`b_local` バイアスで自分の記憶を優先しつつ、他のエージェントの知識も検索できます
- 🏢 **チーム・組織にも対応** — `N3MC_DATA_DIR` を共有パスに向ければ、複数の OS ユーザー間で同一 DB を共有できます（⚠️ 認証機構は未搭載のため、ファイルシステム権限・VPN 等でアクセス制御が必要）
- 🔗 **DB 統合が可能** — 同じ指示書から構築した DB は完全互換。引継ぎ時のナレッジ移行や、他の環境で蓄積した記憶の取り込みがシームレスに行える、統合を前提とした DB 設計です
- 💰 **トークン消費を削減** — 過去の文脈を再説明する必要がなくなります。記憶検索はローカル embedding（`intfloat/e5-base-v2`）で行うため Claude のトークンを消費せず、的確な文脈注入により修正のやり取りも減少します

---

## ⚠️ 配布形態について（インストール前に必須）

本 Pro 版は **PyPI では配布しません**。配布物は **仕様書一式の zip**
（実装指示書の Markdown と `.txt`、PHILOSOPHY、LICENSE）で、**Claude Code
に仕様書をドロップしてコードを生成させる**のが唯一の導入経路です（本リポ
ジトリの Python コードは、その生成結果のリファレンス実装です）。

Zip の中身:

| Zip 内パス                                        | 役割                                            |
| ------------------------------------------------- | ----------------------------------------------- |
| `docs_markdown/N3MemoryCore_MCP_Pro_v1.1.0_JP.md` | **実装指示書（日本語）** — Claude Code に渡す   |
| `docs_markdown/N3MemoryCore_MCP_Pro_v1.1.0_EN.md` | **実装指示書（英語）**                          |
| `docs_markdown/PHILOSOPHY.md`                     | 開発ポリシー                                    |
| `docs_markdown/LICENSE`                           | ライセンス条項                                  |
| `N3MemoryCore_MCP_Pro_v1.1.0_JP.txt` 他           | Markdown を開けない方向けに `.txt` 版をトップに配置 |

> 💡 **指示書内の「注釈」について**
> 指示書（Markdown）内の各所に、AI の挙動を厳格に制御するための「設計意図」を注釈として記しています。コードを生成する前に、ぜひ一度この注釈に目を通してください。そこには、単なるコード以上の「AI を使いこなすための論理」が詰まっています。

Claude Code がこの指示書を読み、`n3mc_mcp_pro/` 配下の Python パッケージ
（`server.py` / `database.py` / `processor.py` / `config.py` / `paths.py` /
`instructions.py`）と `pyproject.toml` を生成します。以降のインストール・
設定・Evidence Report による検証も **Claude Code に依頼するだけ**で完結します。

---

## 仕組み

```
ユーザーの発言
    │
    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. 自動保存  │────▶│  2. 意味検索  │────▶│ 3. コンテキスト│
│  前回の回答を │     │  関連する過去 │     │    注入       │
│  DBに保存    │     │  の記憶を取得 │     │  Claudeに渡す │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          Claudeが過去の
                                          文脈を踏まえて回答
```

MCP の `initialize` 応答で配信される**振る舞い指示**により、すべて自動で
行われます。Claude Code のフックは使わないため、クライアント側の追加設定は
不要です（ツール自動許可の `permissions.allow` 設定のみ）。ユーザーが意識する
必要はありません。

### Claude 標準の auto-memory との違い

Claude Code には標準の auto-memory 機能（`~/.claude/projects/.../memory/`）が
あります。N3MemoryCore はこれと**競合せず、補完し合います**。

|                | Claude auto-memory                     | N3MemoryCore RAG                   |
| -------------- | -------------------------------------- | ---------------------------------- |
| **得意なこと** | 確実・毎回ロード・固定情報             | 過去の会話の文脈・詳細な経緯       |
| **苦手なこと** | 会話の流れや文脈は持てない             | 検索精度に依存・確実性がない       |
| **用途**       | ユーザープロフィール、フォルダパス等   | 会話の詳細、議論の経緯             |

**推奨の使い分け：**

- **毎回必要な固定情報**（開発フォルダのパス、ユーザーの好みなど）→ auto-memory に保存
- **会話の文脈・経緯**（議論の流れ、過去の決定理由など）→ N3MemoryCore が自動で蓄積

---

## Lite 版と Pro 版

| 版                       | ストレージ                             | 耐久性                  | 配布先                     |
| ------------------------ | -------------------------------------- | ----------------------- | -------------------------- |
| **Lite**                 | Redis Stack（RediSearch）              | 7d TTL・揮発            | PyPI / Claude Marketplace  |
| **Pro（本リポジトリ）**  | SQLite + sqlite-vec（ローカルファイル） | **永続**・TTL なし      | **指示書のみ**（個別配布の zip） |

MCP の外向き仕様は同じ（5 ツール・同じツール名）。ただし Pro は以下の点で
Lite と異なります：

- **永続化が既定**。TTL はなく、`retention_days`（既定 365 日）を超えた行のみ
  サーバー起動時に一度 GC されます。
- **Refresh セマンティクス**：意味的に近い（`cos_sim ≥ 0.95`）既存エントリは
  **拒否されず、旧行 DELETE → 新行 INSERT の 1 トランザクション**で置き換わります。
  「ほぼ同じ内容を言い換えて書き直す」使い方が自然に新鮮化されます。
- **`b_session` バイアス**：同セッションで保存された記憶は、別セッションの古い
  記憶より優先されます（1.0 vs 0.6）。
- **親ドキュメント + チャンク契約**：400 字超のテキストは自動で階層分割され、
  `documents` テーブルに**全文 verbatim**（一字一句保存）、`memories` に
  チャンクが登録されます。検索はチャンクヒットで、応答は親の全文で返ります。
- **外部サービス不要**。Redis Stack は使わず、SQLite のファイル 1 点に永続化されます。

**継続プロジェクト・長期アシスタント**用途に最適化されています。短期作業・
ワーキングメモリ・試作用途であれば Lite 版を検討してください。

## 概要

`n3memorycore-mcp-pro` は、Claude をはじめとする任意の MCP 対応クライアントに
**永続的な** 会話メモリを与えるローカル専用 MCP サーバーです。SQLite + sqlite-vec
上に BM25 全文検索インデックスと 768 次元ベクトルインデックス
（[`intfloat/e5-base-v2`](https://huggingface.co/intfloat/e5-base-v2)）の両方を
持ち、ハイブリッドランキングで結果を返します。

全ての処理はユーザー端末上で完結します。API コールもクラウド保存もありません。

## 提供ツール

| ツール           | 用途                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| `search_memory`  | ハイブリッド検索（ベクトル + BM25、時間減衰・b_session・b_local ランキング、軽量語彙リランク） |
| `save_memory`    | エントリを保存（TTL なし、完全一致拒否・近似 **Refresh**、400 字超は親ドキュメント + チャンク自動化） |
| `list_memories`  | 独立メモリと親ドキュメントを新しい順に一覧（親は `[doc×N]` タグ付き）    |
| `delete_memory`  | 特定のエントリを id で削除（親 ID の場合はチャンクを cascade 削除）      |
| `repair_memory`  | スキーマ確保 + 未インデックス行の再構築                                  |

さらに、MCP の `initialize` 応答で**振る舞いの指示**をクライアントへ配信します。
これにより「各ターン先頭で `search_memory`、応答後に `save_memory`」という
自動保存運用が、Claude Code のフック無しでも成立します。

## 動作環境

- **Claude Code**（または他の MCP 対応クライアント）
- **Python 3.10+**
- **OS**: Windows 11・Ubuntu（動作確認済み） / macOS（対応設計だが未検証）

> Python が入っているか確認するには、ターミナルで `python --version` を実行
> してください。未インストールの場合、セットアップ時に Claude Code が案内します。

## セットアップ

1. **配布された `N3MCMCP-Pro` の zip を入手して展開**します。
2. **展開した `docs_markdown/N3MemoryCore_MCP_Pro_v1.1.0_JP.md` を Claude
   Code のプロンプトにドロップ**します。
3. 指示書の **付録 B — フェーズ 1** のプロンプトをそのまま貼り付け、
   「指示書通りに実装してください」と伝えます。
4. Claude Code がコードを生成した後、`pip install -e .` を実行してローカル
   インストールします（Claude Code に依頼すれば自動で実行します）。
5. **MCP 登録 + ツール自動許可をプラグインで一発設定**（推奨、Claude Code CLI 専用）：
   ```
   /plugin install <展開先>/plugins/n3mc-longtermmemory
   ```
   Claude Code が `~/.claude.json` に MCP サーバを登録し、SessionStart hook が
   `~/.claude/settings.json` の `permissions.allow` に `mcp__n3mc-longtermmemory__*`
   の 5 ツールを冪等追加します。**手動編集不要 — 以降は再起動するだけ**で
   自動接続・自動承認されます。
   
   *Claude Desktop や手動登録派の方は [クライアント設定](#クライアント設定) 参照。*
6. Claude Code / Claude Desktop を**完全に終了 → 再起動**します。
7. （任意）指示書の **付録 B — フェーズ 4** のプロンプトで §10 の Evidence
   Report を実行し、実装が仕様通りに動作することを確認します。

セットアップには約 15〜30 分かかります（環境やモデルにより異なります）。初回
ツール呼び出し時に ~440 MB の埋め込みモデル（`intfloat/e5-base-v2`）が
Hugging Face から `~/.cache/huggingface/` にダウンロードされます（**2〜10 分**）。
以降のキャッシュ後は `initialize` は ~24 秒で完了します。

### セットアップ後の体験

再起動後のセッションから自動的に動作します：

- あなたの発言に関連する過去の会話が、自動で検索・注入されます
- Claude は過去の文脈を踏まえて回答します（「前回話した○○ですが…」）
- 保存も検索もバックグラウンドで行われるため、操作は不要です
- **セッションを跨いでも記憶は残ります**（Lite と異なり 7 日で消えません）

### バックアップと復元

記憶を別の環境に移行する場合や、安全のためにバックアップする場合は以下の 2
ファイルを保管してください：

- `n3memory.db` — 記憶データ本体（WAL モードのため `n3memory.db-wal` /
  `n3memory.db-shm` も存在する場合がある）
- `config.json` — `owner_id`・`local_id` の UUIDv4 キー

この 2 ファイルはセットで保管する必要があります。キーが一致しないと所有者検証・
バイアス計算が正しく機能しません。

### アンインストール

フォルダやファイルを直接削除せず、**Claude Code に「n3mc-longtermmemory を削除して
ください」と依頼**してください。Claude Code が以下を順に安全に処理します：

1. MCP クライアント設定（`.mcp.json` / `claude_desktop_config.json`）から
   `n3mc-longtermmemory` エントリを除去
2. `~/.claude/settings.json` の `mcp__n3mc-longtermmemory__*` allow ブロックを除去
3. `pip uninstall` でパッケージを削除
4. データディレクトリ（`${N3MC_DATA_DIR}` または §7 プラットフォーム既定）を
   削除して `n3memory.db` / `config.json` を除去

## クライアント設定

### Claude Desktop（および Claude Desktop 内の「Code」タブ）

**Claude Desktop アプリ**（内蔵の **Code** タブを含む）を使っている場合は、
`.mcp.json` ではなく Desktop 用の設定ファイルを編集してください。`.mcp.json` は
ターミナルから起動する `claude` CLI 専用で、Claude Desktop アプリからは読まれません。

`%APPDATA%\Claude\claude_desktop_config.json`（Windows）または
`~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）：

```json
{
  "mcpServers": {
    "n3mc-longtermmemory": {
      "command": "n3mc-longtermmemory",
      "args": []
    }
  }
}
```

**Windows の注意点**：上記のコマンド名指定で Claude Desktop がサーバーを
起動できない（ハンマー／ツールアイコンが出ない）場合は、`"command"` を
インストール済み `.exe` への絶対パスに置き換えてください。例：

```json
"command": "C:\\Users\\<ユーザー名>\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\n3mc-longtermmemory.exe"
```

正確なパスはターミナルで `where n3mc-longtermmemory` を実行して確認できます。

**設定ファイル編集後は Claude Desktop を完全に終了してください。** ウィンドウを
閉じるだけでは不十分です。タスクトレイの Claude アイコンを右クリックして Quit、
もしくはタスクマネージャーで Claude 関連プロセスをすべて終了させてから再起動
してください。

### Claude Code（スタンドアロン CLI）

この節は `claude` コマンドラインツール専用で、Claude Desktop 内の「Code」タブ
ではありません（そちらは上の節を参照）。

**全プロジェクトで使う（推奨）** — ユーザースコープに登録:

```bash
claude mcp add -s user n3mc-longtermmemory n3mc-longtermmemory
```

または `~/.claude.json` の `mcpServers` に直接追加:

```json
"n3mc-longtermmemory": {
  "type": "stdio",
  "command": "n3mc-longtermmemory",
  "args": []
}
```

登録後は Claude Code を再起動すれば、どのフォルダで開いても利用可能になります。

**このプロジェクトでのみ使う場合** — プロジェクトの `.mcp.json` に追加:

```json
{
  "mcpServers": {
    "n3mc-longtermmemory": {
      "type": "stdio",
      "command": "n3mc-longtermmemory",
      "args": []
    }
  }
}
```

### ツール自動許可（Claude Code 固有）

Claude Code は既定で各 MCP ツール呼び出しに対してユーザー承認プロンプトを
出します。「AI が意識せず保存・検索する」自動ループを成立させるため、
`n3mc-longtermmemory` の 5 ツールを `permissions.allow` に登録してください。

`~/.claude/settings.json`（ユーザーグローバル — 推奨）または
`.claude/settings.json`（プロジェクトスコープ）に追記：

```json
{
  "permissions": {
    "allow": [
      "mcp__n3mc-longtermmemory__search_memory",
      "mcp__n3mc-longtermmemory__save_memory",
      "mcp__n3mc-longtermmemory__list_memories",
      "mcp__n3mc-longtermmemory__delete_memory",
      "mcp__n3mc-longtermmemory__repair_memory"
    ]
  }
}
```

これを設定しないと `save_memory` / `search_memory` の呼び出しごとに承認
プロンプトが出て、ユーザーが離席していると AI がブロックされます。Claude
Desktop にはツール単位のパーミッションゲートが無いため、この設定は不要です。

## データ保存先

| OS      | パス                                                         |
| ------- | ------------------------------------------------------------ |
| Windows | `%LOCALAPPDATA%\n3mc-longtermmemory\`                           |
| macOS   | `~/Library/Application Support/n3mc-longtermmemory/`            |
| Linux   | `~/.local/share/n3mc-longtermmemory/`                           |

データディレクトリ内のファイル：

- `config.json` — 設定
- `n3memory.db` — SQLite DB（WAL モードなので `n3memory.db-wal` / `n3memory.db-shm` も生成される）

環境変数 `N3MC_DATA_DIR`（絶対パス）で上書き可能です。データディレクトリを
削除すれば全記憶が消えます。

## 設定

初回起動時に `config.json` が自動生成され、`owner_id` と `local_id` に
ランダム UUIDv4 が割り当てられます。編集可能な既定値（抜粋）：

```json
{
  "owner_id":                 "<uuid>",
  "local_id":                 "<uuid>",
  "dedup_threshold":          0.95,
  "half_life_days":           90,
  "min_time_decay":           0.2,
  "retention_days":           365,
  "bm25_min_threshold":       0.1,
  "search_result_limit":      20,
  "min_score":                0.2,
  "chunk_threshold":          400,
  "chunk_overlap":            40,
  "access_count_enabled":     true,
  "access_count_weight":      0.02,
  "access_count_max_boost":   0.5,
  "lexical_rerank_enabled":   true,
  "rerank_weight":            0.3,
  "rerank_phrase_weight":     0.2,
  "skip_code_blocks":         false,
  "gc_on_startup":            true,
  "gc_batch_size":            500,
  "b_session_match":          1.0,
  "b_session_mismatch":       0.6,
  "b_local_match":            1.0,
  "b_local_mismatch":         0.8
}
```

- `dedup_threshold` — Refresh 閾値。`cos_sim ≥` ならば意味的重複として旧行を
  DELETE → 新行を INSERT。
- `half_life_days` / `min_time_decay` — 時間減衰の半減期（既定 90 日）と
  フロア値（既定 0.2）。1 年前の記憶でも 0.2 で底打ちします。
- `retention_days` / `gc_on_startup` / `gc_batch_size` — 起動時自動 GC の閾値と
  バッチサイズ。既定 365 日を超えた行のみ削除されます。
- `chunk_threshold` / `chunk_overlap` — 階層分割のサイズとオーバーラップ。
  本文長がこの閾値（既定 400 字）を超えた場合に親ドキュメント + チャンク化に
  入ります。
- `b_session_*` / `b_local_*` — セッションバイアス（既定 1.0 / 0.6）と
  インストールバイアス（既定 1.0 / 0.8）。
- `skip_code_blocks` — `true` にすると `save_memory` はトリプルバッククォート
  フェンス（` ``` `）を含む本文を拒否し、`{"status": "skipped_code", "saved": false}`
  を返します。既定は `false`。

環境変数オーバーライド：`N3MC_OWNER_ID` / `N3MC_LOCAL_ID`（UUIDv4）を設定すると
`config.json` の対応フィールドより優先されます。マルチエージェント構成で複数
クライアントに同じ owner/local を強制する際に使います。

全フィールドの詳細は指示書 §6 を参照してください。

## ランキング式

```
final_score = (0.7 × cosine_similarity + 0.3 × keyword_relevance) × time_decay × b_session × b_local

cosine_sim  = max(0, 1 - L2_distance² / 2)                       (L2 正規化前提)
time_decay  = max(min_time_decay, 2 ^ (-経過日数 / half_life_days))   (既定 半減期 90 日・フロア 0.2)
b_session   = b_session_match (1.0) if 同セッション else b_session_mismatch (0.6)
b_local     = clamp(0.5, 2.0, stored_importance × base + access_boost)
  base         = b_local_match (1.0) if local_id 一致 else b_local_mismatch (0.8)
  access_boost = min(0.5, access_count × 0.02)
```

既定の半減期 90 日・フロア 0.2 により、古い記憶でも底打ちしてランキングに
残ります。**`b_session` は Pro 固有**：現セッションで保存された情報は
セッション跨ぎの古い記憶より優先されます（Lite は 7 日 TTL で自然に収束する
ため `b_session` を持ちません）。

**自動重要度ブースト（アクセス頻度型）**：`search_memory` がある記憶を上位
5 件で返すたび、その記憶の `access_count` が +1 され、次回以降の検索で
`b_local` が 0.02 ずつ押し上げられます（上限 +0.5）。LLM による重要度判定は
不要で、「よく使う記憶ほど自然に上位に来る」自己調整ループが CPU 計算のみで
成立します。

**軽量語彙リランカー**：融合スコア後に `coverage × rerank_weight (0.3) +
phrase_bonus × rerank_phrase_weight (0.2)` を加算します。**CJK バイグラム
展開**により日本語・中国語でも BM25 と coverage が機能します。

## 拡張性

N3MemoryCore は指示書（仕様書）を読ませて作るため、拡張も Claude Code に
相談するだけで対応できます。

- **PostgreSQL 移行** — SQLite から PostgreSQL + pgvector へ。チーム規模の運用に
- **カスタム検索ロジック** — バイアス係数やランキング式の調整
- **他の embedding モデル** — 用途に合わせたモデルへの差し替え
- **ID 階層の拡張** — `project_id` や `tag` など、分類フィールドを自由に追加
- **PDF 取込** — PDF からテキストを抽出し、検索可能な記憶として保存
- **ハッシュタグ対応** — Claude が記憶に `#タグ` を自動付与して絞り込み検索
  （例: `search_memory "#AWS"`）。既存の FTS で動作し、DB 変更不要

指示書を Claude Code に読ませて「○○を追加して」と伝えるだけです。

> 💬 **Claude Code に依頼すれば、hook による全会話の自動保存もセットアップ可能**
> 「毎ターン終わったら、Claude Code の会話全文を Pro に自動保存して」と頼めば、
> Claude Code が `~/.claude/hooks/` にスクリプトを置き、`~/.claude/settings.json`
> に `Stop` hook を追加します。これは LLM の判断を介さず harness が決定論的に
> 実行するため、Claude が `save_memory` を呼び忘れる事故が構造的に発生しません。
> 詳細は本 README の[hook による全会話保存](#hook-による全会話保存)節を参照。

> 💡 仕様書付録 A にはクロスエンコーダ・リランカー、HyDE、日本語形態素解析
> といった「精度を伸ばす」系の差し込みポイントと候補ライブラリも記載されて
> います。永続性・Refresh・親ドキュメント契約を壊さずに改造したいときの
> 参考にしてください。

## なぜ N3MemoryCore？（組込みメモリとの違い）

auto-save の **信頼性** という観点では、N3MemoryCore は最近の LLM 製品の
組込みメモリ機能（例：Claude の組込みメモリ）**と本質的に変わりません** ──
どちらも「LLM が自発的に save ツールを呼ぶ」ことに依存し、後述の
*コンプライアンスについて* に書いた非決定性は両方に当てはまります。
差別化は別のところにあります：

| 観点 | 組込みメモリ | N3MemoryCore |
|---|---|---|
| **データ所有権** | ベンダ管理サーバ | **自分のマシンの SQLite** |
| **クライアントの広さ** | ベンダ製品内のみ | **任意の MCP 準拠クライアント**（Claude Code / Cursor / Cline / Goose / 自前アプリ） |
| **複数 AI の協調** | 単一 AI の記憶 | **`session_id` で複数エージェントが同じ記憶名前空間を共有** |
| **Verbatim 復元** | 不明（要約される可能性あり） | **親ドキュメント契約 — バイト一致の全文返却** |
| **検索内部** | ブラックボックス | **ハイブリッド BM25 + e5 ベクトル + CJK バイグラム + 時間減衰 + 軽量リランカー、全パラメータ可視・可変** |
| **可視性／制御** | UI 経由のみ | **`list_memories` / `delete_memory` で生レコード操作可** |
| **永続性** | ベンダのサービス継続期間に依存 | **自分の DB ファイルに残る、ベンダの状況に左右されない** |
| **チューニング** | 固定 | `half_life_days` / `chunk_threshold` / `dedup_threshold` / リランク重み などすべて編集可能 |

つまり N3MemoryCore を動かす価値は **「より確実な auto-save」ではなく、
「メモリ層を自分で所有すること」** にあります ── データはローカルに残る、
検索の挙動は透明で改造可能、同じ記憶名前空間をどの MCP クライアントからも
触れて、協調する AI 間で共有できる、verbatim 復元は契約レベルで保証される。

これらの特性が運用にとって重要なら、N3MemoryCore は元を取ります。
「**ある一社の製品の中で LLM がセッション跨ぎで何かを覚えていてくれれば
いい**」だけなら、組込みメモリの方がシンプルです。

## コンプライアンスについて — MCP は「促す」ことしかできない

このサーバから LLM にツール呼び出しを強制することはできません。MCP プロトコル
がサーバ側に与える働きかけ手段は次の 3 つだけです：

1. **`tools/list` の各ツール `description`** — 毎ターン LLM の視野に入る
2. **`instructions` フィールド** — セッション開始時に 1 回送られ、システムレベルの
   ヒントとして渡される
3. **ツール応答のテキスト** — LLM がツールを呼んだときに読む

本サーバはこの 3 つすべてを利用しています：tool description には明示的な指示
（「毎ターン開始時に呼ぶこと」）、`instructions` にはルール集、`search_memory` /
`save_memory` の応答末尾には auto-save を促す短い reminder を埋め込んでいます。
それでも、**LLM がそれに従うかは非決定的**です。コンプライアンスは次に依存します：

- モデル自身の学習・ツール呼び出し傾向のバイアス
- MCP クライアントのプロンプト構築（`instructions` を要約・破棄するクライアントもある）
- ユーザのプロンプト、プロジェクトの `CLAUDE.md` など競合する別の指示

実際には **大半のターンでは正しく auto-save されますが、一部のターンでは飛びます**
── 特に短い返答、事実訂正のターン、LLM がユーザの質問に強く集中しているターン。
保存していてほしかった事実が次のセッションで失われていたら、「保存して」と
明示的に言えば取り戻せます。

### 確実な保存が必要なときの 3 つの経路

MCP の建付けの中で、この非決定性を回避する経路は **3 通り**あります：

**経路 1 — ユーザがプロンプトで明示する**（運用回避・即効）
- 「**N3MemoryCore に保存して**」「**メモリに記録して**」をプロンプトに書く
- LLM はだいたいユーザの明示要求には応じる
- 利点: 何のインフラも要らない／今すぐ効く／すべての MCP クライアントで動く
- 欠点: ユーザの認知負荷（毎回明示する必要、自動化されない）

### hook による全会話保存

**経路 2 — Claude Code hook で全会話保存**（Claude Code 専用・決定論的）
- Claude Code には `Stop` などの harness レベル hook があり、これは LLM の判断を**一切介さず**
  harness が決定論的に実行する
- セットアップは Claude Code に依頼するだけ：
  > 「毎ターン終わったら、Claude Code の会話全文を Pro に自動保存して」
- Claude Code が以下を自動構築します：
  - `~/.claude/hooks/save_transcript.py` — `transcript_path` を読んで `n3mc_mcp_pro.database.Database`
    を直接 import し、Pro DB に `save_memory` を呼び出すスクリプト
  - `~/.claude/settings.json` の `hooks.Stop` セクション — 上記スクリプトを毎ターン末に
    `async: true` で実行する設定
- 動作仕様：
  - **Claude が `save_memory` を呼び忘れる事故が構造的に発生しない**（harness が直接呼ぶ）
  - MCP の往復を経由しないため、ツール呼び出しコストゼロ
  - 同一セッションは turn ごとに transcript が成長 → cos_sim ≥ 0.95 の Refresh で
    古い版が自動置換 → DB は **1 セッション 1 エントリ**に収束
  - 200 文字未満の短い transcript は noise として skip
- 利点: 決定論的／LLM の傾向に依存しない／ノイズや忘却の心配なし
- 欠点: Claude Code 専用（Cursor / Windsurf など他クライアントでは別の仕組みが必要）／
  hook プロセスが毎ターン埋め込みモデルをロード（async なので UI ブロックなしだが CPU/IO コストはあり）

**経路 3 — MCP を抜けて first-party API（Anthropic Messages API）に自分で繋ぐ**（アーキテクチャ変更）
- MCP クライアント（Claude Code 等）から外れて、`messages.create` の `tool_use` を自前のアプリで直接制御する
- 「LLM が呼ぼうが呼ぶまいが、コード側で毎ターン `save_memory` を確実に発火する」決定論的動作を組める
- 利点: コードが書いた通り動く／保存保証／どのモデル・どのクライアントとも独立
- 欠点: そのオーケストレーションアプリを書く労力

「**MCP 経由で LLM に丸投げする利便性**」と「**毎ターン確実に保存される保証**」は
トレードオフの両端で、片方を取ったらもう片方は捨てる構造です。本サーバは MCP プロトコル
が許す限りの説得材料を盛り込んでいますが、それ以上の保証はユーザ／クライアント実装者
の選択になります（Claude Code を使っているなら経路 2 が最小コスト）。

## ⚠️ ご利用にあたって

- **ノーサポート・ノークレーム**：本プロジェクトはサポートを提供していません。
  動作に関する問い合わせ・不具合報告・機能要望への対応は保証されません。
  すべて自己責任のもとでご利用ください。
- **自己責任**：本システムは AI が生成したコードで動作します。導入による
  データの変化や不具合については、製作者は責任を負いかねます。
- **バックアップ**：大切なプロジェクトで実行する前に、必ず現在の環境を
  バックアップしてください。

---

個人利用限定ライセンス — Copyright (C) 2026 NeuralNexusNote™ / ArnolfJp019
詳細は [LICENSE](./LICENSE) をご覧ください。
