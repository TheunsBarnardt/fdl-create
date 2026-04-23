import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { TimeRange } from '@/lib/logs';

export type AnalyticsTab = 'traffic' | 'visitors' | 'quality';

const TABS: Array<{ key: AnalyticsTab; label: string; hint: string }> = [
  { key: 'traffic', label: 'Traffic', hint: 'Requests, bandwidth, status classes' },
  { key: 'visitors', label: 'Visitors', hint: 'Core Web Vitals, devices, referrers' },
  { key: 'quality', label: 'Quality', hint: 'Lighthouse scores' }
];

export function AnalyticsTabs({ active, range }: { active: AnalyticsTab; range: TimeRange }) {
  return (
    <div className="border-b border-neutral-200 bg-white px-6">
      <nav className="flex gap-1 -mb-px" role="tablist">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={`/analytics?tab=${t.key}&range=${range}`}
              role="tab"
              aria-selected={isActive}
              title={t.hint}
              className={cn(
                'px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-accent text-accent font-medium'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

