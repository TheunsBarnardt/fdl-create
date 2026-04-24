import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { relativeTime } from '@/lib/logs';
import { NewUserButton, EditUserButton } from '@/components/users-actions';

const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = (typeof ROLES)[number];

export default async function UsersPage({
  searchParams
}: {
  searchParams: { q?: string; role?: string };
}) {
  const session = await auth();
  const meId = (session?.user as any)?.id as string | undefined;
  const me = meId
    ? await prisma.user.findUnique({ where: { id: meId }, select: { role: true } }).catch(() => null)
    : null;
  const isAdmin = me?.role === 'admin';

  if (!isAdmin) {
    return (
      <section className="flex-1 flex flex-col overflow-hidden">
        <ScreenHeader title="Users" chips={<Chip tone="danger">admin only</Chip>} />
        <div className="flex-1 flex items-center justify-center bg-paper">
          <div className="text-center max-w-sm">
            <div className="display text-lg mb-2">Admin access required</div>
            <p className="text-sm text-neutral-600 mb-4">
              User management is restricted to admins. Ask an admin for access.
            </p>
            <Link href="/account" className="text-accent text-sm hover:underline">
              View your account →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const q = (searchParams.q ?? '').trim();
  const roleFilter = searchParams.role && ROLES.includes(searchParams.role as Role) ? (searchParams.role as Role) : null;

  const users = await prisma.user.findMany({
    where: {
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q } },
              { name: { contains: q } }
            ]
          }
        : {})
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      disabledAt: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { tokens: true } }
    }
  });

  const totals = await prisma.user.groupBy({
    by: ['role'],
    _count: { _all: true }
  });
  const totalByRole = Object.fromEntries(totals.map((t) => [t.role, t._count._all])) as Record<string, number>;

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Users"
        chips={
          <>
            <Chip tone="accent">{users.length} shown</Chip>
            <Chip tone="accent">{totalByRole['admin'] ?? 0} admins</Chip>
            <Chip tone="accent">{totalByRole['editor'] ?? 0} editors</Chip>
            <Chip tone="accent">{totalByRole['viewer'] ?? 0} viewers</Chip>
          </>
        }
        actions={<NewUserButton />}
      />

      <div className="flex-1 overflow-auto scrollbar bg-paper p-6 space-y-4">
        <div className="bg-white border border-neutral-200 rounded-md">
          <div className="px-4 py-2 flex items-center gap-3 border-b border-neutral-200 bg-neutral-50">
            <form action="/users" method="get" className="flex items-center gap-2">
              {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
              <input
                name="q"
                defaultValue={q}
                placeholder="Search email or name…"
                className="text-xs px-2.5 py-1 border border-neutral-200 rounded-md w-72 focus:outline-none focus:border-accent"
              />
            </form>
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 mr-1">Role</span>
              <RoleFilterLink href={buildUsersHref({ q, role: null })} active={!roleFilter}>
                all
              </RoleFilterLink>
              {ROLES.map((r) => (
                <RoleFilterLink key={r} href={buildUsersHref({ q, role: r })} active={roleFilter === r}>
                  {r}
                </RoleFilterLink>
              ))}
            </div>
          </div>

          {users.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              No users match. Try clearing filters or invite someone new.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                  <th className="text-left font-semibold px-4 py-2">Email</th>
                  <th className="text-left font-semibold px-2 py-2">Name</th>
                  <th className="text-left font-semibold px-2 py-2">Role</th>
                  <th className="text-left font-semibold px-2 py-2">Status</th>
                  <th className="text-left font-semibold px-2 py-2">Last sign-in</th>
                  <th className="text-left font-semibold px-2 py-2">Created</th>
                  <th className="text-right font-semibold px-2 py-2">Tokens</th>
                  <th className="text-right font-semibold px-4 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === meId;
                  return (
                    <tr key={u.id} className="tilt-row border-b border-white/5">
                      <td className="px-4 py-2 mono">{u.email}{isSelf && <span className="ml-2 text-[10px] text-accent">you</span>}</td>
                      <td className="px-2 py-2">{u.name ?? <span className="text-neutral-400">—</span>}</td>
                      <td className="px-2 py-2">
                        <RoleChip role={u.role as Role} />
                      </td>
                      <td className="px-2 py-2">
                        {u.disabledAt ? (
                          <Chip tone="danger">Disabled</Chip>
                        ) : (
                          <Chip tone="ok">Active</Chip>
                        )}
                      </td>
                      <td className="px-2 py-2 text-neutral-600">
                        {u.lastLoginAt ? relativeTime(u.lastLoginAt) : <span className="text-neutral-400">never</span>}
                      </td>
                      <td className="px-2 py-2 text-neutral-600">{relativeTime(u.createdAt)}</td>
                      <td className="px-2 py-2 text-right mono text-neutral-600">{u._count.tokens}</td>
                      <td className="px-4 py-2 text-right">
                        <EditUserButton
                          user={{
                            id: u.id,
                            email: u.email,
                            name: u.name,
                            role: u.role as Role,
                            disabledAt: u.disabledAt ? u.disabledAt.toISOString() : null
                          }}
                          isSelf={isSelf}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-md p-4 text-[11px] text-neutral-500 leading-relaxed">
          <div className="text-sm font-semibold text-neutral-900 mb-1">Roles</div>
          <div className="grid grid-cols-3 gap-4">
            <RoleCard name="admin" desc="Full access — manage users, tokens, schemas, records, pages, themes. Can change others' roles." />
            <RoleCard name="editor" desc="Modify content — collections, records, pages, blocks, themes. Cannot manage users or issue other users' tokens." />
            <RoleCard name="viewer" desc="Read-only through the admin UI and read: API scopes. Cannot mutate." />
          </div>
        </div>
      </div>
    </section>
  );
}

function RoleCard({ name, desc }: { name: string; desc: string }) {
  return (
    <div>
      <RoleChip role={name as Role} />
      <div className="mt-1 text-[11px] text-neutral-600">{desc}</div>
    </div>
  );
}

function RoleChip({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    admin: 'bg-accent-soft text-accent',
    editor: 'bg-ok/10 text-ok',
    viewer: 'bg-neutral-100 text-neutral-700'
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${map[role]}`}>
      {role}
    </span>
  );
}

function RoleFilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-2 py-0.5 rounded border text-[11px] mono capitalize ${active ? 'border-accent bg-accent-soft text-accent' : 'border-neutral-200 hover:bg-neutral-50'}`}
    >
      {children}
    </Link>
  );
}

function buildUsersHref({ q, role }: { q?: string; role: string | null }): string {
  const u = new URLSearchParams();
  if (q) u.set('q', q);
  if (role) u.set('role', role);
  const s = u.toString();
  return `/users${s ? `?${s}` : ''}`;
}
