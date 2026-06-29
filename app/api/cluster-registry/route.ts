import { NextResponse } from 'next/server';

// ════════════════════════════════════════════════════════════════════════════
// GET /api/cluster-registry
//
// refbase:registry:clusters から Cluster 一覧を返す read-only API。
// IA-1a: Cluster Registry + read-only API（/cluster/{id} ページは IA-1b で実装）
//
// 安全条件:
//   - KV 書き込みなし（read-only）
//   - Entity / Reference / Evidence / QI への変更なし
//   - AI 呼び出しなし
// ════════════════════════════════════════════════════════════════════════════

interface ClusterItem {
  clusterId: string;
  slug: string;
  name: string;
  nameJa?: string;
  description: string;
  entitySlugs: string[];
  secondaryEntitySlugs?: string[];
  entityCount: number;
  representativeQuestions: string[];
  primaryPromptTypes: string[];
  relatedClusters: string[];
  maturity: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ClusterRegistryEnvelope {
  registryId: string;
  version: string;
  status: string;
  description: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  items: ClusterItem[];
}

async function kvGet<T>(key: string): Promise<T | null> {
  const url  = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('KV env vars not set');

  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`KV GET failed [${key}]: ${res.status}`);
  const json = await res.json() as { result: T | null };
  return json.result;
}

export async function GET(): Promise<NextResponse> {
  try {
    const registry = await kvGet<ClusterRegistryEnvelope>('refbase:registry:clusters');

    if (!registry) {
      return NextResponse.json(
        { ok: false, error: 'Cluster Registry が未登録です。scripts/ia1a-register-cluster-registry.mjs を実行してください。' },
        { status: 404 },
      );
    }

    const activeClusters = registry.items.filter(c => c.status === 'ACTIVE');
    const allClusters    = registry.items;

    return NextResponse.json({
      ok: true,
      count: activeClusters.length,
      totalCount: allClusters.length,
      clusters: allClusters,
      registryVersion: registry.version,
      registryUpdatedAt: registry.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
