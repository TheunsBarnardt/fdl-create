import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { getActiveProject } from '@/lib/active-project';

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads');

export const GET = withApi('read:themes', async (req) => {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get('categoryId') || undefined;
  const project = await getActiveProject();

  const assets = await prisma.asset.findMany({
    where: { projectId: project.id, ...(categoryId ? { categoryId } : {}) },
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

  let buffer = Buffer.from(await file.arrayBuffer());
  let mimeType = file.type;
  let finalExt = extname(file.name);
  let width: number | null = null;
  let height: number | null = null;
  let optimizedSize = buffer.length;

  const isImage = mimeType.startsWith('image/');
  const isSvg = mimeType === 'image/svg+xml';

  if (isImage && !isSvg) {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      width = metadata.width || null;
      height = metadata.height || null;

      const optimized = await image.rotate().webp({ quality: 80 }).toBuffer();
      buffer = Buffer.from(optimized);
      mimeType = 'image/webp';
      finalExt = '.webp';
      optimizedSize = optimized.length;
    } catch (err) {
      return NextResponse.json({ error: 'Failed to process image' }, { status: 400 });
    }
  } else if (isImage && isSvg) {
    try {
      const metadata = await sharp(buffer).metadata();
      width = metadata.width || null;
      height = metadata.height || null;
    } catch {
    }
  }

  const filename = `${randomBytes(12).toString('hex')}${finalExt}`;
  await writeFile(join(UPLOADS_DIR, filename), buffer);

  const project = await getActiveProject();
  const max = await prisma.asset.findFirst({ where: { projectId: project.id }, orderBy: { order: 'desc' }, select: { order: true } });

  const asset = await prisma.asset.create({
    data: {
      name: name || file.name.replace(/\.[^.]+$/, ''),
      filename,
      url: `/uploads/${filename}`,
      mimeType,
      size: optimizedSize,
      width,
      height,
      alt: alt || undefined,
      categoryId: categoryId || undefined,
      order: (max?.order ?? 0) + 1,
      projectId: project.id,
    },
    include: { category: true },
  });

  return NextResponse.json(asset, { status: 201 });
});
