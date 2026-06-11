import { NextResponse } from 'next/server';
import { getEntity, getEntityIndex } from '@/lib/kv';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await params;
  const [entity, index] = await Promise.all([
    getEntity(entityId),
    getEntityIndex(entityId),
  ]);
  if (!entity) {
    return NextResponse.json({ ok: false, error: 'Entity not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, entity, referenceIndex: index });
}
