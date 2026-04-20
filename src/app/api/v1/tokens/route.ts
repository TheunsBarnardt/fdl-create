import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { SCOPES, type Scope, generateToken } from '@/lib/api-auth';

const CreateToken = z.object({
  name: z.string().min(1),
  scopes: z.array(z.enum(SCOPES as any)).min(1),
  expiresInDays: z.number().int().positive().nullable().optional()
});

export const GET = withApi('admin', async (_req, _ctx, who) => {
  const tokens = await prisma.apiToken.findMany({
    where: { userId: who.userId },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(tokens.map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    scopes: JSON.parse(t.scopes) as Scope[],
    lastUsedAt: t.lastUsedAt,
    expiresAt: t.expiresAt,
    revokedAt: t.revokedAt,
    createdAt: t.createdAt
  })));
});

export const POST = withApi('admin', async (req, _ctx, who) => {
  const body = CreateToken.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const { full, prefix, hash } = generateToken();
  const expiresAt = body.data.expiresInDays
    ? new Date(Date.now() + body.data.expiresInDays * 24 * 60 * 60 * 1000)
    : null;
  const created = await prisma.apiToken.create({
    data: {
      userId: who.userId,
      name: body.data.name,
      prefix,
      tokenHash: hash,
      scopes: JSON.stringify(body.data.scopes),
      expiresAt
    }
  });
  return NextResponse.json(
    { id: created.id, prefix: created.prefix, token: full },
    { status: 201 }
  );
});
