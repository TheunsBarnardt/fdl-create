// Curated preset blocks, shadcnui-blocks-inspired.
// These are standalone (no collection binding required) — drop them in a page as-is
// and edit the copy. If you add {{slot}} tokens later, the block studio will detect
// them and let you bind fields.

export type PresetCategory =
  | 'hero'
  | 'features'
  | 'pricing'
  | 'cta'
  | 'testimonial'
  | 'stats'
  | 'faq'
  | 'logos'
  | 'footer'
  | 'content';

export type BlockPreset = {
  id: string;
  name: string; // machine name (stored as CustomBlock.name)
  title: string; // display title
  category: PresetCategory;
  description: string;
  source: string; // JSX/HTML template
};

export const CATEGORY_META: Record<PresetCategory, { label: string; blurb: string }> = {
  hero: { label: 'Hero', blurb: 'Above-the-fold lead-ins with a headline + CTA' },
  features: { label: 'Features', blurb: 'Three- and four-column feature grids' },
  pricing: { label: 'Pricing', blurb: 'Comparison tables and plan cards' },
  cta: { label: 'Call to action', blurb: 'Conversion bands and sign-up prompts' },
  testimonial: { label: 'Testimonials', blurb: 'Quotes and social proof panels' },
  stats: { label: 'Stats', blurb: 'Metrics strips and KPI rows' },
  faq: { label: 'FAQ', blurb: 'Accordion-ready question lists' },
  logos: { label: 'Logo cloud', blurb: 'Trusted-by bars of customer logos' },
  footer: { label: 'Footer', blurb: 'Site footers with nav + legal' },
  content: { label: 'Content', blurb: 'Articles, quotes, and long-form blocks' }
};

export const BLOCK_PRESETS: BlockPreset[] = [
  // ---------------------------- HERO ----------------------------
  {
    id: 'hero-split',
    name: 'hero-split',
    title: 'Hero — split with image',
    category: 'hero',
    description: 'Headline + subcopy + primary CTA on the left, illustration on the right.',
    source: `<section className="py-20 bg-white">
  <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 gap-12 items-center">
    <div>
      <span className="chip bg-accent-soft text-accent">New · 2026</span>
      <h1 className="display text-5xl mt-4 leading-tight">Build faster with composable blocks.</h1>
      <p className="text-neutral-600 mt-4 leading-relaxed text-lg">
        Ship marketing pages without re-cutting a design system every time. Mix presets, bind to data, deploy.
      </p>
      <div className="flex gap-3 mt-6">
        <a href="/sign-up" className="px-5 py-2.5 rounded-md bg-ink-950 text-paper text-sm font-medium">Get started</a>
        <a href="/pages" className="px-5 py-2.5 rounded-md border border-neutral-200 text-sm">See examples</a>
      </div>
    </div>
    <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-accent-soft to-white border border-neutral-200" />
  </div>
</section>`
  },
  {
    id: 'hero-centered',
    name: 'hero-centered',
    title: 'Hero — centered',
    category: 'hero',
    description: 'Centered headline with badge and dual CTA below.',
    source: `<section className="py-24 bg-paper">
  <div className="max-w-3xl mx-auto px-6 text-center">
    <span className="chip bg-accent-soft text-accent">Open beta</span>
    <h1 className="display text-5xl mt-5">The CMS that writes its own components.</h1>
    <p className="text-neutral-600 mt-4 text-lg leading-relaxed">
      Paste from shadcn/ui. Bind to a collection. Ship. Your pages stay responsive by default.
    </p>
    <div className="flex gap-3 justify-center mt-7">
      <a href="/sign-up" className="px-5 py-2.5 rounded-md bg-ink-950 text-paper text-sm">Start for free</a>
      <a href="/api-reference" className="px-5 py-2.5 rounded-md border border-neutral-200 text-sm">Read the docs</a>
    </div>
  </div>
</section>`
  },
  {
    id: 'hero-gradient',
    name: 'hero-gradient',
    title: 'Hero — gradient background',
    category: 'hero',
    description: 'Dark gradient hero with contrast CTA.',
    source: `<section className="py-24 bg-gradient-to-br from-ink-950 via-ink-900 to-accent/40 text-paper">
  <div className="max-w-4xl mx-auto px-6 text-center">
    <h1 className="display text-5xl leading-tight">Schema-as-data. Live. Forever.</h1>
    <p className="text-paper/70 mt-4 text-lg">
      Change your collection shape at 2am and the whole app adjusts. No migrations. No redeploys.
    </p>
    <a href="/sign-up" className="inline-block px-6 py-3 mt-7 bg-paper text-ink-950 rounded-md text-sm font-medium">Create workspace</a>
  </div>
</section>`
  },

  // ---------------------------- FEATURES ----------------------------
  {
    id: 'features-3col',
    name: 'features-3col',
    title: 'Features — three-column',
    category: 'features',
    description: 'Three bullet-style features with icon dot and body copy.',
    source: `<section className="py-20 bg-white">
  <div className="max-w-6xl mx-auto px-6">
    <div className="text-center max-w-2xl mx-auto">
      <span className="chip bg-accent-soft text-accent">Why us</span>
      <h2 className="display text-3xl mt-3">Everything you need to ship content fast.</h2>
      <p className="text-neutral-600 mt-3">A three-line promise that sets the shape for the grid below.</p>
    </div>
    <div className="grid grid-cols-3 gap-6 mt-12">
      <div className="p-6 rounded-xl border border-neutral-200 bg-white">
        <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center text-accent">✱</div>
        <h3 className="font-semibold mt-3">Live schema</h3>
        <p className="text-sm text-neutral-600 mt-1.5">Rename a field, reshape the UI. No downtime.</p>
      </div>
      <div className="p-6 rounded-xl border border-neutral-200 bg-white">
        <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center text-accent">◍</div>
        <h3 className="font-semibold mt-3">Composable blocks</h3>
        <p className="text-sm text-neutral-600 mt-1.5">Paste any JSX. Bind. Reuse across pages.</p>
      </div>
      <div className="p-6 rounded-xl border border-neutral-200 bg-white">
        <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center text-accent">⚙</div>
        <h3 className="font-semibold mt-3">Built-in API</h3>
        <p className="text-sm text-neutral-600 mt-1.5">Every collection ships with REST + PATs out of the box.</p>
      </div>
    </div>
  </div>
</section>`
  },
  {
    id: 'features-alt',
    name: 'features-alt',
    title: 'Features — image + bullets',
    category: 'features',
    description: 'Alternating row with illustration left and numbered bullets right.',
    source: `<section className="py-20 bg-paper">
  <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 gap-12 items-center">
    <div className="aspect-[5/4] rounded-xl bg-gradient-to-br from-accent/20 to-white border border-neutral-200" />
    <div>
      <span className="chip bg-accent-soft text-accent">How it works</span>
      <h2 className="display text-3xl mt-3">From empty workspace to live page in five minutes.</h2>
      <ul className="space-y-4 mt-6">
        <li className="flex gap-3">
          <span className="w-7 h-7 rounded-full bg-ink-950 text-paper flex items-center justify-center text-xs">1</span>
          <div><div className="font-medium">Design a collection</div><div className="text-sm text-neutral-600">Add fields visually — no migrations.</div></div>
        </li>
        <li className="flex gap-3">
          <span className="w-7 h-7 rounded-full bg-ink-950 text-paper flex items-center justify-center text-xs">2</span>
          <div><div className="font-medium">Author a block</div><div className="text-sm text-neutral-600">Paste JSX. Declare slots. Bind.</div></div>
        </li>
        <li className="flex gap-3">
          <span className="w-7 h-7 rounded-full bg-ink-950 text-paper flex items-center justify-center text-xs">3</span>
          <div><div className="font-medium">Publish</div><div className="text-sm text-neutral-600">Drop the block on a page and hit publish.</div></div>
        </li>
      </ul>
    </div>
  </div>
</section>`
  },
  {
    id: 'features-bento',
    name: 'features-bento',
    title: 'Features — bento grid',
    category: 'features',
    description: 'Mixed-size feature tiles for a bento layout.',
    source: `<section className="py-20 bg-white">
  <div className="max-w-6xl mx-auto px-6">
    <h2 className="display text-3xl text-center">A little bit of everything.</h2>
    <div className="grid grid-cols-6 gap-4 mt-10">
      <div className="col-span-3 row-span-2 p-6 rounded-xl border border-neutral-200 bg-gradient-to-br from-accent-soft to-white">
        <div className="chip bg-accent text-white">Featured</div>
        <h3 className="display text-xl mt-3">Visual schema designer</h3>
        <p className="text-sm text-neutral-600 mt-2">Drag fields. Rearrange. Ship.</p>
      </div>
      <div className="col-span-3 p-6 rounded-xl border border-neutral-200">
        <h3 className="font-semibold">REST API</h3>
        <p className="text-xs text-neutral-600 mt-1">Auto-generated per collection.</p>
      </div>
      <div className="col-span-3 p-6 rounded-xl border border-neutral-200">
        <h3 className="font-semibold">Governance</h3>
        <p className="text-xs text-neutral-600 mt-1">AI off by default. Full audit trail.</p>
      </div>
      <div className="col-span-2 p-6 rounded-xl border border-neutral-200">
        <h3 className="font-semibold">Backups</h3>
        <p className="text-xs text-neutral-600 mt-1">One-click snapshots.</p>
      </div>
      <div className="col-span-2 p-6 rounded-xl border border-neutral-200">
        <h3 className="font-semibold">Versioning</h3>
        <p className="text-xs text-neutral-600 mt-1">Diff pages over time.</p>
      </div>
      <div className="col-span-2 p-6 rounded-xl border border-neutral-200">
        <h3 className="font-semibold">Webhooks</h3>
        <p className="text-xs text-neutral-600 mt-1">Trigger on write.</p>
      </div>
    </div>
  </div>
</section>`
  },

  // ---------------------------- PRICING ----------------------------
  {
    id: 'pricing-3tier',
    name: 'pricing-3tier',
    title: 'Pricing — three-tier',
    category: 'pricing',
    description: 'Starter / Pro / Enterprise with a highlighted middle tier.',
    source: `<section className="py-20 bg-white">
  <div className="max-w-6xl mx-auto px-6 text-center">
    <h2 className="display text-3xl">Simple, predictable pricing.</h2>
    <p className="text-neutral-600 mt-2">No per-seat gotchas. Scale when you need to.</p>
    <div className="grid grid-cols-3 gap-6 mt-12 text-left">
      <div className="p-6 rounded-xl border border-neutral-200">
        <div className="text-sm text-neutral-500">Starter</div>
        <div className="mt-3"><span className="display text-4xl">$0</span><span className="text-sm text-neutral-500">/mo</span></div>
        <p className="text-sm text-neutral-600 mt-2">For solo projects and side quests.</p>
        <ul className="text-sm text-neutral-600 mt-5 space-y-2">
          <li>· 1 workspace</li><li>· Up to 1k records</li><li>· Community support</li>
        </ul>
        <a className="mt-6 block text-center px-4 py-2 border border-neutral-200 rounded-md text-sm">Start free</a>
      </div>
      <div className="p-6 rounded-xl border-2 border-accent bg-accent-soft/40 ring-1 ring-accent/30 relative">
        <div className="chip bg-accent text-white absolute -top-3 left-6">Popular</div>
        <div className="text-sm text-accent font-medium">Pro</div>
        <div className="mt-3"><span className="display text-4xl">$29</span><span className="text-sm text-neutral-500">/mo</span></div>
        <p className="text-sm text-neutral-600 mt-2">Everything you need to publish for real.</p>
        <ul className="text-sm text-neutral-700 mt-5 space-y-2">
          <li>· Unlimited workspaces</li><li>· 1M records</li><li>· Priority support</li>
        </ul>
        <a className="mt-6 block text-center px-4 py-2 bg-ink-950 text-paper rounded-md text-sm">Start 14-day trial</a>
      </div>
      <div className="p-6 rounded-xl border border-neutral-200">
        <div className="text-sm text-neutral-500">Enterprise</div>
        <div className="mt-3"><span className="display text-4xl">Talk</span></div>
        <p className="text-sm text-neutral-600 mt-2">SSO, audit export, and a named CSM.</p>
        <ul className="text-sm text-neutral-600 mt-5 space-y-2">
          <li>· SAML / OIDC</li><li>· 99.99% SLA</li><li>· Dedicated region</li>
        </ul>
        <a className="mt-6 block text-center px-4 py-2 border border-neutral-200 rounded-md text-sm">Contact sales</a>
      </div>
    </div>
  </div>
</section>`
  },

  // ---------------------------- CTA ----------------------------
  {
    id: 'cta-band',
    name: 'cta-band',
    title: 'CTA — full-width band',
    category: 'cta',
    description: 'Dark conversion band with a single primary action.',
    source: `<section className="py-16 bg-ink-950 text-paper">
  <div className="max-w-5xl mx-auto px-6 flex items-center justify-between gap-6">
    <div>
      <h2 className="display text-3xl">Ready when you are.</h2>
      <p className="text-paper/70 mt-2">Set up a workspace in under two minutes.</p>
    </div>
    <a href="/sign-up" className="px-5 py-3 bg-accent text-white rounded-md text-sm font-medium shrink-0">Create workspace →</a>
  </div>
</section>`
  },
  {
    id: 'cta-newsletter',
    name: 'cta-newsletter',
    title: 'CTA — newsletter inline',
    category: 'cta',
    description: 'Inline email capture with a sentence of copy.',
    source: `<section className="py-14 bg-paper border-y border-neutral-200">
  <div className="max-w-3xl mx-auto px-6 text-center">
    <h2 className="display text-2xl">Ship notes, monthly.</h2>
    <p className="text-neutral-600 mt-2 text-sm">One email. Product updates and a good recipe.</p>
    <form className="mt-5 flex max-w-md mx-auto gap-2">
      <input type="email" placeholder="you@company.com" className="flex-1 border border-neutral-200 rounded-md px-3 py-2 text-sm" />
      <button type="submit" className="px-4 py-2 bg-ink-950 text-paper rounded-md text-sm">Subscribe</button>
    </form>
  </div>
</section>`
  },

  // ---------------------------- TESTIMONIALS ----------------------------
  {
    id: 'testimonial-quote',
    name: 'testimonial-quote',
    title: 'Testimonial — hero quote',
    category: 'testimonial',
    description: 'One oversized quote with author attribution.',
    source: `<section className="py-20 bg-white">
  <div className="max-w-3xl mx-auto px-6 text-center">
    <div className="text-accent display text-6xl leading-none">"</div>
    <blockquote className="display text-2xl leading-relaxed mt-4">
      Lattice cut our page-build cycles from two weeks to a Tuesday afternoon.
    </blockquote>
    <div className="mt-6 flex items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-full bg-neutral-200" />
      <div className="text-left">
        <div className="font-medium text-sm">Amelia Chen</div>
        <div className="text-xs text-neutral-500">Head of Product · Meridian</div>
      </div>
    </div>
  </div>
</section>`
  },
  {
    id: 'testimonial-grid',
    name: 'testimonial-grid',
    title: 'Testimonial — three-up grid',
    category: 'testimonial',
    description: 'Three customer cards with avatar, quote, company.',
    source: `<section className="py-20 bg-paper">
  <div className="max-w-6xl mx-auto px-6">
    <h2 className="display text-3xl text-center">Teams ship faster on Lattice.</h2>
    <div className="grid grid-cols-3 gap-6 mt-10">
      <div className="p-6 bg-white border border-neutral-200 rounded-xl">
        <p className="text-sm">“The block studio feels like pasting from Figma, except it actually works.”</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-neutral-200" />
          <div><div className="text-xs font-medium">Jordan P.</div><div className="text-[10px] text-neutral-500">Engineering · Palette</div></div>
        </div>
      </div>
      <div className="p-6 bg-white border border-neutral-200 rounded-xl">
        <p className="text-sm">“Schema changes at 2am, app adjusts by 2:01. Wild.”</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-neutral-200" />
          <div><div className="text-xs font-medium">Mira S.</div><div className="text-[10px] text-neutral-500">CTO · Orbit</div></div>
        </div>
      </div>
      <div className="p-6 bg-white border border-neutral-200 rounded-xl">
        <p className="text-sm">“Finally a CMS that thinks in components, not pages.”</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-neutral-200" />
          <div><div className="text-xs font-medium">Lee N.</div><div className="text-[10px] text-neutral-500">Design · Rill</div></div>
        </div>
      </div>
    </div>
  </div>
</section>`
  },

  // ---------------------------- STATS ----------------------------
  {
    id: 'stats-strip',
    name: 'stats-strip',
    title: 'Stats — four-up strip',
    category: 'stats',
    description: 'Four KPIs with large numbers.',
    source: `<section className="py-16 bg-white border-y border-neutral-200">
  <div className="max-w-6xl mx-auto px-6 grid grid-cols-4 gap-6 text-center">
    <div><div className="display text-4xl">14×</div><div className="text-xs text-neutral-500 mt-1">Faster publishing</div></div>
    <div><div className="display text-4xl">99.99%</div><div className="text-xs text-neutral-500 mt-1">Uptime SLA</div></div>
    <div><div className="display text-4xl">1.2M</div><div className="text-xs text-neutral-500 mt-1">Rows served / day</div></div>
    <div><div className="display text-4xl">28</div><div className="text-xs text-neutral-500 mt-1">Ship-ready blocks</div></div>
  </div>
</section>`
  },

  // ---------------------------- FAQ ----------------------------
  {
    id: 'faq-2col',
    name: 'faq-2col',
    title: 'FAQ — two-column',
    category: 'faq',
    description: 'Common questions laid out in a compact two-column list.',
    source: `<section className="py-20 bg-paper">
  <div className="max-w-5xl mx-auto px-6">
    <div className="text-center">
      <h2 className="display text-3xl">Frequently asked.</h2>
      <p className="text-neutral-600 mt-2 text-sm">Still wondering? Drop us a note.</p>
    </div>
    <div className="grid grid-cols-2 gap-x-10 gap-y-8 mt-10">
      <div>
        <h3 className="font-semibold">Is there a free tier?</h3>
        <p className="text-sm text-neutral-600 mt-1.5">Yes — Starter is free for one workspace up to 1,000 rows.</p>
      </div>
      <div>
        <h3 className="font-semibold">Can I self-host?</h3>
        <p className="text-sm text-neutral-600 mt-1.5">Enterprise customers get a Docker bundle with their own region.</p>
      </div>
      <div>
        <h3 className="font-semibold">Do you support SSO?</h3>
        <p className="text-sm text-neutral-600 mt-1.5">SAML / OIDC ships with Enterprise. OAuth on all tiers.</p>
      </div>
      <div>
        <h3 className="font-semibold">What about AI features?</h3>
        <p className="text-sm text-neutral-600 mt-1.5">AI is off by default. Opt in per collection; every call is audit-logged.</p>
      </div>
    </div>
  </div>
</section>`
  },

  // ---------------------------- LOGOS ----------------------------
  {
    id: 'logos-cloud',
    name: 'logos-cloud',
    title: 'Logo cloud — trusted by',
    category: 'logos',
    description: 'Muted row of placeholder marks.',
    source: `<section className="py-12 bg-white border-y border-neutral-200">
  <div className="max-w-6xl mx-auto px-6">
    <div className="text-center text-xs uppercase tracking-wider text-neutral-500">Trusted by product teams at</div>
    <div className="mt-6 grid grid-cols-6 gap-6 items-center opacity-60">
      <div className="h-8 bg-neutral-200 rounded" />
      <div className="h-8 bg-neutral-200 rounded" />
      <div className="h-8 bg-neutral-200 rounded" />
      <div className="h-8 bg-neutral-200 rounded" />
      <div className="h-8 bg-neutral-200 rounded" />
      <div className="h-8 bg-neutral-200 rounded" />
    </div>
  </div>
</section>`
  },

  // ---------------------------- FOOTER ----------------------------
  {
    id: 'footer-columns',
    name: 'footer-columns',
    title: 'Footer — four columns',
    category: 'footer',
    description: 'Logo + three nav columns + legal strip.',
    source: `<footer className="bg-ink-950 text-paper/80 py-16">
  <div className="max-w-6xl mx-auto px-6 grid grid-cols-4 gap-8">
    <div>
      <div className="display text-lg text-paper">Lattice</div>
      <p className="text-xs text-paper/50 mt-2 leading-relaxed">
        The composable CMS for teams that ship.
      </p>
    </div>
    <div>
      <div className="text-xs font-semibold text-paper mb-3">Product</div>
      <ul className="text-xs space-y-2 text-paper/60">
        <li>Schema</li><li>Blocks</li><li>API</li><li>Governance</li>
      </ul>
    </div>
    <div>
      <div className="text-xs font-semibold text-paper mb-3">Company</div>
      <ul className="text-xs space-y-2 text-paper/60">
        <li>About</li><li>Changelog</li><li>Careers</li><li>Contact</li>
      </ul>
    </div>
    <div>
      <div className="text-xs font-semibold text-paper mb-3">Legal</div>
      <ul className="text-xs space-y-2 text-paper/60">
        <li>Privacy</li><li>Terms</li><li>POPIA</li><li>DPA</li>
      </ul>
    </div>
  </div>
  <div className="max-w-6xl mx-auto px-6 mt-12 pt-6 border-t border-paper/10 flex justify-between text-[11px] text-paper/40">
    <div>© 2026 Lattice Labs</div>
    <div>Made in Cape Town</div>
  </div>
</footer>`
  },

  // ---------------------------- CONTENT ----------------------------
  {
    id: 'content-article',
    name: 'content-article',
    title: 'Content — article intro',
    category: 'content',
    description: 'Blog-style H1 + metadata + lead paragraph.',
    source: `<article className="py-16 bg-white">
  <div className="max-w-2xl mx-auto px-6">
    <div className="chip bg-accent-soft text-accent">Engineering</div>
    <h1 className="display text-4xl mt-4 leading-tight">Why we chose schema-as-data over code generation.</h1>
    <div className="flex items-center gap-3 mt-5 text-xs text-neutral-500">
      <div className="w-7 h-7 rounded-full bg-neutral-200" />
      <span>Theuns Barnardt · 12 Apr 2026 · 7 min read</span>
    </div>
    <p className="mt-8 text-lg leading-relaxed text-neutral-700">
      Most CMSes treat the schema as a static contract. We treated ours as live data — and it changed the shape of everything downstream.
    </p>
  </div>
</article>`
  }
];

export const CATEGORY_ORDER: PresetCategory[] = [
  'hero',
  'features',
  'pricing',
  'cta',
  'testimonial',
  'stats',
  'faq',
  'logos',
  'footer',
  'content'
];

export function presetsByCategory(): Record<PresetCategory, BlockPreset[]> {
  const out = {} as Record<PresetCategory, BlockPreset[]>;
  for (const cat of CATEGORY_ORDER) out[cat] = [];
  for (const p of BLOCK_PRESETS) out[p.category].push(p);
  return out;
}
