import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { CollectionSchemaJson } from '@/lib/schema-types';
import { withApi } from '@/lib/with-api';

const CreateCollection = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_-]*$/, 'kebab/snake case, starts with letter'),
  label: z.string().min(1),
  description: z.string().optional(),
  schema: CollectionSchemaJson
});

export const GET = withApi('read:collections', async () => {
  const collections = await prisma.collection.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(collections.map((c) => ({
    id: c.id,
    name: c.name,
    label: c.label,
    description: c.description,
    aiOptIn: c.aiOptIn,
    schema: JSON.parse(c.schema)
  })));
});

export const POST = withApi('write:collections', async (req) => {
  const body = CreateCollection.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const created = await prisma.collection.create({
    data: {
      name: body.data.name,
      label: body.data.label,
      description: body.data.description,
      schema: JSON.stringify(body.data.schema)
    }
  });
  return NextResponse.json({ id: created.id, name: created.name }, { status: 201 });
});
