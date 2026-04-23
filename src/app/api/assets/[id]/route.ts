import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  alt: z.string().max(500).optional(),
  categoryId: z.string().nullable().optional(),
  focalX: z.number().min(0).max(100).optional(),
  focalY: z.number().min(0).max(100).optional(),
});

export const PATCH = withApi('write:themes', async (req, ctx: { params: { id: string } }) => {
  const { id } = ctx.params;
  const body = UpdateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const asset = await prisma.asset.update({
    where: { id },
    data: body.data,
    include: { category: true },
  });
  return NextResponse.json(asset);
});

export const DELETE = withApi('write:themes', async (_req, ctx: { params: { id: string } }) => {
  const { id } = ctx.params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.asset.delete({ where: { id } });

  try {
    await unlink(join(process.cwd(), 'public', 'uploads', asset.filename));
  } catch {
    // file already gone — fine
  }

  return NextResponse.json({ ok: true });
});
