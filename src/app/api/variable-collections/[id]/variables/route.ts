import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import {
  CreateVariableSchema,
  parseVariablePath,
  buildVariableTree,
} from '@/lib/variable-types';

type P = { params: { id: string } };

export const GET = withApi<P>('read:themes', async (_req, { params }) => {
  const variables = await prisma.variable.findMany({
    where: { collectionId: params.id },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json(
    variables.map((v) => ({
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
    }))
  );
});

export const POST = withApi<P>('write:themes', async (req, { params }) => {
  const body = CreateVariableSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const collection = await prisma.variableCollection.findUnique({
    where: { id: params.id },
  });

  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  }

  const maxOrder = await prisma.variable.findFirst({
    where: { collectionId: params.id },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const created = await prisma.variable.create({
    data: {
      collectionId: params.id,
      name: body.data.name,
      type: body.data.type,
      value: JSON.stringify(body.data.value),
      description: body.data.description,
      order: (maxOrder?.order ?? 0) + 1,
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      collectionId: created.collectionId,
      name: created.name,
      path: parseVariablePath(created.name),
      type: created.type,
      value: JSON.parse(created.value),
      description: created.description,
      order: created.order,
    },
    { status: 201 }
  );
});
