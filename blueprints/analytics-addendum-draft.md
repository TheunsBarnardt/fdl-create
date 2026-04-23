# PLAN addendum — Analytics & Observability surface

**Proposed for merge into:** `C:\Work\ai-fdl-kit\docs\brainstorm\visual-cms\PLAN.md`
**Drafted:** 2026-04-23
**Origin:** fdl-create working session — user wants a Cloudflare-style analytics surface + Google Lighthouse scores inside the product.

## One-paragraph summary

Every Lattice workspace gets a first-class **Analytics** surface modelled on Cloudflare's Account Analytics + Web Analytics, extended with Lighthouse-style quality scores. Three tabs — **Traffic** (requests, bandwidth, visits, page views, geo map, cache, errors), **Visitors** (Core Web Vitals LCP/FID/CLS/INP, device/browser/referrer breakdowns), **Quality** (Lighthouse Performance/Accessibility/Best Practices/SEO scores with history). Telemetry is collected by a tenant-scoped runtime that treats visitor records as POPIA-governed data — same opt-in, redaction, and audit rules as every other collection.

## Decisions to lock in

| Fork | Options | Recommendation |
|---|---|---|
| Data source for traffic metrics | (a) Cloudflare Web Analytics beacon, (b) self-hosted Plausible/Umami, (c) first-party edge logs via middleware | **(c) first-party middleware** — keeps POPIA surface owned, no third-party data egress. (a)/(b) remain opt-in integrations. |
| Core Web Vitals collection | (a) `web-vitals` JS library → `/api/telemetry`, (b) Vercel Speed Insights, (c) Cloudflare Web Analytics RUM | **(a)** — same reason as above, and it's ~1kB. |
| Lighthouse score source | (a) PageSpeed Insights API (Google-hosted), (b) self-hosted Lighthouse CI, (c) on-demand browser run | **(b) Lighthouse CI** for scheduled scores + **(c) on-demand** button for per-page re-run. (a) is a third-party round-trip with quota limits. |
| Storage | Reuse `Collection`/`Record` shape (schema-as-data) or dedicated time-series table? | **Dedicated append-only `TelemetryEvent` table** — time-series volume breaks the JSON-record pattern. Aggregates roll up into regular collections (`TrafficDaily`, `VitalsDaily`, `LighthouseRun`) so dashboard queries stay on the standard runtime. |
| Scope | Per-workspace, per-site, or per-page? | **All three, nested.** Workspace → Sites → Pages, with drill-down. Mirrors Cloudflare's Account → Zone → Path structure. |

## New blueprints to create

Two new blueprints, added to the existing 13:

| Blueprint | Category | What it defines |
|---|---|---|
| `observability-runtime` | data | Edge middleware that stamps each request with `requestId`, `duration`, `cacheHit`, `geo`, `ua`; `/api/telemetry` ingress for client-side web-vitals + Lighthouse CI results; append-only `TelemetryEvent` storage; nightly roll-up jobs into `TrafficDaily` / `VitalsDaily` / `LighthouseRun` collections; retention policy (raw 30d, daily 13mo). Lists `popia-compliance` as `required`. |
| `analytics-dashboard` | ui | The `/analytics` surface — three tabs (Traffic / Visitors / Quality), Cloudflare-style metric cards with sparklines, world-map geo breakdown, time-range picker (last 24h / 7d / 30d / custom), drill-down from workspace → site → page, Lighthouse score history chart, on-demand "Run Lighthouse" button. Reads only from the aggregate collections (never the raw `TelemetryEvent` table — keeps the UI fast and the PII surface small). |

## POPIA posture (non-negotiable)

Web analytics is PII-adjacent — IP, geo, user-agent, referrer, session identifier all count. This surface must thread through the same governance pipe as every other tenant-data surface:

- **Redaction-on-ingress.** `TelemetryEvent` writes pass through the `ai-data-governance` redaction pipeline before storage. IPs are hashed with a per-workspace rotating salt by default; full IP retention is a per-workspace opt-in with a banner.
- **Per-collection grant still applies.** The `TelemetryEvent` "collection" has its own Governance row. Turning analytics off means ingress stops and the dashboard shows "disabled".
- **Audit-logged.** Every aggregate read by the dashboard UI is logged (actor, time-range, scope) — same contract as AI reads.
- **Data-residency.** Telemetry stays on the same workspace plane as the tenant's other data — no cross-region shipping even if the roll-up worker is shared infrastructure.
- **Visitor-side disclosure.** Generated tenant apps must render a cookie/analytics banner when `observability-runtime` is active. Banner text and behaviour come from the `popia-compliance` blueprint.

## Responsive posture

Analytics dashboards historically ship desktop-only. Not here — the three tabs must render at tablet and mobile. On mobile, metric cards stack, the geo map collapses to a sortable country list, and the Lighthouse history chart switches to a compact sparkline + latest-score badge. Publish-gate check applies (author sees all three breakpoints before shipping).

## AI posture

No AI in v1 of this surface. Later candidates (parked):
- **Anomaly narrator** — "5xx rate spiked 4× on 2026-04-22 between 14:00–15:00, 92% from /api/records/customers" — on-demand, opt-in, reads aggregates only.
- **Lighthouse regression explainer** — "LCP dropped from 2.1s to 4.3s between runs; the added `/hero-image.jpg` (2.8MB unoptimised) is the likely cause" — opt-in per site.

Both fold into `ai-content-assistant` when built, gated by the same `ai-data-governance` opt-in.

## Build order impact

Insert after the M2/M3 surfaces are alive but before the AI layer:

1. Foundation — `schema-registry` + `live-schema-migration` + `workspace-data-plane`
2. M2 — `visual-schema-builder`
3. M3 — `page-canvas-builder` + `data-binding-panel` + `inline-data-embed`
4. Editor runtime — `form-builder`
5. **Observability — `observability-runtime` then `analytics-dashboard`** ← new
6. AI layer — `ai-data-governance` → `ai-schema-designer` → `ai-content-assistant`
7. Control plane — `workspace-control-plane`

Rationale for slotting here: we want Lighthouse + traffic data *before* the AI layer ships, because the anomaly-narrator use case depends on having a history of aggregates to narrate over. Also, the `TelemetryEvent` path exercises `ai-data-governance`'s redaction pipeline in a lower-stakes context than AI reads — useful shake-down.

## Known unknowns

- **Geo map library.** Cloudflare uses a custom SVG topology; we'd likely pull `react-simple-maps` or `topojson` + `d3-geo`. Decision deferred to implementation.
- **Lighthouse CI hosting.** Local Puppeteer vs. a dedicated runner worker. If self-hosted single-tenant deploys, runners live on the workspace plane; if SaaS, likely a shared pool with per-workspace quotas. Revisit when `workspace-control-plane` lands.
- **Sampling.** At what traffic level do we switch from 100% event capture to sampled ingress? Parked — not a v1 concern for the early tenant footprint.
- **Real-user Lighthouse vs. synthetic.** v1 = synthetic (Lighthouse CI on a schedule). Real-user "field data" via Chrome UX Report / CrUX API is a post-v1 add.

## Stub-first build plan (concrete, fdl-create side)

Matches the "what's stubbed, build next" rhythm in `CLAUDE.md`:

1. `src/app/(app)/analytics/page.tsx` — tabbed shell, mock data matching the Cloudflare layout, using the Lattice default theme (zinc/sky, thin borders, `rounded-md`).
2. `src/components/analytics/` — `metric-card.tsx`, `sparkline.tsx`, `geo-map.tsx`, `vitals-panel.tsx`, `lighthouse-score.tsx`.
3. Sidebar entry added to `src/components/sidebar.tsx` with the Lattice bar-chart icon.
4. Mock data lives in `src/lib/analytics-fixtures.ts` until `observability-runtime` is built.
5. Real ingress (`/api/telemetry`) + middleware wiring is a second PR, gated on the `observability-runtime` blueprint being authored upstream.

## Next step

Two-part handoff:

1. **Upstream sync** — merge this addendum into `C:\Work\ai-fdl-kit\docs\brainstorm\visual-cms\PLAN.md` (append the new blueprints to the table, update the build order).
2. **Author the two blueprints** via `/fdl-create observability-runtime` then `/fdl-create analytics-dashboard` in the `ai-fdl-kit` repo.
3. **Build the stub UI here** via `/fdl-build analytics-dashboard` once the blueprint exists.
