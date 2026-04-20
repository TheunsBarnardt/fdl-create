import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { CollectionSchemaJson } from '@/lib/schema-types';
import { withApi } from '@/lib/with-api';

const UpdateCollection = z.object({
  label: z.string().optional(),
  description: z.string().nullable().optional(),
  schema: CollectionSchemaJson.optional(),
  aiOptIn: z.boolean().optional(),
  redactions: z.array(z.string()).optional()
});

export const GET = withApi<{ params: { name: string } }>('read:collections', async (_req, { params }) => {
  const c = await prisma.collection.findUnique({ where: { name: params.name } });
  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    id: c.id,
    name: c.name,
    label: c.label,
    description: c.description,
    aiOptIn: c.aiOptIn,
    redactions: c.redactions ? JSON.parse(c.redactions) : [],
    schema: JSON.parse(c.schema)
  });
});

export const PATCH = withApi<{ params: { name: string } }>('write:collections', async (req, { params }, who) => {
  const body = UpdateCollection.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const updated = await prisma.collection.update({
    where: { name: params.name },
    data: {
      ...(body.data.label !== undefined && { label: body.data.label }),
      ...(body.data.description !== undefined && { description: body.data.description }),
      ...(body.data.schema !== undefined && { schema: JSON.stringify(body.data.schema) }),
      ...(body.data.aiOptIn !== undefined && { aiOptIn: body.data.aiOptIn }),
      ...(body.data.redactions !== undefined && { redactions: JSON.stringify(body.data.redactions) })
    }
  });
  if (body.data.aiOptIn !== undefined || body.data.redactions !== undefined) {
    await prisma.aiAuditLog.create({
      data: {
        userId: who.userId,
        collection: params.name,
        action: 'governance_update',
        scope: JSON.stringify({
          aiOptIn: body.data.aiOptIn,
          redactions: body.data.redactions
        })
      }
    });
  }
  return NextResponse.json({ id: updated.id });
});

export const DELETE = withApi<{ params: { name: string } }>('write:collections', async (_req, { params }) => {
  await prisma.collection.delete({ where: { name: params.name } });
  return NextResponse.json({ ok: true });
});
