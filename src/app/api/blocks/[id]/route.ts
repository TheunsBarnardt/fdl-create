import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const UpdateBlock = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/).optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  source: z.string().optional(),
  slotMap: z.record(z.string()).nullable().optional(),
  collection: z.string().nullable().optional(),
  category: z.string().nullable().optional()
});

type P = { params: { id: string } };

export const GET = withApi<P>('read:blocks', async (_req, { params }) => {
  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "CustomBlock" WHERE id = ${params.id} LIMIT 1`;
  const b = rows[0];
  if (!b) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ...b, slotMap: b.slotMap ? JSON.parse(b.slotMap) : {} });
});

export const PATCH = withApi<P>('write:blocks', async (req, { params }) => {
  const body = UpdateBlock.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const d = body.data;

  const sets: string[] = [];
  const vals: any[] = [];

  if (d.name !== undefined)       { sets.push('name = ?');        vals.push(d.name); }
  if (d.title !== undefined)      { sets.push('title = ?');       vals.push(d.title); }
  if (d.description !== undefined){ sets.push('description = ?'); vals.push(d.description); }
  if (d.source !== undefined)     { sets.push('source = ?');      vals.push(d.source); }
  if (d.slotMap !== undefined)    { sets.push('slotMap = ?');     vals.push(d.slotMap ? JSON.stringify(d.slotMap) : null); }
  if (d.collection !== undefined) { sets.push('collection = ?');  vals.push(d.collection); }
  if (d.category !== undefined)   { sets.push('category = ?');    vals.push(d.category); }

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
