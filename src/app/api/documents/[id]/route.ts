import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  categoryId: z.string().nullable().optional(),
});

export const PATCH = withApi('write:themes', async (req, ctx: { params: { id: string } }) => {
  const { id } = ctx.params;
  const body = UpdateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const doc = await prisma.document.update({
    where: { id },
    data: body.data,
    include: { category: true },
  });
  return NextResponse.json(doc);
});

export const DELETE = withApi('write:themes', async (_req, ctx: { params: { id: string } }) => {
  const { id } = ctx.params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.document.delete({ where: { id } });

  try {
    await unlink(join(process.cwd(), 'public', 'documents', doc.filename));
  } catch {
    // file already gone — fine
  }

  return NextResponse.json({ ok: true });
});
