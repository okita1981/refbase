import { NextResponse } from 'next/server';
import { getEntity, getReference } from '@/lib/kv';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ entityId: string; referenceId: string }> },
) {
  const { entityId, referenceId } = await params;
  const [entity, reference] = await Promise.all([
    getEntity(entityId),
    getReference(entityId, referenceId),
  ]);
  if (!reference) {
    return NextResponse.json({ ok: false, error: 'Reference not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, entity: entity ?? null, reference });
}
