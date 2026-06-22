# CLAUDE.md — RefBase 実装ガイダンス

最終更新: 2026-06-22
本番URL: https://www.refbase.ai
リポジトリ: C:\Users\kousu\refbase
GitHub: okita1981/refbase

---

## 0. RefBase とは

RefBase は「AI が企業・サービスを正確に回答するための、構造化された参照知識基盤」。

- Aisle で生成した問い別回答・Evidence・参照情報を格納し、AI が参照しやすい形で公開する
- 成功指標：AI が回答時に RefBase のページを参照・引用すること
- SSR 必須：AI は HTML を読む。Next.js App Router で全ページ SSR 出力

---

## 1. 技術スタック

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js 16 App Router + TypeScript + Tailwind CSS |
| 永続化 | Vercel KV（@vercel/kv）— 現状 Aisle KV 共有 |
| ホスト | Vercel（www.refbase.ai） |
| ビルド | `next build --webpack`（ARM64 Windows でのターボパック回避） |

---

## 2. KV キー体系

現状 `REFBASE_STANDALONE=false`（Aisle KV 共有モード）：

| KVキー | 内容 |
|--------|------|
| `refbase:company:{entityId}` | RefBaseCompany（name / category / updatedAt） |
| `refbase:ref:{entityId}/{referenceId}` | RefBaseReference（answer / evidencePoints 等） |
| `refbase:index:{entityId}` | string[] — エンティティ別 referenceId 一覧 |
| `refbase:index:all` | string[] — 全 entityId 一覧 |

`REFBASE_STANDALONE=true` に切り替えると `entity:` / `ref:` / `index:` プレフィックスに移行（lib/kv.ts で制御）。

---

## 3. ディレクトリ構造

```
refbase/
├── app/
│   ├── page.tsx                                    # / トップ（全エンティティ一覧）
│   ├── entity/[entityId]/page.tsx                  # Entity Hub
│   ├── reference/[entityId]/[referenceId]/
│   │   └── page.tsx                                # Referenceページ（最重要）
│   ├── api/
│   │   ├── entity/[entityId]/route.ts              # GET /api/entity/{entityId}
│   │   ├── reference/[entityId]/route.ts           # GET /api/reference/{entityId}
│   │   └── reference/[entityId]/[referenceId]/route.ts
│   ├── llms.txt/route.ts                           # /llms.txt（getGlobalIndex()から自動生成）
│   ├── sitemap.ts                                  # /sitemap.xml（Next.js規約・自動生成、要force-dynamic）
│   ├── robots.ts                                   # /robots.txt（Next.js規約・全UA許可）
│   └── manifest.ts                                 # /manifest.webmanifest（Next.js規約）
├── lib/
│   ├── kv.ts       # KV抽象化レイヤー
│   └── types.ts    # RefBaseCompany / RefBaseReference 型定義
└── next.config.ts
```

### Discovery層（2026-06-22 追加）

新規Entity/Referenceは `getGlobalIndex()` / `getAllReferences()` を起点に自動集約される設計。sitemap.ts/llms.txtは**手動更新不要**、KVに保存された瞬間に次回アクセスで反映される。

- `sitemap.ts` は `export const dynamic = 'force-dynamic'` 必須（無いとビルド時プリレンダリングでKV未接続エラーになる）
- `llms.txt` のURLは `https://www.refbase.ai` に統一済み（旧 `https://refbase.ai`（wwwなし）は廃止）

---

## 4. URL 構造

| URL | 説明 |
|-----|------|
| `/` | トップ：エンティティ一覧・統計 |
| `/entity/{entityId}` | Entity Hub：Reference 一覧 |
| `/reference/{entityId}/{referenceId}` | Reference 詳細（JSON-LD: FAQPage + Organization） |
| `/api/entity/{entityId}` | Entity JSON API |
| `/api/reference/{entityId}/{referenceId}` | Reference JSON API |
| `/llms.txt` | AI 向けインデックス |
| `/sitemap.xml` | 全Entity/Reference URL（自動集約） |
| `/robots.txt` | 全UA許可 + sitemap参照 |
| `/manifest.webmanifest` | PWAマニフェスト |

---

## 5. RefBaseReference 型（主要フィールド）

```typescript
interface RefBaseReference {
  id: string;               // referenceId
  companyId: string;        // entityId
  promptText: string;       // 問いの全文
  promptTypeId: string;     // P-01〜P-06
  answer: string;           // 統合回答文（AI引用を想定した自己完結型）
  evidencePoints: string[]; // 根拠箇条書き
  scope: string;            // 向いている相談・文脈
  differentiation: string;  // 他の選択肢との違い
  faq: { question: string; answer: string }[];
  pageUrl: string;          // Aisle側公開ページURL
  sourceEvidence: EvidenceItem[];  // sourceUrl?/sourceType?対応済み（2026-06-22）。あればReferenceページで外部リンク表示
  generatedAt: string;
}
```

JSON-LD（`FAQPage`）の`mainEntity`は**先頭にページの主問い（promptText→answer）を含む**（2026-06-22修正。以前は補助FAQのみでページの中心内容が構造化データから漏れていた）。

---

## 6. KV 移行ロードマップ

| Phase | ステータス | 内容 |
|-------|------------|------|
| Phase 1 | ✅ 完了 | Aisle KV 共有で動作確認。refbase.ai 公開 |
| Phase 2 | ⬜ 未着手 | RefBase 専用 Vercel KV 作成 |
| Phase 3 | ⬜ 未着手 | REFBASE_STANDALONE=true で切り替え |
| Phase 4 | ⬜ 未着手 | Aisle 側の refbase:* キー廃止 |

---

## 7. AI Crawlability 改善ロードマップ（2026-06-22〜）

ユーザー方針：「AIに選ばれる品質」最優先。技術的負債解消そのものが目的ではない。

| Phase | 内容 | ステータス |
|-------|------|------------|
| Phase 1 | Google Search Console登録・sitemap送信・URL Inspection・Bing Webmaster登録 | ⬜ 次回着手（Aisle→RefBaseリンク強化やnote等の外部リンク施策は**やらない方針**。RefBaseはAisleと独立したReference Baseとして育てる） |
| Phase 2 | Emergence Monitorに「AI Crawl Log」機能追加（GPTBot/ClaudeBot/PerplexityBot/Google-Extended等のアクセス記録、URL別クロール履歴、AI Contactとの比較表示、Emergence Timeline） | ⬜ 未着手（emergence-monitor側の作業） |
| Phase 3 | RefBase棚卸し（Discovery/Structure/JSON-LD/Evidence/Prompt/Reference品質を体系的に整理） | ⬜ 未着手 |
| Phase 4 | Aisle Studio棚卸し（Reference生成品質/Evidence品質/Prompt品質/レポート品質） | ⬜ 未着手 |

### 既知の知見（2026-06-22調査）

- Discovery層（llms.txt/sitemap/robots/canonical/JSON-LD/entity内部リンク/API）は実装済みで技術的問題なし（`recommendation-002`/`003`/`citation-001`で全項目確認済み）
- それでもPerplexity等のAI検索に拾われない場合の主因候補：①ドメイン自体が新しい（refbase.ai登録から日が浅い）②コンテンツ自体の引用強度（例：`citation-001`はP-05出典限定モードで「第三者出典は限定的」と自己申告しており、技術的に読めても引用候補として選ばれにくい構造）
- 日本語データをコンソールに直接printすると、Windows環境のコンソール（cp932）でU+FFFDのような文字化け表示になることがある。**実データ確認は必ずファイル書き出し経由で行うこと**（過去に誤って「JSON-LD文字化け」と誤報告した実例あり）

---

## 8. ガードレール

- Aisle 側でのみデータを書き込む（RefBase は読み取り専用プロジェクト）
- SSR を維持する（`export const dynamic = 'force-dynamic'` または `revalidate` 設定）
- JSON-LD は必ず出力する（FAQPage + Organization / hasPart）
- ビルドは常に `next build --webpack`（ARM64 Windows 対応）
- BOM なし UTF-8 でファイルを保存する（PowerShell Set-Content は BOM 付きになるため Write ツールを使う）
