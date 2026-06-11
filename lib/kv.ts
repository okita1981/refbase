import { kv } from '@vercel/kv';
import type { RefBaseEntity, RefBaseReference } from './types';

// 後方互換のため RefBaseCompany も re-export
export type { RefBaseCompany } from './types';

// ── KV キー抽象化 ──────────────────────────────────────────────
// REFBASE_STANDALONE=true になったとき、Aisle KV プレフィックスから
// RefBase 専用キー体系へ自動切り替えするための抽象レイヤー。
//
// 現在 (standalone=false):
//   refbase:company:{id}, refbase:ref:{id}/{refId}, refbase:index:{id}, refbase:index:all
// 将来 (standalone=true):
//   entity:{id}, ref:{id}/{refId}, index:{id}, index:all

const standalone = process.env.REFBASE_STANDALONE === 'true';

export const kvKey = {
  entity:   (id: string)                      => standalone ? `entity:${id}`              : `refbase:company:${id}`,
  ref:      (entityId: string, refId: string) => standalone ? `ref:${entityId}/${refId}`  : `refbase:ref:${entityId}/${refId}`,
  index:    (entityId: string)                => standalone ? `index:${entityId}`          : `refbase:index:${entityId}`,
  indexAll: ()                                => standalone ? `index:all`                  : `refbase:index:all`,
};

// ── データ取得ヘルパー ─────────────────────────────────────────

export async function getEntity(entityId: string): Promise<RefBaseEntity | null> {
  return kv.get<RefBaseEntity>(kvKey.entity(entityId));
}

export async function getReference(entityId: string, referenceId: string): Promise<RefBaseReference | null> {
  return kv.get<RefBaseReference>(kvKey.ref(entityId, referenceId));
}

export async function getEntityIndex(entityId: string): Promise<string[]> {
  return (await kv.get<string[]>(kvKey.index(entityId))) ?? [];
}

export async function getGlobalIndex(): Promise<string[]> {
  return (await kv.get<string[]>(kvKey.indexAll())) ?? [];
}

export async function getAllReferences(entityId: string): Promise<RefBaseReference[]> {
  const index = await getEntityIndex(entityId);
  const refs = await Promise.all(index.map(refId => getReference(entityId, refId)));
  return refs.filter((r): r is RefBaseReference => r !== null);
}
