import Link from 'next/link';
import { ScreenHeader, Chip } from '@/components/screen-header';

// Stub — full implementation planned:
//  · Live capture: intercept Prisma $queryRaw calls via middleware + record duration/plan
//  · Slow-query threshold configurable per workspace (default 200 ms)
//  · Each row: query text, parameters, duration, table scans, index hits, execution plan XML
//  · Flame-graph breakdown of execution plan (similar to SSMS "Actual Execution Plan")
//  · Filter by: duration range, table name, caller (API route), time window
//  · Export as .sql workload file for SSMS Tuning Advisor
//  · Alert rule: page Governance log when any query exceeds threshold N times in window W

const SAMPLE_QUERIES = [
  {
    id: 1,
    query: 'SELECT * FROM "Record" WHERE "collectionId" = @p1 ORDER BY "createdAt" DESC',
    caller: '/api/collections/customers/records',
    duration: 842,
    rows: 1204,
    scans: 2,
    status: 'slow',
  },
  {
    id: 2,
    query: 'SELECT COUNT(*) FROM "Record" WHERE "collectionId" = @p1',
    caller: '/api/collections/customers/records',
    duration: 312,
    rows: 1,
    scans: 1,
    status: 'warn',
  },
  {
    id: 3,
    query: 'SELECT * FROM "Collection" ORDER BY "name" ASC',
    caller: '/api/collections',
    duration: 18,
    rows: 7,
    scans: 0,
    status: 'ok',
  },
  {
    id: 4,
    query: 'INSERT INTO "AuditLog" ("id","action","collectionId","userId","ts") VALUES (@p1,@p2,@p3,@p4,@p5)',
    caller: '/api/governance/audit',
    duration: 9,
    rows: 1,
    scans: 0,
    status: 'ok',
  },
];

const toneCls: Record<string, string> = {
  slow: 'text-red-600 bg-red-50',
  warn: 'text-amber-600 bg-amber-50',
  ok: 'text-emerald-600 bg-emerald-50',
};

export default function SqlProfilerPage() {
  const slowCount = SAMPLE_QUERIES.filter((q) => q.status === 'slow').length;
  const warnCount = SAMPLE_QUERIES.filter((q) => q.status === 'warn').length;

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title={
          <div className="flex items-center gap-2">
            <Link href="/analytics" className="text-neutral-400 hover:text-neutral-700">Run</Link>
            <span className="text-neutral-300">/</span>
            <span>SQL Profiler</span>
          </div>
        }
        chips={
          <>
            <Chip tone="warn">coming soon</Chip>
            {slowCount > 0 && <Chip tone="danger">{slowCount} slow</Chip>}
            {warnCount > 0 && <Chip tone="warn">{warnCount} warn</Chip>}
          </>
        }
      />

      <div className="flex-1 overflow-auto scrollbar bg-paper p-6 space-y-6">

        {/* Concept callout */}
        <div className="bg-sky-50 border border-sky-200 rounded-md p-4 text-sm text-sky-800 space-y-1">
          <div className="font-semibold">SQL Profiler</div>
          <p className="text-[12px] leading-relaxed text-sky-700">
            Captures every query executed through the runtime, highlights slow ones, and shows
            the MSSQL execution plan so you can add the right index without opening SSMS.
            Threshold, retention, and alerting rules are configurable per workspace.
          </p>
        </div>

        {/* Planned feature panels */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              title: 'Slow-query capture',
              desc: 'Flag queries above your threshold (default 200 ms). See full query text, caller, row count, and scan count.',
            },
            {
              title: 'Execution plan viewer',
              desc: 'Flame-graph breakdown of the MSSQL actual execution plan. Instantly spot table scans and missing indexes.',
            },
            {
              title: 'Export & alert',
              desc: 'Export captured queries as a .sql workload file for SSMS Tuning Advisor, or set alert rules in Governance.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white border border-neutral-200 rounded-md p-4 opacity-60">
              <div className="text-xs font-semibold mb-1">{f.title}</div>
              <div className="text-[11px] text-neutral-500 leading-relaxed">{f.desc}</div>
              <div className="mt-3 inline-block text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-400 uppercase tracking-wide">Planned</div>
            </div>
          ))}
        </div>

        {/* Sample query table */}
        <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between bg-neutral-50 border-b border-neutral-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Recent queries — sample data
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-400">threshold: 200 ms</span>
              <button disabled className="text-[11px] px-2 py-1 rounded bg-neutral-100 text-neutral-400 cursor-not-allowed">▶ Start capture</button>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                <th className="text-left font-semibold px-4 py-2">Status</th>
                <th className="text-left font-semibold px-2 py-2">Query</th>
                <th className="text-left font-semibold px-2 py-2">Caller</th>
                <th className="text-right font-semibold px-2 py-2">Duration</th>
                <th className="text-right font-semibold px-2 py-2">Rows</th>
                <th className="text-right font-semibold px-4 py-2">Scans</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_QUERIES.map((q) => (
                <tr key={q.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${toneCls[q.status]}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 mono text-[11px] text-neutral-700 max-w-xs truncate">{q.query}</td>
                  <td className="px-2 py-2 mono text-[11px] text-neutral-500">{q.caller}</td>
                  <td className="px-2 py-2 text-right mono font-medium">{q.duration} ms</td>
                  <td className="px-2 py-2 text-right mono">{q.rows}</td>
                  <td className="px-4 py-2 text-right mono">{q.scans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}
