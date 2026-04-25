import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { UpdateVariableCollectionSchema } from '@/lib/variable-types';

type P = { params: { id: string } };

export const PATCH = withApi<P>('write:themes', async (req, { params }) => {
  const body = UpdateVariableCollectionSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.variableCollection.update({
    where: { id: params.id },
    data: {
      ...(body.data.name !== undefined && { name: body.data.name }),
      ...(body.data.order !== undefined && { order: body.data.order }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    order: updated.order,
  });
});

export const DELETE = withApi<P>('write:themes', async (_req, { params }) => {
  await prisma.variableCollection.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
