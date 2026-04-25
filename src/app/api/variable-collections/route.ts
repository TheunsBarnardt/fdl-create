import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { getActiveProject } from '@/lib/active-project';
import {
  CreateVariableCollectionSchema,
  parseVariablePath,
  buildVariableTree,
} from '@/lib/variable-types';

export const GET = withApi('read:themes', async () => {
  const project = await getActiveProject();
  const collections = await prisma.variableCollection.findMany({
    where: { projectId: project.id },
    include: {
      variables: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json(
    collections.map((col) => ({
      id: col.id,
      name: col.name,
      order: col.order,
      variables: col.variables.map((v) => ({
        id: v.id,
        collectionId: v.collectionId,
        name: v.name,
        path: parseVariablePath(v.name),
        type: v.type,
        value: (() => {
          try {
            return JSON.parse(v.value);
          } catch {
            return v.value;
          }
        })(),
        description: v.description,
        order: v.order,
      })),
    }))
  );
});

export const POST = withApi('write:themes', async (req) => {
  const body = CreateVariableCollectionSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const project = await getActiveProject();
  const maxOrder = await prisma.variableCollection
    .findFirst({
      where: { projectId: project.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

  const created = await prisma.variableCollection.create({
    data: {
      name: body.data.name,
      order: (maxOrder?.order ?? 0) + 1,
      projectId: project.id,
    },
    include: {
      variables: true,
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      name: created.name,
      order: created.order,
      variables: [],
    },
    { status: 201 }
  );
});
