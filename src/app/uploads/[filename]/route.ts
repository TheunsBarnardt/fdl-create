import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { NextResponse } from 'next/server';

const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads');

export async function GET(_req: Request, { params }: { params: { filename: string } }) {
  const { filename } = params;

  // Basic path traversal guard
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  try {
    const filePath = join(UPLOADS_DIR, filename);
    const buffer = await readFile(filePath);
    const ext = extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
