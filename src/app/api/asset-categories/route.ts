import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { z } from 'zod';
import { getActiveProject } from '@/lib/active-project';

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9_-]+$/),
  parentId: z.string().nullable().optional(),
});

export const GET = withApi('read:themes', async () => {
  const project = await getActiveProject();
  const cats = await prisma.assetCategory.findMany({
    include: { children: { orderBy: { order: 'asc' } } },
    where: { parentId: null, projectId: project.id },
    orderBy: { order: 'asc' },
  });
  return NextResponse.json(cats);
});

export const POST = withApi('write:themes', async (req) => {
  const body = CreateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const project = await getActiveProject();
  const existing = await prisma.assetCategory.findFirst({ where: { slug: body.data.slug, projectId: project.id } });
  if (existing) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });

  const max = await prisma.assetCategory.findFirst({ where: { projectId: project.id }, orderBy: { order: 'desc' }, select: { order: true } });
  const cat = await prisma.assetCategory.create({
    data: { ...body.data, order: (max?.order ?? 0) + 1, projectId: project.id },
    include: { children: true },
  });
  return NextResponse.json(cat, { status: 201 });
});
