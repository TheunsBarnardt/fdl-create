import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const Create = z.object({
  name: z.string().min(1).max(64),
  signature: z.string().optional(),
  body: z.string().optional(),
});

export const GET = withApi('read:procedures', async (_req, ctx) => {
  const { id: groupId } = ctx.params!;
  const procs = await prisma.storedProcedure.findMany({
    where: { groupId },
    orderBy: { order: 'asc' },
  });
  return NextResponse.json(
    procs.map((p) => ({
      ...p,
      params: (() => { try { return JSON.parse(p.params); } catch { return []; } })(),
    }))
  );
});

export const POST = withApi('write:procedures', async (req, ctx) => {
  const { id: groupId } = ctx.params!;
  const body = Create.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const group = await prisma.procedureGroup.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  const agg = await prisma.storedProcedure.aggregate({
    where: { groupId },
    _max: { order: true },
  });
  const signature = body.data.signature || `dbo.${group.name}_${body.data.name}`;
  const defaultBody = buildDefaultBody(signature);

  const created = await prisma.storedProcedure.create({
    data: {
      groupId,
      name: body.data.name,
      signature,
      body: body.data.body ?? defaultBody,
      order: (agg._max.order ?? -1) + 1,
    },
  });
  return NextResponse.json(
    { ...created, params: [] },
    { status: 201 }
  );
});

function buildDefaultBody(signature: string): string {
  return `CREATE OR ALTER PROCEDURE ${signature}\n  @id NVARCHAR(36) = NULL\nAS\nBEGIN\n  SET NOCOUNT ON;\n\n  SELECT *\n  FROM dbo.TableName\n  WHERE (@id IS NULL OR id = @id);\nEND`;
}
