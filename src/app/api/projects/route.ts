import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const CreateProject = z.object({
  name: z.string().min(1).max(60),
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/, 'kebab-case, starts with letter').max(40),
  description: z.string().max(200).optional()
});

export const GET = withApi('admin', async () => {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(projects);
});

export const POST = withApi('admin', async (req) => {
  const body = CreateProject.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const existing = await prisma.project.findUnique({ where: { slug: body.data.slug } });
  if (existing) return NextResponse.json({ error: 'slug already in use' }, { status: 409 });
  const created = await prisma.project.create({ data: body.data });
  return NextResponse.json(created, { status: 201 });
});
