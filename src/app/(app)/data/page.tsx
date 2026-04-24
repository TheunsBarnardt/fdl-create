import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { parseCollectionSchema } from '@/lib/schema-types';
import { relativeTime, bucketize, rangeToSince } from '@/lib/logs';

function countRelations(fields: { label?: string }[]): number {
  return fields.filter((f) => (f.label ?? '').startsWith('→')).length;
}

export default async function DataOverviewPage() {
  const [collections, recentLogs, aiOptIn, totalRecords] = await Promise.all([
    prisma.collection.findMany({ orderBy: { name: 'asc' } }).catch(() => []),
    prisma.apiRequestLog
      .findMany({
        where: {
          createdAt: { gte: rangeToSince('24h') },
          path: { contains: '/records' }
        },
        orderBy: { createdAt: 'desc' }
      })
      .catch(() => []),
    prisma.collection.count({ where: { aiOptIn: true } }).catch(() => 0),
    prisma.record.count().catch(() => 0)
  ]);

  const recordCounts = await Promise.all(
    collections.map((c) =>
      prisma.record
        .aggregate({
          where: { collectionId: c.id },
          _count: { _all: true },
          _max: { updatedAt: true }
        })
        .catch(() => ({ _count: { _all: 0 }, _max: { updatedAt: null as Date | null } }))
    )
  );

  const totalFields = collections.reduce((sum, c) => {
    try {
      return sum + parseCollectionSchema(c.schema).fields.length;
    } catch {
      return sum;
    }
  }, 0);

  const totalRelations = collections.reduce((sum, c) => {
    try {
      return sum + countRelations(parseCollectionSchema(c.schema).fields);
    } catch {
      return sum;
    }
  }, 0);

  const writes = recentLogs.filter((l) => l.method !== 'GET').length;
  const reads = recentLogs.filter((l) => l.method === 'GET').length;

  const volume = bucketize(recentLogs, '24h');
  const maxBucket = Math.max(1, ...volume.map((b) => b.count));

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Data"
        chips={
          <>
            <Chip tone="accent">{collections.length} tables</Chip>
            <Chip tone="accent">{totalRecords.toLocaleString()} rows</Chip>
            <Chip tone="accent">{totalFields} fields</Chip>
            <Chip tone="accent">{totalRelations} relations</Chip>
            {aiOptIn > 0 && <Chip tone="warn">{aiOptIn} AI-enabled</Chip>}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/data/backups" className="px-2.5 py-1 text-xs rounded-md border border-neutral-200 hover:bg-neutral-50">
              Backups
            </Link>
            <Link href="/schema" className="px-2.5 py-1 text-xs rounded-md bg-ink-950 text-paper hover:bg-ink-900">
              + New table
            </Link>
          </div>
        }
      />

      <div className="flex-1 overflow-auto scrollbar bg-paper p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Stat label="Tables" value={collections.length.toLocaleString()} href="/records" />
          <Stat label="Rows" value={totalRecords.toLocaleString()} href="/records" />
          <Stat label="Relations" value={totalRelations.toLocaleString()} href="/data/visualizer" />
          <Stat label="Mutations (24h)" value={writes.toLocaleString()} href={`/logs?range=24h&m=POST,PATCH,DELETE&q=/records`} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white border border-neutral-200 rounded-md p-4">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-sm font-semibold">Record activity (24h)</div>
              <div className="text-[11px] text-neutral-400 mono">
                {reads} reads · {writes} writes
              </div>
            </div>
            <Volume data={volume.map((b) => b.count)} max={maxBucket} />
            <div className="flex justify-between text-[10px] text-neutral-400 mono mt-1">
              <span>{volume[0]?.t.toLocaleTimeString() ?? ''}</span>
              <span>now</span>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-md p-4">
            <div className="text-sm font-semibold mb-2">Shortcuts</div>
            <div className="space-y-1.5 text-[12px]">
              <Shortcut href="/records" label="Browse tables" subtitle="Edit rows across collections" />
              <Shortcut href="/schema" label="Design schema" subtitle="Add/remove fields live" />
              <Shortcut href="/data/visualizer" label="Visualize relations" subtitle="Collection graph" />
              <Shortcut href="/data/backups" label="Export / import" subtitle="JSON snapshots" />
              <Shortcut href="/governance" label="AI governance" subtitle="Per-collection opt-in + audit" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between bg-neutral-50 border-b border-neutral-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Tables</div>
            <Link href="/records" className="text-[11px] text-accent hover:underline">Open record editor →</Link>
          </div>
          {collections.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              No tables yet. <Link href="/schema" className="text-accent hover:underline">Create your first collection</Link>.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                  <th className="text-left font-semibold px-4 py-2">Name</th>
                  <th className="text-left font-semibold px-2 py-2">Label</th>
                  <th className="text-right font-semibold px-2 py-2">Fields</th>
                  <th className="text-right font-semibold px-2 py-2">Relations</th>
                  <th className="text-right font-semibold px-2 py-2">Rows</th>
                  <th className="text-left font-semibold px-2 py-2">AI</th>
                  <th className="text-left font-semibold px-2 py-2">Last updated</th>
                  <th className="text-right font-semibold px-4 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {collections.map((c, i) => {
                  const schema = (() => {
                    try { return parseCollectionSchema(c.schema); } catch { return { fields: [] as any[] }; }
                  })();
                  const rels = countRelations(schema.fields);
                  return (
                    <tr key={c.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-2 mono text-neutral-800">{c.name}</td>
                      <td className="px-2 py-2">{c.label}</td>
                      <td className="px-2 py-2 text-right mono text-neutral-600">{schema.fields.length}</td>
                      <td className="px-2 py-2 text-right mono text-neutral-600">{rels}</td>
                      <td className="px-2 py-2 text-right mono font-semibold">{(recordCounts[i]._count._all ?? 0).toLocaleString()}</td>
                      <td className="px-2 py-2">
                        {c.aiOptIn ? <Chip tone="warn">on</Chip> : <span className="text-neutral-400 text-[10px]">off</span>}
                      </td>
                      <td className="px-2 py-2 text-neutral-600">
                        {recordCounts[i]._max.updatedAt ? relativeTime(recordCounts[i]._max.updatedAt as Date) : <span className="text-neutral-400">—</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/records/${c.name}`} className="text-[11px] text-accent hover:underline mr-3">Rows →</Link>
                        <Link href={`/schema?collection=${c.name}`} className="text-[11px] text-neutral-500 hover:text-accent">Schema →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="bg-white border border-neutral-200 rounded-md p-4 hover:border-accent transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
        <span className="text-[10px] text-neutral-300 group-hover:text-accent">→</span>
      </div>
      <div className="display text-2xl mt-1">{value}</div>
    </Link>
  );
}

function Shortcut({ href, label, subtitle }: { href: string; label: string; subtitle: string }) {
  return (
    <Link href={href} className="block rounded px-2 py-1 -mx-2 hover:bg-neutral-50">
      <div className="font-medium">{label}</div>
      <div className="text-[10px] text-neutral-500">{subtitle}</div>
    </Link>
  );
}

function Volume({ data, max }: { data: number[]; max: number }) {
  const w = 800;
  const h = 60;
  const n = data.length;
  if (n === 0) return <div className="h-14 flex items-center justify-center text-xs text-neutral-400">No data</div>;
  const barW = w / n;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-14">
      {data.map((v, i) => {
        const barH = (v / max) * (h - 2);
        return (
          <rect
            key={i}
            x={i * barW + 0.5}
            y={h - barH}
            width={Math.max(1, barW - 1)}
            height={barH}
            className="fill-accent"
            opacity={v === 0 ? 0.12 : 0.9}
          />
        );
      })}
    </svg>
  );
}
