'use client';
import Link from 'next/link';

export function LandingHero() {
  return (
    <section className="relative min-h-[100vh] w-full overflow-hidden bg-[#070709]">
      {/* ── Ambient background layers ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Conic sweep */}
        <div className="conic-sweep opacity-40" />

        {/* Animated mesh orbs */}
        <div className="mesh-orb mesh-orb-amber" style={{ width: '600px', height: '600px', top: '-10%', left: '-10%' }} />
        <div className="mesh-orb mesh-orb-violet" style={{ width: '700px', height: '700px', top: '30%', right: '-15%' }} />
        <div className="mesh-orb mesh-orb-sky" style={{ width: '500px', height: '500px', bottom: '-15%', left: '25%' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 grid-overlay opacity-50" />

        {/* Noise texture */}
        <div className="absolute inset-0 noise-layer" />

        {/* Particles */}
        {[...Array(14)].map((_, i) => (
          <span
            key={i}
            className={`particle ${i % 3 === 0 ? 'violet' : ''}`}
            style={{
              left: `${(i * 7.3) % 100}%`,
              animationDelay: `${(i * 0.8) % 12}s`,
              animationDuration: `${9 + (i % 5)}s`,
            }}
          />
        ))}

        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#070709]" />
      </div>

      {/* ── Content container ── */}
      <div className="relative z-10 min-h-[100vh] flex items-center justify-center px-6 py-24">
        <div className="w-full max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center">
            {/* ── Left: Headline + CTAs ── */}
            <div className="relative">
              {/* Announcement chip */}
              <div className="reveal-up d-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 shimmer-chip backdrop-blur-md mb-8">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
                </span>
                <span className="text-amber-200 text-[10.5px] font-bold tracking-[0.18em] uppercase">
                  Claude AI is now integrated
                </span>
                <svg className="w-3 h-3 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Headline */}
              <h1 className="reveal-up d-2 display font-semibold tracking-[-0.035em] leading-[0.95] mb-6">
                <span className="block text-[64px] md:text-[84px] lg:text-[96px] heading-gradient">
                  The runtime for
                </span>
                <span className="block text-[64px] md:text-[84px] lg:text-[96px] text-gradient-sweep">
                  schema-driven{' '}
                  <span className="word-rotator">
                    <span>apps.</span>
                    <span>CMSes.</span>
                    <span>teams.</span>
                    <span>ideas.</span>
                    <span>apps.</span>
                  </span>
                </span>
              </h1>

              {/* Subtitle */}
              <p className="reveal-up d-3 text-white/60 text-lg md:text-xl leading-relaxed mb-10 max-w-[560px]">
                Design collections visually. Ship schema changes live — no migrations, no redeploys. Let Claude draft your data model from a transcript.
              </p>

              {/* Dual CTAs */}
              <div className="reveal-up d-4 flex flex-wrap items-center gap-4 mb-12">
                <Link
                  href="/dashboard"
                  className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-md bg-amber-500 text-black font-semibold text-sm shadow-[0_0_0_1px_rgba(245,158,11,0.5),0_12px_40px_-8px_rgba(245,158,11,0.6)] hover:bg-amber-400 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.7),0_16px_50px_-8px_rgba(245,158,11,0.8)] transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <span>Enter the studio</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>

                <Link
                  href="#live-demo"
                  className="group inline-flex items-center gap-2.5 px-5 py-3 rounded-md border border-white/10 bg-white/[0.03] text-white/80 font-medium text-sm backdrop-blur-md hover:bg-white/[0.06] hover:border-amber-500/40 hover:text-white transition-all duration-300"
                >
                  <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40">
                    <svg className="w-2.5 h-2.5 text-amber-300 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <span>See it in motion</span>
                </Link>
              </div>

              {/* Social proof / live stats strip */}
              <div className="reveal-up d-5 flex flex-wrap items-center gap-x-6 gap-y-3 pt-6 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 border-2 border-[#070709] flex items-center justify-center text-[9px] font-bold text-black">T</div>
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 border-2 border-[#070709] flex items-center justify-center text-[9px] font-bold text-white">S</div>
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-cyan-600 border-2 border-[#070709] flex items-center justify-center text-[9px] font-bold text-white">K</div>
                  </div>
                  <span className="text-[11px] text-white/50">Trusted by 1,240+ teams</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  All systems operational
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                  <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
                  </svg>
                  4.9 average rating
                </div>
              </div>
            </div>

            {/* ── Right: Floating UI Mockup Cluster ── */}
            <div className="relative hidden lg:block w-[440px] h-[520px]">
              {/* Orb glow behind cluster */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full orb-pulse bg-amber-500/5 border border-amber-500/20" />

              {/* Mock 1: Ask Claude chat card */}
              <div
                className="mock-card float-card delay-1 reveal-up d-3 absolute top-0 left-0 w-[260px] rounded-lg p-4"
                style={{ ['--r' as string]: '-3deg' } as React.CSSProperties}
              >
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/[0.06]">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 via-orange-500 to-violet-500 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-white/95">Ask Claude</div>
                    <div className="text-[9px] text-white/40">drafting schema…</div>
                  </div>
                  <div className="flex gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
                <div className="text-[11px] text-white/75 leading-relaxed">
                  "Add a <span className="text-amber-300 font-semibold">Subscriptions</span> collection linked to Customers with plan tier, renewal date and status."
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-[9px] text-amber-300 font-bold tracking-wider">DRAFTED</span>
                  <span className="text-[9px] text-white/40">4 fields · 1 relation</span>
                </div>
              </div>

              {/* Mock 2: Schema card */}
              <div
                className="mock-card float-card delay-2 reveal-up d-4 absolute top-[80px] right-0 w-[240px] rounded-lg overflow-hidden"
                style={{ ['--r' as string]: '4deg' } as React.CSSProperties}
              >
                <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-500/20 to-violet-500/20 border-b border-white/[0.08]">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-amber-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 3v18" />
                    </svg>
                    <span className="text-[11px] font-bold text-white">Subscriptions</span>
                  </div>
                  <span className="text-[9px] text-white/50 mono">schema</span>
                </div>
                <div className="text-[10.5px] mono">
                  {[
                    { name: 'id',          type: 'uuid',    hl: false },
                    { name: 'customer',    type: '→ ref',   hl: true  },
                    { name: 'plan',        type: 'enum',    hl: false },
                    { name: 'renewsAt',    type: 'datetime', hl: false },
                    { name: 'status',      type: 'enum',    hl: true  },
                  ].map((f, i) => (
                    <div
                      key={f.name}
                      className="flex items-center justify-between px-3 py-1.5 border-t border-white/[0.04] hover:bg-white/[0.03]"
                      style={{ animationDelay: `${1 + i * 0.15}s` }}
                    >
                      <span className="text-white/85">{f.name}</span>
                      <span className={f.hl ? 'text-amber-300' : 'text-white/45'}>{f.type}</span>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-1.5 border-t border-white/[0.08] bg-emerald-500/5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  <span className="text-[9px] text-emerald-300 font-semibold tracking-wider">LIVE · 0 downtime</span>
                </div>
              </div>

              {/* Mock 3: Metric / stat card */}
              <div
                className="mock-card float-card delay-3 reveal-up d-5 absolute bottom-0 left-[40px] w-[220px] rounded-lg p-4"
                style={{ ['--r' as string]: '-2deg' } as React.CSSProperties}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9.5px] font-bold tracking-wider text-white/50 uppercase">Records (30d)</span>
                  <span className="text-[9px] text-emerald-400 font-semibold">↑ 24%</span>
                </div>
                <div className="display text-[26px] font-bold text-white mb-2 count-pulse inline-block">
                  45,208
                </div>
                {/* Mini sparkline */}
                <svg viewBox="0 0 180 40" className="w-full h-8">
                  <defs>
                    <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(245,158,11,0.5)" />
                      <stop offset="100%" stopColor="rgba(245,158,11,0)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,32 L20,28 L40,30 L60,22 L80,24 L100,16 L120,18 L140,10 L160,12 L180,4 L180,40 L0,40 Z"
                    fill="url(#spark)"
                  />
                  <path
                    d="M0,32 L20,28 L40,30 L60,22 L80,24 L100,16 L120,18 L140,10 L160,12 L180,4"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                  <span className="text-[9px] text-white/50">API · Schema · AI</span>
                </div>
              </div>

              {/* Mock 4: API response blip */}
              <div
                className="mock-card float-card reveal-up d-6 absolute bottom-[60px] right-[-10px] w-[180px] rounded-lg p-3"
                style={{ ['--r' as string]: '3deg' } as React.CSSProperties}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[8px] font-bold text-emerald-300 tracking-wider">GET · 200</span>
                  <span className="text-[9px] text-white/40 mono">38ms</span>
                </div>
                <div className="text-[9.5px] mono text-white/60 leading-snug">
                  <span className="text-white/30">{'{'}</span><br />
                  <span className="pl-2 text-amber-300">"id"</span>: <span className="text-emerald-300">"cus_42"</span>,<br />
                  <span className="pl-2 text-amber-300">"plan"</span>: <span className="text-emerald-300">"pro"</span><br />
                  <span className="text-white/30">{'}'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scroll hint ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 scroll-hint pointer-events-none">
        <span className="text-[9.5px] font-bold tracking-[0.2em] text-white/40 uppercase">Scroll to explore</span>
        <svg className="w-4 h-4 text-amber-400/60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
