import type { MetadataRoute } from 'next';
import { kv } from '@vercel/kv';
import { getGlobalIndex, getEntity, getAllReferences } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const REFBASE_BASE = 'https://www.refbase.ai';

// P-ID別 Reference priority（AI回答で引用・推薦に使われやすい順）
const REF_PRIORITY: Record<string, number> = {
  'P-06': 0.85,
  'P-02': 0.80,
  'P-05': 0.75,
  'P-03': 0.70,
  'P-01': 0.65,
  'P-04': 0.60,
};

interface ClusterItem {
  slug: string;
  maturity: string;
  status: string;
  updatedAt: string;
}

interface ClusterRegistry {
  items: ClusterItem[];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [entityIds, clusterRegistry] = await Promise.all([
    getGlobalIndex(),
    kv.get<ClusterRegistry>('refbase:registry:clusters'),
  ]);

  const activeClusters = (clusterRegistry?.items ?? []).filter(c => c.status === 'ACTIVE');

  const entries: MetadataRoute.Sitemap = [
    { url: `${REFBASE_BASE}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  ];

  // Cluster URL: ACTIVE のみ。Established 0.85 / Growing 0.75
  for (const c of activeClusters) {
    entries.push({
      url: `${REFBASE_BASE}/cluster/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: c.maturity === 'established' ? 0.85 : 0.75,
    });
  }

  // Entity + Reference
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
        priority: REF_PRIORITY[ref.promptTypeId] ?? 0.60,
      });
    }
  }));

  return entries;
}
