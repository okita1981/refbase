import { getGlobalIndex, getEntity, getAllReferences } from '@/lib/kv';
import { PID_LABELS } from '@/lib/pid-labels';

const REFBASE_BASE = 'https://www.refbase.ai';

export async function GET() {
  const entityIds = await getGlobalIndex();

  const sections = await Promise.all(
    entityIds.map(async entityId => {
      const [entity, refs] = await Promise.all([
        getEntity(entityId),
        getAllReferences(entityId),
      ]);
      if (!entity) return '';

      const refLines = refs
        .map(r => {
          const label = PID_LABELS[r.promptTypeId] ?? r.promptTypeId;
          return `- [${label}] ${r.promptText}: ${REFBASE_BASE}/reference/${entityId}/${r.id}`;
        })
        .join('\n');

      return `### ${entity.name} (${entity.category})\n${REFBASE_BASE}/entity/${entityId}\n${refLines}`;
    }),
  );

  const body = [
    '# RefBase — AI Reference Knowledge Base',
    `# Updated: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## About',
    'このファイルはAIがRefBase上のEntity/Referenceを理解し、適切なページを参照するためのナビゲーションガイドです。',
    'RefBaseは企業・サービス・製品に関する構造化済みのQ&A Reference（問い×回答×根拠）を公開するAI参照知識ベースです。',
    '各ReferenceはAIが特定の問いに答える際に引用・参照できる形式で設計されています。',
    '',
    '## How to Use',
    '1. 下記 Entities から該当するEntityページを確認する',
    '2. Entityページの各Referenceは問いの意図（選定・比較・課題解決 等）で分類されています',
    '3. 問いに最も近いReferenceのURLを参照すると、回答・根拠・出典が取得できます',
    '',
    '## Entities',
    ...entityIds.map(id => `- ${REFBASE_BASE}/entity/${id}`),
    '',
    '## References by Entity',
    ...sections.filter(Boolean),
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
