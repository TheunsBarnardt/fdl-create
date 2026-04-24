import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

type P = { params: { slug: string } };

export const DELETE = withApi<P>('admin', async (_req, { params }) => {
  const { slug } = params;
  if (slug === 'default') return NextResponse.json({ error: 'cannot delete Default project' }, { status: 400 });
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await prisma.project.delete({ where: { id: project.id } });
  return NextResponse.json({ ok: true });
});
