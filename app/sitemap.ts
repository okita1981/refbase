import type { MetadataRoute } from 'next';
import { getGlobalIndex, getEntity, getAllReferences } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const REFBASE_BASE = 'https://www.refbase.ai';

// 既存の自動集約関数（getGlobalIndex / getAllReferences）をそのまま使う。
// 新規Entity/Referenceは refbase:index:all / refbase:index:{entityId} に追加された瞬間、
// 次回アクセス時に自動でsitemapへ反映される（個別ページ追記は不要）。
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entityIds = await getGlobalIndex();

  const entries: MetadataRoute.Sitemap = [
    { url: `${REFBASE_BASE}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  ];

  await Promise.all(entityIds.map(async entityId => {
    const [entity, references] = await Promise.all([
      getEntity(entityId),
      getAllReferences(entityId),
    ]);
    if (!entity) return;

    entries.push({
      url: `${REFBASE_BASE}/entity/${entityId}`,
      lastModified: new Date(entity.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.8,
    });

    for (const ref of references) {
      entries.push({
        url: `${REFBASE_BASE}/reference/${entityId}/${ref.id}`,
        lastModified: new Date(ref.generatedAt),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }));

  return entries;
}
