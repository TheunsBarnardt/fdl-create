import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { getActiveProject } from '@/lib/active-project';

const CreateTheme = z.object({
  name: z.string().min(1),
  tokens: z.any(),
  isDefault: z.boolean().optional()
});

export const GET = withApi('read:themes', async () => {
  const themes = await prisma.theme.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(themes.map((t) => ({
    id: t.id, name: t.name, isDefault: t.isDefault,
    tokens: JSON.parse(t.tokens)
  })));
});

export const POST = withApi('write:themes', async (req) => {
  const body = CreateTheme.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  if (body.data.isDefault) {
    await prisma.theme.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }
  const created = await prisma.theme.create({
    data: {
      name: body.data.name,
      tokens: JSON.stringify(body.data.tokens),
      isDefault: body.data.isDefault ?? false
    }
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
});
