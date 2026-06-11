// RefBase 型定義
// Aisle の page-generate.ts から独立させたコピー。将来 npm パッケージ化可能。

export interface RefBaseCompany {
  id: string;        // entityId (旧: clientSlug)
  name: string;
  category: string;
  updatedAt: string;
}

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
  pageUrl: string;         // Aisle 側公開ページの URL
  sourceEvidence: Array<{
    type: string; title: string; description: string;
    entityRole: string; value?: string; tags: string[];
  }>;
  generatedAt: string;
}
