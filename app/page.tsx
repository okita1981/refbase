import type { Metadata } from 'next';
import { getGlobalIndex, getEntity, getEntityIndex } from '@/lib/kv';
import type { EntityType } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

export const metadata: Metadata = {
  title: 'RefBase — A reference layer for AI-generated answers.',
  description: '企業・サービスについて、AIが回答時に参照できる問い別の回答・根拠・FAQを構造化して公開する知識基盤です。',
  alternates: { canonical: REFBASE_BASE },
  openGraph: {
    title: 'RefBase — A reference layer for AI-generated answers.',
    description: '企業・サービスについて、AIが回答時に参照できる問い別の回答・根拠・FAQを構造化して公開する知識基盤です。',
    url: REFBASE_BASE,
  },
};

export default async function TopPage() {
  const entityIds = await getGlobalIndex();
  const entities = await Promise.all(
    entityIds.map(async id => {
      const [entity, index] = await Promise.all([getEntity(id), getEntityIndex(id)]);
      return entity ? { ...entity, refCount: index.length } : null;
    }),
  );
  const validEntities = entities.filter((e): e is NonNullable<typeof entities[0]> => e !== null);
  const totalRefs = validEntities.reduce((s, e) => s + e.refCount, 0);

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'RefBase',
    description: 'A reference layer for AI-generated answers. 企業・サービスについて、AIが回答時に参照できる問い別の回答・根拠・FAQを構造化して公開する知識基盤。',
    url: REFBASE_BASE,
  };

  const itemListLd = validEntities.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'RefBase — 公開中のEntity一覧',
    url: REFBASE_BASE,
    numberOfItems: validEntities.length,
    itemListElement: validEntities.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${REFBASE_BASE}/entity/${e.id}`,
      name: e.name,
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
      {itemListLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      )}

      <div className="max-w-2xl mx-auto px-4 py-12 text-gray-900">

        {/* ① Hero */}
        <header className="mb-14">
          <p className="text-xs font-mono text-gray-400 mb-3 tracking-widest uppercase">
            {REFBASE_BASE}
          </p>
          <h1 className="text-2xl font-semibold leading-snug mb-4">
            RefBase
          </h1>
          <p className="text-base font-medium text-gray-700 leading-snug mb-4">
            RefBase is a reference layer for AI-generated answers.
          </p>
          <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
            企業・サービスについて、AIが回答時に参照できる<br />
            問い別の回答・根拠・FAQを構造化して公開する知識基盤です。
          </p>
        </header>

        {/* ② 構造説明 */}
        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-5">
            Structure
          </h2>
          <div className="space-y-4">
            {/* Entity */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-bold text-gray-400 font-mono shrink-0 mt-0.5 w-20">Entity</span>
                <div>
                  <p className="text-sm font-medium text-gray-800 leading-snug">企業・サービス単位の親ページ</p>
                  <p className="text-xs text-gray-400 mt-1">
                    例: <span className="font-mono">/entity/aisle</span> — 株式会社Aisle に関するReferenceをまとめたハブ
                  </p>
                </div>
              </div>
            </div>
            {/* 矢印 */}
            <div className="pl-4 text-gray-300 text-sm select-none">└──</div>
            {/* Reference */}
            <div className="border border-gray-200 rounded-xl p-4 ml-6">
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-bold text-gray-400 font-mono shrink-0 mt-0.5 w-20">Reference</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 leading-snug">問い別の回答・根拠単位</p>
                  <p className="text-xs text-gray-400 mt-1 mb-3">
                    例: <span className="font-mono">/reference/aisle/recommendation-001</span>
                  </p>
                  <ul className="space-y-1">
                    {[
                      ['answer', 'AIが引用する本文回答'],
                      ['evidencePoints', '根拠・実績リスト'],
                      ['faq', '関連Q&A'],
                      ['sourceEvidence', '情報ソース'],
                    ].map(([field, desc]) => (
                      <li key={field} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-mono text-gray-400 w-28 shrink-0">{field}</span>
                        <span>{desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ③ AI & Machine Access */}
        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-5">
            AI &amp; Machine Access
          </h2>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                {[
                  {
                    label: 'llms.txt',
                    href: '/llms.txt',
                    path: '/llms.txt',
                    desc: '全Referenceのインデックス。AIクローラーが一括取得できる形式で公開。',
                  },
                  {
                    label: 'JSON-LD',
                    href: null,
                    path: null,
                    desc: '各ページに Organization / FAQPage / ItemList スキーマを埋め込み済み。',
                  },
                  {
                    label: 'Entity API',
                    href: '/api/entity/aisle',
                    path: '/api/entity/{entityId}',
                    desc: 'Entity情報をJSONで返す。RAG連携・ツール呼び出しに対応。',
                  },
                  {
                    label: 'Reference API',
                    href: '/api/reference/aisle',
                    path: '/api/reference/{entityId}',
                    desc: 'Reference一覧をJSONで返す。answer / evidencePoints / faq を含む。',
                  },
                ].map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-3 pl-4 pr-3 font-medium text-gray-700 w-28 align-top shrink-0">
                      {row.label}
                    </td>
                    <td className="py-3 pr-3 align-top">
                      {row.href ? (
                        <a href={row.href} className="font-mono text-blue-600 hover:underline break-all">
                          {row.path}
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">各ページに自動埋め込み</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-400 leading-relaxed align-top hidden sm:table-cell">
                      {row.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ④ Entities — 公開中のReference入口 */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Published Entities
            </h2>
            <span className="text-[11px] text-gray-400">
              {validEntities.length} entities · {totalRefs} references
            </span>
          </div>

          {validEntities.length === 0 ? (
            <p className="text-sm text-gray-400">公開中のEntityはありません。</p>
          ) : (
            <ul className="space-y-3">
              {validEntities.map(e => {
                const entityUrl = `${REFBASE_BASE}/entity/${e.id}`;
                return (
                  <li key={e.id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                    <a href={`/entity/${e.id}`} className="group block">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-800 group-hover:text-gray-600 leading-snug">
                              {e.name}
                            </p>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-gray-200 text-[10px] font-medium text-gray-400 font-mono">
                              {ENTITY_TYPE_LABELS[e.entityType ?? 'company']}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{e.category}</p>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-medium border border-emerald-100 shrink-0">
                          {e.refCount} References
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-600 font-mono mt-2 break-all">
                        {entityUrl}
                      </p>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-100 pt-6 text-xs text-gray-400 space-y-1">
          <p>RefBase — A reference layer for AI-generated answers.</p>
          <p className="font-mono text-gray-300 break-all">{REFBASE_BASE}</p>
        </footer>

      </div>
    </>
  );
}
