import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { getActiveProject } from '@/lib/active-project';

const CreatePage = z.object({
  slug: z.string().regex(/^[a-z0-9-/]+$/),
  title: z.string().min(1),
  tree: z.any().optional(),
  published: z.boolean().optional(),
  themeId: z.string().nullable().optional(),
  params: z.string().nullable().optional(),
  defaultCollection: z.string().nullable().optional(),
  seo: z.any().optional(),
});

export const GET = withApi('read:pages', async () => {
  const project = await getActiveProject();
  const pages = await prisma.page.findMany({ where: { projectId: project.id }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json(pages.map((p) => ({
    id: p.id, slug: p.slug, title: p.title, published: p.published,
    updatedAt: p.updatedAt
  })));
});

export const POST = withApi('write:pages', async (req) => {
  const body = CreatePage.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const project = await getActiveProject();
  const created = await prisma.page.create({
    data: {
      slug: body.data.slug,
      title: body.data.title,
      tree: JSON.stringify(body.data.tree ?? { blocks: [] }),
      published: body.data.published ?? false,
      themeId: body.data.themeId ?? null,
      params: body.data.params ?? null,
      seo: body.data.seo ? JSON.stringify(body.data.seo) : null,
      projectId: project.id,
    }
  });
  if (body.data.defaultCollection !== undefined) {
    await prisma.$executeRawUnsafe(
      'UPDATE "Page" SET defaultCollection = ? WHERE id = ?',
      body.data.defaultCollection,
      created.id
    );
  }
  return NextResponse.json({ id: created.id }, { status: 201 });
});
