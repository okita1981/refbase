import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getEntity, getAllReferences } from '@/lib/kv';
import { PID_LABELS, PID_COLORS } from '@/lib/pid-labels';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ entityId: string; referenceId: string }> };

const REFBASE_BASE = 'https://www.refbase.ai';

// sourceType → 人間向け信頼性ラベル + リンク文言
const SOURCE_TYPE_CONFIG: Record<string, { label: string; linkText: string }> = {
  official_site: { label: 'Official',    linkText: '公式サイトを見る' },
  pdf:           { label: 'Official',    linkText: '資料を見る' },
  note:          { label: 'Company',     linkText: 'Blogを見る' },
  media:         { label: 'Third-party', linkText: '掲載記事を見る' },
  sns:           { label: 'Community',   linkText: '投稿を見る' },
  manual:        { label: 'Source',      linkText: '出典を見る' },
  other:         { label: 'Source',      linkText: '出典を見る' },
};

// entityType → schema.org @type マッピング
const SCHEMA_TYPE: Record<string, string> = {
  company:      'Organization',
  service:      'Service',
  product:      'Product',
  person:       'Person',
  organization: 'Organization',
  concept:      'DefinedTerm',
  other:        'Thing',
};

const pidClass = (pid: string) =>
  PID_COLORS[pid] ?? 'bg-gray-50 text-gray-600 border-gray-200';

// ── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entityId, referenceId } = await params;
  const [entity, allReferences] = await Promise.all([
    getEntity(entityId),
    getAllReferences(entityId),
  ]);
  const reference = allReferences.find(r => r.id === referenceId);
  if (!entity || !reference) return { title: 'Not Found | RefBase' };

  const canonicalUrl = `${REFBASE_BASE}/reference/${entityId}/${referenceId}`;
  const description = reference.answer.slice(0, 300);

  return {
    title: `${reference.promptText} | ${entity.name} | RefBase`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${entity.name} — ${reference.promptText}`,
      description,
      url: canonicalUrl,
      images: [`${REFBASE_BASE}/og.png`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${entity.name} — ${reference.promptText}`,
      description,
    },
  };
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function ReferencePage({ params }: Props) {
  const { entityId, referenceId } = await params;

  const [entity, allReferences] = await Promise.all([
    getEntity(entityId),
    getAllReferences(entityId),
  ]);
  const reference = allReferences.find(r => r.id === referenceId);
  if (!entity || !reference) notFound();

  const otherRefs = allReferences.filter(r => r.id !== referenceId);

  const canonicalUrl = `${REFBASE_BASE}/reference/${entityId}/${referenceId}`;
  const entityUrl = `${REFBASE_BASE}/entity/${entityId}`;
  const schemaType = SCHEMA_TYPE[entity.entityType ?? 'company'] ?? 'Organization';

  // citation: sourceEvidence の sourceUrl から重複排除
  const citationUrls = [
    ...new Set(
      reference.sourceEvidence
        .map(ev => ev.sourceUrl ?? '')
        .filter(url => url.length > 0),
    ),
  ];

  const primaryQA = {
    '@type': 'Question',
    name: reference.promptText,
    acceptedAnswer: {
      '@type': 'Answer',
      text: reference.answer,
      ...(citationUrls.length > 0 ? { citation: citationUrls.map(url => ({ '@type': 'WebPage', url })) } : {}),
    },
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: reference.promptText,
    url: canonicalUrl,
    description: reference.answer.slice(0, 300),
    about: {
      '@type': schemaType,
      '@id': entityUrl,
      name: entity.name,
      description: entity.category,
    },
    ...(citationUrls.length > 0 ? { citation: citationUrls.map(url => ({ '@type': 'WebPage', url })) } : {}),
    mainEntity: [
      primaryQA,
      ...reference.faq.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl mx-auto px-4 py-8 text-gray-900">

        {/* breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <a href="/" className="hover:underline">RefBase</a>
          {' / '}
          <a href={`/entity/${entityId}`} className="hover:underline">{entity.name}</a>
        </nav>

        {/* P-ID badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-bold ${pidClass(reference.promptTypeId)}`}>
            {reference.promptTypeId}
          </span>
          {PID_LABELS[reference.promptTypeId] && (
            <span className="text-xs text-gray-400">{PID_LABELS[reference.promptTypeId]}</span>
          )}
        </div>

        <h1 className="text-xl font-semibold mb-6 leading-snug">{reference.promptText}</h1>

        {/* answer */}
        <section className="mb-8">
          <p className="text-gray-800 leading-relaxed">{reference.answer}</p>
        </section>

        {/* 実績・根拠 */}
        {reference.evidencePoints.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">実績・根拠</h2>
            <ul className="space-y-1">
              {reference.evidencePoints.map((pt, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-gray-400 shrink-0">—</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 向いている相談 */}
        {reference.scope && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">向いている相談</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{reference.scope}</p>
          </section>
        )}

        {/* 他の選択肢との違い */}
        {reference.differentiation && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">他の選択肢との違い</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{reference.differentiation}</p>
          </section>
        )}

        {/* よくある質問 */}
        {reference.faq.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">よくある質問</h2>
            <dl className="space-y-5">
              {reference.faq.map((f, i) => (
                <div key={i}>
                  <dt className="text-sm font-medium text-gray-800 mb-1">{f.question}</dt>
                  <dd className="text-sm text-gray-600 leading-relaxed">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* 情報ソース */}
        {reference.sourceEvidence.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">情報ソース</h2>
            <ul className="space-y-2.5">
              {reference.sourceEvidence.map((ev, i) => {
                const cfg = SOURCE_TYPE_CONFIG[ev.sourceType ?? ''] ?? SOURCE_TYPE_CONFIG['other'];
                return (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded border border-gray-200 text-[10px] font-medium text-gray-400 bg-white">
                      {cfg.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-700">{ev.title}</span>
                      {ev.value && (
                        <span className="ml-1.5 text-gray-500">{ev.value}</span>
                      )}
                      {ev.sourceUrl && (
                        <a
                          href={ev.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:underline text-xs"
                        >
                          {cfg.linkText}
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* footer */}
        <footer className="border-t border-gray-200 pt-6 mt-8 space-y-4">
          <div className="text-xs text-gray-400">
            <span>最終更新: {reference.generatedAt.slice(0, 10)}</span>
          </div>

          {otherRefs.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">このEntityの他のReference</p>
              <ul className="space-y-1.5">
                {otherRefs.map(r => (
                  <li key={r.id}>
                    <a
                      href={`/reference/${entityId}/${r.id}`}
                      className="text-sm text-gray-500 hover:text-gray-700 hover:underline leading-snug"
                    >
                      {r.promptText}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 text-xs text-gray-400">
            <p>
              <a href="/" className="hover:underline">RefBase</a>
              {' — '}
              AI Knowledge Infrastructure
            </p>
            <p className="mt-1 font-mono text-gray-300 break-all">{canonicalUrl}</p>
          </div>
        </footer>

      </div>
    </>
  );
}
