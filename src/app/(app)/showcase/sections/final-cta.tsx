'use client';
import Link from 'next/link';

export function FinalCTA() {
  return (
    <section className="relative w-full py-32 px-6 bg-[#070709] overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl pointer-events-none mesh-orb-amber" style={{ animation: 'mesh-drift 20s ease-in-out infinite' }} />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

      <div className="absolute inset-0 grid-overlay opacity-30 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        <div className="relative rounded-2xl p-12 md:p-16 text-center overflow-hidden border-glow bg-[rgba(10,10,14,0.9)] backdrop-blur-xl border border-white/[0.08]">
          {/* Inner ambient */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-violet-500/5 pointer-events-none" />
          <div className="absolute inset-0 noise-layer" />

          <div className="relative">
            {/* Icon orb */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 bg-gradient-to-br from-amber-400 via-orange-500 to-violet-500 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <h2 className="display text-[44px] md:text-[64px] leading-[1.02] font-semibold tracking-tight mb-5 heading-gradient">
              Ship your first collection<br />
              <span className="text-gradient-sweep">in the next 60 seconds.</span>
            </h2>

            <p className="text-white/60 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-10">
              Your studio is ready. Describe a collection, and Claude drafts the schema. You ship it — no migration, no rebuild, no interruption.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-md bg-amber-500 text-black font-semibold text-sm shadow-[0_0_0_1px_rgba(245,158,11,0.5),0_16px_50px_-8px_rgba(245,158,11,0.7)] hover:bg-amber-400 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.75),0_20px_60px_-8px_rgba(245,158,11,0.9)] transition-all duration-300 hover:-translate-y-0.5"
              >
                Open the studio
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <Link
                href="/governance"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-md border border-white/10 bg-white/[0.03] text-white/75 font-medium text-sm hover:bg-white/[0.06] hover:border-amber-500/40 hover:text-white transition-all"
              >
                Read governance
              </Link>
            </div>

            <div className="mt-10 pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] text-white/40">
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span>POPIA compliant by default</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                <span>Live schema migration</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
                <span>Claude integrated</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
