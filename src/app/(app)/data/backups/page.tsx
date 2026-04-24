import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { BackupsImport } from '@/components/backups-import';
import { getActiveProject } from '@/lib/active-project';

export default async function BackupsPage() {
  const project = await getActiveProject();
  const [collections, totalRecords] = await Promise.all([
    prisma.collection.findMany({ where: { projectId: project.id }, orderBy: { name: 'asc' } }).catch(() => []),
    prisma.record.count({ where: { collection: { projectId: project.id } } }).catch(() => 0)
  ]);

  const counts = await Promise.all(
    collections.map((c) => prisma.record.count({ where: { collectionId: c.id } }).catch(() => 0))
  );

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title={
          <div className="flex items-center gap-2">
            <Link href="/data" className="text-neutral-400 hover:text-neutral-700">Data</Link>
            <span className="text-neutral-300">/</span>
            <span>Backups</span>
          </div>
        }
        chips={
          <>
            <Chip tone="accent">{collections.length} tables</Chip>
            <Chip tone="accent">{totalRecords.toLocaleString()} rows</Chip>
          </>
        }
      />

      <div className="flex-1 overflow-auto scrollbar bg-paper p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200 rounded-md p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-semibold">Export snapshot</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Downloads every collection's schema and all rows as a single JSON file.
                </div>
              </div>
              <Chip tone="ok">{collections.length} tables</Chip>
            </div>
            <ul className="text-[11px] text-neutral-500 space-y-1 mb-4">
              <li>· Includes schema, AI opt-in, redactions, and records</li>
              <li>· Does not include users, tokens, or logs</li>
              <li>· Safe to commit — contains no secrets or hashes</li>
            </ul>
            <a
              href="/api/v1/backups"
              className="inline-block px-3 py-1.5 text-xs rounded-md bg-ink-950 text-paper hover:bg-ink-900"
              download
            >
              ↓ Download JSON
            </a>
          </div>

          <div className="bg-white border border-neutral-200 rounded-md p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-semibold">Import snapshot</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Upload a previously exported JSON file. Collections are upserted by name.
                </div>
              </div>
              <Chip tone="warn">careful</Chip>
            </div>
            <BackupsImport />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between bg-neutral-50 border-b border-neutral-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              What's in the snapshot
            </div>
            <Link href="/data" className="text-[11px] text-neutral-500 hover:text-accent">Back to data →</Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                <th className="text-left font-semibold px-4 py-2">Table</th>
                <th className="text-left font-semibold px-2 py-2">Label</th>
                <th className="text-right font-semibold px-2 py-2">Rows</th>
                <th className="text-left font-semibold px-2 py-2">AI</th>
                <th className="text-right font-semibold px-4 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((c, i) => (
                <tr key={c.id} className="border-b border-neutral-100">
                  <td className="px-4 py-2 mono text-neutral-800">{c.name}</td>
                  <td className="px-2 py-2">{c.label}</td>
                  <td className="px-2 py-2 text-right mono">{counts[i].toLocaleString()}</td>
                  <td className="px-2 py-2">
                    {c.aiOptIn ? <Chip tone="warn">on</Chip> : <span className="text-neutral-400 text-[10px]">off</span>}
                  </td>
                  <td className="px-4 py-2 text-right text-neutral-500 mono text-[11px]">
                    {c.updatedAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
              {collections.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-sm text-neutral-500">
                    No tables yet. <Link href="/schema" className="text-accent hover:underline">Create your first collection</Link>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
