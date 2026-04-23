import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const PresetTokens = z.record(z.string(), z.any());

const CreatePreset = z.object({
  name: z.string().min(1),
  tokens: PresetTokens
});

export const GET = withApi('read:themes', async () => {
  const presets = await prisma.preset.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(presets.map((p) => ({
    id: p.id,
    name: p.name,
    tokens: JSON.parse(p.tokens),
    custom: true
  })));
});

export const POST = withApi('write:themes', async (req) => {
  const body = CreatePreset.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const created = await prisma.preset.create({
    data: {
      name: body.data.name,
      tokens: JSON.stringify(body.data.tokens)
    }
  });

  return NextResponse.json({
    id: created.id,
    name: created.name,
    tokens: JSON.parse(created.tokens),
    custom: true
  }, { status: 201 });
});
