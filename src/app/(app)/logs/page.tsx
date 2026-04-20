import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { bucketize, rangeToSince, statusClass, relativeTime, formatDuration, type TimeRange } from '@/lib/logs';

type Row = {
  id: string;
  createdAt: Date;
  type: 'api' | 'ai';
  method: string;
  path: string;
  status: number | null;
  durationMs: number | null;
  actor: string;
};

const RANGES: Array<{ key: TimeRange; label: string }> = [
  { key: '15m', label: 'Last 15 min' },
  { key: '1h', label: 'Last 1 hour' },
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' }
];

const METHODS = ['GET', 'POST', 'PATCH', 'DELETE'] as const;
const STATUS_CLASSES = ['2xx', '3xx', '4xx', '5xx'] as const;

function buildQs(params: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) u.set(k, v);
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

export default async function LogsPage({
  searchParams
}: {
  searchParams: { range?: TimeRange; m?: string; s?: string; q?: string; id?: string };
}) {
  const range = (searchParams.range as TimeRange) ?? '24h';
  const methodFilter = searchParams.m ? searchParams.m.split(',') : [];
  const statusFilter = searchParams.s ? searchParams.s.split(',') : [];
  const pathQuery = (searchParams.q ?? '').trim();
  const since = rangeToSince(range);

  const [apiLogs, aiLogs, users, tokens] = await Promise.all([
    prisma.apiRequestLog.findMany({
      where: {
        createdAt: { gte: since },
        ...(methodFilter.length > 0 ? { method: { in: methodFilter } } : {}),
        ...(pathQuery ? { path: { contains: pathQuery } } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    }).catch(() => []),
    prisma.aiAuditLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 100
    }).catch(() => []),
    prisma.user.findMany({ select: { id: true, email: true } }).catch(() => []),
    prisma.apiToken.findMany({ select: { id: true, name: true, prefix: true } }).catch(() => [])
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.email]));
  const tokenMap = new Map(tokens.map((t) => [t.id, `${t.name} (${t.prefix})`]));
  const apiMap = new Map(apiLogs.map((l) => [l.id, l]));
  const aiMap = new Map(aiLogs.map((l) => [l.id, l]));

  const unified: Row[] = [
    ...apiLogs.map((r): Row => ({
      id: r.id,
      createdAt: r.createdAt,
      type: 'api',
      method: r.method,
      path: r.path,
      status: r.status,
      durationMs: r.durationMs,
      actor: r.tokenId ? tokenMap.get(r.tokenId) ?? 'token' : r.userId ? userMap.get(r.userId) ?? 'user' : 'anon'
    })),
    ...aiLogs.map((r): Row => ({
      id: r.id,
      createdAt: r.createdAt,
      type: 'ai',
      method: 'AI',
      path: `${r.action} ${r.collection ?? ''}`.trim(),
      status: null,
      durationMs: null,
      actor: r.userId ? userMap.get(r.userId) ?? 'user' : 'anon'
    }))
  ]
    .filter((r) => {
      if (statusFilter.length > 0 && r.status !== null) {
        if (!statusFilter.includes(statusClass(r.status))) return false;
      }
      if (methodFilter.length > 0 && !methodFilter.includes(r.method)) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const histogram = bucketize(unified, range);
  const maxBucket = Math.max(1, ...histogram.map((b) => b.count));

  const selectedKey = searchParams.id ?? null;
  const [selType, selId] = selectedKey ? selectedKey.split(':') : [null, null];
  const selectedApi = selType === 'api' && selId ? apiMap.get(selId) ?? null : null;
  const selectedAi = selType === 'ai' && selId ? aiMap.get(selId) ?? null : null;

  const baseQs = {
    range,
    m: methodFilter.join(',') || undefined,
    s: statusFilter.join(',') || undefined,
    q: pathQuery || undefined
  };

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Logs"
        chips={<Chip tone="accent">{unified.length} events</Chip>}
        actions={
          <div className="flex items-center gap-2">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/logs${buildQs({ ...baseQs, range: r.key, id: searchParams.id })}`}
                className={`px-2.5 py-1 border rounded-md ${range === r.key ? 'border-accent bg-accent-soft text-accent' : 'border-neutral-200 hover:bg-neutral-50'}`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-3 border-b border-neutral-200 bg-white">
            <div className="flex items-baseline justify-between mb-1">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">Request volume</div>
              <div className="text-[10px] text-neutral-400 mono">
                {histogram[0]?.t.toLocaleTimeString() ?? ''} → now
              </div>
            </div>
            <Histogram data={histogram.map((b) => b.count)} max={maxBucket} />
          </div>

          <div className="px-6 py-3 border-b border-neutral-200 bg-white flex items-center gap-3 flex-wrap">
            <FilterGroup param="m" label="Method" options={METHODS as readonly string[]} current={methodFilter} base={baseQs} selected={searchParams.id} />
            <FilterGroup param="s" label="Status" options={STATUS_CLASSES as readonly string[]} current={statusFilter} base={baseQs} selected={searchParams.id} />
            <form action="/logs" method="get" className="flex items-center gap-2 ml-auto">
              <input type="hidden" name="range" value={range} />
              {methodFilter.length > 0 && <input type="hidden" name="m" value={methodFilter.join(',')} />}
              {statusFilter.length > 0 && <input type="hidden" name="s" value={statusFilter.join(',')} />}
              <input
                name="q"
                defaultValue={pathQuery}
                placeholder="Search path…"
                className="text-xs px-2.5 py-1 border border-neutral-200 rounded-md w-64 mono focus:outline-none focus:border-accent"
              />
            </form>
          </div>

          <div className="flex-1 overflow-auto scrollbar bg-white">
            {unified.length === 0 ? (
              <div className="p-12 text-center text-sm text-neutral-500">
                No events in range. Click around the app to generate requests.
              </div>
            ) : (
              <table className="w-full text-xs mono">
                <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
                  <tr className="text-[10px] uppercase tracking-wider text-neutral-500">
                    <th className="text-left font-semibold px-4 py-2 w-40">Time</th>
                    <th className="text-left font-semibold px-2 py-2 w-20">Method</th>
                    <th className="text-left font-semibold px-2 py-2">Path</th>
                    <th className="text-left font-semibold px-2 py-2 w-20">Status</th>
                    <th className="text-right font-semibold px-2 py-2 w-24">Duration</th>
                    <th className="text-left font-semibold px-2 py-2 w-56">Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {unified.map((r) => {
                    const key = `${r.type}:${r.id}`;
                    const isSelected = selectedKey === key;
                    return (
                      <tr
                        key={key}
                        className={`border-b border-neutral-100 cursor-pointer ${isSelected ? 'bg-accent-soft' : 'hover:bg-neutral-50'}`}
                      >
                        <LinkCell href={`/logs${buildQs({ ...baseQs, id: key })}`} className="px-4 py-1.5 text-neutral-500">
                          {relativeTime(r.createdAt)}
                        </LinkCell>
                        <LinkCell href={`/logs${buildQs({ ...baseQs, id: key })}`} className="px-2 py-1.5">
                          <MethodBadge method={r.method} type={r.type} />
                        </LinkCell>
                        <LinkCell href={`/logs${buildQs({ ...baseQs, id: key })}`} className="px-2 py-1.5 truncate max-w-[480px]">
                          {r.path}
                        </LinkCell>
                        <LinkCell href={`/logs${buildQs({ ...baseQs, id: key })}`} className="px-2 py-1.5">
                          {r.status !== null ? <StatusBadge status={r.status} /> : <span className="text-neutral-400">—</span>}
                        </LinkCell>
                        <LinkCell href={`/logs${buildQs({ ...baseQs, id: key })}`} className="px-2 py-1.5 text-right text-neutral-600">
                          {r.durationMs !== null ? formatDuration(r.durationMs) : '—'}
                        </LinkCell>
                        <LinkCell href={`/logs${buildQs({ ...baseQs, id: key })}`} className="px-2 py-1.5 truncate text-neutral-600">
                          {r.actor}
                        </LinkCell>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {(selectedApi || selectedAi) && (
          <aside className="w-96 shrink-0 border-l border-neutral-200 bg-white flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-neutral-400">Event detail</div>
                <div className="display text-base leading-tight mt-0.5">
                  {selectedApi ? `${selectedApi.method} ${selectedApi.path}` : selectedAi ? `AI · ${selectedAi.action}` : ''}
                </div>
              </div>
              <Link
                href={`/logs${buildQs(baseQs)}`}
                className="text-neutral-400 hover:text-neutral-700 text-sm"
                aria-label="Close"
              >
                ✕
              </Link>
            </div>
            <div className="flex-1 overflow-auto scrollbar p-4 space-y-4 text-[12px]">
              {selectedApi && (
                <>
                  <DetailRow label="Status">
                    <StatusBadge status={selectedApi.status} />
                  </DetailRow>
                  <DetailRow label="Method">
                    <MethodBadge method={selectedApi.method} type="api" />
                  </DetailRow>
                  <DetailRow label="Path" mono>{selectedApi.path}</DetailRow>
                  <DetailRow label="Duration">{formatDuration(selectedApi.durationMs)}</DetailRow>
                  <DetailRow label="Timestamp" mono>{selectedApi.createdAt.toISOString()}</DetailRow>
                  <DetailRow label="IP" mono>{selectedApi.ip ?? '—'}</DetailRow>
                  <DetailRow label="User agent" mono wrap>{selectedApi.userAgent ?? '—'}</DetailRow>
                  <DetailRow label="Actor">
                    {selectedApi.tokenId
                      ? tokenMap.get(selectedApi.tokenId) ?? 'token'
                      : selectedApi.userId
                      ? userMap.get(selectedApi.userId) ?? 'user'
                      : 'anon'}
                  </DetailRow>
                  {selectedApi.userId && <DetailRow label="User id" mono>{selectedApi.userId}</DetailRow>}
                  {selectedApi.tokenId && <DetailRow label="Token id" mono>{selectedApi.tokenId}</DetailRow>}
                  <DetailRow label="Log id" mono>{selectedApi.id}</DetailRow>
                </>
              )}
              {selectedAi && (
                <>
                  <DetailRow label="Action">{selectedAi.action}</DetailRow>
                  <DetailRow label="Collection" mono>{selectedAi.collection ?? '—'}</DetailRow>
                  <DetailRow label="Timestamp" mono>{selectedAi.createdAt.toISOString()}</DetailRow>
                  <DetailRow label="Actor">
                    {selectedAi.userId ? userMap.get(selectedAi.userId) ?? 'user' : 'anon'}
                  </DetailRow>
                  {selectedAi.userId && <DetailRow label="User id" mono>{selectedAi.userId}</DetailRow>}
                  <DetailRow label="Log id" mono>{selectedAi.id}</DetailRow>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">Scope</div>
                    <pre className="mono text-[11px] bg-neutral-50 border border-neutral-200 rounded-md p-2 overflow-auto">
                      {formatJson(selectedAi.scope)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

function LinkCell({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <td className={className}>
      <Link href={href} scroll={false} className="block w-full h-full">
        {children}
      </Link>
    </td>
  );
}

function DetailRow({
  label,
  children,
  mono,
  wrap
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  wrap?: boolean;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 items-baseline">
      <div className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
      <div className={`${mono ? 'mono text-[11px]' : ''} ${wrap ? 'break-words' : 'truncate'}`}>{children}</div>
    </div>
  );
}

function FilterGroup({
  param, label, options, current, base, selected
}: {
  param: string;
  label: string;
  options: readonly string[];
  current: string[];
  base: Record<string, string | undefined>;
  selected?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</span>
      {options.map((opt) => {
        const active = current.includes(opt);
        const next = active ? current.filter((c) => c !== opt) : [...current, opt];
        const nextBase = { ...base, [param]: next.length > 0 ? next.join(',') : undefined, id: selected };
        return (
          <Link
            key={opt}
            href={`/logs${buildQs(nextBase)}`}
            className={`px-2 py-0.5 rounded border text-[11px] mono ${active ? 'border-accent bg-accent-soft text-accent' : 'border-neutral-200 hover:bg-neutral-50'}`}
          >
            {opt}
          </Link>
        );
      })}
    </div>
  );
}

function MethodBadge({ method, type }: { method: string; type: 'api' | 'ai' }) {
  if (type === 'ai') return <span className="px-1.5 py-0.5 rounded bg-accent-soft text-accent text-[10px] font-semibold">AI</span>;
  const map: Record<string, string> = {
    GET: 'bg-neutral-100 text-neutral-700',
    POST: 'bg-ok/10 text-ok',
    PATCH: 'bg-warn/10 text-warn',
    DELETE: 'bg-danger/10 text-danger'
  };
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${map[method] ?? 'bg-neutral-100 text-neutral-700'}`}>{method}</span>;
}

function StatusBadge({ status }: { status: number }) {
  const cls = statusClass(status);
  const map: Record<string, string> = {
    '2xx': 'text-ok',
    '3xx': 'text-neutral-500',
    '4xx': 'text-warn',
    '5xx': 'text-danger'
  };
  return <span className={`font-semibold ${map[cls]}`}>{status}</span>;
}

function Histogram({ data, max }: { data: number[]; max: number }) {
  const w = 1200;
  const h = 64;
  const n = data.length;
  if (n === 0) return <div className="h-16 flex items-center justify-center text-xs text-neutral-400">No data</div>;
  const barW = w / n;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-16">
      {data.map((v, i) => {
        const barH = (v / max) * (h - 2);
        return (
          <rect
            key={i}
            x={i * barW + 0.5}
            y={h - barH}
            width={Math.max(1, barW - 1)}
            height={barH}
            className="fill-ok"
            opacity={v === 0 ? 0.12 : 0.9}
          />
        );
      })}
    </svg>
  );
}

function formatJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
