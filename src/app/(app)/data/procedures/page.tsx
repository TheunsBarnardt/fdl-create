import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { ProceduresClient, type ProcGroup, type CollectionMeta } from './ProceduresClient';
import { ScreenHeader, Chip } from '@/components/screen-header';
import Link from 'next/link';

export default async function ProceduresPage() {
  const session = await auth();
  const email = session?.user?.email ?? '';
  const userInitials = email
    .split('@')[0]
    .split(/[._-]/)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() ?? '')
    .join('');
  // Tables may not exist yet if prisma db push hasn't been run.
  let groups: ProcGroup[] = [];
  let collections: CollectionMeta[] = [];
  let migrationPending = false;

  try {
    const [rawGroups, rawCollections] = await Promise.all([
      (prisma as any).procedureGroup.findMany({
        orderBy: { order: 'asc' },
        include: { procedures: { orderBy: { order: 'asc' } } },
      }),
      prisma.collection.findMany({ orderBy: { name: 'asc' } }),
    ]);

    groups = rawGroups.map((g: any) => ({
      id: g.id,
      name: g.name,
      order: g.order,
      procedures: g.procedures.map((p: any) => ({
        id: p.id,
        groupId: p.groupId,
        name: p.name,
        signature: p.signature,
        body: p.body,
        params: (() => { try { return JSON.parse(p.params); } catch { return []; } })(),
        status: p.status as 'draft' | 'saved' | 'deployed',
        boundTo: p.boundTo,
        order: p.order,
      })),
    }));

    collections = rawCollections.map((c: any) => ({
      id: c.id,
      name: c.name,
      label: c.label,
      schema: (() => { try { return JSON.parse(c.schema); } catch { return { fields: [] }; } })(),
    }));
  } catch {
    migrationPending = true;
  }

  if (migrationPending) {
    return (
      <section className="flex-1 flex flex-col overflow-hidden">
        <ScreenHeader
          title={
            <div className="flex items-center gap-2">
              <Link href="/data" className="text-neutral-400 hover:text-neutral-700">Data</Link>
              <span className="text-neutral-300">/</span>
              <span>Procedures</span>
            </div>
          }
          chips={<Chip tone="warn">migration required</Chip>}
        />
        <div className="flex-1 flex items-center justify-center bg-paper">
          <div className="max-w-md text-center space-y-4">
            <div className="text-2xl">🗄</div>
            <div className="font-semibold text-neutral-800">Database tables not yet created</div>
            <p className="text-sm text-neutral-500 leading-relaxed">
              The <code className="mono text-xs bg-neutral-100 px-1 rounded">ProcedureGroup</code>,{' '}
              <code className="mono text-xs bg-neutral-100 px-1 rounded">StoredProcedure</code>, and{' '}
              <code className="mono text-xs bg-neutral-100 px-1 rounded">ProcedureRevision</code> tables
              haven't been pushed to the database yet.
            </p>
            <div className="bg-neutral-950 text-neutral-100 rounded-md px-4 py-3 text-left mono text-xs space-y-1">
              <div className="text-neutral-400"># stop the dev server, then:</div>
              <div>npx prisma generate</div>
              <div>npx prisma db push</div>
            </div>
            <p className="text-xs text-neutral-400">Then restart the dev server and reload this page.</p>
          </div>
        </div>
      </section>
    );
  }

  return <ProceduresClient initialGroups={groups} collections={collections} />;
}
