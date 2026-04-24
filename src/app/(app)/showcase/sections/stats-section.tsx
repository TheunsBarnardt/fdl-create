'use client';
import { useEffect, useRef, useState } from 'react';

type Stat = {
  value: number;
  suffix: string;
  prefix?: string;
  label: string;
  sub: string;
  format?: (n: number) => string;
};

const stats: Stat[] = [
  {
    value: 1247,
    suffix: '',
    label: 'Collections shipped',
    sub: 'across tenants',
    format: (n) => n.toLocaleString(),
  },
  {
    value: 2.4,
    suffix: 'M',
    label: 'API calls served',
    sub: 'in last 30 days',
    format: (n) => n.toFixed(1),
  },
  {
    value: 38291,
    suffix: '',
    label: 'Schema changes',
    sub: 'zero downtime',
    format: (n) => n.toLocaleString(),
  },
  {
    value: 99.99,
    suffix: '%',
    label: 'Uptime SLA',
    sub: 'measured monthly',
    format: (n) => n.toFixed(2),
  },
];

function useCountUp(target: number, active: boolean, durationMs = 1800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, durationMs]);

  return value;
}

function StatCard({ stat, active }: { stat: Stat; active: boolean }) {
  const current = useCountUp(stat.value, active);
  const display = stat.format ? stat.format(current) : Math.round(current).toString();

  return (
    <div className="group relative p-8 border border-white/[0.06] rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent overflow-hidden hover:border-amber-500/25 transition-colors">
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        <div className="display text-[52px] md:text-[64px] leading-none font-bold tracking-tight heading-gradient mb-3 flex items-baseline">
          {stat.prefix && <span className="text-white/50 text-[32px] mr-1">{stat.prefix}</span>}
          <span className="tabular-nums">{display}</span>
          {stat.suffix && <span className="text-amber-300 text-[36px] ml-1">{stat.suffix}</span>}
        </div>
        <div className="text-[13.5px] font-semibold text-white/85 mb-0.5 tracking-tight">{stat.label}</div>
        <div className="text-[11px] text-white/40">{stat.sub}</div>
      </div>

      <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export function StatsSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!sectionRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(true);
        });
      },
      { threshold: 0.3 }
    );
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full py-24 px-6 bg-[#070709] overflow-hidden">
      <div className="absolute inset-0 dot-overlay opacity-40 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <div className="heading-tactical mb-3">By the numbers</div>
            <h2 className="display text-[36px] md:text-[48px] leading-[1.02] font-semibold heading-gradient tracking-tight">
              Proof in production.
            </h2>
          </div>
          <p className="text-white/45 max-w-md text-sm leading-relaxed">
            Real metrics from the FDL-Create fleet. Schema is the product; uptime is the price of admission.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} stat={s} active={active} />
          ))}
        </div>
      </div>
    </section>
  );
}
