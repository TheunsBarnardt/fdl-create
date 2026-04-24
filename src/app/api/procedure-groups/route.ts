import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const Create = z.object({
  name: z.string().min(1).max(64),
});

export const GET = withApi('read:procedures', async () => {
  const groups = await prisma.procedureGroup.findMany({
    orderBy: { order: 'asc' },
    include: { procedures: { orderBy: { order: 'asc' } } },
  });
  return NextResponse.json(
    groups.map((g) => ({
      ...g,
      procedures: g.procedures.map((p) => ({
        ...p,
        params: (() => { try { return JSON.parse(p.params); } catch { return []; } })(),
      })),
    }))
  );
});

export const POST = withApi('write:procedures', async (req) => {
  const body = Create.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const agg = await prisma.procedureGroup.aggregate({ _max: { order: true } });
  const created = await prisma.procedureGroup.create({
    data: { name: body.data.name, order: (agg._max.order ?? -1) + 1 },
    include: { procedures: true },
  });
  return NextResponse.json({ ...created, procedures: [] }, { status: 201 });
});
