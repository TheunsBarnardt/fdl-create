import { Sidebar } from '@/components/sidebar';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const uid = (session?.user as any)?.id as string | undefined;
  const me = uid
    ? await prisma.user.findUnique({ where: { id: uid }, select: { role: true } }).catch(() => null)
    : null;
  const role = (me?.role as 'admin' | 'editor' | 'viewer' | undefined) ?? 'viewer';

  return (
    <div className="h-screen w-screen overflow-hidden flex">
      <Sidebar role={role} />
      <main className="flex-1 flex flex-col bg-paper overflow-hidden">{children}</main>
    </div>
  );
}
