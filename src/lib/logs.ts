export type TimeRange = '15m' | '1h' | '24h' | '7d';

const TR_MS: Record<TimeRange, number> = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000
};

export function rangeToSince(range: TimeRange): Date {
  return new Date(Date.now() - TR_MS[range]);
}

export function statusClass(s: number): '2xx' | '3xx' | '4xx' | '5xx' {
  if (s >= 500) return '5xx';
  if (s >= 400) return '4xx';
  if (s >= 300) return '3xx';
  return '2xx';
}

export function bucketize(
  rows: Array<{ createdAt: Date }>,
  range: TimeRange
): Array<{ t: Date; count: number }> {
  const bucketMs = range === '15m' ? 30_000 : range === '1h' ? 2 * 60_000 : range === '24h' ? 30 * 60_000 : 4 * 60 * 60_000;
  const now = Date.now();
  const since = now - TR_MS[range];
  const buckets = Math.ceil((now - since) / bucketMs);
  const out: Array<{ t: Date; count: number }> = [];
  for (let i = 0; i < buckets; i++) {
    out.push({ t: new Date(since + i * bucketMs), count: 0 });
  }
  for (const r of rows) {
    const idx = Math.floor((r.createdAt.getTime() - since) / bucketMs);
    if (idx >= 0 && idx < out.length) out[idx].count++;
  }
  return out;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function relativeTime(d: Date): string {
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const suffix = diff < 0 ? 'ago' : 'from now';
  let n: number;
  let unit: string;
  if (abs < 60_000) { n = Math.round(abs / 1000); unit = 's'; }
  else if (abs < 3_600_000) { n = Math.round(abs / 60_000); unit = 'm'; }
  else if (abs < 86_400_000) { n = Math.round(abs / 3_600_000); unit = 'h'; }
  else { n = Math.round(abs / 86_400_000); unit = 'd'; }
  return `${n}${unit} ${suffix}`;
}
