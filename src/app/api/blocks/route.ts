import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const CreateBlock = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  source: z.string().min(1),
  slotMap: z.record(z.string()).optional(),
  collection: z.string().optional()
});

export const GET = withApi('read:blocks', async () => {
  const blocks = await prisma.customBlock.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(blocks.map((b) => ({
    id: b.id, name: b.name, collection: b.collection,
    slotMap: b.slotMap ? JSON.parse(b.slotMap) : {},
    createdAt: b.createdAt
  })));
});

export const POST = withApi('write:blocks', async (req) => {
  const body = CreateBlock.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const created = await prisma.customBlock.create({
    data: {
      name: body.data.name,
      source: body.data.source,
      slotMap: body.data.slotMap ? JSON.stringify(body.data.slotMap) : null,
      collection: body.data.collection
    }
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
});
