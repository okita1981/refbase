# CLAUDE.md — RefBase 実装ガイダンス

最終更新: 2026-06-11
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
│   └── llms.txt/route.ts                           # /llms.txt
├── lib/
│   ├── kv.ts       # KV抽象化レイヤー
│   └── types.ts    # RefBaseCompany / RefBaseReference 型定義
└── next.config.ts
```

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
  sourceEvidence: EvidenceItem[];
  generatedAt: string;
}
```

---

## 6. KV 移行ロードマップ

| Phase | ステータス | 内容 |
|-------|------------|------|
| Phase 1 | ✅ 完了 | Aisle KV 共有で動作確認。refbase.ai 公開 |
| Phase 2 | ⬜ 未着手 | RefBase 専用 Vercel KV 作成 |
| Phase 3 | ⬜ 未着手 | REFBASE_STANDALONE=true で切り替え |
| Phase 4 | ⬜ 未着手 | Aisle 側の refbase:* キー廃止 |

---

## 7. ガードレール

- Aisle 側でのみデータを書き込む（RefBase は読み取り専用プロジェクト）
- SSR を維持する（`export const dynamic = 'force-dynamic'` または `revalidate` 設定）
- JSON-LD は必ず出力する（FAQPage + Organization / hasPart）
- ビルドは常に `next build --webpack`（ARM64 Windows 対応）
- BOM なし UTF-8 でファイルを保存する（PowerShell Set-Content は BOM 付きになるため Write ツールを使う）
