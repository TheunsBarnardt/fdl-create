import Link from 'next/link';
import { ScreenHeader, Chip } from '@/components/screen-header';

// Stub — full implementation planned:
//  · Left panel: tree of procedure groups (e.g. "Accounts" > Get, Save, Delete)
//  · Center: Monaco SQL editor with syntax highlighting + parameter table
//  · Right panel: result grid + execution plan viewer
//  · Builder mode: visual query builder that generates the EXEC body
//  · Save → persists to StoredProcedure table; version history via ProcedureRevision
//  · Collections can reference a procedure instead of a direct table query
//  · Groups prevent naming sprawl (GetAccounts / SaveAccounts → Accounts > Get / Save)

export default function ProceduresPage() {
  const groups = [
    {
      name: 'Accounts',
      procs: [
        { name: 'Get', signature: 'dbo.Accounts_Get', status: 'stub' },
        { name: 'Save', signature: 'dbo.Accounts_Save', status: 'stub' },
        { name: 'Delete', signature: 'dbo.Accounts_Delete', status: 'stub' },
      ],
    },
    {
      name: 'Users',
      procs: [
        { name: 'GetById', signature: 'dbo.Users_GetById', status: 'stub' },
        { name: 'Upsert', signature: 'dbo.Users_Upsert', status: 'stub' },
      ],
    },
  ];

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
        chips={
          <>
            <Chip tone="warn">coming soon</Chip>
            <Chip tone="neutral">{groups.length} groups</Chip>
          </>
        }
      />

      <div className="flex-1 overflow-auto scrollbar bg-paper p-6 space-y-6">

        {/* Concept callout */}
        <div className="bg-sky-50 border border-sky-200 rounded-md p-4 text-sm text-sky-800 space-y-1">
          <div className="font-semibold">Stored Procedures &amp; Functions</div>
          <p className="text-[12px] leading-relaxed text-sky-700">
            Write or build MSSQL stored procedures here, organise them into groups, and bind them
            to collections instead of direct table queries. Each group (e.g. <code>Accounts</code>)
            holds named operations (<code>Get</code>, <code>Save</code>, <code>Delete</code>) so
            your object browser stays tidy — no more <code>GetAccounts</code> / <code>SaveAccounts</code> clutter.
          </p>
        </div>

        {/* Planned feature panels */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              title: 'SQL editor',
              desc: 'Monaco-based editor with MSSQL syntax, parameter declaration table, and one-click Run.',
            },
            {
              title: 'Visual builder',
              desc: 'Point-and-click query builder that generates the procedure body — no SQL required.',
            },
            {
              title: 'Collection binding',
              desc: 'Swap a collection\'s data source from a direct table to any saved procedure.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white border border-neutral-200 rounded-md p-4 opacity-60">
              <div className="text-xs font-semibold mb-1">{f.title}</div>
              <div className="text-[11px] text-neutral-500 leading-relaxed">{f.desc}</div>
              <div className="mt-3 inline-block text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-400 uppercase tracking-wide">Planned</div>
            </div>
          ))}
        </div>

        {/* Stub group tree */}
        <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between bg-neutral-50 border-b border-neutral-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Procedure groups (example structure)</div>
            <button disabled className="text-[11px] px-2 py-1 rounded bg-neutral-100 text-neutral-400 cursor-not-allowed">+ New group</button>
          </div>
          <div className="divide-y divide-neutral-100">
            {groups.map((g) => (
              <div key={g.name}>
                <div className="px-4 py-2 flex items-center gap-2 bg-neutral-50/60">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
                    <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                  <span className="text-xs font-semibold text-neutral-700">{g.name}</span>
                  <span className="text-[10px] text-neutral-400">{g.procs.length} procedures</span>
                </div>
                {g.procs.map((p) => (
                  <div key={p.name} className="px-4 py-2 pl-10 flex items-center justify-between hover:bg-neutral-50">
                    <div className="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M7 8l3 3-3 3M13 14h4" />
                      </svg>
                      <span className="text-xs font-medium text-neutral-700">{p.name}</span>
                      <span className="text-[10px] text-neutral-400 mono">{p.signature}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip tone="neutral">stub</Chip>
                      <button disabled className="text-[11px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-400 cursor-not-allowed">Run</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
