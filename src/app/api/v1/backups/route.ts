import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { parseCollectionSchema, buildRecordValidator } from '@/lib/schema-types';

export const GET = withApi('read:collections', async () => {
  const collections = await prisma.collection.findMany({ orderBy: { name: 'asc' } });
  const records = await prisma.record.findMany({ orderBy: { createdAt: 'asc' } });

  const byCol = new Map<string, { id: string; data: any; createdAt: string; updatedAt: string }[]>();
  for (const r of records) {
    const list = byCol.get(r.collectionId) ?? [];
    let data: any = {};
    try { data = JSON.parse(r.data); } catch {}
    list.push({
      id: r.id,
      data,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    });
    byCol.set(r.collectionId, list);
  }

  const snapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: collections.map((c) => {
      let schema: any = { fields: [] };
      try { schema = JSON.parse(c.schema); } catch {}
      return {
        name: c.name,
        label: c.label,
        description: c.description,
        aiOptIn: c.aiOptIn,
        redactions: c.redactions ? JSON.parse(c.redactions) : [],
        schema,
        records: byCol.get(c.id) ?? []
      };
    })
  };

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="lattice-backup-${new Date().toISOString().slice(0, 10)}.json"`
    }
  });
});

const Snapshot = z.object({
  version: z.number().optional(),
  collections: z.array(
    z.object({
      name: z.string().min(1),
      label: z.string(),
      description: z.string().nullable().optional(),
      aiOptIn: z.boolean().optional(),
      redactions: z.array(z.string()).optional(),
      schema: z.object({ fields: z.array(z.any()).min(1) }).passthrough(),
      records: z
        .array(
          z.object({
            id: z.string().optional(),
            data: z.record(z.any())
          })
        )
        .optional()
    })
  )
});

export const POST = withApi('write:collections', async (req) => {
  const body = await req.json().catch(() => null);
  const parsed = Snapshot.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const mode = (new URL(req.url).searchParams.get('mode') ?? 'merge') as 'merge' | 'replace';

  const report: { collections: number; records: number; skipped: number; errors: string[] } = {
    collections: 0,
    records: 0,
    skipped: 0,
    errors: []
  };

  for (const c of parsed.data.collections) {
    let schemaObj;
    try {
      schemaObj = parseCollectionSchema(JSON.stringify(c.schema));
    } catch (e: any) {
      report.errors.push(`${c.name}: invalid schema (${e?.message ?? 'unknown'})`);
      continue;
    }

    const upserted = await prisma.collection.upsert({
      where: { name: c.name },
      create: {
        name: c.name,
        label: c.label,
        description: c.description ?? null,
        aiOptIn: c.aiOptIn ?? false,
        redactions: c.redactions ? JSON.stringify(c.redactions) : null,
        schema: JSON.stringify(c.schema)
      },
      update: {
        label: c.label,
        description: c.description ?? null,
        aiOptIn: c.aiOptIn ?? false,
        redactions: c.redactions ? JSON.stringify(c.redactions) : null,
        schema: JSON.stringify(c.schema)
      }
    });
    report.collections += 1;

    if (mode === 'replace') {
      await prisma.record.deleteMany({ where: { collectionId: upserted.id } });
    }

    const validator = buildRecordValidator(schemaObj);
    for (const r of c.records ?? []) {
      const v = validator.safeParse(r.data);
      if (!v.success) {
        report.skipped += 1;
        continue;
      }
      try {
        await prisma.record.create({
          data: {
            collectionId: upserted.id,
            data: JSON.stringify(r.data)
          }
        });
        report.records += 1;
      } catch {
        report.skipped += 1;
      }
    }
  }

  return NextResponse.json(report);
});
