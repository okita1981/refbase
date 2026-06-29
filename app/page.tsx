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
  title: 'RefBase — AI Knowledge Infrastructure',
  description: '企業・サービス・商品に関する知識を、AIが理解・比較・推論・推薦できる形へ構造化する基盤。Question → Cluster → Entity → Reference → Evidence の構造で、AI の回答に自然に出現できる状態をつくる。',
  alternates: { canonical: REFBASE_BASE },
  openGraph: {
    title: 'RefBase — AI Knowledge Infrastructure',
    description: '企業・サービス・商品に関する知識を、AIが理解・比較・推論・推薦できる形へ構造化する基盤。',
    url: REFBASE_BASE,
    images: ['https://www.refbase.ai/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RefBase — AI Knowledge Infrastructure',
    description: '企業・サービス・商品に関する知識を、AIが理解・比較・推論・推薦できる形へ構造化する基盤。',
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
    description: '企業・サービス・商品に関する知識を、AIが理解・比較・推論・推薦できる形へ構造化するAI Knowledge Infrastructure。',
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
    name: 'RefBase — AI Knowledge Directory',
    description: '問いのパターンで整理した AI Knowledge Index。分野ごとに Entity / Reference を探索できる Cluster の一覧。',
    url: `${REFBASE_BASE}/#knowledge-directory`,
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
          <p className="text-base font-medium text-gray-700 leading-snug mb-3">
            RefBase is an AI Knowledge Infrastructure.
          </p>
          <p className="text-sm text-gray-500 leading-relaxed max-w-lg mb-5">
            企業・サービス・商品に関する知識を、<br />
            AI が理解・比較・推論・推薦できる形へ構造化する基盤。
          </p>
          <a href="#knowledge-directory" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
            Explore AI Knowledge Directory →
          </a>
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
                sub:   'Designed as an AI Knowledge Infrastructure',
                note:  '企業・サービス・商品の知識を、AI が理解・比較・推論・推薦できる形へ構造化する。引用は手段。目的は AI の回答に自然に出現すること。',
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
            引用は手段。目的は、AI が企業・サービス・商品を正しく理解し、回答の中で自然に出現できる状態をつくること。<br />
            RefBase は Question を起点に知識を構造化する。Question → Cluster → Entity → Reference → Evidence の5層で、AI が理解・比較・推論・推薦できる単位に整える。
          </p>
        </section>

        {/* ③ 構造説明 */}
        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-5">
            Structure
          </h2>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {[
              {
                type: 'Question',
                label: 'AI への問い — 知識の起点',
                note: '「このツールとあのツールはどう違うか？」のような問いのパターンを単位に知識を構造化する。',
                example: null,
              },
              {
                type: 'Cluster',
                label: '知識の分野 — AI Knowledge Directory の分類単位',
                note: null,
                example: '/cluster/ai-assistant',
              },
              {
                type: 'Entity',
                label: '企業・サービス・商品・人物',
                note: null,
                example: '/entity/chatgpt',
              },
              {
                type: 'Reference',
                label: '問い別の知識単位 — AI が引用する回答',
                note: 'answer / evidencePoints / faq / sourceEvidence の4フィールドで構成。',
                example: '/reference/chatgpt/comparison-001',
              },
              {
                type: 'Evidence',
                label: 'Reference を支える根拠・出典',
                note: '公式サイト・論文・メディア記事など。Tier（T1〜T4）で信頼性を分類。',
                example: null,
              },
            ].map((item) => (
              <div key={item.type} className="flex items-start gap-3 px-4 py-3 bg-white">
                <span className="text-[11px] font-bold text-gray-400 font-mono shrink-0 mt-0.5 w-20">{item.type}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 leading-snug">{item.label}</p>
                  {item.example && (
                    <p className="text-xs text-gray-400 mt-0.5">例: <span className="font-mono">{item.example}</span></p>
                  )}
                  {item.note && (
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Knowledge Graph */}
          <div className="border border-gray-100 rounded-xl p-4 mt-3 bg-gray-50">
            <div className="flex items-start gap-3">
              <span className="text-[11px] font-bold text-gray-400 font-mono shrink-0 mt-0.5 w-20">Knowledge Graph</span>
              <div>
                <p className="text-sm font-medium text-gray-800 leading-snug">Entity 間の構造化されたつながり</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  競合・親子・所属 Cluster を Relationship として定義。AI がテキストを読まなくても文脈を把握できる構造を提供する。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ④ Clusters — AI Knowledge Directory */}
        {activeClusters.length > 0 && (
          <section id="knowledge-directory" className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                AI Knowledge Directory
              </h2>
              <span className="text-[11px] text-gray-400">
                {activeClusters.length} clusters
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-5">
              問いのパターンで整理した、AI Knowledge Index です。AI が頻繁に受け取る Question を Cluster として分類し、分野ごとに Entity / Reference を探索できます。
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

        {/* ⑥ AI & Machine Access */}
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
                    desc: '全 Reference のインデックス。AI クローラーが一括取得できる形式で公開。',
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
                    desc: 'Entity 情報を JSON で返す。RAG 連携・ツール呼び出しに対応。',
                  },
                  {
                    label: 'Reference API',
                    href: '/api/reference/aisle',
                    path: '/api/reference/{entityId}',
                    desc: 'Reference 一覧を JSON で返す。answer / evidencePoints / faq を含む。',
                  },
                  {
                    label: 'Cluster API',
                    href: '/api/cluster-registry',
                    path: '/api/cluster-registry',
                    desc: 'Cluster 一覧を JSON で返す。entitySlugs / maturity / representativeQuestions を含む。',
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

        {/* Footer */}
        <footer className="border-t border-gray-100 pt-6 text-xs text-gray-400 space-y-1">
          <p>RefBase — AI Knowledge Infrastructure</p>
          <p className="font-mono text-gray-300 break-all">{REFBASE_BASE}</p>
        </footer>

      </div>
    </>
  );
}
