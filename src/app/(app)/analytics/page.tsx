import Link from 'next/link';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { AnalyticsTabs, type AnalyticsTab } from '@/components/analytics/analytics-tabs';
import { TrafficTab } from '@/components/analytics/traffic-tab';
import { VisitorsTab } from '@/components/analytics/visitors-tab';
import { QualityTab } from '@/components/analytics/quality-tab';
import type { TimeRange } from '@/lib/logs';

const RANGES: Array<{ key: TimeRange; label: string }> = [
  { key: '15m', label: 'Last 15 min' },
  { key: '1h', label: 'Last 1 hour' },
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' }
];

const VALID_TABS: readonly AnalyticsTab[] = ['traffic', 'visitors', 'quality'];

export default async function AnalyticsPage({
  searchParams
}: {
  searchParams: { range?: TimeRange; tab?: string };
}) {
  const range = (searchParams.range as TimeRange) ?? '24h';
  const tab: AnalyticsTab = VALID_TABS.includes(searchParams.tab as AnalyticsTab)
    ? (searchParams.tab as AnalyticsTab)
    : 'traffic';

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Analytics"
        chips={<Chip tone="accent">{labelFor(tab)}</Chip>}
        actions={
          <div className="flex items-center gap-2">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/analytics?tab=${tab}&range=${r.key}`}
                className={`px-2.5 py-1 border rounded-md ${range === r.key ? 'border-accent bg-accent-soft text-accent' : 'border-neutral-200 hover:bg-neutral-50'}`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      <AnalyticsTabs active={tab} range={range} />

      <div className="flex-1 overflow-auto scrollbar bg-paper p-6">
        {tab === 'traffic' && <TrafficTab range={range} />}
        {tab === 'visitors' && <VisitorsTab range={range} />}
        {tab === 'quality' && <QualityTab range={range} />}
      </div>
    </section>
  );
}

function labelFor(tab: AnalyticsTab): string {
  switch (tab) {
    case 'traffic':
      return 'Traffic';
    case 'visitors':
      return 'Visitors';
    case 'quality':
      return 'Quality';
  }
}
