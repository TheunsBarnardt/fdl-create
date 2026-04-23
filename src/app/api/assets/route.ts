import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads');

export const GET = withApi('read:themes', async (req) => {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get('categoryId') || undefined;

  const assets = await prisma.asset.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: { category: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json(assets);
});

export const POST = withApi('write:themes', async (req) => {
  await mkdir(UPLOADS_DIR, { recursive: true });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const categoryId = form.get('categoryId') as string | null;
  const name = (form.get('name') as string | null) || '';
  const alt = (form.get('alt') as string | null) || '';

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const ext = extname(file.name) || '';
  const filename = `${randomBytes(12).toString('hex')}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(join(UPLOADS_DIR, filename), buffer);

  const max = await prisma.asset.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });

  const asset = await prisma.asset.create({
    data: {
      name: name || file.name.replace(/\.[^.]+$/, ''),
      filename,
      url: `/uploads/${filename}`,
      mimeType: file.type,
      size: file.size,
      alt: alt || undefined,
      categoryId: categoryId || undefined,
      order: (max?.order ?? 0) + 1,
    },
    include: { category: true },
  });

  return NextResponse.json(asset, { status: 201 });
});
