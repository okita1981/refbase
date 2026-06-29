import type { Metadata } from 'next';
import { kv } from '@vercel/kv';
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

export const metadata: Metadata = {
  title: 'AI Knowledge Directory | RefBase',
  description: 'AI が頻繁に受け取る問いを Cluster として分類した AI Knowledge Index。分野ごとに Entity / Reference を探索できる。',
  alternates: { canonical: DIRECTORY_URL },
  openGraph: {
    title: 'AI Knowledge Directory | RefBase',
    description: 'AI が頻繁に受け取る問いを Cluster として分類した AI Knowledge Index。',
    url: DIRECTORY_URL,
    images: [`${REFBASE_BASE}/og.png`],
  },
};

export default async function DirectoryPage() {
  const registry = await kv.get<ClusterRegistry>('refbase:registry:clusters');
  const activeClusters = (registry?.items ?? []).filter(c => c.status === 'ACTIVE');

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'AI Knowledge Directory',
    description: 'AI が頻繁に受け取る問いを Cluster として分類した AI Knowledge Index。',
    url: DIRECTORY_URL,
    isPartOf: { '@type': 'WebSite', name: 'RefBase', url: REFBASE_BASE },
  };

  const itemListLd = activeClusters.length > 0 ? {
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
      {itemListLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
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
        <header className="mb-8">
          <h1 className="text-2xl font-semibold leading-snug mb-3">AI Knowledge Directory</h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
            AI が頻繁に受け取る問いを Cluster として分類した Knowledge Index です。<br />
            分野ごとに Entity・Reference を探索できます。
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {activeClusters.length} clusters
          </p>
        </header>

        {/* 将来の Search / Filter / Sort 用プレースホルダー */}
        {/* <div id="directory-controls" /> */}

        {/* Cluster 一覧 */}
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

        {/* footer */}
        <footer className="text-xs text-gray-400 border-t border-gray-100 pt-6 mt-10">
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
