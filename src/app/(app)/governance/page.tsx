import { prisma } from '@/lib/db';
import { parseCollectionSchema } from '@/lib/schema-types';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { GovernanceRow } from '@/components/governance-row';
import { getActiveProject } from '@/lib/active-project';

export default async function GovernancePage() {
  const project = await getActiveProject();
  const collections = await prisma.collection.findMany({ where: { projectId: project.id }, orderBy: { name: 'asc' } }).catch(() => []);
  const audits = await prisma.aiAuditLog.findMany({
    where: { OR: [{ projectId: project.id }, { projectId: null }] },
    orderBy: { createdAt: 'desc' },
    take: 30
  }).catch(() => []);

  const optInCount = collections.filter((c) => c.aiOptIn).length;

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Governance"
        chips={
          <>
            <Chip tone="accent">{collections.length} collections</Chip>
            <Chip tone="accent">{optInCount} AI opt-in</Chip>
            <Chip tone="accent">{audits.length} audit events</Chip>
          </>
        }
      />

      <div className="flex-1 overflow-auto scrollbar bg-paper p-6 space-y-4">
        <div className="bg-white border border-neutral-200 rounded-md p-4 text-[11px] text-neutral-500 leading-relaxed">
          <div className="text-sm font-semibold text-neutral-900 mb-1">POPIA-gated AI</div>
          <p>
            Per-collection opt-in, per-field redaction, full audit log. AI is off by default — enable only the collections you need, and redact any field that should never leave the database.
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-md">
          <div className="px-4 py-2 flex items-center justify-between bg-neutral-50 border-b border-neutral-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Per-collection AI opt-in
            </div>
            <span className="text-[11px] text-neutral-500">
              <span className="mono text-neutral-800 font-semibold">{optInCount}</span> / {collections.length} enabled
            </span>
          </div>

          {collections.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              No collections yet. Create one in the schema designer to configure AI access.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {collections.map((c) => {
                let fields: string[] = [];
                try {
                  fields = parseCollectionSchema(c.schema).fields.map((f) => f.name);
                } catch {}
                return (
                  <GovernanceRow
                    key={c.id}
                    name={c.name}
                    label={c.label}
                    fields={fields}
                    aiOptIn={c.aiOptIn}
                    redactions={c.redactions ? JSON.parse(c.redactions) : []}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-md">
          <div className="px-4 py-2 flex items-center justify-between bg-neutral-50 border-b border-neutral-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              AI audit log
            </div>
            <span className="text-[11px] text-neutral-500">last {audits.length} events</span>
          </div>

          {audits.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              No AI activity yet. Events are recorded every time a prompt touches tenant data.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                  <th className="text-left font-semibold px-4 py-2 w-48">When</th>
                  <th className="text-left font-semibold px-2 py-2 w-40">Action</th>
                  <th className="text-left font-semibold px-4 py-2">Collection</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2 mono text-neutral-600">
                      {a.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="px-2 py-2 mono">{a.action}</td>
                    <td className="px-4 py-2 mono text-neutral-600">
                      {a.collection ?? <span className="text-neutral-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
