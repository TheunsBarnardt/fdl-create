import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { getActiveProject, listProjects } from '@/lib/active-project';
import { activateProject, createProject, deleteProject } from './projects/actions';

async function countsFor(projectId: string) {
  const [collections, pages, records] = await Promise.all([
    prisma.collection.count({ where: { projectId } }).catch(() => 0),
    prisma.page.count({ where: { projectId } }).catch(() => 0),
    prisma.record.count({ where: { collection: { projectId } } }).catch(() => 0)
  ]);
  return { collections, pages, records };
}

function relativeTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const h = Math.round(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default async function WorkspaceProjects() {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  const me = uid
    ? await prisma.user.findUnique({ where: { id: uid }, select: { role: true } }).catch(() => null)
    : null;
  const isAdmin = me?.role === 'admin';

  const [projects, active] = await Promise.all([listProjects(), getActiveProject()]);
  const withCounts = await Promise.all(
    projects.map(async (p) => ({ ...p, counts: await countsFor(p.id) }))
  );

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Projects"
        chips={<Chip tone="accent">Workspace</Chip>}
        actions={
          <div className="flex items-center gap-3 text-white/50">
            <span>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
          </div>
        }
      />

      <div className="flex-1 p-8 overflow-auto scrollbar space-y-8">
        <div>
          <h1 className="display text-[36px] leading-[1.08] font-semibold mb-2 heading-gradient tracking-tight">
            Your projects
          </h1>
          <p className="text-white/55 text-sm max-w-xl leading-relaxed">
            Each project is an isolated site with its own schema, pages, theme, and assets. Pick one to enter its studio.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {withCounts.map((p) => {
            const isActive = p.id === active.id;
            return (
              <div key={p.id} className="glass-card glow-ring p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-[15px] text-white/95">{p.name}</div>
                    <div className="text-[11px] text-white/45 mono mt-0.5">{p.slug}</div>
                  </div>
                  {isActive && <span className="chip chip-glass-ok text-[10px]">active</span>}
                </div>
                {p.description && (
                  <p className="text-xs text-white/55 leading-relaxed line-clamp-2">{p.description}</p>
                )}
                <div className="text-[11px] text-white/45">
                  {p.counts.collections} collections · {p.counts.pages} pages · {p.counts.records.toLocaleString()} records
                </div>
                <div className="text-[10px] text-white/30">
                  Updated {relativeTime(p.updatedAt)}
                </div>
                <div className="flex items-center gap-2 pt-2 mt-auto border-t border-white/[0.06]">
                  <form action={activateProject.bind(null, p.slug, '/dashboard')}>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs rounded-md font-medium shadow-accent-glow transition-colors"
                    >
                      Open →
                    </button>
                  </form>
                  {isAdmin && p.slug !== 'default' && (
                    <form action={deleteProject.bind(null, p.slug)} className="ml-auto">
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 text-xs text-white/40 hover:text-rose-300 transition-colors"
                      >
                        Delete
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}

          {isAdmin && (
            <form
              action={createProject}
              className="glass-card p-5 border border-dashed border-white/15 flex flex-col gap-3 hover:border-sky-500/40 transition-colors"
            >
              <div className="font-medium text-[15px] text-white/95">+ Create project</div>
              <input
                name="name"
                required
                placeholder="Name (e.g. Marketing site)"
                className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-sky-500/60"
              />
              <input
                name="slug"
                placeholder="slug (auto-derived if empty)"
                pattern="[a-z][a-z0-9-]*"
                className="mono bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white/90 placeholder-white/30 focus:outline-none focus:border-sky-500/60"
              />
              <input
                name="description"
                placeholder="Description (optional)"
                maxLength={200}
                className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white/80 placeholder-white/30 focus:outline-none focus:border-sky-500/60"
              />
              <button
                type="submit"
                className="mt-auto px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs rounded-md font-medium shadow-accent-glow transition-colors"
              >
                Create
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
