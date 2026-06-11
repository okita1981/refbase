import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getEntity, getAllReferences } from '@/lib/kv';

type Props = { params: Promise<{ entityId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entityId } = await params;
  const entity = await getEntity(entityId);
  if (!entity) return { title: 'Not Found | RefBase' };
  return {
    title: `${entity.name} | RefBase`,
    description: `${entity.name}（${entity.category}）に関するAI参照情報のインデックスです。`,
  };
}

export default async function EntityPage({ params }: Props) {
  const { entityId } = await params;
  const [entity, references] = await Promise.all([
    getEntity(entityId),
    getAllReferences(entityId),
  ]);
  if (!entity) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: entity.name,
    description: entity.category,
    identifier: entityId,
    hasPart: references.map(r => ({
      '@type': 'Article',
      name: r.promptText,
      url: `/reference/${entityId}/${r.id}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl mx-auto px-4 py-8 text-gray-900">
        <nav className="text-sm text-gray-500 mb-6">
          <a href="/" className="hover:underline">RefBase</a>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">{entity.name}</h1>
          <p className="text-sm text-gray-500">{entity.category}</p>
        </header>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
            参照インデックス（{references.length}件）
          </h2>
          {references.length === 0 ? (
            <p className="text-sm text-gray-400">登録されている参照はありません。</p>
          ) : (
            <ul className="space-y-3">
              {references.map(r => (
                <li key={r.id}>
                  <a
                    href={`/reference/${entityId}/${r.id}`}
                    className="block group"
                  >
                    <p className="text-sm text-gray-800 group-hover:underline leading-snug">
                      {r.promptText}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.promptTypeId} · {r.id} · {r.generatedAt.slice(0, 10)}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="border-t border-gray-200 pt-6 mt-10 text-xs text-gray-400">
          <p>最終更新: {entity.updatedAt.slice(0, 10)}</p>
          <p className="mt-1">
            API: <a href={`/api/entity/${entityId}`} className="hover:underline">/api/entity/{entityId}</a>
          </p>
        </footer>
      </div>
    </>
  );
}
