import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getEntity, getAllReferences } from '@/lib/kv';
import type { EntityType } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ entityId: string }> };

const REFBASE_BASE = 'https://www.refbase.ai';

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  company:      'Company',
  service:      'Service',
  product:      'Product',
  person:       'Person',
  organization: 'Organization',
  concept:      'Concept',
  other:        'Other',
};

const PID_COLORS: Record<string, string> = {
  'P-01': 'bg-violet-50 text-violet-700 border-violet-200',
  'P-02': 'bg-blue-50 text-blue-700 border-blue-200',
  'P-03': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'P-04': 'bg-amber-50 text-amber-700 border-amber-200',
  'P-05': 'bg-green-50 text-green-700 border-green-200',
  'P-06': 'bg-rose-50 text-rose-700 border-rose-200',
};
const pidClass = (pid: string) =>
  PID_COLORS[pid] ?? 'bg-gray-50 text-gray-600 border-gray-200';

const PID_LABELS: Record<string, string> = {
  'P-01': '選定・相談',
  'P-02': '比較・評価',
  'P-03': 'ランキング',
  'P-04': '課題解決',
  'P-05': '出典引用',
  'P-06': '推薦深掘り',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entityId } = await params;
  const entity = await getEntity(entityId);
  if (!entity) return { title: 'Not Found | RefBase' };
  const canonicalUrl = `${REFBASE_BASE}/entity/${entityId}`;
  return {
    title: `${entity.name} — AI参照知識Hub | RefBase`,
    description: `${entity.name}（${entity.category}）に関するAI参照Referenceのインデックスです。生成AIが問いに答える際に参照できる構造化知識を公開しています。`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${entity.name} | RefBase`,
      description: `${entity.name}のAI参照Reference一覧`,
      url: canonicalUrl,
    },
  };
}

export default async function EntityPage({ params }: Props) {
  const { entityId } = await params;
  const [entity, references] = await Promise.all([
    getEntity(entityId),
    getAllReferences(entityId),
  ]);
  if (!entity) notFound();

  const entityUrl = `${REFBASE_BASE}/entity/${entityId}`;

  // ── JSON-LD ──────────────────────────────────────────────────
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: entity.name,
    description: entity.category,
    url: entityUrl,
    identifier: entityId,
  };

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${entity.name} — AI参照Referenceインデックス`,
    description: `${entity.name}に関する問い別AI参照Referenceの一覧。生成AIが各問いに答える際に参照できる構造化知識。`,
    url: entityUrl,
    numberOfItems: references.length,
    itemListElement: references.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${REFBASE_BASE}/reference/${entityId}/${r.id}`,
      name: r.promptText,
    })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'RefBase', item: REFBASE_BASE },
      { '@type': 'ListItem', position: 2, name: entity.name, item: entityUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="max-w-2xl mx-auto px-4 py-8 text-gray-900">

        {/* breadcrumb */}
        <nav className="text-sm text-gray-400 mb-6">
          <a href="/" className="hover:underline">RefBase</a>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{entity.name}</span>
        </nav>

        {/* Entity ヘッダー */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-semibold leading-snug">{entity.name}</h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-gray-200 text-[10px] font-medium text-gray-400 font-mono">
                  {ENTITY_TYPE_LABELS[entity.entityType ?? 'company']}
                </span>
              </div>
              <p className="text-sm text-gray-500">{entity.category}</p>
            </div>
            <div className="text-right text-xs text-gray-400 shrink-0">
              <p>最終更新: {entity.updatedAt.slice(0, 10)}</p>
              <p className="mt-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                  {references.length} References
                </span>
              </p>
            </div>
          </div>
          {/* Entity URL */}
          <p className="mt-3 text-xs text-gray-400 font-mono break-all">
            {entityUrl}
          </p>
        </header>

        {/* Reference 一覧 */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            References — 問い別AI参照ページ
          </h2>

          {references.length === 0 ? (
            <p className="text-sm text-gray-400">登録されているReferenceはありません。</p>
          ) : (
            <ul className="space-y-3">
              {references.map((r, i) => {
                const refUrl = `${REFBASE_BASE}/reference/${entityId}/${r.id}`;
                return (
                  <li key={r.id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* 連番 */}
                      <span className="text-xs font-bold text-gray-300 shrink-0 mt-0.5 w-4 text-right">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {/* P-ID バッジ */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-bold ${pidClass(r.promptTypeId)}`}>
                            {r.promptTypeId}
                          </span>
                          {PID_LABELS[r.promptTypeId] && (
                            <span className="text-[11px] text-gray-400">{PID_LABELS[r.promptTypeId]}</span>
                          )}
                        </div>
                        {/* 問い文 */}
                        <a
                          href={refUrl}
                          className="block text-sm font-medium text-gray-800 hover:text-gray-600 leading-snug mb-2"
                        >
                          {r.promptText}
                        </a>
                        {/* Reference URL + メタ情報 */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <a
                            href={refUrl}
                            className="text-[11px] text-emerald-600 font-mono hover:underline break-all"
                          >
                            {refUrl}
                          </a>
                          <span className="text-[11px] text-gray-300">|</span>
                          <span className="text-[11px] text-gray-400">{r.id}</span>
                          <span className="text-[11px] text-gray-300">|</span>
                          <span className="text-[11px] text-gray-400">{r.generatedAt.slice(0, 10)}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* AI / API 導線 */}
        <section className="border border-gray-100 rounded-xl p-4 bg-gray-50 mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            AI &amp; API Access
          </h2>
          <ul className="space-y-2 text-xs text-gray-500">
            <li className="flex items-start gap-2">
              <span className="shrink-0 font-medium text-gray-600 w-28">Entity JSON</span>
              <a href={`/api/entity/${entityId}`} className="font-mono text-blue-600 hover:underline break-all">
                /api/entity/{entityId}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 font-medium text-gray-600 w-28">References JSON</span>
              <a href={`/api/reference/${entityId}`} className="font-mono text-blue-600 hover:underline break-all">
                /api/reference/{entityId}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 font-medium text-gray-600 w-28">AI Index</span>
              <a href="/llms.txt" className="font-mono text-blue-600 hover:underline break-all">
                /llms.txt
              </a>
            </li>
          </ul>
          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            各APIエンドポイントはJSON形式でデータを返します。生成AIのツール呼び出し・RAG連携での利用を想定しています。
          </p>
        </section>

        {/* footer */}
        <footer className="text-xs text-gray-400 border-t border-gray-100 pt-6">
          <p>
            <a href="/" className="hover:underline">RefBase</a>
            {' — '}
            AI Reference Knowledge Base
          </p>
          <p className="mt-1 font-mono text-gray-300 break-all">{entityUrl}</p>
        </footer>
      </div>
    </>
  );
}
