import { NextResponse } from 'next/server';
import { getEntity, getAllReferences } from '@/lib/kv';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await params;
  const url = new URL(req.url);
  const promptTypeId = url.searchParams.get('promptTypeId');

  const [entity, refs] = await Promise.all([
    getEntity(entityId),
    getAllReferences(entityId),
  ]);
  if (!entity) {
    return NextResponse.json({ ok: false, error: 'Entity not found' }, { status: 404 });
  }

  const references = promptTypeId
    ? refs.filter(r => r.promptTypeId === promptTypeId)
    : refs;

  return NextResponse.json({ ok: true, entity, references });
}
