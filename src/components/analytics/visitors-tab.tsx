import { prisma } from '@/lib/db';
import { rangeToSince, type TimeRange } from '@/lib/logs';

type Rating = 'good' | 'needs-improvement' | 'poor';
type MetricKey = 'LCP' | 'INP' | 'CLS' | 'FID' | 'TTFB' | 'FCP';

const VITAL_ORDER: MetricKey[] = ['LCP', 'INP', 'CLS', 'FID'];
const VITAL_META: Record<MetricKey, { label: string; unit: 'ms' | ''; thresholds: { good: number; poor: number } }> = {
  LCP: { label: 'Largest Contentful Paint', unit: 'ms', thresholds: { good: 2500, poor: 4000 } },
  INP: { label: 'Interaction to Next Paint', unit: 'ms', thresholds: { good: 200, poor: 500 } },
  CLS: { label: 'Cumulative Layout Shift', unit: '', thresholds: { good: 0.1, poor: 0.25 } },
  FID: { label: 'First Input Delay', unit: 'ms', thresholds: { good: 100, poor: 300 } },
  TTFB: { label: 'Time to First Byte', unit: 'ms', thresholds: { good: 800, poor: 1800 } },
  FCP: { label: 'First Contentful Paint', unit: 'ms', thresholds: { good: 1800, poor: 3000 } }
};

const ratingTone: Record<Rating, { label: string; dot: string; text: string }> = {
  good: { label: 'Good', dot: 'bg-ok', text: 'text-ok' },
  'needs-improvement': { label: 'Needs improvement', dot: 'bg-warn', text: 'text-warn' },
  poor: { label: 'Poor', dot: 'bg-danger', text: 'text-danger' }
};

export async function VisitorsTab({ range }: { range: TimeRange }) {
  const since = rangeToSince(range);

  const events = await prisma.vitalsEvent
    .findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'asc' } })
    .catch(() => []);

  const byMetric = new Map<MetricKey, number[]>();
  for (const e of events) {
    const k = e.metric as MetricKey;
    if (!VITAL_ORDER.includes(k) && k !== 'TTFB' && k !== 'FCP') continue;
    const arr = byMetric.get(k) ?? [];
    arr.push(e.value);
    byMetric.set(k, arr);
  }

  const devices = tally(events, (e) => e.device ?? 'Unknown');
  const browsers = tally(events, (e) => e.browser ?? 'Unknown');
  const paths = tally(events, (e) => e.path || '/');

  return (
    <div className="space-y-6">
      {events.length === 0 && (
        <div className="bg-white border border-neutral-200 rounded-md p-6 text-center">
          <div className="text-sm font-semibold mb-1">No vitals recorded yet</div>
          <div className="text-[12px] text-neutral-500">
            The <code className="px-1 bg-neutral-100 rounded text-[11px]">web-vitals</code> beacon has been mounted in the root layout. Navigate around the app in a few tabs and return here — events will start appearing.
          </div>
        </div>
      )}

      <section>
        <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">Core Web Vitals · p75 · {range}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {VITAL_ORDER.map((key) => (
            <VitalCard key={key} metric={key} values={byMetric.get(key) ?? []} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BreakdownCard title="Device" rows={devices} />
        <BreakdownCard title="Browser" rows={browsers} />
        <BreakdownCard title="Top paths" rows={paths} />
      </div>
    </div>
  );
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

function rate(value: number, metric: MetricKey): Rating {
  const t = VITAL_META[metric].thresholds;
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

function formatValue(value: number, metric: MetricKey): string {
  const unit = VITAL_META[metric].unit;
  if (metric === 'CLS') return value.toFixed(3);
  if (unit === 'ms') return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
  return String(value);
}

function tally<T>(items: T[], key: (t: T) => string): Array<{ label: string; count: number }> {
  const m = new Map<string, number>();
  for (const t of items) {
    const k = key(t);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function VitalCard({ metric, values }: { metric: MetricKey; values: number[] }) {
  const meta = VITAL_META[metric];
  const p75 = percentile(values, 0.75);
  const hasData = values.length > 0;
  const rating = hasData ? rate(p75, metric) : 'good';
  const tone = ratingTone[rating];

  return (
    <div className="glass-card p-4 pulse-host">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="mono text-[10px] text-white/55">{metric}</span>
            {hasData && <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />}
            {hasData && <span className={`text-[10px] ${tone.text}`}>{tone.label}</span>}
            {!hasData && <span className="text-[10px] text-neutral-400">no data</span>}
          </div>
          <div className="display text-2xl mt-1"><span className="pulse-on-hover">{hasData ? formatValue(p75, metric) : '—'}</span></div>
          <div className="text-[10px] text-neutral-400 mt-0.5">{meta.label}</div>
        </div>
      </div>
      <div className="mt-3">
        <TrendLine values={values} metric={metric} />
        <div className="flex justify-between text-[9px] mono text-neutral-400 mt-1">
          <span>good ≤ {meta.thresholds.good}{meta.unit}</span>
          <span>poor ≥ {meta.thresholds.poor}{meta.unit}</span>
        </div>
      </div>
      <div className="text-[10px] text-neutral-400 mt-2">{values.length} samples</div>
    </div>
  );
}

function TrendLine({ values, metric }: { values: number[]; metric: MetricKey }) {
  if (values.length === 0) {
    return <div className="h-8 flex items-center justify-center text-[10px] text-neutral-300">—</div>;
  }
  const w = 200;
  const h = 32;
  const max = Math.max(VITAL_META[metric].thresholds.poor, ...values);
  const stepX = w / (values.length - 1 || 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - (v / max) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" className="text-accent" strokeWidth="1.5" />
    </svg>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const total = Math.max(1, rows.reduce((a, b) => a + b.count, 0));
  return (
    <div className="bg-white border border-neutral-200 rounded-md p-4">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {rows.length === 0 ? (
        <div className="text-[11px] text-neutral-400 py-2">No data</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => {
            const pct = (r.count / total) * 100;
            return (
              <div key={r.label} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[11px]">
                <div className="truncate mono">{r.label}</div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-neutral-100 rounded overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right mono text-neutral-600">{r.count}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
