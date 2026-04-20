import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { parseCollectionSchema } from '@/lib/schema-types';
import { relativeTime } from '@/lib/logs';

export default async function RecordsOverviewPage() {
  const collections = await prisma.collection
    .findMany({ orderBy: { name: 'asc' } })
    .catch(() => []);

  const counts = await Promise.all(
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

  const totalRecords = counts.reduce((sum, c) => sum + (c._count._all ?? 0), 0);

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Record editor"
        chips={
          <>
            <Chip tone="accent">{collections.length} collections</Chip>
            <Chip tone="neutral">{totalRecords.toLocaleString()} records</Chip>
          </>
        }
        actions={
          <Link
            href="/schema"
            className="px-2.5 py-1 text-xs rounded-md border border-neutral-200 hover:bg-neutral-50"
          >
            Open schema designer →
          </Link>
        }
      />

      <div className="flex-1 overflow-auto scrollbar bg-paper p-6 space-y-6">
        <div className="bg-white border border-neutral-200 rounded-md p-4">
          <div className="text-sm font-semibold mb-1">Collections</div>
          <div className="text-[11px] text-neutral-500 leading-relaxed">
            Every collection is a schema-as-data table — define fields once, write rows that match, and the REST API is auto-exposed at{' '}
            <span className="mono text-neutral-700">/api/collections/&lt;name&gt;/records</span>. Schema changes take effect live.
          </div>
        </div>

        {collections.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-md p-12 text-center">
            <div className="text-sm font-semibold mb-1">No collections yet</div>
            <div className="text-[11px] text-neutral-500 mb-4">
              Head to the schema designer to create your first collection.
            </div>
            <Link
              href="/schema"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-ink-950 text-paper hover:bg-ink-900"
            >
              Create collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {collections.map((c, i) => {
              const schema = parseCollectionSchema(c.schema);
              const recordCount = counts[i]._count._all ?? 0;
              const lastUpdated = counts[i]._max.updatedAt;
              const preview = schema.fields.slice(0, 4);
              return (
                <Link
                  key={c.id}
                  href={`/records/${c.name}`}
                  className="group bg-white border border-neutral-200 rounded-md p-4 hover:border-accent transition-colors flex flex-col"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="display text-base leading-tight">{c.label}</div>
                      <div className="mono text-[11px] text-neutral-500 mt-0.5">{c.name}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.aiOptIn && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-accent-soft text-accent rounded font-semibold">
                          AI
                        </span>
                      )}
                    </div>
                  </div>

                  {c.description && (
                    <div className="text-[11px] text-neutral-500 mb-3 line-clamp-2">{c.description}</div>
                  )}

                  <div className="space-y-1 mb-3 mono text-[11px] flex-1">
                    {preview.map((f) => (
                      <div key={f.name} className="flex items-center gap-2 text-neutral-600">
                        <span className="truncate">{f.name}</span>
                        <span className="text-neutral-400">{f.type}</span>
                        {f.required && <span className="text-warn text-[9px]">REQ</span>}
                      </div>
                    ))}
                    {schema.fields.length > preview.length && (
                      <div className="text-neutral-400 text-[10px]">
                        + {schema.fields.length - preview.length} more
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                    <span>
                      <span className="mono text-neutral-800 font-semibold">{recordCount.toLocaleString()}</span> rows
                    </span>
                    <span>
                      {lastUpdated ? `updated ${relativeTime(lastUpdated)}` : 'no records'}
                    </span>
                    <span className="text-neutral-300 group-hover:text-accent">open →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
