import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const UpdatePage = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  tree: z.any().optional(),
  published: z.boolean().optional(),
  themeId: z.string().nullable().optional(),
  params: z.string().nullable().optional(),
  seo: z.any().optional(),
});

type P = { params: { id: string } };

export const GET = withApi<P>('read:pages', async (_req, { params }) => {
  const p = await prisma.page.findUnique({ where: { id: params.id } });
  if (!p) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ...p, tree: JSON.parse(p.tree), seo: p.seo ? JSON.parse(p.seo) : null });
});

export const PATCH = withApi<P>('write:pages', async (req, { params }) => {
  const body = UpdatePage.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  await prisma.page.update({
    where: { id: params.id },
    data: {
      ...(body.data.title !== undefined && { title: body.data.title }),
      ...(body.data.slug !== undefined && { slug: body.data.slug }),
      ...(body.data.tree !== undefined && { tree: JSON.stringify(body.data.tree) }),
      ...(body.data.published !== undefined && { published: body.data.published }),
      ...('themeId' in body.data && { themeId: body.data.themeId ?? null }),
      ...('params' in body.data && { params: body.data.params ?? null }),
      ...('seo' in body.data && { seo: body.data.seo ? JSON.stringify(body.data.seo) : null }),
    }
  });
  return NextResponse.json({ id: params.id });
});

export const DELETE = withApi<P>('write:pages', async (_req, { params }) => {
  await prisma.page.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
