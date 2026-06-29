import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// ════════════════════════════════════════════════════════════════════════════
// GET /api/relationship-registry
//
// refbase:registry:relationships から Relationship 一覧を返す read-only API。
// IA-4a: Relationship Registry + read-only API
//
// クエリパラメータ:
//   ?entity=chatgpt        → sourceEntity または targetEntity が一致するものを絞り込み
//   ?type=competitorOf     → relationshipType で絞り込み
//   ?status=ACTIVE         → status で絞り込み（デフォルト: 全件）
//
// 安全条件:
//   - KV 書き込みなし（read-only）
//   - Entity / Reference / Cluster / Evidence / QI への変更なし
//   - AI 呼び出しなし
// ════════════════════════════════════════════════════════════════════════════

interface RelationshipItem {
  relationshipId: string;
  sourceEntity: string;
  targetEntity: string;
  relationshipType: string;
  direction: 'directed' | 'bidirectional';
  description: string;
  confidence: string;
  source: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface RelationshipRegistryEnvelope {
  registryId: string;
  version: string;
  status: string;
  description: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  items: RelationshipItem[];
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const entityFilter = searchParams.get('entity') ?? '';
    const typeFilter   = searchParams.get('type') ?? '';
    const statusFilter = searchParams.get('status') ?? '';

    const registry = await kv.get<RelationshipRegistryEnvelope>('refbase:registry:relationships');

    if (!registry) {
      return NextResponse.json(
        { ok: false, error: 'Relationship Registry が未登録です。scripts/ia4a-register-relationship-registry.mjs を実行してください。' },
        { status: 404 },
      );
    }

    let items = registry.items;

    // フィルタリング
    if (entityFilter) {
      items = items.filter(
        r => r.sourceEntity === entityFilter || r.targetEntity === entityFilter,
      );
    }
    if (typeFilter) {
      items = items.filter(r => r.relationshipType === typeFilter);
    }
    if (statusFilter) {
      items = items.filter(r => r.status === statusFilter);
    }

    // サマリー集計（フィルタ前の全件から集計）
    const allItems = registry.items;

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byEntity: Record<string, number> = {};

    for (const r of allItems) {
      byType[r.relationshipType]   = (byType[r.relationshipType]   ?? 0) + 1;
      byStatus[r.status]           = (byStatus[r.status]           ?? 0) + 1;
      byEntity[r.sourceEntity]     = (byEntity[r.sourceEntity]     ?? 0) + 1;
      // bidirectional は target 側にもカウント
      if (r.direction === 'bidirectional') {
        byEntity[r.targetEntity] = (byEntity[r.targetEntity] ?? 0) + 1;
      }
    }

    return NextResponse.json({
      ok: true,
      count: items.length,
      totalCount: registry.items.length,
      relationships: items,
      summary: { byType, byStatus, byEntity },
      filters: {
        entity: entityFilter || null,
        type:   typeFilter   || null,
        status: statusFilter || null,
      },
      registryVersion: registry.version,
      registryUpdatedAt: registry.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
