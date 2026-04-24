import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const ProcParam = z.object({
  name: z.string(),
  sqlType: z.string(),
  direction: z.enum(['IN', 'OUT']).default('IN'),
  defaultValue: z.string().default('NULL'),
  testValue: z.string().default(''),
});

const Update = z.object({
  name: z.string().min(1).max(64).optional(),
  signature: z.string().optional(),
  body: z.string().optional(),
  params: z.array(ProcParam).optional(),
  status: z.enum(['draft', 'saved', 'deployed']).optional(),
  boundTo: z.string().nullable().optional(),
});

export const GET = withApi('read:procedures', async (_req, ctx) => {
  const { id } = ctx.params!;
  const proc = await prisma.storedProcedure.findUnique({
    where: { id },
    include: { revisions: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });
  if (!proc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    ...proc,
    params: (() => { try { return JSON.parse(proc.params); } catch { return []; } })(),
  });
});

export const PATCH = withApi('write:procedures', async (req, ctx) => {
  const { id } = ctx.params!;
  const body = Update.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const existing = await prisma.storedProcedure.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.data.name !== undefined) data.name = body.data.name;
  if (body.data.signature !== undefined) data.signature = body.data.signature;
  if (body.data.status !== undefined) data.status = body.data.status;
  if (body.data.boundTo !== undefined) data.boundTo = body.data.boundTo;

  if (body.data.body !== undefined || body.data.params !== undefined) {
    const newBody = body.data.body ?? existing.body;
    const newParams = body.data.params !== undefined
      ? JSON.stringify(body.data.params)
      : existing.params;

    // Save revision before overwriting
    if (body.data.body !== undefined && body.data.body !== existing.body) {
      await prisma.procedureRevision.create({
        data: { procedureId: id, body: existing.body, params: existing.params },
      });
    }
    data.body = newBody;
    data.params = newParams;
  }

  const updated = await prisma.storedProcedure.update({ where: { id }, data });
  return NextResponse.json({
    ...updated,
    params: (() => { try { return JSON.parse(updated.params); } catch { return []; } })(),
  });
});

export const DELETE = withApi('write:procedures', async (_req, ctx) => {
  const { id } = ctx.params!;
  await prisma.storedProcedure.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
