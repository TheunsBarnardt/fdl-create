import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';
import { getActiveProject } from '@/lib/active-project';

const UPLOADS_DIR = join(process.cwd(), 'public', 'documents');

export const GET = withApi('read:themes', async (req) => {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get('categoryId') || undefined;
  const project = await getActiveProject();

  const documents = await prisma.document.findMany({
    where: { projectId: project.id, ...(categoryId ? { categoryId } : {}) },
    include: { category: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json(documents);
});

export const POST = withApi('write:themes', async (req) => {
  await mkdir(UPLOADS_DIR, { recursive: true });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const categoryId = form.get('categoryId') as string | null;
  const name = (form.get('name') as string | null) || '';
  const description = (form.get('description') as string | null) || '';

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || 'application/octet-stream';
  const ext = extname(file.name);

  const filename = `${randomBytes(12).toString('hex')}${ext}`;
  await writeFile(join(UPLOADS_DIR, filename), buffer);

  const project = await getActiveProject();
  const max = await prisma.document.findFirst({ where: { projectId: project.id }, orderBy: { order: 'desc' }, select: { order: true } });

  const doc = await prisma.document.create({
    data: {
      name: name || file.name.replace(/\.[^.]+$/, ''),
      filename,
      url: `/documents/${filename}`,
      mimeType,
      size: buffer.length,
      description: description || undefined,
      categoryId: categoryId || undefined,
      order: (max?.order ?? 0) + 1,
      projectId: project.id,
    },
    include: { category: true },
  });

  return NextResponse.json(doc, { status: 201 });
});
