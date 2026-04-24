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
  slow: 'text-red-300 bg-red-500/15 border border-red-500/30',
  warn: 'text-amber-300 bg-amber-500/15 border border-amber-500/30',
  ok: 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30',
};

export default function SqlProfilerPage() {
  const slowCount = SAMPLE_QUERIES.filter((q) => q.status === 'slow').length;
  const warnCount = SAMPLE_QUERIES.filter((q) => q.status === 'warn').length;

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title={
          <div className="flex items-center gap-2">
            <Link href="/analytics" className="text-white/45 hover:text-white/80 transition-colors">Run</Link>
            <span className="text-white/25">/</span>
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

      <div className="flex-1 overflow-auto scrollbar p-8 space-y-6">

        {/* Concept callout */}
        <div className="relative rounded-xl p-4 overflow-hidden border border-white/[0.08] space-y-1" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.14), rgba(139,92,246,0.14))' }}>
          <div className="absolute inset-0 backdrop-blur-xl -z-10" />
          <div className="display text-base text-white">SQL Profiler</div>
          <p className="text-[12px] leading-relaxed text-white/70">
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
            <div key={f.title} className="glass-card p-4 opacity-70">
              <div className="text-xs font-semibold mb-1 text-white/95">{f.title}</div>
              <div className="text-[11px] text-white/55 leading-relaxed">{f.desc}</div>
              <div className="mt-3 inline-block text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-white/45 uppercase tracking-wide border border-white/[0.08]">Planned</div>
            </div>
          ))}
        </div>

        {/* Sample query table */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between bg-white/[0.03] border-b border-white/[0.06]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
              Recent queries — sample data
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40">threshold: 200 ms</span>
              <button disabled className="text-[11px] px-2 py-1 rounded bg-white/[0.06] text-white/40 border border-white/[0.08] cursor-not-allowed">▶ Start capture</button>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-white/45 border-b border-white/[0.06]">
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
                <tr key={q.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                  <td className="px-4 py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${toneCls[q.status]}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 mono text-[11px] text-white/85 max-w-xs truncate">{q.query}</td>
                  <td className="px-2 py-2 mono text-[11px] text-white/55">{q.caller}</td>
                  <td className="px-2 py-2 text-right mono font-medium text-white/90">{q.duration} ms</td>
                  <td className="px-2 py-2 text-right mono text-white/75">{q.rows}</td>
                  <td className="px-4 py-2 text-right mono text-white/75">{q.scans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}
