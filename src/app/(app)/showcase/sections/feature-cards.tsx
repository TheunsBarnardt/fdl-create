'use client';

type Feature = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  Illustration: () => React.ReactNode;
  accent: 'amber' | 'violet' | 'sky' | 'emerald';
};

const accentMap = {
  amber:   { text: 'text-amber-300',   ring: 'rgba(245,158,11,0.55)',   glow: 'rgba(245,158,11,0.35)' },
  violet:  { text: 'text-violet-300',  ring: 'rgba(139,92,246,0.55)',   glow: 'rgba(139,92,246,0.35)' },
  sky:     { text: 'text-sky-300',     ring: 'rgba(56,189,248,0.55)',   glow: 'rgba(56,189,248,0.35)' },
  emerald: { text: 'text-emerald-300', ring: 'rgba(52,211,153,0.55)',   glow: 'rgba(52,211,153,0.35)' },
};

const SchemaIllustration = () => (
  <svg viewBox="0 0 160 90" className="w-full h-full" fill="none">
    <rect x="10" y="15" width="50" height="18" rx="2" stroke="rgba(245,158,11,0.6)" strokeWidth="1" fill="rgba(245,158,11,0.08)" />
    <rect x="10" y="40" width="50" height="10" rx="1.5" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    <rect x="10" y="55" width="50" height="10" rx="1.5" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    <rect x="10" y="70" width="30" height="10" rx="1.5" stroke="rgba(245,158,11,0.5)" strokeWidth="1" fill="rgba(245,158,11,0.05)" />
    <path d="M60 42 Q 85 42 85 60 T 110 60" stroke="rgba(245,158,11,0.5)" strokeWidth="1" strokeDasharray="2 2" />
    <rect x="110" y="30" width="40" height="16" rx="2" stroke="rgba(139,92,246,0.55)" strokeWidth="1" fill="rgba(139,92,246,0.08)" />
    <rect x="110" y="52" width="40" height="8" rx="1" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    <rect x="110" y="64" width="40" height="8" rx="1" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    <circle cx="15" cy="24" r="2" fill="#f59e0b" className="group-hover:animate-pulse" />
    <circle cx="115" cy="38" r="2" fill="#8b5cf6" className="group-hover:animate-pulse" />
  </svg>
);

const BuilderIllustration = () => (
  <svg viewBox="0 0 160 90" className="w-full h-full" fill="none">
    <rect x="10" y="10" width="140" height="70" rx="4" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="rgba(255,255,255,0.02)" />
    <rect x="10" y="10" width="30" height="70" rx="4" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="rgba(255,255,255,0.03)" />
    <line x1="15" y1="22" x2="35" y2="22" stroke="rgba(245,158,11,0.6)" strokeWidth="1.5" />
    <line x1="15" y1="30" x2="32" y2="30" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    <line x1="15" y1="38" x2="30" y2="38" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    <rect x="48" y="18" width="45" height="25" rx="2" stroke="rgba(245,158,11,0.5)" strokeWidth="1" fill="rgba(245,158,11,0.08)" strokeDasharray="3 2" />
    <rect x="100" y="18" width="45" height="25" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    <rect x="48" y="50" width="97" height="24" rx="2" stroke="rgba(139,92,246,0.45)" strokeWidth="1" fill="rgba(139,92,246,0.05)" />
    <circle cx="53" cy="24" r="1.5" fill="#f59e0b" />
    <circle cx="60" cy="24" r="1.5" fill="#f59e0b" opacity="0.5" />
    <circle cx="67" cy="24" r="1.5" fill="#f59e0b" opacity="0.3" />
  </svg>
);

const AIIllustration = () => (
  <svg viewBox="0 0 160 90" className="w-full h-full" fill="none">
    <defs>
      <linearGradient id="ai-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <circle cx="80" cy="45" r="22" stroke="url(#ai-grad)" strokeWidth="1.5" fill="rgba(245,158,11,0.06)" />
    <circle cx="80" cy="45" r="14" stroke="rgba(245,158,11,0.4)" strokeWidth="1" strokeDasharray="2 2" className="group-hover:animate-spin" style={{ transformOrigin: 'center', animationDuration: '8s' }} />
    <path d="M80 31 L83 40 L92 40 L85 46 L88 55 L80 50 L72 55 L75 46 L68 40 L77 40 Z" fill="url(#ai-grad)" />
    <line x1="20" y1="20" x2="55" y2="35" stroke="rgba(245,158,11,0.35)" strokeWidth="0.8" strokeDasharray="2 3" />
    <line x1="20" y1="70" x2="55" y2="55" stroke="rgba(139,92,246,0.35)" strokeWidth="0.8" strokeDasharray="2 3" />
    <line x1="140" y1="22" x2="108" y2="38" stroke="rgba(245,158,11,0.35)" strokeWidth="0.8" strokeDasharray="2 3" />
    <line x1="140" y1="68" x2="108" y2="52" stroke="rgba(139,92,246,0.35)" strokeWidth="0.8" strokeDasharray="2 3" />
    <rect x="10" y="14" width="20" height="12" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="rgba(255,255,255,0.03)" />
    <rect x="10" y="64" width="20" height="12" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="rgba(255,255,255,0.03)" />
    <rect x="130" y="16" width="20" height="12" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="rgba(255,255,255,0.03)" />
    <rect x="130" y="62" width="20" height="12" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="rgba(255,255,255,0.03)" />
  </svg>
);

const ApiIllustration = () => (
  <svg viewBox="0 0 160 90" className="w-full h-full" fill="none">
    <rect x="10" y="18" width="140" height="54" rx="4" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="rgba(0,0,0,0.2)" />
    <rect x="10" y="18" width="140" height="14" rx="4 4 0 0" fill="rgba(245,158,11,0.08)" />
    <text x="18" y="28" fontSize="6" fill="rgba(245,158,11,0.8)" fontFamily="monospace" fontWeight="700">GET /api/records · 200</text>
    <text x="120" y="28" fontSize="6" fill="rgba(52,211,153,0.85)" fontFamily="monospace">38ms</text>
    <text x="18" y="44" fontSize="6" fill="rgba(255,255,255,0.5)" fontFamily="monospace">{"{"}</text>
    <text x="24" y="52" fontSize="6" fill="rgba(245,158,11,0.8)" fontFamily="monospace">"id":</text>
    <text x="46" y="52" fontSize="6" fill="rgba(52,211,153,0.75)" fontFamily="monospace">"rec_1a2b"</text>
    <text x="24" y="60" fontSize="6" fill="rgba(245,158,11,0.8)" fontFamily="monospace">"status":</text>
    <text x="56" y="60" fontSize="6" fill="rgba(52,211,153,0.75)" fontFamily="monospace">"active"</text>
    <text x="18" y="68" fontSize="6" fill="rgba(255,255,255,0.5)" fontFamily="monospace">{"}"}</text>
  </svg>
);

const GovernanceIllustration = () => (
  <svg viewBox="0 0 160 90" className="w-full h-full" fill="none">
    <path d="M80 10 L120 22 V 48 C 120 65 100 78 80 82 C 60 78 40 65 40 48 V 22 Z"
      stroke="rgba(245,158,11,0.5)" strokeWidth="1.2" fill="rgba(245,158,11,0.06)" />
    <path d="M66 48 L76 58 L94 38"
      stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="15" y1="20" x2="30" y2="20" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
    <line x1="15" y1="28" x2="34" y2="28" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    <line x1="15" y1="36" x2="26" y2="36" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    <line x1="130" y1="60" x2="145" y2="60" stroke="rgba(52,211,153,0.4)" strokeWidth="1" />
    <line x1="126" y1="68" x2="145" y2="68" stroke="rgba(52,211,153,0.25)" strokeWidth="1" />
    <line x1="132" y1="76" x2="145" y2="76" stroke="rgba(52,211,153,0.25)" strokeWidth="1" />
    <circle cx="12" cy="62" r="2" fill="#8b5cf6" />
    <circle cx="148" cy="22" r="2" fill="#f59e0b" />
  </svg>
);

const LiveIllustration = () => (
  <svg viewBox="0 0 160 90" className="w-full h-full" fill="none">
    <circle cx="80" cy="45" r="6" fill="#f59e0b" />
    <circle cx="80" cy="45" r="12" stroke="rgba(245,158,11,0.5)" strokeWidth="1" fill="none">
      <animate attributeName="r" values="12;30;12" dur="2.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="80" cy="45" r="20" stroke="rgba(245,158,11,0.3)" strokeWidth="0.8" fill="none">
      <animate attributeName="r" values="20;38;20" dur="2.5s" repeatCount="indefinite" begin="0.6s" />
      <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" repeatCount="indefinite" begin="0.6s" />
    </circle>
    <circle cx="30" cy="25" r="3" fill="#8b5cf6" />
    <circle cx="130" cy="25" r="3" fill="#38bdf8" />
    <circle cx="30" cy="65" r="3" fill="#10b981" />
    <circle cx="130" cy="65" r="3" fill="#f59e0b" />
    <line x1="33" y1="28" x2="75" y2="43" stroke="rgba(139,92,246,0.3)" strokeWidth="0.8" />
    <line x1="127" y1="28" x2="85" y2="43" stroke="rgba(56,189,248,0.3)" strokeWidth="0.8" />
    <line x1="33" y1="62" x2="75" y2="48" stroke="rgba(16,185,129,0.3)" strokeWidth="0.8" />
    <line x1="127" y1="62" x2="85" y2="48" stroke="rgba(245,158,11,0.3)" strokeWidth="0.8" />
  </svg>
);

const features: Feature[] = [
  {
    eyebrow: 'Runtime',
    title: 'Schema-as-Data',
    description: 'Change collections while the app is live. Field adds, renames, drops, and backfills — no migrations, no redeploys, no downtime.',
    highlights: ['Live schema', 'Zero downtime', 'JSON storage'],
    Illustration: SchemaIllustration,
    accent: 'amber',
  },
  {
    eyebrow: 'Authoring',
    title: 'Visual builders',
    description: 'Design collections, pages, blocks, and themes with drag-and-drop canvases. Every surface ships responsive by default.',
    highlights: ['Page canvas', 'Block studio', 'Theme tokens'],
    Illustration: BuilderIllustration,
    accent: 'violet',
  },
  {
    eyebrow: 'Intelligence',
    title: 'Claude at the core',
    description: 'Draft schemas from transcripts. Suggest field types. Generate content with per-collection opt-in and full audit trails.',
    highlights: ['Schema designer', 'Content assist', 'Auditable'],
    Illustration: AIIllustration,
    accent: 'amber',
  },
  {
    eyebrow: 'Integration',
    title: 'API-first',
    description: 'Every collection gets a typed REST endpoint out of the box. Paginate, filter, sort. Tokens scoped per project.',
    highlights: ['REST', 'Tokens', 'Typed'],
    Illustration: ApiIllustration,
    accent: 'sky',
  },
  {
    eyebrow: 'Compliance',
    title: 'POPIA-grade governance',
    description: 'Per-collection AI opt-in. Per-field redaction. Immutable audit log of every read, write, and decision — human or model.',
    highlights: ['POPIA', 'Redaction', 'Audit log'],
    Illustration: GovernanceIllustration,
    accent: 'emerald',
  },
  {
    eyebrow: 'Operations',
    title: 'Always live',
    description: 'Ambient telemetry, latency percentiles, and activity streams. Watch the system think — without opening a dashboard.',
    highlights: ['Real-time', 'Metrics', 'Incidents'],
    Illustration: LiveIllustration,
    accent: 'amber',
  },
];

export function FeatureCards() {
  return (
    <section className="relative w-full py-28 px-6 bg-[#070709] overflow-hidden">
      {/* Ambient accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-amber-500/[0.04] blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-16 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md mb-5">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/60">The platform</span>
          </div>
          <h2 className="display text-[40px] md:text-[56px] leading-[1.02] font-semibold mb-4 heading-gradient tracking-tight">
            Six surfaces,<br />
            <span className="text-gradient-sweep">one runtime.</span>
          </h2>
          <p className="text-white/55 text-base md:text-lg max-w-2xl leading-relaxed">
            FDL-Create collapses the stack: authoring, data, AI, compliance, and observability — all behind a single schema-aware layer.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, idx) => {
            const a = accentMap[feature.accent];
            return (
              <div
                key={feature.title}
                className="group tilt-card mock-card relative overflow-hidden rounded-xl p-6 flex flex-col"
                style={
                  {
                    boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                  } as React.CSSProperties
                }
              >
                {/* Hover glow ring */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    boxShadow: `inset 0 0 0 1px ${a.ring}, 0 20px 50px -20px ${a.glow}`,
                  }}
                />

                {/* Illustration window */}
                <div className="relative h-[120px] mb-5 rounded-lg border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent overflow-hidden">
                  <div className="absolute inset-0 dot-overlay opacity-50" />
                  <div className="relative w-full h-full p-3">
                    <feature.Illustration />
                  </div>
                  {/* Top-left corner label */}
                  <span className={`absolute top-2 left-2 text-[9px] font-bold tracking-[0.18em] uppercase ${a.text}`}>
                    {String(idx + 1).padStart(2, '0')} · {feature.eyebrow}
                  </span>
                </div>

                {/* Body */}
                <h3 className="text-[19px] font-semibold text-white mb-2 tracking-tight group-hover:text-amber-200 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-[13.5px] text-white/55 leading-relaxed mb-4 flex-1">
                  {feature.description}
                </p>

                {/* Highlight chips */}
                <div className="flex flex-wrap gap-1.5">
                  {feature.highlights.map((h) => (
                    <span
                      key={h}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.04] border border-white/[0.08] text-white/65"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {/* Bottom accent line */}
                <div
                  className="absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(90deg, transparent, ${a.ring}, transparent)` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
