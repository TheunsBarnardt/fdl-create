import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseCollectionSchema, buildRecordValidator } from '@/lib/schema-types';
import { withApi } from '@/lib/with-api';

type P = { params: { name: string; id: string } };

export const GET = withApi<P>('read:records', async (_req, { params }) => {
  const r = await prisma.record.findFirst({
    where: { id: params.id, collection: { name: params.name } }
  });
  if (!r) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ id: r.id, ...JSON.parse(r.data) });
});

export const PATCH = withApi<P>('write:records', async (req, { params }) => {
  const col = await prisma.collection.findUnique({ where: { name: params.name } });
  if (!col) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const schema = parseCollectionSchema(col.schema);
  const existing = await prisma.record.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const merged = { ...JSON.parse(existing.data), ...(await req.json()) };
  const validator = buildRecordValidator(schema);
  const parsed = validator.safeParse(merged);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await prisma.record.update({
    where: { id: params.id },
    data: { data: JSON.stringify(parsed.data) }
  });
  return NextResponse.json({ id: params.id });
});

export const DELETE = withApi<P>('write:records', async (_req, { params }) => {
  await prisma.record.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
