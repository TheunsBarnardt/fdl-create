import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { z } from 'zod';

const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().int().optional(),
});

export const PATCH = withApi('write:themes', async (req, ctx: { params: { id: string } }) => {
  const { id } = ctx.params;
  const body = UpdateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const cat = await prisma.documentCategory.update({ where: { id }, data: body.data, include: { children: true } });
  return NextResponse.json(cat);
});

export const DELETE = withApi('write:themes', async (_req, ctx: { params: { id: string } }) => {
  const { id } = ctx.params;
  await prisma.documentCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
