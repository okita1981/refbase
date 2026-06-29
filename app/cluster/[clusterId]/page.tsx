import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { kv } from '@vercel/kv';
import { getEntity, getAllReferences, getEntityIndex } from '@/lib/kv';
import type { RefBaseEntity, RefBaseReference } from '@/lib/types';
import { PID_LABELS, PID_COLORS } from '@/lib/pid-labels';

export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════════════════════
// 型定義（api/cluster-registry と同一構造。src/ import 不可のため inline）
// ════════════════════════════════════════════════════════════════════════════

interface ClusterItem {
  clusterId: string;
  slug: string;
  name: string;
  nameJa?: string;
  description: string;
  entitySlugs: string[];
  entityCount: number;
  representativeQuestions: string[];
  primaryPromptTypes: string[];
  relatedClusters: string[];
  maturity: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ClusterRegistry {
  registryId: string;
  version: string;
  items: ClusterItem[];
}

type Props = { params: Promise<{ clusterId: string }> };

const REFBASE_BASE = 'https://www.refbase.ai';

// ── ユーティリティ ──────────────────────────────────────────────────────────

const pidClass = (pid: string) => PID_COLORS[pid] ?? 'bg-gray-50 text-gray-600 border-gray-200';

const MATURITY_LABELS: Record<string, string> = {
  established: 'Established',
  growing: 'Growing',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  company: 'Company', service: 'Service', product: 'Product',
  person: 'Person', organization: 'Organization', concept: 'Concept', other: 'Other',
};

// ── データ取得 ──────────────────────────────────────────────────────────────

async function getCluster(clusterId: string): Promise<ClusterItem | null> {
  const registry = await kv.get<ClusterRegistry>('refbase:registry:clusters');
  if (!registry?.items) return null;
  return registry.items.find(c => c.slug === clusterId && c.status !== 'DRAFT') ?? null;
}

// ════════════════════════════════════════════════════════════════════════════
// Metadata
// ════════════════════════════════════════════════════════════════════════════

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clusterId } = await params;
  const cluster = await getCluster(clusterId);
  if (!cluster) return { title: 'Not Found | RefBase' };

  const canonicalUrl = `${REFBASE_BASE}/cluster/${clusterId}`;
  const entityNames = cluster.entitySlugs.slice(0, 4).join(', ');
  const description = `${entityNames} など${cluster.name}に関するReferenceをまとめたClusterページです。生成AIが参照できる構造化知識を公開しています。`;

  return {
    title: `${cluster.name} | RefBase`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${cluster.name} | RefBase`,
      description,
      url: canonicalUrl,
      images: [`${REFBASE_BASE}/og.png`],
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════════════

export default async function ClusterPage({ params }: Props) {
  const { clusterId } = await params;
  const cluster = await getCluster(clusterId);
  if (!cluster) notFound();

  const clusterUrl = `${REFBASE_BASE}/cluster/${clusterId}`;

  // Entity + Index を並行取得
  const entityResults = await Promise.all(
    cluster.entitySlugs.map(async (slug) => {
      const [entity, index] = await Promise.all([
        getEntity(slug),
        getEntityIndex(slug),
      ]);
      return { slug, entity, index };
    }),
  );

  // 代表 Reference: 各 Entity の最初の 2件まで取得
  const representativeRefs: Array<{
    entitySlug: string;
    entityName: string;
    ref: RefBaseReference;
  }> = [];

  await Promise.all(
    entityResults.map(async ({ slug, entity, index }) => {
      if (!entity || index.length === 0) return;
      const refs = await getAllReferences(slug);
      const sliced = refs.slice(0, 2);
      for (const ref of sliced) {
        representativeRefs.push({ entitySlug: slug, entityName: entity.name, ref });
      }
    }),
  );

  // ── JSON-LD ──────────────────────────────────────────────────────────────

  const validEntities = entityResults.filter(
    (r): r is { slug: string; entity: RefBaseEntity; index: string[] } => !!r.entity,
  );

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${cluster.name} — Entity一覧`,
    description: cluster.description,
    url: clusterUrl,
    numberOfItems: validEntities.length,
    itemListElement: validEntities.map(({ slug, entity }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${REFBASE_BASE}/entity/${slug}`,
      name: entity.name,
    })),
  };

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${cluster.name} | RefBase`,
    description: cluster.description,
    url: clusterUrl,
    isPartOf: { '@type': 'WebSite', name: 'RefBase', url: REFBASE_BASE },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'RefBase', item: REFBASE_BASE },
      { '@type': 'ListItem', position: 2, name: cluster.name, item: clusterUrl },
    ],
  };

  // ── レンダリング ─────────────────────────────────────────────────────────

  const totalRefs = entityResults.reduce((n, r) => n + r.index.length, 0);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="max-w-2xl mx-auto px-4 py-8 text-gray-900">

        {/* breadcrumb */}
        <nav className="text-sm text-gray-400 mb-6">
          <a href="/" className="hover:underline">RefBase</a>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{cluster.name}</span>
        </nav>

        {/* Cluster ヘッダー */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
            <div>
              <h1 className="text-2xl font-semibold leading-snug mb-1">{cluster.name}</h1>
              {cluster.nameJa && cluster.nameJa !== cluster.name && (
                <p className="text-sm text-gray-400">{cluster.nameJa}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${
                cluster.maturity === 'established'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {MATURITY_LABELS[cluster.maturity] ?? cluster.maturity}
              </span>
              <span className="text-xs text-gray-400">{cluster.entityCount} Entities · {totalRefs} References</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{cluster.description}</p>
          <p className="mt-2 text-xs text-gray-300 font-mono break-all">{clusterUrl}</p>
        </header>

        {/* 代表的な問い */}
        {cluster.representativeQuestions.length > 0 && (
          <section className="mb-8 border border-gray-100 rounded-xl p-4 bg-gray-50">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              このClusterに集まる問い
            </h2>
            <ul className="space-y-2">
              {cluster.representativeQuestions.map((q, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-gray-300 shrink-0">Q.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
            {/* P-ID バッジ */}
            <div className="flex gap-1.5 flex-wrap mt-3 pt-3 border-t border-gray-100">
              {cluster.primaryPromptTypes.map(pid => (
                <span
                  key={pid}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-bold ${pidClass(pid)}`}
                >
                  {pid}
                  {PID_LABELS[pid] && (
                    <span className="font-normal text-[10px]">{PID_LABELS[pid]}</span>
                  )}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Entity 一覧 */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            所属 Entity — {cluster.entityCount}件
          </h2>
          <ul className="space-y-2">
            {entityResults.map(({ slug, entity, index }) => {
              const entityUrl = `${REFBASE_BASE}/entity/${slug}`;
              return (
                <li key={slug} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                  {entity ? (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <a href={entityUrl} className="text-sm font-medium text-gray-800 hover:text-gray-600">
                            {entity.name}
                          </a>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-gray-200 text-[10px] font-medium text-gray-400 font-mono">
                            {ENTITY_TYPE_LABELS[entity.entityType ?? 'company']}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{entity.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <a
                          href={entityUrl}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline font-mono"
                        >
                          {index.length} refs →
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 font-mono">{slug} <span className="text-xs">（未登録）</span></p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* 代表 Reference 一覧 */}
        {representativeRefs.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              代表 Reference
            </h2>
            <ul className="space-y-3">
              {representativeRefs.map(({ entitySlug, entityName, ref }) => {
                const refUrl = `${REFBASE_BASE}/reference/${entitySlug}/${ref.id}`;
                return (
                  <li key={`${entitySlug}-${ref.id}`} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-bold shrink-0 ${pidClass(ref.promptTypeId)}`}>
                        {ref.promptTypeId}
                      </span>
                      {PID_LABELS[ref.promptTypeId] && (
                        <span className="text-[11px] text-gray-400 mt-0.5">{PID_LABELS[ref.promptTypeId]}</span>
                      )}
                    </div>
                    <a
                      href={refUrl}
                      className="block text-sm font-medium text-gray-800 hover:text-gray-600 leading-snug mb-1.5"
                    >
                      {ref.promptText}
                    </a>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-gray-400">{entityName}</span>
                      <span className="text-[11px] text-gray-300">|</span>
                      <a href={refUrl} className="text-[11px] text-emerald-600 hover:underline font-mono break-all">
                        {refUrl}
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* 関連 Cluster */}
        {cluster.relatedClusters.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              関連 Cluster
            </h2>
            <div className="flex gap-2 flex-wrap">
              {cluster.relatedClusters.map(rel => (
                <a
                  key={rel}
                  href={`/cluster/${rel}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors"
                >
                  {rel}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* AI & API Access */}
        <section className="border border-gray-100 rounded-xl p-4 bg-gray-50 mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            AI &amp; API Access
          </h2>
          <ul className="space-y-2 text-xs text-gray-500">
            <li className="flex items-start gap-2">
              <span className="shrink-0 font-medium text-gray-600 w-32">Cluster Registry</span>
              <a href="/api/cluster-registry" className="font-mono text-blue-600 hover:underline break-all">
                /api/cluster-registry
              </a>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 font-medium text-gray-600 w-32">AI Index</span>
              <a href="/llms.txt" className="font-mono text-blue-600 hover:underline break-all">
                /llms.txt
              </a>
            </li>
          </ul>
        </section>

        {/* footer */}
        <footer className="text-xs text-gray-400 border-t border-gray-100 pt-6">
          <p>
            <a href="/" className="hover:underline">RefBase</a>
            {' — '}
            AI Reference Knowledge Base
          </p>
          <p className="mt-1 font-mono text-gray-300 break-all">{clusterUrl}</p>
        </footer>
      </div>
    </>
  );
}
