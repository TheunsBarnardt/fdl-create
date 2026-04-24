'use client';

const stack = [
  'Next.js 14',
  'React 18',
  'TypeScript',
  'Tailwind',
  'Prisma',
  'MSSQL',
  'Auth.js v5',
  'Zod',
  'Claude AI',
  'shadcn/ui',
  'Lexical',
  'Monaco',
];

export function TechMarquee() {
  return (
    <section className="relative w-full py-10 bg-[#070709] border-y border-white/[0.05] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#070709] via-transparent to-[#070709] z-10 pointer-events-none" />

      <div className="flex items-center gap-6 mb-5 px-6 max-w-7xl mx-auto">
        <span className="heading-tactical">Built on</span>
        <div className="flex-1 ribbon-accent" />
        <span className="text-[10px] text-white/40 tracking-wider uppercase">Production stack</span>
      </div>

      <div className="marquee-mask">
        <div className="marquee-track gap-12 items-center py-2">
          {[...stack, ...stack].map((name, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-white/50 hover:text-amber-300 transition-colors shrink-0"
            >
              <span className="w-1 h-1 rounded-full bg-amber-500/60" />
              <span className="text-lg font-semibold tracking-tight whitespace-nowrap">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
