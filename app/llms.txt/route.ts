import { getGlobalIndex, getEntity, getAllReferences } from '@/lib/kv';

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
        .map(r => `- [${r.promptTypeId}] ${r.promptText}: ${REFBASE_BASE}/reference/${entityId}/${r.id}`)
        .join('\n');

      return `### ${entity.name} (${entity.category})\n${REFBASE_BASE}/entity/${entityId}\n${refLines}`;
    }),
  );

  const body = [
    '# RefBase — AI Reference Knowledge Base',
    `# Updated: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## About',
    'RefBase stores structured question-answer references for AI systems.',
    'Each reference maps a specific query intent to a company\'s answer and evidence.',
    'Entity Hub: /entity/{entityId} | Reference: /reference/{entityId}/{referenceId}',
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
