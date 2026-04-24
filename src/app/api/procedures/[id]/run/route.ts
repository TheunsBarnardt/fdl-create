import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';

const RunBody = z.object({
  action: z.enum(['deploy', 'exec']).default('exec'),
  testValues: z.record(z.string()).default({}),
});

type ProcParam = { name: string; sqlType: string; direction: string; testValue: string };

function serializeValue(v: unknown): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, serializeValue(val)])
    );
  }
  return v;
}

// Extract the SELECT body from a CREATE PROCEDURE block and substitute @params with literal values.
// This lets the query run against any DB (SQLite in dev, MSSQL in prod).
function buildInlineQuery(body: string, params: ProcParam[], testValues: Record<string, string>): string {
  // Extract content between BEGIN...END
  let sql = body;
  const beginIdx = body.search(/\bBEGIN\b/i);
  // Find the last END in the string (handles nested BEGIN/END in theory)
  const endMatch = [...body.matchAll(/\bEND\b/gi)];
  const lastEnd = endMatch[endMatch.length - 1];
  if (beginIdx !== -1 && lastEnd && lastEnd.index! > beginIdx) {
    sql = body.slice(beginIdx + 5, lastEnd.index);
  }

  // Remove SET NOCOUNT ON
  sql = sql.replace(/\bSET\s+NOCOUNT\s+ON\s*;?\s*/gi, '');

  // Strip schema prefixes from table references so the query works on SQLite:
  //   dbo.Customers → Customers
  //   [dbo].[Customers] → Customers
  sql = sql.replace(/\bFROM\s+\[?\w+\]?\.\[?(\w+)\]?/gi, 'FROM $1');
  sql = sql.replace(
    /\b((?:(?:INNER|LEFT|RIGHT|FULL|CROSS)\s+)?(?:OUTER\s+)?JOIN)\s+\[?\w+\]?\.\[?(\w+)\]?/gi,
    '$1 $2',
  );

  // Substitute @params — longest name first to avoid partial replacement (@userId before @user)
  const sorted = [...params].sort((a, b) => b.name.length - a.name.length);
  for (const p of sorted) {
    const rawVal = testValues[p.name] ?? p.testValue ?? '';
    const sqlType = p.sqlType.toUpperCase();
    const isNumeric = /^(INT|BIGINT|SMALLINT|TINYINT|DECIMAL|FLOAT|NUMERIC|BIT)/.test(sqlType);

    let literal: string;
    if (!rawVal || rawVal.toUpperCase() === 'NULL') {
      literal = 'NULL';
    } else if (isNumeric) {
      literal = rawVal;
    } else {
      literal = `'${rawVal.replace(/'/g, "''")}'`;
    }

    const escapedParamName = p.name.replace(/[@$]/g, '\\$&');
    sql = sql.replace(new RegExp(`${escapedParamName}\\b`, 'gi'), literal);
  }

  // Pull out just the first SELECT statement (drop anything after the first semicolon-terminated statement)
  const selectMatch = sql.match(/\bSELECT\b[\s\S]+/i);
  if (selectMatch) sql = selectMatch[0];

  // Strip trailing semicolon and whitespace
  return sql.trim().replace(/;\s*$/, '');
}

export const POST = withApi('write:procedures', async (req, ctx) => {
  const { id } = ctx.params!;
  const body = RunBody.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const proc = await prisma.storedProcedure.findUnique({ where: { id } });
  if (!proc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { action, testValues } = body.data;
  let params: ProcParam[] = [];
  try { params = JSON.parse(proc.params); } catch { params = []; }

  // ---- Deploy only ----
  if (action === 'deploy') {
    try {
      await prisma.$executeRawUnsafe(proc.body);
      await prisma.storedProcedure.update({ where: { id }, data: { status: 'deployed' } });
      return NextResponse.json({ deployed: true, signature: proc.signature });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 422 });
    }
  }

  // ---- Exec (preview run) ----
  // Strategy 1: deploy + EXEC (MSSQL)
  let rows: Record<string, unknown>[] | null = null;
  let deployed = false;

  if (proc.body.trim()) {
    try {
      await prisma.$executeRawUnsafe(proc.body);
      deployed = true;
      await prisma.storedProcedure.update({ where: { id }, data: { status: 'deployed' } });

      const inParams = params.filter((p) => p.direction !== 'OUT');
      const paramParts = inParams
        .map((p) => {
          const val = testValues[p.name] ?? p.testValue ?? '';
          const sqlType = p.sqlType.toUpperCase();
          if (!val || val.toUpperCase() === 'NULL') return `${p.name} = NULL`;
          if (/^(INT|BIGINT|SMALLINT|TINYINT|DECIMAL|FLOAT|NUMERIC|BIT)/.test(sqlType)) {
            return `${p.name} = ${val}`;
          }
          return `${p.name} = N'${val.replace(/'/g, "''")}'`;
        })
        .join(', ');

      const execSql = `EXEC ${proc.signature}${paramParts ? ` ${paramParts}` : ''}`;
      rows = await prisma.$queryRawUnsafe(execSql) as Record<string, unknown>[];
    } catch {
      // Strategy 2: extract SELECT from body and run directly (works on SQLite dev DB)
    }
  }

  // Strategy 2: inline SELECT with @param substitution
  let devFallbackNote: string | undefined;
  if (rows === null) {
    const inlineSql = buildInlineQuery(proc.body, params, testValues);
    if (!inlineSql) {
      return NextResponse.json({ error: 'No SELECT statement found in procedure body.' }, { status: 422 });
    }

    try {
      rows = await prisma.$queryRawUnsafe(inlineSql) as Record<string, unknown>[];
    } catch (inlineErr: unknown) {
      const inlineMsg = inlineErr instanceof Error ? inlineErr.message : String(inlineErr);

      // Strategy 3: SQLite dev fallback — the collection's data lives in the Record table as JSON,
      // not as a native SQL table. Detect "no such table: <name>" and serve from the record store.
      const noTable = inlineMsg.match(/no such table[:\s]+[`'"]?(\w+)[`'"]?/i)
        ?? inlineMsg.match(/Invalid object name '?(\w+)'?/i);

      if (noTable) {
        const tableName = noTable[1].toLowerCase();
        const coll = await prisma.collection.findFirst({
          where: { name: { equals: tableName, mode: 'insensitive' } },
        });

        if (coll) {
          const records = await prisma.record.findMany({
            where: { collectionId: coll.id },
            orderBy: { createdAt: 'asc' },
            take: 200,
          });
          rows = records.map((r) => {
            try { return JSON.parse(r.data) as Record<string, unknown>; } catch { return {}; }
          });
          devFallbackNote = `Dev preview: data from Collection '${coll.label}' record store — not a live SQL query. Deploy to MSSQL for real EXEC.`;
        }
      }

      if (rows === null) {
        return NextResponse.json({ error: inlineMsg }, { status: 422 });
      }
    }
  }

  const serialized = (rows ?? []).map(serializeValue) as Record<string, unknown>[];
  const columns = serialized.length > 0 ? Object.keys(serialized[0]) : [];

  return NextResponse.json({
    columns,
    rows: serialized,
    rowCount: serialized.length,
    deployed,
    note: devFallbackNote ?? (deployed ? undefined : 'Ran as inline query (MSSQL required for EXEC).'),
  });
});
