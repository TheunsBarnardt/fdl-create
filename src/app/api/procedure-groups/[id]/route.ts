import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const Update = z.object({ name: z.string().min(1).max(64).optional() });

export const PATCH = withApi('write:procedures', async (req, ctx) => {
  const { id } = ctx.params!;
  const body = Update.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const updated = await prisma.procedureGroup.update({ where: { id }, data: body.data });
  return NextResponse.json(updated);
});

export const DELETE = withApi('write:procedures', async (_req, ctx) => {
  const { id } = ctx.params!;
  await prisma.procedureGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
