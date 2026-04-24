import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { parseCollectionSchema } from '@/lib/schema-types';
import { getActiveProject } from '@/lib/active-project';

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
  const project = await getActiveProject();

  const [collections, collectionsCount, pagesCount, recordsCount, recentAudits] = await Promise.all([
    prisma.collection
      .findMany({
        where: { projectId: project.id },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { _count: { select: { records: true } } }
      })
      .catch(() => []),
    prisma.collection.count({ where: { projectId: project.id } }).catch(() => 0),
    prisma.page.count({ where: { projectId: project.id } }).catch(() => 0),
    prisma.record.count({ where: { collection: { projectId: project.id } } }).catch(() => 0),
    prisma.aiAuditLog
      .findMany({
        where: { OR: [{ projectId: project.id }, { projectId: null }] },
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
        title={project.name}
        chips={<Chip tone="accent">Project · {project.slug}</Chip>}
        actions={
          <div className="flex items-center gap-3 text-white/50">
            <span>POPIA: SA residency</span>
            <span className="text-white/25">·</span>
            <span>
              {collectionsCount} collections · {pagesCount} pages · {recordsCount.toLocaleString()} records
            </span>
          </div>
        }
      />

      <div className="flex-1 grid grid-cols-3 gap-6 p-8 overflow-auto scrollbar">
        <div className="col-span-2 space-y-6">
          <div>
            <h1 className="display text-[44px] leading-[1.05] font-semibold mb-3 heading-gradient tracking-tight">
              {greeting(firstName(session))}
            </h1>
            <p className="text-white/55 text-sm max-w-xl leading-relaxed">
              Visual CMS + app-data runtime. Schema changes take effect live — no redeploys, no migrations for tenant data.
            </p>
          </div>

          <div className="glass-card glow-ring p-5">
            <div className="flex items-center gap-2 mb-3 text-xs text-white/55">
              <span className="w-5 h-5 rounded-md bg-gradient-to-br from-sky-400 to-violet-500 text-white flex items-center justify-center text-[10px] font-bold shadow-[0_0_12px_rgba(14,165,233,0.4)]">
                C
              </span>
              Ask Claude
            </div>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/30 focus:outline-none"
                placeholder='e.g. "add a Subscriptions collection linked to Customers"'
              />
              <span className="kbd" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>⌘K</span>
              <button className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs rounded-md font-medium shadow-accent-glow transition-colors">Draft</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Link href="/schema/new" className="chip chip-glass-neutral hover:bg-white/[0.1] transition-colors">
                + new collection
              </Link>
              <Link href="/pages/new" className="chip chip-glass-neutral hover:bg-white/[0.1] transition-colors">
                + new page
              </Link>
              <button className="chip chip-glass-neutral hover:bg-white/[0.1] transition-colors">import from CSV</button>
              <button className="chip chip-glass-neutral hover:bg-white/[0.1] transition-colors">generate seed data</button>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">Collections</h2>
              <Link href="/schema" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {collections.map((c) => {
                const fields = fieldsFor(c.schema);
                const aiChip = c.aiOptIn
                  ? { tone: 'chip-glass-ok', label: 'AI: on' }
                  : { tone: 'chip-glass-neutral', label: 'AI: off' };
                return (
                  <Link
                    key={c.id}
                    href={`/records/${c.name}`}
                    className="glass-card glow-ring p-3.5 cursor-pointer block"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm text-white/95">{c.label}</div>
                      <span className={`chip ${aiChip.tone}`}>{aiChip.label}</span>
                    </div>
                    <div className="text-[11px] text-white/45">
                      {c._count.records.toLocaleString()} records · {fields} fields
                    </div>
                  </Link>
                );
              })}
              <Link
                href="/schema/new"
                className="rounded-xl border border-dashed border-white/15 p-3.5 flex items-center justify-center text-xs text-white/45 hover:text-sky-400 hover:border-sky-500/40 cursor-pointer transition-colors"
              >
                + New collection
              </Link>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="glass-card p-4">
            <div className="text-[11px] font-semibold text-white/45 uppercase tracking-wider mb-3">Recent activity</div>
            {recentAudits.length === 0 ? (
              <p className="text-[12px] text-white/55 leading-relaxed">
                No activity yet. Opt in a collection under Governance to let Claude read it, and its reads/writes will log here.
              </p>
            ) : (
              <ul className="space-y-3 text-[12px] text-white/65">
                {recentAudits.map((a) => {
                  const dot =
                    a.action === 'write'
                      ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                      : a.action === 'suggest'
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                        : 'bg-white/25';
                  const actor = a.user?.name || a.user?.email?.split('@')[0] || 'Claude';
                  return (
                    <li key={a.id} className="flex gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${dot} mt-1.5 shrink-0`} />
                      <div>
                        <b className="text-white/95 font-medium">{actor}</b> {a.action}
                        {a.collection && (
                          <>
                            {' on '}
                            <code className="mono text-[11px] text-sky-300">{a.collection}</code>
                          </>
                        )}{' '}
                        · <span className="text-white/35">{relativeTime(a.createdAt)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="relative rounded-xl p-4 overflow-hidden border border-white/[0.08]" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.14), rgba(139,92,246,0.14))' }}>
            <div className="absolute inset-0 backdrop-blur-xl -z-10" />
            <div className="display text-base mb-1 text-white">Schema change waiting</div>
            <p className="text-xs text-white/65 mb-3 leading-relaxed">
              Claude will draft new collections from meeting transcripts once{' '}
              <Link href="/governance" className="text-sky-300 underline underline-offset-2 hover:text-sky-200">AI is opted in</Link>.
            </p>
            <div className="flex gap-2">
              <Link
                href="/schema"
                className="px-2.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs rounded-md font-medium shadow-accent-glow transition-colors"
              >
                Open schema
              </Link>
              <Link href="/governance" className="px-2.5 py-1.5 text-white/70 hover:text-white text-xs transition-colors">
                Governance
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
