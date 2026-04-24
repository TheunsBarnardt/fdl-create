import { Sidebar } from '@/components/sidebar';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { SessionProvider } from '@/components/session-context';
import { getActiveProject, listProjects } from '@/lib/active-project';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const uid = (session?.user as any)?.id as string | undefined;
  const me = uid
    ? await prisma.user.findUnique({ where: { id: uid }, select: { role: true } }).catch(() => null)
    : null;
  const role = (me?.role as 'admin' | 'editor' | 'viewer' | undefined) ?? 'viewer';
  const [activeProject, projects] = await Promise.all([getActiveProject(), listProjects()]);

  const email = session?.user?.email ?? '';
  const initials = email
    .split('@')[0]
    .split(/[._-]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <SessionProvider value={{ initials, email }}>
      <div className="theme-midnight ambient-bg h-screen w-screen overflow-hidden flex">
        <Sidebar role={role} activeProject={activeProject} projects={projects.map((p) => ({ id: p.id, slug: p.slug, name: p.name }))} />
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </SessionProvider>
  );
}
