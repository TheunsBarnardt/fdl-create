# fdl-create · Lattice

Visual user-driven CMS + app-data platform. Companion reference implementation for the
`ai-fdl-kit` brainstorm output. Schema-as-data, live runtime, POPIA-gated AI, built on
Next.js + Prisma + MSSQL with Auth.js.

## What's in this scaffold

| Surface | Status |
|---|---|
| Auth (sign-in, middleware, sessions) | ✅ working |
| Workspace home | ✅ working |
| Customers collection — list, edit, create | ✅ working (vertical slice) |
| REST API for collections + records | ✅ working |
| Governance (AI opt-in view, audit log) | ✅ read-only |
| Schema designer (M2) | 🟡 stub — needs `visual-schema-builder` |
| Page editor (M3) | 🟡 stub — needs `page-canvas-builder` + binding blueprints |
| Block studio | 🟡 stub — needs `custom-block-authoring` |
| Theme studio | 🟡 stub — needs `theme-system` |
| AI co-pilots | 🟡 stub — governance blueprint must land first |

## Prerequisites

- Node 20+
- A reachable MSSQL instance (local SQL Server, Azure SQL, or Docker `mcr.microsoft.com/mssql/server`)
- `npm` or `pnpm`

## Setup

```bash
cd C:\private\fdl-create
npm install
cp .env.example .env
# edit DATABASE_URL + AUTH_SECRET in .env

npm run db:generate
npm run db:push      # creates tables
npm run db:seed      # creates admin@fdl.local / admin123 + Customers collection

npm run dev
# http://localhost:3000
```

Sign in with `admin@fdl.local` / `admin123`.

## REST API

All endpoints require a session cookie (same auth as the web app).

```
GET    /api/collections
POST   /api/collections
GET    /api/collections/:name/records
POST   /api/collections/:name/records
GET    /api/collections/:name/records/:id
PATCH  /api/collections/:name/records/:id
DELETE /api/collections/:name/records/:id
```

Request bodies are validated against the collection's stored schema (Zod, derived at request time — schema-as-data).

## How it connects to `ai-fdl-kit`

- **Blueprints** (YAML specs) live in `C:\Work\ai-fdl-kit\blueprints\`
- **Brainstorm plan** (product decisions + blueprint list) at
  `C:\Work\ai-fdl-kit\docs\brainstorm\visual-cms\PLAN.md`
- **Clickable prototype** at
  `C:\Work\ai-fdl-kit\docs\brainstorm\visual-cms\prototype.html`
- To extend this project, run `/fdl-build <blueprint-name>` from the `ai-fdl-kit` repo.
  Claude will read the blueprint and generate the implementation into this codebase.

## POPIA

Per-collection AI opt-in, per-field redaction, and full audit logging are **required** before
any AI surface touches tenant data. The `AiAuditLog` table and Governance page are the
foundation — the opt-in workflow and redaction UI land with the `ai-data-governance` blueprint.

## License

Private / internal.
