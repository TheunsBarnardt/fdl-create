import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const UpdateTheme = z.object({
  name: z.string().optional(),
  tokens: z.any().optional(),
  isDefault: z.boolean().optional()
});

type P = { params: { id: string } };

export const PATCH = withApi<P>('write:themes', async (req, { params }) => {
  const body = UpdateTheme.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  if (body.data.isDefault) {
    await prisma.theme.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }
  await prisma.theme.update({
    where: { id: params.id },
    data: {
      ...(body.data.name !== undefined && { name: body.data.name }),
      ...(body.data.tokens !== undefined && { tokens: JSON.stringify(body.data.tokens) }),
      ...(body.data.isDefault !== undefined && { isDefault: body.data.isDefault })
    }
  });
  return NextResponse.json({ id: params.id });
});

export const DELETE = withApi<P>('write:themes', async (_req, { params }) => {
  await prisma.theme.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
