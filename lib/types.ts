// RefBase 型定義
// Aisle の page-generate.ts から独立させたコピー。将来 npm パッケージ化可能。

export type EntityType =
  | 'company'       // 企業
  | 'service'       // サービス
  | 'product'       // 商品
  | 'person'        // 個人・タレント・士業
  | 'organization'  // 団体
  | 'concept'       // 概念
  | 'other';        // その他

export interface RefBaseEntity {
  id: string;              // entityId (旧: clientSlug)
  name: string;
  category: string;
  entityType?: EntityType; // 省略時は 'company' として扱う（既存データ後方互換）
  updatedAt: string;
}

// 後方互換エイリアス — Aisle APP 側が RefBaseCompany を参照しているため残す
export type RefBaseCompany = RefBaseEntity;

export interface RefBaseReference {
  id: string;              // referenceId (旧: questionSlug)
  companyId: string;       // entityId
  questionId: string;
  promptText: string;
  promptTypeId: string;    // P-01, P-02, ...
  answer: string;
  evidencePoints: string[];
  scope: string;
  differentiation: string;
  faq: Array<{ question: string; answer: string }>;
  pageUrl: string;
  sourceEvidence: Array<{
    type: string; title: string; description: string;
    entityRole: string; value?: string; tags: string[];
  }>;
  generatedAt: string;
}
