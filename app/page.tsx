import type { Metadata } from 'next';
import { kv } from '@vercel/kv';
import { getGlobalIndex, getEntity, getEntityIndex } from '@/lib/kv';
import type { EntityType } from '@/lib/types';
import { PID_LABELS, PID_COLORS } from '@/lib/pid-labels';

interface ClusterItem {
  clusterId: string;
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
  title: 'RefBase | AIのための知識基盤',
  description: 'RefBaseは、企業・サービスに関する問い別の回答と根拠情報を構造化して公開する、AIのための参照知識基盤（Reference Base）です。AIが理解・引用しやすい情報を提供します。',
  alternates: { canonical: REFBASE_BASE },
  openGraph: {
    title: 'RefBase | AIのための知識基盤',
    description: 'RefBaseは、企業・サービスに関する問い別の回答と根拠情報を構造化して公開する、AIのための参照知識基盤（Reference Base）です。AIが理解・引用しやすい情報を提供します。',
    url: REFBASE_BASE,
    images: ['https://www.refbase.ai/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RefBase | AIのための知識基盤',
    description: 'RefBaseは、企業・サービスに関する問い別の回答と根拠情報を構造化して公開する、AIのための参照知識基盤（Reference Base）です。AIが理解・引用しやすい情報を提供します。',
  },
};

export default async function TopPage() {
  const [entityIds, clusterRegistry] = await Promise.all([
    getGlobalIndex(),
    kv.get<ClusterRegistry>('refbase:registry:clusters'),
  ]);

  const activeClusters = (clusterRegistry?.items ?? []).filter(c => c.status === 'ACTIVE');

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
    description: 'RefBaseは、企業・サービスに関する問い別の回答と根拠情報を構造化して公開する、AIのための参照知識基盤（Reference Base）です。',
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

  const clusterListLd = activeClusters.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'RefBase — Question Cluster一覧',
    description: '問いの種類でまとめた分野別インデックス。AI回答に頻出する問いパターンを Cluster として整理しています。',
    url: `${REFBASE_BASE}/#clusters`,
    numberOfItems: activeClusters.length,
    itemListElement: activeClusters.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${REFBASE_BASE}/cluster/${c.slug}`,
      name: c.name,
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
      {itemListLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      )}
      {clusterListLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(clusterListLd) }} />
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

        {/* ② Why RefBase */}
        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-6">
            Why RefBase
          </h2>
          <div className="space-y-0 divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {[
              {
                label: 'Traditional websites',
                sub:   'Designed for human readers',
                note:  'ナビゲーション・ブランド・デザインが前提。AIには構造が見えにくい。',
                muted: true,
              },
              {
                label: 'Search engines',
                sub:   'Designed to rank documents',
                note:  'キーワード密度・被リンク・ページ権威が評価軸。AI回答の引用単位とは異なる。',
                muted: true,
              },
              {
                label: 'RefBase',
                sub:   'Designed as a reference layer for AI-generated answers',
                note:  '問い別の回答・根拠・FAQをAIが取得・引用・統合しやすい単位で構造化する。',
                muted: false,
              },
            ].map(row => (
              <div
                key={row.label}
                className={`px-5 py-4 ${row.muted ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="flex items-baseline gap-3 flex-wrap mb-1">
                  <span className={`text-sm font-medium ${row.muted ? 'text-gray-400' : 'text-gray-800'}`}>
                    {row.label}
                  </span>
                  <span className={`text-xs ${row.muted ? 'text-gray-300' : 'text-gray-500'}`}>
                    — {row.sub}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${row.muted ? 'text-gray-300' : 'text-gray-500'}`}>
                  {row.note}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mt-4 max-w-lg">
            生成AIはページ全体を読むのではなく、問いに対する回答・根拠・FAQ・比較軸などを統合して回答を生成します。
            RefBaseは企業紹介サイトではなく、AIが取得・引用・統合しやすい単位で情報を構造化するための知識レイヤーです。
          </p>
        </section>

        {/* ③ 構造説明 */}
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
                  {
                    label: 'Cluster API',
                    href: '/api/cluster-registry',
                    path: '/api/cluster-registry',
                    desc: 'Cluster一覧をJSONで返す。entitySlugs / maturity / representativeQuestions を含む。',
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

        {/* ④ Clusters — Question Cluster入口 */}
        {activeClusters.length > 0 && (
          <section id="clusters" className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Question Clusters
              </h2>
              <span className="text-[11px] text-gray-400">
                {activeClusters.length} clusters
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-5">
              問いの種類でまとめた分野別インデックスです。AIが頻繁に受け取る問いパターンを Cluster として整理しています。
            </p>
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
          </section>
        )}

        {/* ⑤ Entities — 公開中のReference入口 */}
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
