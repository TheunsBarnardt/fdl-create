import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const UpdateBlock = z.object({
  source: z.string().optional(),
  slotMap: z.record(z.string()).nullable().optional(),
  collection: z.string().nullable().optional()
});

type P = { params: { id: string } };

export const GET = withApi<P>('read:blocks', async (_req, { params }) => {
  const b = await prisma.customBlock.findUnique({ where: { id: params.id } });
  if (!b) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    ...b,
    slotMap: b.slotMap ? JSON.parse(b.slotMap) : {}
  });
});

export const PATCH = withApi<P>('write:blocks', async (req, { params }) => {
  const body = UpdateBlock.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  await prisma.customBlock.update({
    where: { id: params.id },
    data: {
      ...(body.data.source !== undefined && { source: body.data.source }),
      ...(body.data.slotMap !== undefined && { slotMap: body.data.slotMap ? JSON.stringify(body.data.slotMap) : null }),
      ...(body.data.collection !== undefined && { collection: body.data.collection })
    }
  });
  return NextResponse.json({ id: params.id });
});

export const DELETE = withApi<P>('write:blocks', async (_req, { params }) => {
  await prisma.customBlock.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
