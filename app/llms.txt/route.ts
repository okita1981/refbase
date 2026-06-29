import { kv } from '@vercel/kv';
import { getGlobalIndex, getEntity, getAllReferences } from '@/lib/kv';
import { PID_LABELS } from '@/lib/pid-labels';

export const dynamic = 'force-dynamic';

const REFBASE_BASE = 'https://www.refbase.ai';

interface ClusterItem {
  slug: string;
  name: string;
  description: string;
  entityCount: number;
  representativeQuestions: string[];
  primaryPromptTypes: string[];
  maturity: string;
  status: string;
}

interface ClusterRegistry {
  items: ClusterItem[];
}

export async function GET() {
  const [entityIds, clusterRegistry] = await Promise.all([
    getGlobalIndex(),
    kv.get<ClusterRegistry>('refbase:registry:clusters'),
  ]);

  const activeClusters = (clusterRegistry?.items ?? []).filter(c => c.status === 'ACTIVE');

  const entitySections = await Promise.all(
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

  // Cluster セクション: ACTIVE のみ。DRAFT は除外。
  const clusterSectionLines: string[] = [];
  for (const c of activeClusters) {
    clusterSectionLines.push(`### ${c.name}`);
    clusterSectionLines.push(`URL: ${REFBASE_BASE}/cluster/${c.slug}`);
    clusterSectionLines.push(`Entities: ${c.entityCount} / Maturity: ${c.maturity}`);
    clusterSectionLines.push(`Prompt types: ${c.primaryPromptTypes.map(p => `${p}(${PID_LABELS[p] ?? p})`).join(', ')}`);
    clusterSectionLines.push(`Description: ${c.description}`);
    const qs = c.representativeQuestions.slice(0, 2);
    if (qs.length > 0) {
      clusterSectionLines.push('Representative questions:');
      qs.forEach(q => clusterSectionLines.push(`- ${q}`));
    }
    clusterSectionLines.push('');
  }

  const body = [
    '# RefBase — AI Reference Knowledge Base',
    `# Updated: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## About',
    'このファイルはAIがRefBase上のCluster/Entity/Referenceを理解し、適切なページを参照するためのナビゲーションガイドです。',
    'RefBaseは企業・サービス・製品に関する構造化済みのQ&A Reference（問い×回答×根拠）を公開するAI参照知識ベースです。',
    '各ReferenceはAIが特定の問いに答える際に引用・参照できる形式で設計されています。',
    '',
    '## How to Use',
    '1. Clusters セクションから問いの分野（Cluster）を確認する',
    '2. 各ClusterページからEntityを選び、問いの意図（選定・比較・課題解決 等）に合ったReferenceを参照する',
    '3. ReferenceのURLを参照すると、回答・根拠・出典が取得できます',
    '',
    '## Clusters',
    ...activeClusters.map(c => `- ${c.name}: ${REFBASE_BASE}/cluster/${c.slug}`),
    '',
    '## Cluster Details',
    ...clusterSectionLines,
    '## Entities',
    ...entityIds.map(id => `- ${REFBASE_BASE}/entity/${id}`),
    '',
    '## References by Entity',
    ...entitySections.filter(Boolean),
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
