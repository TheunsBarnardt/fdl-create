import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { CollectionSchemaJson } from '@/lib/schema-types';
import { withApi } from '@/lib/with-api';
import { getActiveProject } from '@/lib/active-project';

const CreateCollection = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_-]*$/, 'kebab/snake case, starts with letter'),
  label: z.string().min(1),
  description: z.string().optional(),
  schema: CollectionSchemaJson
});

export const GET = withApi('read:collections', async () => {
  const project = await getActiveProject();
  const collections = await prisma.collection.findMany({ where: { projectId: project.id }, orderBy: { name: 'asc' } });
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
  const project = await getActiveProject();
  const created = await prisma.collection.create({
    data: {
      name: body.data.name,
      label: body.data.label,
      description: body.data.description,
      schema: JSON.stringify(body.data.schema),
      projectId: project.id
    }
  });
  return NextResponse.json({ id: created.id, name: created.name }, { status: 201 });
});
