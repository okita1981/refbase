import { getGlobalIndex, getEntity, getEntityIndex } from '@/lib/kv';

export const revalidate = 3600;

export default async function TopPage() {
  const entityIds = await getGlobalIndex();
  const entities = await Promise.all(
    entityIds.map(async id => {
      const [entity, index] = await Promise.all([getEntity(id), getEntityIndex(id)]);
      return entity ? { ...entity, refCount: index.length } : null;
    }),
  );
  const validEntities = entities.filter((e): e is NonNullable<typeof entities[0]> => e !== null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-gray-900">
      <header className="mb-12">
        <h1 className="text-2xl font-semibold mb-3">RefBase</h1>
        <p className="text-sm text-gray-600 leading-relaxed max-w-lg">
          RefBase は、企業・サービスに関する問い別回答と根拠情報を構造化して公開するナレッジレイヤーです。
          各エンティティは問い（クエリ意図）に対応した参照（Reference）を持ち、
          生成AIが回答を構築する際の参照情報として設計されています。
        </p>
        <p className="text-xs text-gray-400 mt-3">
          Entities: {validEntities.length} ·{' '}
          References: {validEntities.reduce((s, e) => s + e.refCount, 0)} ·{' '}
          <a href="/llms.txt" className="hover:underline">llms.txt</a>
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">エンティティ一覧</h2>
        {validEntities.length === 0 ? (
          <p className="text-sm text-gray-400">登録されているエンティティはありません。</p>
        ) : (
          <ul className="space-y-4">
            {validEntities.map(e => (
              <li key={e.id}>
                <a href={`/entity/${e.id}`} className="group block">
                  <p className="text-sm font-medium text-gray-800 group-hover:underline">{e.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {e.category} · {e.refCount}件 · {e.updatedAt.slice(0, 10)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-gray-200 pt-6 mt-12 text-xs text-gray-400 space-y-1">
        <p>RefBase — AI Reference Knowledge Base</p>
        <p>
          <a href="/llms.txt" className="hover:underline">llms.txt</a>
          {' · '}
          <a href="/api/entity/aisle" className="hover:underline">API</a>
        </p>
      </footer>
    </div>
  );
}
