import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

type P = { params: { id: string } };

export const DELETE = withApi<P>('write:themes', async (_req, { params }) => {
  await prisma.preset.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
