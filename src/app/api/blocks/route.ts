import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { compileBlock } from '@/lib/compile-block';

const CreateBlock = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  source: z.string().min(1),
  kind: z.enum(['template', 'component']).optional(),
  shape: z.enum(['single', 'list']).optional(),
  slotSchema: z.record(z.any()).nullable().optional(),
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
    shape: b.shape ?? 'single',
    slotSchema: b.slotSchema ? JSON.parse(b.slotSchema) : null,
    category: b.category,
    themeId: b.themeId ?? null,
    source: b.source,
    createdAt: b.createdAt
  })));
});

export const POST = withApi('write:blocks', async (req) => {
  const body = CreateBlock.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const d = body.data;
  const kind = d.kind ?? 'template';

  let compiled: string | null = null;
  let finalSchema = d.slotSchema ?? null;
  if (kind === 'component') {
    const result = compileBlock(d.source);
    if (result.errors.length) {
      return NextResponse.json({ error: { compile: result.errors } }, { status: 422 });
    }
    compiled = result.compiled;
    // Prefer the schema extracted from code; fall back to what the client sent.
    if (Object.keys(result.propSchema).length > 0) finalSchema = result.propSchema;
  }

  const created = await prisma.customBlock.create({
    data: { name: d.name, source: d.source }
  });
  await prisma.$executeRawUnsafe(
    'UPDATE "CustomBlock" SET title = ?, description = ?, shape = ?, slotSchema = ?, category = ?, themeId = ?, kind = ?, compiled = ? WHERE id = ?',
    d.title ?? null,
    d.description ?? null,
    d.shape ?? 'single',
    finalSchema ? JSON.stringify(finalSchema) : null,
    d.category ?? null,
    d.themeId ?? null,
    kind,
    compiled,
    created.id
  );
  return NextResponse.json({ id: created.id }, { status: 201 });
});
