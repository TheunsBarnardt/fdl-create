'use client';
import { useEffect, useState } from 'react';

const promptText = 'add a Subscriptions collection linked to Customers with plan, renewsAt, status';

const schemaFields = [
  { name: 'id',        type: 'uuid',      hint: 'primary' },
  { name: 'customer',  type: '→ Customer', hint: 'relation' },
  { name: 'plan',      type: 'enum',      hint: 'free · pro · enterprise' },
  { name: 'renewsAt',  type: 'datetime',  hint: 'ISO 8601' },
  { name: 'status',    type: 'enum',      hint: 'active · paused · cancelled' },
];

export function LiveDemo() {
  const [typed, setTyped] = useState('');
  const [rowsShown, setRowsShown] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    let i = 0;
    setTyped('');
    setRowsShown(0);

    const typeInterval = setInterval(() => {
      i += 1;
      setTyped(promptText.slice(0, i));
      if (i >= promptText.length) {
        clearInterval(typeInterval);
        // Reveal rows sequentially
        let r = 0;
        const rowInterval = setInterval(() => {
          r += 1;
          setRowsShown(r);
          if (r >= schemaFields.length) {
            clearInterval(rowInterval);
            // Loop after delay
            setTimeout(() => setCycle((c) => c + 1), 3500);
          }
        }, 350);
      }
    }, 45);

    return () => clearInterval(typeInterval);
  }, [cycle]);

  return (
    <section id="live-demo" className="relative w-full py-28 px-6 bg-[#070709] overflow-hidden">
      {/* Ambient orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-amber-500/[0.04] blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/25 bg-amber-500/5 backdrop-blur-md mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-300">Watch it happen</span>
          </div>
          <h2 className="display text-[40px] md:text-[56px] leading-[1.02] font-semibold mb-4 heading-gradient tracking-tight">
            From prompt to production<br />in seconds, not sprints.
          </h2>
          <p className="text-white/55 text-base max-w-2xl mx-auto leading-relaxed">
            Describe what you need. Claude drafts the collection. Your schema goes live instantly — no migrations, no redeploys, no downtime.
          </p>
        </div>

        {/* Demo split panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Left: Terminal / prompt pane ── */}
          <div className="mock-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-black/50 border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              </div>
              <span className="ml-3 text-[11px] font-bold tracking-wider text-white/50">ASK CLAUDE</span>
              <span className="ml-auto text-[10px] mono text-white/30">~/studio</span>
            </div>

            <div className="p-6 min-h-[340px] mono">
              <div className="text-[11px] text-white/40 tracking-wider mb-2">PROMPT</div>
              <div className="text-sm text-white/90 leading-relaxed">
                <span className="text-amber-400">$</span>{' '}
                <span>{typed}</span>
                {typed.length < promptText.length && <span className="terminal-caret" />}
              </div>

              {typed.length >= promptText.length && (
                <>
                  <div className="mt-6 text-[11px] text-white/40 tracking-wider mb-2">CLAUDE</div>
                  <div className="text-[12.5px] text-white/75 leading-relaxed space-y-1">
                    <div className="schema-row-enter">
                      <span className="text-emerald-400">✓</span> Analysed existing Customer collection
                    </div>
                    <div className="schema-row-enter" style={{ animationDelay: '0.3s' }}>
                      <span className="text-emerald-400">✓</span> Proposed 5 fields including 1 relation
                    </div>
                    <div className="schema-row-enter" style={{ animationDelay: '0.6s' }}>
                      <span className="text-emerald-400">✓</span> Inferred enum values from context
                    </div>
                    <div className="schema-row-enter" style={{ animationDelay: '0.9s' }}>
                      <span className="text-emerald-400">✓</span> Schema deployed — 0 downtime
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Right: Live schema pane ── */}
          <div className="mock-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-black/50 border-b border-white/[0.06]">
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 3v18" />
              </svg>
              <span className="text-[11px] font-bold tracking-wider text-white">Subscriptions</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-300 tracking-wider ml-2">LIVE</span>
              <span className="ml-auto text-[10px] mono text-white/30">schema v1</span>
            </div>

            <div className="p-4 min-h-[340px]">
              {rowsShown === 0 && (
                <div className="flex items-center justify-center h-[280px] text-white/30 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
                    Waiting for prompt…
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                {schemaFields.slice(0, rowsShown).map((f, i) => (
                  <div
                    key={f.name}
                    className="schema-row-enter flex items-center justify-between px-3 py-2.5 rounded-md border border-white/[0.06] bg-white/[0.02] hover:border-amber-500/30 group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-1 h-4 rounded-full bg-amber-500/70 group-hover:bg-amber-400 group-hover:shadow-[0_0_8px_rgba(245,158,11,0.7)] transition-all" />
                      <span className="text-sm font-semibold text-white/90 mono">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] text-white/45">{f.hint}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-300 mono">{f.type}</span>
                    </div>
                  </div>
                ))}
              </div>

              {rowsShown >= schemaFields.length && (
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between schema-row-enter">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span className="text-[11px] text-emerald-300 font-semibold">
                      Deployed to all tenants · 0 migrations run
                    </span>
                  </div>
                  <span className="text-[10px] mono text-white/40">take: 38ms</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
