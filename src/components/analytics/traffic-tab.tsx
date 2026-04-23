import Link from 'next/link';
import { prisma } from '@/lib/db';
import {
  rangeToSince,
  statusClass,
  bucketize,
  percentile,
  formatDuration,
  type TimeRange
} from '@/lib/logs';
import { formatBytes } from '@/lib/analytics-fixtures';

function logsHref(params: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const s = u.toString();
  return `/logs${s ? `?${s}` : ''}`;
}
function splitMethodPath(key: string): { method?: string; path?: string } {
  const idx = key.indexOf(' ');
  if (idx === -1) return { path: key };
  return { method: key.slice(0, idx), path: key.slice(idx + 1) };
}

export async function TrafficTab({ range }: { range: TimeRange }) {
  const since = rangeToSince(range);

  const [apiLogs, pageViews] = await Promise.all([
    prisma.apiRequestLog
      .findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'asc' } })
      .catch(() => []),
    prisma.pageView
      .findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'asc' } })
      .catch(() => [])
  ]);

  const totalEdge = pageViews.length;
  const totalBytes = pageViews.reduce((a, p) => a + (p.bytes ?? 0), 0);
  const uniqueSessions = new Set(pageViews.map((p) => p.sessionId ?? p.ipHash ?? p.id)).size;
  const uniquePaths = new Set(pageViews.map((p) => p.path)).size;
  const edgeVolume = bucketize(pageViews, range);
  const maxEdge = Math.max(1, ...edgeVolume.map((b) => b.count));
  const bytesVolume = bucketizeSum(pageViews, range, (p) => p.bytes ?? 0);
  const maxBytes = Math.max(1, ...bytesVolume.map((b) => b.value));
  const sessionVolume = bucketize(
    dedupePerBucket(pageViews, range, (p) => p.sessionId ?? p.ipHash ?? p.id),
    range
  );
  const maxSession = Math.max(1, ...sessionVolume.map((b) => b.count));

  const countryCounts = new Map<string, { requests: number; bytes: number }>();
  for (const p of pageViews) {
    const key = p.country ?? 'Unknown';
    const cur = countryCounts.get(key) ?? { requests: 0, bytes: 0 };
    cur.requests += 1;
    cur.bytes += p.bytes ?? 0;
    countryCounts.set(key, cur);
  }
  const topCountries = [...countryCounts.entries()]
    .sort((a, b) => b[1].requests - a[1].requests)
    .slice(0, 10);
  const maxCountry = Math.max(1, ...topCountries.map(([, v]) => v.requests));

  const total = apiLogs.length;
  const errorCount = apiLogs.filter((l) => l.status >= 500).length;
  const clientErrCount = apiLogs.filter((l) => l.status >= 400 && l.status < 500).length;
  const errorRate = total === 0 ? 0 : (errorCount + clientErrCount) / total;
  const durations = apiLogs.map((l) => l.durationMs);
  const avgLatency = total === 0 ? 0 : durations.reduce((a, b) => a + b, 0) / total;
  const p50 = percentile(durations, 0.5);
  const p95 = percentile(durations, 0.95);
  const uniqueActors = new Set(apiLogs.map((l) => l.tokenId ?? l.userId ?? 'anon')).size;

  const volume = bucketize(apiLogs, range);
  const maxCount = Math.max(1, ...volume.map((b) => b.count));

  const pathCounts = new Map<string, number>();
  const errorPathCounts = new Map<string, number>();
  for (const l of apiLogs) {
    const key = `${l.method} ${l.path}`;
    pathCounts.set(key, (pathCounts.get(key) ?? 0) + 1);
    if (l.status >= 400) errorPathCounts.set(key, (errorPathCounts.get(key) ?? 0) + 1);
  }
  const topPaths = [...pathCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topErrors = [...errorPathCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const statusBuckets: Record<string, number> = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
  for (const l of apiLogs) statusBuckets[statusClass(l.status)]++;

  const baseLogsQs = { range };

  return (
    <div className="space-y-6">
      <section>
        <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">
          Edge traffic · live · {totalEdge.toLocaleString()} page views
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <EdgeCard label="Page views" value={totalEdge.toLocaleString()} spark={edgeVolume.map((b) => b.count)} max={maxEdge} />
          <EdgeCard label="Bandwidth" value={formatBytes(totalBytes)} spark={bytesVolume.map((b) => b.value)} max={maxBytes} />
          <EdgeCard label="Visits" value={uniqueSessions.toLocaleString()} spark={sessionVolume.map((b) => b.count)} max={maxSession} />
          <EdgeCard label="Unique paths" value={uniquePaths.toLocaleString()} spark={edgeVolume.map((b) => b.count)} max={maxEdge} />
        </div>
      </section>

      <Card title="Top countries" subtitle={`${countryCounts.size} unique · header-derived`}>
        {topCountries.length === 0 ? (
          <div className="text-xs text-neutral-400 py-2">No page views in this range yet. Navigate around the app to populate.</div>
        ) : (
          <div className="space-y-1">
            {topCountries.map(([country, v]) => {
              const pct = (v.requests / maxCountry) * 100;
              return (
                <div
                  key={country}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-[11px] px-1 -mx-1 py-0.5"
                >
                  <div className="truncate">{country}</div>
                  <div className="w-32 h-1.5 bg-neutral-100 rounded overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-3 tabular-nums text-neutral-600">
                    <span className="w-14 text-right mono">{v.requests.toLocaleString()}</span>
                    <span className="w-16 text-right mono text-neutral-400">{formatBytes(v.bytes)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="pt-2">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">API requests · live</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatLink label="Total requests" value={total.toLocaleString()} href={logsHref(baseLogsQs)} />
          <StatLink
            label="Error rate"
            value={`${(errorRate * 100).toFixed(1)}%`}
            tone={errorRate > 0.05 ? 'danger' : 'ok'}
            href={logsHref({ ...baseLogsQs, s: '4xx,5xx' })}
          />
          <StatLink label="Avg latency" value={formatDuration(avgLatency)} href={logsHref(baseLogsQs)} />
          <StatLink label="Unique actors" value={String(uniqueActors)} href={logsHref(baseLogsQs)} />
        </div>
      </div>

      <LinkCard href={logsHref(baseLogsQs)} title="Request volume" subtitle={`bucketed · ${range}`}>
        <Sparkline data={volume.map((b) => b.count)} max={maxCount} />
        <div className="flex justify-between text-[10px] text-neutral-400 mono mt-1">
          <span>{volume[0]?.t.toLocaleTimeString() ?? ''}</span>
          <span>{volume[volume.length - 1]?.t.toLocaleTimeString() ?? 'now'}</span>
        </div>
      </LinkCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Latency" subtitle="p50 / p95 / avg">
          <div className="grid grid-cols-3 text-center">
            <Metric label="p50" value={formatDuration(p50)} />
            <Metric label="p95" value={formatDuration(p95)} />
            <Metric label="avg" value={formatDuration(avgLatency)} />
          </div>
        </Card>

        <Card title="Status classes" subtitle={`${errorCount} server errors · ${clientErrCount} client`}>
          <div className="space-y-1.5">
            {(['2xx', '3xx', '4xx', '5xx'] as const).map((cls) => {
              const count = statusBuckets[cls];
              const pct = total === 0 ? 0 : (count / total) * 100;
              const color = cls === '2xx' ? 'bg-ok' : cls === '4xx' ? 'bg-warn' : cls === '5xx' ? 'bg-danger' : 'bg-neutral-400';
              return (
                <Link
                  key={cls}
                  href={logsHref({ ...baseLogsQs, s: cls })}
                  className="flex items-center gap-2 text-[11px] mono rounded hover:bg-neutral-50 px-1 -mx-1 py-0.5"
                >
                  <span className="w-8 text-neutral-500">{cls}</span>
                  <div className="flex-1 h-2 bg-neutral-100 rounded overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-neutral-600">{count}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Top endpoints" subtitle="by volume · click to filter">
          <RankedList rows={topPaths} total={total} baseQs={baseLogsQs} />
        </Card>
        <Card title="Top error paths" subtitle="4xx + 5xx · click to filter">
          <RankedList
            rows={topErrors}
            total={Math.max(1, errorCount + clientErrCount)}
            tone="danger"
            baseQs={{ ...baseLogsQs, s: '4xx,5xx' }}
          />
        </Card>
      </div>
    </div>
  );
}

function bucketizeSum<T extends { createdAt: Date }>(
  rows: T[],
  range: TimeRange,
  pick: (row: T) => number
): Array<{ t: Date; value: number }> {
  const bucketMs = bucketMsFor(range);
  const now = Date.now();
  const since = now - rangeMs(range);
  const buckets = Math.ceil((now - since) / bucketMs);
  const out: Array<{ t: Date; value: number }> = [];
  for (let i = 0; i < buckets; i++) out.push({ t: new Date(since + i * bucketMs), value: 0 });
  for (const r of rows) {
    const idx = Math.floor((r.createdAt.getTime() - since) / bucketMs);
    if (idx >= 0 && idx < out.length) out[idx].value += pick(r);
  }
  return out;
}

function dedupePerBucket<T extends { createdAt: Date }>(
  rows: T[],
  range: TimeRange,
  key: (row: T) => string | null
): Array<{ createdAt: Date }> {
  const bucketMs = bucketMsFor(range);
  const seen = new Map<number, Set<string>>();
  const out: Array<{ createdAt: Date }> = [];
  for (const r of rows) {
    const b = Math.floor(r.createdAt.getTime() / bucketMs);
    const k = key(r) ?? 'anon';
    const s = seen.get(b) ?? new Set();
    if (!s.has(k)) {
      s.add(k);
      seen.set(b, s);
      out.push({ createdAt: r.createdAt });
    }
  }
  return out;
}

function bucketMsFor(range: TimeRange): number {
  return range === '15m' ? 30_000 : range === '1h' ? 2 * 60_000 : range === '24h' ? 30 * 60_000 : 4 * 60 * 60_000;
}
function rangeMs(range: TimeRange): number {
  return range === '15m' ? 15 * 60_000 : range === '1h' ? 60 * 60_000 : range === '24h' ? 24 * 60 * 60_000 : 7 * 24 * 60 * 60_000;
}

function StatLink({
  label,
  value,
  tone,
  href
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'danger';
  href: string;
}) {
  const colorCls = tone === 'danger' ? 'text-danger' : tone === 'ok' ? 'text-ok' : 'text-neutral-900';
  return (
    <Link
      href={href}
      className="bg-white border border-neutral-200 rounded-md p-4 hover:border-accent transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
        <span className="text-[10px] text-neutral-300 group-hover:text-accent">view logs →</span>
      </div>
      <div className={`display text-2xl mt-1 ${colorCls}`}>{value}</div>
    </Link>
  );
}

function EdgeCard({ label, value, spark, max }: { label: string; value: string; spark: number[]; max: number }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-md p-4">
      <div className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
      <div className="display text-2xl mt-1">{value}</div>
      <div className="mt-2">
        <Sparkline data={spark} max={max} compact />
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-md p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && <div className="text-[11px] text-neutral-400 mono">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function LinkCard({
  href,
  title,
  subtitle,
  children
}: {
  href: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block bg-white border border-neutral-200 rounded-md p-4 hover:border-accent transition-colors group"
    >
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-semibold">{title}</div>
        <div className="flex items-center gap-2">
          {subtitle && <div className="text-[11px] text-neutral-400 mono">{subtitle}</div>}
          <span className="text-[10px] text-neutral-300 group-hover:text-accent">view logs →</span>
        </div>
      </div>
      {children}
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
      <div className="display text-xl mt-0.5">{value}</div>
    </div>
  );
}

function Sparkline({ data, max, compact }: { data: number[]; max: number; compact?: boolean }) {
  const w = 800;
  const h = compact ? 32 : 80;
  const n = data.length;
  if (n === 0) return <div className="h-20 flex items-center justify-center text-xs text-neutral-400">No data</div>;
  const barW = w / n;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full ${compact ? 'h-8' : 'h-20'}`} preserveAspectRatio="none">
      {data.map((v, i) => {
        const barH = (v / max) * (h - 4);
        return (
          <rect
            key={i}
            x={i * barW + 1}
            y={h - barH}
            width={Math.max(1, barW - 2)}
            height={barH}
            className="fill-accent"
            opacity={v === 0 ? 0.15 : 1}
          />
        );
      })}
    </svg>
  );
}

function RankedList({
  rows,
  total,
  tone,
  baseQs
}: {
  rows: Array<[string, number]>;
  total: number;
  tone?: 'danger';
  baseQs: Record<string, string | undefined>;
}) {
  if (rows.length === 0) return <div className="text-xs text-neutral-400 py-2">No data</div>;
  return (
    <div className="space-y-1">
      {rows.map(([label, count]) => {
        const pct = (count / total) * 100;
        const { method, path } = splitMethodPath(label);
        const href = logsHref({ ...baseQs, m: method, q: path });
        return (
          <Link
            key={label}
            href={href}
            className="grid grid-cols-[1fr_auto] items-center gap-3 text-[11px] rounded hover:bg-neutral-50 px-1 -mx-1 py-0.5"
          >
            <div className="mono truncate">{label}</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-neutral-100 rounded overflow-hidden">
                <div className={`h-full ${tone === 'danger' ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right text-neutral-600 mono">{count}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
