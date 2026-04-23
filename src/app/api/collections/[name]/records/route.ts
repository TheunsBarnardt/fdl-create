import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseCollectionSchema, buildRecordValidator } from '@/lib/schema-types';
import { withApi } from '@/lib/with-api';
import { invalidatePagesFor } from '@/lib/publish';

export const GET = withApi<{ params: { name: string } }>('read:records', async (_req, { params }) => {
  const col = await prisma.collection.findUnique({ where: { name: params.name } });
  if (!col) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const records = await prisma.record.findMany({
    where: { collectionId: col.id },
    orderBy: { updatedAt: 'desc' }
  });
  return NextResponse.json(records.map((r) => ({
    id: r.id,
    ...JSON.parse(r.data),
    _createdAt: r.createdAt,
    _updatedAt: r.updatedAt
  })));
});

export const POST = withApi<{ params: { name: string } }>('write:records', async (req, { params }) => {
  const col = await prisma.collection.findUnique({ where: { name: params.name } });
  if (!col) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const schema = parseCollectionSchema(col.schema);
  const validator = buildRecordValidator(schema);
  const parsed = validator.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const created = await prisma.record.create({
    data: { collectionId: col.id, data: JSON.stringify(parsed.data) }
  });
  invalidatePagesFor(params.name, created.id).catch(() => {});
  return NextResponse.json({ id: created.id }, { status: 201 });
});
