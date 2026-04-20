import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

type P = { params: { id: string } };

export const DELETE = withApi<P>('admin', async (_req, { params }, who) => {
  const token = await prisma.apiToken.findUnique({ where: { id: params.id } });
  if (!token || token.userId !== who.userId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (token.revokedAt) return NextResponse.json({ id: token.id, alreadyRevoked: true });
  await prisma.apiToken.update({
    where: { id: params.id },
    data: { revokedAt: new Date() }
  });
  return NextResponse.json({ id: token.id });
});
