import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getEntity, getReference, getEntityIndex } from '@/lib/kv';

type Props = { params: Promise<{ entityId: string; referenceId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entityId, referenceId } = await params;
  const [entity, reference] = await Promise.all([
    getEntity(entityId),
    getReference(entityId, referenceId),
  ]);
  if (!entity || !reference) return { title: 'Not Found | RefBase' };
  return {
    title: `${reference.promptText} | ${entity.name} | RefBase`,
    description: reference.answer.slice(0, 160),
    openGraph: { title: `${entity.name} — ${reference.promptText}`, description: reference.answer.slice(0, 160) },
  };
}

export default async function ReferencePage({ params }: Props) {
  const { entityId, referenceId } = await params;
  const [entity, reference, index] = await Promise.all([
    getEntity(entityId),
    getReference(entityId, referenceId),
    getEntityIndex(entityId),
  ]);
  if (!entity || !reference) notFound();

  const otherRefs = index.filter(id => id !== referenceId);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: reference.promptText,
    description: reference.answer,
    about: { '@type': 'Organization', name: entity.name, description: entity.category },
    mainEntity: reference.faq.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
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

        <h1 className="text-xl font-semibold mb-6 leading-snug">{reference.promptText}</h1>

        {/* answer */}
        <section className="mb-8">
          <p className="text-gray-800 leading-relaxed">{reference.answer}</p>
        </section>

        {/* evidence */}
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

        {/* scope */}
        {reference.scope && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">向いている相談</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{reference.scope}</p>
          </section>
        )}

        {/* differentiation */}
        {reference.differentiation && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">他の選択肢との違い</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{reference.differentiation}</p>
          </section>
        )}

        {/* faq */}
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

        {/* source evidence */}
        {reference.sourceEvidence.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">情報ソース</h2>
            <ul className="space-y-2">
              {reference.sourceEvidence.map((ev, i) => (
                <li key={i} className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">{ev.title}</span>
                  {ev.value && <span className="ml-2 text-gray-500">{ev.value}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* footer links */}
        <footer className="border-t border-gray-200 pt-6 mt-8 text-xs text-gray-400 space-y-2">
          {reference.pageUrl && (
            <p>
              公開ページ:{' '}
              <a href={reference.pageUrl} className="hover:underline" target="_blank" rel="noopener noreferrer">
                {reference.pageUrl}
              </a>
            </p>
          )}
          <p>最終更新: {reference.generatedAt.slice(0, 10)}</p>
          {otherRefs.length > 0 && (
            <p className="pt-2">
              他の参照:{' '}
              {otherRefs.map((id, i) => (
                <span key={id}>
                  {i > 0 && '・'}
                  <a href={`/reference/${entityId}/${id}`} className="hover:underline">{id}</a>
                </span>
              ))}
            </p>
          )}
        </footer>
      </div>
    </>
  );
}
