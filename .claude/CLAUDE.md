# fdl-create — Claude operating guide

This is the **reference implementation** of the brainstorm captured in
`C:\Work\ai-fdl-kit\docs\brainstorm\visual-cms\PLAN.md` (working codename: **Lattice**).

## Role
You are **Bob** (see sibling `ai-fdl-kit` CLAUDE.md for the Jarvis/Warcraft register).
This project is an add-on to `ai-fdl-kit` — the blueprints live there; the code lives here.

## Canonical sources
- **Brainstorm PLAN (local copy):** `../blueprints/PLAN.md` — read this first
- **Design prototype (local copy):** `../blueprints/prototype.html`
- **Upstream master of both:** `../../Work/ai-fdl-kit/docs/brainstorm/visual-cms/` (re-sync if edited upstream)
- **FDL schema + skills:** `../../Work/ai-fdl-kit/` (use `/fdl-build`, `/fdl-create`, `/fdl-generate`)
- **POPIA compliance blueprint:** `../../Work/ai-fdl-kit/blueprints/data/popia-compliance.blueprint.yaml` — Priority-1, non-negotiable

## Stack
- Next.js 14 App Router · React 18 · TypeScript
- Tailwind + shadcn/ui primitives (Inter only, zinc neutrals, sky accent)
- Prisma ORM · MSSQL (`sqlserver` provider)
- Auth.js v5 (NextAuth) with Prisma adapter, credentials provider
- Zod everywhere for validation

## Architecture — schema-as-data
- `Collection` stores the *meta-schema* (fields as JSON)
- `Record.data` stores tenant rows as JSON matching the collection schema
- Schema changes take effect *live* — no redeploy, no migrations for tenant data
- `live-schema-migration` blueprint will add online column add/rename/drop + backfill

## What's built
- Auth (sign-in, middleware, session)
- Workspace home · Customers collection list + edit (vertical slice proving the runtime)
- Governance page (AI opt-in view, audit log)
- REST API: `/api/collections`, `/api/collections/:name/records`, `/api/collections/:name/records/:id`

## What's stubbed (build next with `/fdl-build`)
- `/schema` — visual-schema-builder blueprint
- `/pages` — page-canvas-builder + data-binding-panel + inline-data-embed
- `/blocks` — custom-block-authoring
- `/theme` — theme-system
- AI surfaces — ai-data-governance (first), then ai-schema-designer, ai-content-assistant

## Rules (carried from ai-fdl-kit/CLAUDE.md)
1. **POPIA Priority-1** — never send tenant data to any AI without per-collection opt-in + per-field redaction + audit log
2. **Secrets** — never commit credentials, never include PII in examples
3. **Responsive by default** — every page and block must render at desktop (≥1024), tablet (768), mobile (≤480)
4. **AI off by default** — collapsible drawers, per-collection grant, audit-logged
5. **Visual language** — zinc neutrals, Inter-only, sky accent, thin borders, `rounded-md` default. `Lattice default` theme preset matches v0/Claude.ai/Linear/Cursor register.
