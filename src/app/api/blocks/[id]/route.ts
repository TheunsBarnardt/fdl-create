import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { compileBlock } from '@/lib/compile-block';

const UpdateBlock = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/).optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  source: z.string().optional(),
  kind: z.enum(['template', 'component']).optional(),
  shape: z.enum(['single', 'list']).optional(),
  slotSchema: z.record(z.any()).nullable().optional(),
  category: z.string().nullable().optional(),
  themeId: z.string().nullable().optional()
});

type P = { params: { id: string } };

export const GET = withApi<P>('read:blocks', async (_req, { params }) => {
  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "CustomBlock" WHERE id = ${params.id} LIMIT 1`;
  const b = rows[0];
  if (!b) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    ...b,
    shape: b.shape ?? 'single',
    slotSchema: b.slotSchema ? JSON.parse(b.slotSchema) : null,
  });
});

export const PATCH = withApi<P>('write:blocks', async (req, { params }) => {
  const body = UpdateBlock.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const d = body.data;

  // If this is a component kind save with new source, compile before writing.
  let compiled: string | null | undefined = undefined;
  let schemaOverride: Record<string, any> | undefined = undefined;
  if (d.kind === 'component' && d.source !== undefined) {
    const result = compileBlock(d.source);
    if (result.errors.length) {
      return NextResponse.json({ error: { compile: result.errors } }, { status: 422 });
    }
    compiled = result.compiled;
    if (Object.keys(result.propSchema).length > 0) schemaOverride = result.propSchema;
  } else if (d.kind === 'template') {
    // Switching back to template — clear compiled.
    compiled = null;
  }

  const sets: string[] = [];
  const vals: any[] = [];

  if (d.name !== undefined)       { sets.push('name = ?');        vals.push(d.name); }
  if (d.title !== undefined)      { sets.push('title = ?');       vals.push(d.title); }
  if (d.description !== undefined){ sets.push('description = ?'); vals.push(d.description); }
  if (d.source !== undefined)     { sets.push('source = ?');      vals.push(d.source); }
  if (d.kind !== undefined)       { sets.push('kind = ?');        vals.push(d.kind); }
  if (d.shape !== undefined)      { sets.push('shape = ?');       vals.push(d.shape); }
  if (schemaOverride !== undefined) {
    sets.push('slotSchema = ?');
    vals.push(JSON.stringify(schemaOverride));
  } else if (d.slotSchema !== undefined) {
    sets.push('slotSchema = ?');
    vals.push(d.slotSchema ? JSON.stringify(d.slotSchema) : null);
  }
  if (d.category !== undefined)   { sets.push('category = ?');    vals.push(d.category); }
  if (d.themeId !== undefined)    { sets.push('themeId = ?');     vals.push(d.themeId); }
  if (compiled !== undefined)     { sets.push('compiled = ?');    vals.push(compiled); }

  if (sets.length > 0) {
    vals.push(params.id);
    await prisma.$executeRawUnsafe(
      `UPDATE "CustomBlock" SET ${sets.join(', ')} WHERE id = ?`,
      ...vals
    );
  }
  return NextResponse.json({ id: params.id });
});

export const DELETE = withApi<P>('write:blocks', async (_req, { params }) => {
  await prisma.customBlock.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
