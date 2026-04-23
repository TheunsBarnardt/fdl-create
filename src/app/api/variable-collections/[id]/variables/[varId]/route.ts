import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { UpdateVariableSchema, parseVariablePath } from '@/lib/variable-types';

type P = { params: { id: string; varId: string } };

export const PATCH = withApi<P>('write:themes', async (req, { params }) => {
  const body = UpdateVariableSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.variable.update({
    where: { id: params.varId },
    data: {
      ...(body.data.name !== undefined && { name: body.data.name }),
      ...(body.data.type !== undefined && { type: body.data.type }),
      ...(body.data.value !== undefined && {
        value: JSON.stringify(body.data.value),
      }),
      ...(body.data.description !== undefined && { description: body.data.description }),
      ...(body.data.order !== undefined && { order: body.data.order }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    collectionId: updated.collectionId,
    name: updated.name,
    path: parseVariablePath(updated.name),
    type: updated.type,
    value: JSON.parse(updated.value),
    description: updated.description,
    order: updated.order,
  });
});

export const DELETE = withApi<P>('write:themes', async (_req, { params }) => {
  await prisma.variable.delete({ where: { id: params.varId } });
  return NextResponse.json({ ok: true });
});
