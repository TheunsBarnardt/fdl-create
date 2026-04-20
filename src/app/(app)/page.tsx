import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { parseCollectionSchema } from '@/lib/schema-types';

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  return `Good ${part}, ${name}.`;
}

function firstName(session: { user?: { name?: string | null; email?: string | null } } | null) {
  const n = session?.user?.name;
  if (n) return n.split(' ')[0];
  const email = session?.user?.email ?? '';
  const local = email.split('@')[0] ?? '';
  return local.split(/[._-]/)[0]?.replace(/^\w/, (c) => c.toUpperCase()) || 'there';
}

function relativeTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default async function Home() {
  const session = await auth();

  const [collections, collectionsCount, pagesCount, recordsCount, recentAudits] = await Promise.all([
    prisma.collection
      .findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { _count: { select: { records: true } } }
      })
      .catch(() => []),
    prisma.collection.count().catch(() => 0),
    prisma.page.count().catch(() => 0),
    prisma.record.count().catch(() => 0),
    prisma.aiAuditLog
      .findMany({
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: { user: { select: { name: true, email: true } } }
      })
      .catch(() => [])
  ]);

  const fieldsFor = (schemaJson: string) => {
    try {
      return parseCollectionSchema(schemaJson).fields.length;
    } catch {
      return 0;
    }
  };

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Acme Studio"
        chips={<Chip tone="accent">Workspace</Chip>}
        actions={
          <div className="flex items-center gap-3 text-neutral-500">
            <span>POPIA: SA residency</span>
            <span>·</span>
            <span>
              {collectionsCount} collections · {pagesCount} pages · {recordsCount.toLocaleString()} records
            </span>
          </div>
        }
      />

      <div className="flex-1 grid grid-cols-3 gap-6 p-8 overflow-auto scrollbar">
        <div className="col-span-2 space-y-6">
          <div>
            <h1 className="display text-[42px] leading-[1.1] font-semibold mb-2">
              {greeting(firstName(session))}
            </h1>
            <p className="text-neutral-600 text-sm max-w-xl">
              Visual CMS + app-data runtime. Schema changes take effect live — no redeploys, no migrations for tenant data.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-xs text-neutral-500">
              <span className="w-5 h-5 rounded-md bg-gradient-to-br from-accent to-purple-500 text-white flex items-center justify-center text-[10px] font-bold">
                C
              </span>
              Ask Claude
            </div>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 bg-transparent text-sm focus:outline-none"
                placeholder='e.g. "add a Subscriptions collection linked to Customers"'
              />
              <span className="kbd">⌘K</span>
              <button className="px-3 py-1.5 bg-ink-950 text-paper text-xs rounded-md">Draft</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link href="/schema/new" className="chip bg-neutral-100 text-neutral-700 hover:bg-neutral-200">
                + new collection
              </Link>
              <Link href="/pages/new" className="chip bg-neutral-100 text-neutral-700 hover:bg-neutral-200">
                + new page
              </Link>
              <button className="chip bg-neutral-100 text-neutral-700 hover:bg-neutral-200">import from CSV</button>
              <button className="chip bg-neutral-100 text-neutral-700 hover:bg-neutral-200">generate seed data</button>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold text-neutral-900">Collections</h2>
              <Link href="/schema" className="text-xs text-accent hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {collections.map((c) => {
                const fields = fieldsFor(c.schema);
                const aiChip = c.aiOptIn
                  ? { tone: 'bg-ok/10 text-ok', label: 'AI: on' }
                  : { tone: 'bg-neutral-200 text-neutral-600', label: 'AI: off' };
                return (
                  <Link
                    key={c.id}
                    href={`/records/${c.name}`}
                    className="bg-white border border-neutral-200 rounded-lg p-3 hover:border-accent cursor-pointer block"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">{c.label}</div>
                      <span className={`chip ${aiChip.tone}`}>{aiChip.label}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {c._count.records.toLocaleString()} records · {fields} fields
                    </div>
                  </Link>
                );
              })}
              <Link
                href="/schema/new"
                className="bg-white border border-dashed border-neutral-300 rounded-lg p-3 flex items-center justify-center text-xs text-neutral-500 hover:border-accent cursor-pointer"
              >
                + New collection
              </Link>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-neutral-900 mb-3">Recent activity</div>
            {recentAudits.length === 0 ? (
              <p className="text-[12px] text-neutral-500">
                No activity yet. Opt in a collection under Governance to let Claude read it, and its reads/writes will log here.
              </p>
            ) : (
              <ul className="space-y-3 text-[12px] text-neutral-600">
                {recentAudits.map((a) => {
                  const dot =
                    a.action === 'write'
                      ? 'bg-accent'
                      : a.action === 'suggest'
                        ? 'bg-ok'
                        : 'bg-neutral-300';
                  const actor = a.user?.name || a.user?.email?.split('@')[0] || 'Claude';
                  return (
                    <li key={a.id} className="flex gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${dot} mt-1.5 shrink-0`} />
                      <div>
                        <b className="text-neutral-900">{actor}</b> {a.action}
                        {a.collection && (
                          <>
                            {' on '}
                            <code className="mono text-[11px]">{a.collection}</code>
                          </>
                        )}{' '}
                        · <span className="text-neutral-400">{relativeTime(a.createdAt)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="bg-gradient-to-br from-ink-950 to-ink-800 text-paper rounded-xl p-4">
            <div className="display text-base mb-1">Schema change waiting</div>
            <p className="text-xs text-white/70 mb-3">
              Claude will draft new collections from meeting transcripts once{' '}
              <Link href="/governance" className="underline">AI is opted in</Link>.
            </p>
            <div className="flex gap-2">
              <Link
                href="/schema"
                className="px-2.5 py-1.5 bg-paper text-ink-950 text-xs rounded-md font-medium"
              >
                Open schema
              </Link>
              <Link href="/governance" className="px-2.5 py-1.5 text-white/70 text-xs">
                Governance
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
