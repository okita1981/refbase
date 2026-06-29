import type { Metadata } from 'next';
import { kv } from '@vercel/kv';
import { getGlobalIndex, getEntity, getEntityIndex } from '@/lib/kv';
import type { EntityType } from '@/lib/types';
import { PID_LABELS, PID_COLORS } from '@/lib/pid-labels';

export const dynamic = 'force-dynamic';

interface ClusterItem {
  clusterId: string;
  slug: string;
  name: string;
  nameJa?: string;
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

const REFBASE_BASE = 'https://www.refbase.ai';
const DIRECTORY_URL = `${REFBASE_BASE}/directory`;

// Entity Type 表示順・設定
const ENTITY_TYPE_ORDER: EntityType[] = ['company', 'product', 'service', 'person', 'organization', 'concept', 'other'];

const ENTITY_TYPE_CONFIG: Record<string, { label: string; description: string; anchor: string }> = {
  company:      { label: 'Companies',     description: '企業・法人',            anchor: 'entities-company' },
  product:      { label: 'Products',      description: '商品・プロダクト',      anchor: 'entities-product' },
  service:      { label: 'Services',      description: 'サービス',              anchor: 'entities-service' },
  person:       { label: 'People',        description: '人物',                  anchor: 'entities-person' },
  organization: { label: 'Organizations', description: '団体・組織',            anchor: 'entities-organization' },
  concept:      { label: 'Concepts',      description: '概念・フレームワーク',   anchor: 'entities-concept' },
  other:        { label: 'Others',        description: 'その他',                anchor: 'entities-other' },
};

export const metadata: Metadata = {
  title: 'AI Knowledge Directory | RefBase',
  description: 'AI が頻繁に受け取る問いを Cluster として分類した Knowledge Index。Cluster（問いの領域）と Entity Type（対象の種類）の2軸で探索できる。',
  alternates: { canonical: DIRECTORY_URL },
  openGraph: {
    title: 'AI Knowledge Directory | RefBase',
    description: 'AI が頻繁に受け取る問いを Cluster として分類した AI Knowledge Index。',
    url: DIRECTORY_URL,
    images: [`${REFBASE_BASE}/og.png`],
  },
};

export default async function DirectoryPage() {
  // KV取得: ClusterRegistry + Entity全件（並行）
  const [registry, entityIds] = await Promise.all([
    kv.get<ClusterRegistry>('refbase:registry:clusters'),
    getGlobalIndex(),
  ]);

  const activeClusters = (registry?.items ?? []).filter(c => c.status === 'ACTIVE');

  // Entity本体 + Reference数を並行取得
  const entityResults = await Promise.all(
    entityIds.map(async (id) => {
      const [entity, index] = await Promise.all([getEntity(id), getEntityIndex(id)]);
      return entity ? { ...entity, refCount: index.length } : null;
    })
  );
  const validEntities = entityResults.filter((e): e is NonNullable<typeof entityResults[0]> => e !== null);

  // entityType 別グルーピング（存在するtypeのみ）
  const byType = new Map<string, typeof validEntities>();
  for (const entity of validEntities) {
    const type = entity.entityType ?? 'company';
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(entity);
  }
  const activeTypes = ENTITY_TYPE_ORDER.filter(t => byType.has(t));

  // JSON-LD: WebPage + Cluster ItemList + BreadcrumbList のみ（Entity ItemListは今回追加しない）
  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'AI Knowledge Directory',
    description: 'AI が頻繁に受け取る問いを Cluster として分類した AI Knowledge Index。',
    url: DIRECTORY_URL,
    isPartOf: { '@type': 'WebSite', name: 'RefBase', url: REFBASE_BASE },
  };

  const clusterItemListLd = activeClusters.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'RefBase — AI Knowledge Directory',
    description: 'AI が頻繁に受け取る問いを Cluster として分類した AI Knowledge Index。分野ごとに Entity / Reference を探索できる。',
    url: DIRECTORY_URL,
    numberOfItems: activeClusters.length,
    itemListElement: activeClusters.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${REFBASE_BASE}/cluster/${c.slug}`,
      name: c.name,
    })),
  } : null;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'RefBase', item: REFBASE_BASE },
      { '@type': 'ListItem', position: 2, name: 'AI Knowledge Directory', item: DIRECTORY_URL },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
      {clusterItemListLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(clusterItemListLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="max-w-2xl mx-auto px-4 py-8 text-gray-900">

        {/* breadcrumb */}
        <nav className="text-sm text-gray-400 mb-6">
          <a href="/" className="hover:underline">RefBase</a>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">AI Knowledge Directory</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-2xl font-semibold leading-snug mb-3">AI Knowledge Directory</h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
            2つの軸で探索できる Knowledge Index です。<br />
            <span className="font-medium text-gray-700">Browse by Cluster</span> — 問いの領域から探す。<br />
            <span className="font-medium text-gray-700">Browse by Entity Type</span> — 対象の種類から探す。
          </p>
          <p className="text-xs text-gray-400 mt-3">
            {activeClusters.length} clusters · {validEntities.length} entities
          </p>
        </header>

        {/* 将来の Search 用プレースホルダー */}
        {/* <div id="directory-controls" /> */}

        {/* ── Browse by Cluster ───────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Browse by Cluster
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed mb-5">
            AI が頻繁に受け取る問いを領域ごとに分類したインデックスです。
          </p>
          {activeClusters.length === 0 ? (
            <p className="text-sm text-gray-400">公開中の Cluster はありません。</p>
          ) : (
            <ul className="space-y-3">
              {activeClusters.map(c => (
                <li key={c.slug} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                  <a href={`/cluster/${c.slug}`} className="group block">
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-medium text-gray-800 group-hover:text-gray-600 leading-snug">
                            {c.name}
                          </p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${
                            c.maturity === 'established'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {c.maturity === 'established' ? 'Established' : 'Growing'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{c.description}</p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 text-[11px] font-medium border border-gray-100 shrink-0">
                        {c.entityCount} Entities
                      </span>
                    </div>
                    {c.representativeQuestions.slice(0, 2).map((q, i) => (
                      <p key={i} className="text-[11px] text-gray-400 leading-relaxed mt-1">
                        <span className="text-gray-300 mr-1">Q.</span>{q}
                      </p>
                    ))}
                    {c.primaryPromptTypes.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {c.primaryPromptTypes.map(pid => (
                          <span
                            key={pid}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold ${PID_COLORS[pid] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}
                          >
                            {pid}
                            {PID_LABELS[pid] && (
                              <span className="font-normal">{PID_LABELS[pid]}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-emerald-600 font-mono mt-2 break-all">
                      {REFBASE_BASE}/cluster/{c.slug}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Browse by Entity Type ────────────────────────────────── */}
        {activeTypes.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Browse by Entity Type
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed mb-5">
              対象の種類ごとに Entity を探索できます。
            </p>

            {/* Type サマリーカード */}
            <div className="grid grid-cols-2 gap-3 mb-10 sm:grid-cols-3">
              {activeTypes.map(type => {
                const cfg = ENTITY_TYPE_CONFIG[type];
                const entities = byType.get(type) ?? [];
                const previews = entities.slice(0, 3);
                return (
                  <a
                    key={type}
                    href={`#${cfg.anchor}`}
                    className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors block"
                  >
                    <p className="text-sm font-semibold text-gray-800 mb-0.5">{cfg.label}</p>
                    <p className="text-xs text-gray-400 mb-2">{cfg.description}</p>
                    <p className="text-[11px] text-gray-500 font-medium mb-1.5">{entities.length} entities</p>
                    <div className="space-y-0.5">
                      {previews.map(e => (
                        <p key={e.id} className="text-[11px] text-gray-400 truncate">{e.name}</p>
                      ))}
                      {entities.length > 3 && (
                        <p className="text-[11px] text-gray-300">+{entities.length - 3} more</p>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-600 mt-2">View entities →</p>
                  </a>
                );
              })}
            </div>

            {/* Entity Type別一覧セクション */}
            <div className="space-y-10">
              {activeTypes.map(type => {
                const cfg = ENTITY_TYPE_CONFIG[type];
                const entities = byType.get(type) ?? [];
                return (
                  <div key={type} id={cfg.anchor}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
                      {cfg.label} — {entities.length}件
                    </h3>
                    <ul className="space-y-2">
                      {entities.map(e => (
                        <li key={e.id} className="border border-gray-200 rounded-xl p-3 hover:border-gray-300 transition-colors">
                          <a href={`/entity/${e.id}`} className="group flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 group-hover:text-gray-600 leading-snug truncate">
                                {e.name}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{e.category}</p>
                            </div>
                            <span className="text-[11px] text-emerald-600 font-mono shrink-0">
                              {e.refCount} refs →
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* footer */}
        <footer className="text-xs text-gray-400 border-t border-gray-100 pt-6 mt-4">
          <p>
            <a href="/" className="hover:underline">RefBase</a>
            {' — '}
            AI Knowledge Infrastructure
          </p>
          <p className="mt-1 font-mono text-gray-300 break-all">{DIRECTORY_URL}</p>
        </footer>
      </div>
    </>
  );
}
