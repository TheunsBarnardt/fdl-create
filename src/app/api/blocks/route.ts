import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const CreateBlock = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  source: z.string().min(1),
  slotMap: z.record(z.string()).optional(),
  collection: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  themeId: z.string().nullable().optional()
});

export const GET = withApi('read:blocks', async () => {
  const blocks = await prisma.$queryRaw<any[]>`SELECT * FROM "CustomBlock" ORDER BY createdAt DESC`;
  return NextResponse.json(blocks.map((b) => ({
    id: b.id,
    name: b.name,
    title: b.title,
    description: b.description,
    collection: b.collection,
    category: b.category,
    themeId: b.themeId ?? null,
    source: b.source,
    slotMap: b.slotMap ? JSON.parse(b.slotMap) : {},
    createdAt: b.createdAt
  })));
});

export const POST = withApi('write:blocks', async (req) => {
  const body = CreateBlock.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const d = body.data;

  // Create with known fields (typed client), then patch new fields via raw SQL.
  const created = await prisma.customBlock.create({
    data: {
      name: d.name,
      source: d.source,
      slotMap: d.slotMap ? JSON.stringify(d.slotMap) : null,
      collection: d.collection ?? null
    }
  });
  await prisma.$executeRawUnsafe(
    'UPDATE "CustomBlock" SET title = ?, description = ?, category = ?, themeId = ? WHERE id = ?',
    d.title ?? null,
    d.description ?? null,
    d.category ?? null,
    d.themeId ?? null,
    created.id
  );
  return NextResponse.json({ id: created.id }, { status: 201 });
});
