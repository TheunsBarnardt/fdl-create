# Visual CMS — Brainstorm Result

**Working codename:** Lattice (placeholder — rename freely)
**Session date:** 2026-04-19
**Origin complaint:** Payload CMS is a good idea but too dev-locked; no reason users should write code to create a collection; admin UI is dated. Want FlutterFlow-style visual ergonomics with Claude as co-pilot, producing a clickable prototype first.

## One-paragraph summary

A modern, user-driven headless platform that unifies content CMS and application-data workloads in a single live runtime. Non-devs model data visually on a schema-diagram canvas and compose pages on a block canvas. Pages read data via both explicit query bindings and inline slash-command embeds. Claude is a sidebar co-pilot at design-time (schema authoring, content drafting, binding generation) and at editor-time (summarising, tagging, translating record content — gated by per-collection AI opt-in and POPIA-aware redaction). Ships as SaaS first, with a self-hosted single-tenant variant sharing the same workspace-plane binary for POPIA/data-residency customers.

## Decisions locked in

| Fork | Choice | Meaning |
|---|---|---|
| Architecture | **B** | Full replacement runtime, not a Payload wrapper. Payload blueprints become reference patterns, not runtime dependencies. |
| Runtime model | **B1** | Live runtime. Schema stored as data. Schema changes take effect without redeploy. Carries a real online-migration engine. |
| Scope | **B1-iii** | Unified — same runtime handles editorial content *and* application/business data. |
| Design surfaces | **M2 + M3** | M2 = schema-diagram canvas for collections/relations. M3 = page/block canvas for pages. Two modes, one product. |
| Data→page binding | **Q1 + Q2** | Explicit panel-driven binding *and* inline slash-command embeds, both first-class. |
| Deployment | **D3, SaaS-first** | Multi-tenant SaaS for small/mid + self-hosted single-tenant for enterprise/POPIA. Control plane and workspace plane cleanly separated from day one. |
| AI scope | **C2** | Claude helps at design-time *and* editor-time. Editor-time AI is POPIA-gated: per-collection opt-in, per-field redaction, full audit log. |

## Prototype

See [`prototype.html`](./prototype.html) — a single-file design-grade clickable prototype demonstrating the five hero screens:

1. **Workspace home** — recent activity, collection shortcuts, Claude quick prompt
2. **Schema designer (M2)** — ER diagram with collections, relations, Claude sidebar drafting schema from natural language
3. **Page editor (M3)** — block canvas with a bound data list, Q1 binding panel open on the right, Q2 slash-command menu visible
4. **Record editor (C2)** — single-record form with Claude co-pilot offering summarise/translate/tag on selected fields
5. **Governance** — per-collection AI opt-in, field-level redaction list, audit log, data-residency selector

## Blueprint list

### Reuse (existing in this repo)
Most Payload blueprints are **reference only** (we're B, not A). A few are directly adoptable:

| Blueprint | Use |
|---|---|
| [`blueprints/ui/drag-drop-editor.blueprint.yaml`](../../../blueprints/ui/drag-drop-editor.blueprint.yaml) | Core drag engine shared between M2 and M3 surfaces |
| [`blueprints/ui/form-builder.blueprint.yaml`](../../../blueprints/ui/form-builder.blueprint.yaml) | Record editor renders dynamic forms from stored schema |
| [`blueprints/data/content-tree.blueprint.yaml`](../../../blueprints/data/content-tree.blueprint.yaml) | Page tree structure on the M3 side |
| [`blueprints/data/field-transforms.blueprint.yaml`](../../../blueprints/data/field-transforms.blueprint.yaml) | Per-field read/write transforms |
| [`blueprints/data/popia-compliance.blueprint.yaml`](../../../blueprints/data/popia-compliance.blueprint.yaml) | Required on every new blueprint that touches tenant data. Non-negotiable. |

### New blueprints to create
Thirteen new blueprints cover the ground Payload's code-first model doesn't:

| Blueprint | Category | What it defines |
|---|---|---|
| `visual-schema-builder` | ui | M2 diagram canvas + MSSQL-style column editor (name, type, PK/NN/UQ/FK flags, defaults, indexes), new-collection and new-relation modals, inline add-column inside a selected entity |
| `page-canvas-builder` | ui | M3 page canvas — block composition, nested zones, Q2 slash-commands |
| `data-binding-panel` | ui | Q1 explicit binding panel — collection/fields/filter/sort contract per block |
| `inline-data-embed` | ui | Q2 slash-command data embedding inline in pages |
| `custom-block-authoring` | ui | Block studio — paste JSX/HTML from any source (shadcnui-blocks, Tailwind UI, hand-written), detect slots, bind to a collection, map slots to fields, save to block library |
| `theme-system` | ui | System-wide design tokens (colors, radius, typography) with light/dark modes, scope switch (admin / published / both), preset library, live component preview, export to CSS / Tailwind / FDL YAML / Figma tokens. Models shadcn's `/create` surface. Themes apply instantly across all surfaces on save. |
| `live-schema-migration` | data | Schema-as-data runtime — online add/rename/drop column, backfill, type-widening, rollback |
| `schema-registry` | data | Collection definitions stored as documents; source of truth for the live runtime |
| `workspace-control-plane` | infrastructure | Tenants, billing, workspace lifecycle — SaaS-only layer |
| `workspace-data-plane` | infrastructure | Per-tenant collection runtime — shared by SaaS and self-hosted |
| `ai-schema-designer` | ai | Claude co-pilot in M2 — NL → schema diagram mutations, with review/approve gate. **Opt-in, collapsible drawer, never always-on.** |
| `ai-content-assistant` | ai | Claude co-pilot in M3 and record editor — drafting, summarise, tag, translate. **Opt-in per collection (see `ai-data-governance`).** |
| `ai-data-governance` | data | Per-collection AI opt-in, per-field redaction, audit log of AI reads/writes |

### Visual language (default brand)

The product's own chrome follows the modern AI-system register — the same aesthetic family as v0, Claude.ai, Linear, Raycast, Cursor, OpenAI platform. This is the **default** `Lattice default` theme shipped in the Theme studio; customers override it freely.

- **Palette:** cool zinc neutrals on pure white (`#fafafa` surface, `#ffffff` cards, near-black `#09090b` ink). No warm cream/paper tones in the base brand.
- **Accent:** a single restrained hue (sky `#0ea5e9`, light variant `#f0f9ff`) used sparingly — selection rings, live-state chips, AI-moment highlights. Never a large colored fill.
- **Typography:** Inter-only, no display serif. Headings use tight letter-spacing (`-0.028em`) and weight 600 to carry hierarchy without ornament. Mono is JetBrains Mono with tabular figures and slashed zero.
- **Surface:** thin 1px neutral borders (`zinc-200`), minimal shadows (softer-than-default Tailwind), no rounded-xl on data-dense surfaces — `rounded-md` is the default.
- **Chromatic chrome restraint:** status chips lean neutral (grey with a coloured dot) rather than filled pills. Colour is a signal, not decoration.
- **AI moments:** the only place where a small gradient is allowed is on Claude's avatar/trigger (`sky → violet`) and the "AI generated" indicator. Everywhere else, monochrome.
- **Otto 1890** and other warm/editorial palettes remain as opt-in presets in the Theme studio — not the default.

This brand posture is embodied in the `theme-system` blueprint's `Lattice default` preset.

### Responsive posture (non-negotiable)

- **All pages ship responsive by default.** No "desktop-only" or "mobile-only" variants unless explicitly opted out. One block tree, three breakpoints, rendered automatically.
- **Breakpoints:** desktop (≥1024px), tablet (768px), mobile (≤480px). Folded into both `page-canvas-builder` and `custom-block-authoring` blueprints.
- **Preview in all three, always.** Page editor and Block studio headers both expose a desktop / tablet / mobile switcher. Authors cannot publish without having seen the block tree render at each breakpoint — a publish-gate check.
- **Imported blocks must declare breakpoints.** `custom-block-authoring` parses the pasted JSX/HTML for responsive classes (e.g. Tailwind `md:`, `lg:` prefixes). Blocks without them prompt the author to confirm single-layout fallback.

### AI posture (non-negotiable)
Every AI surface follows these rules — folded into each `ai-*` blueprint:

- **Off by default.** A fresh workspace has no active AI surfaces. Toggling Claude on is an explicit user action.
- **Collapsible, not docked.** AI panels are drawers that slide in/out. The primary work surfaces (column editor, canvas, slot mapping) never depend on AI being open.
- **Per-collection grant.** No AI surface reads tenant data unless that collection has been opted in under Governance.
- **Audit-logged.** Every AI read/write is recorded with scope, actor, and redaction summary.

Every new blueprint that persists tenant data **must** list `popia-compliance` in `related[]` with type `required`, per the Priority-1 rule in CLAUDE.md.

## Build order (suggested)

1. **Foundation** — `schema-registry` + `live-schema-migration` + `workspace-data-plane`. Without these, nothing is "live."
2. **M2 surface** — `visual-schema-builder` on top of `drag-drop-editor`. First user-visible milestone.
3. **M3 surface** — `page-canvas-builder` + `data-binding-panel` + `inline-data-embed`. Pages start working.
4. **Editor runtime** — `form-builder` rendering from the schema registry.
5. **AI layer** — `ai-data-governance` *first*, then `ai-schema-designer`, then `ai-content-assistant`. Governance before capability — reverse order is a POPIA trap.
6. **Control plane** — `workspace-control-plane` for the SaaS deploy target.

## Known unknowns (flagged for later)

- **Automations / workflow (C3 territory).** Parked. Revisit once C2 is stable.
- **Permissions model depth.** Re-use `payload-access-control` shape or design fresh? Worth a mini-brainstorm before `workspace-data-plane` lands.
- **Pricing and billing boundaries** in the control plane. Out of scope for v1 build.
- **Marketplace / templates.** Post-v1.

## Next step

Terminal state of brainstorm: hand each new blueprint to `/fdl-create`. Recommend starting with `schema-registry` since every other blueprint depends on its shape.

Suggested invocation order:
```
/fdl-create schema-registry
/fdl-create live-schema-migration
/fdl-create workspace-data-plane
/fdl-create visual-schema-builder
/fdl-create page-canvas-builder
/fdl-create data-binding-panel
/fdl-create inline-data-embed
/fdl-create custom-block-authoring
/fdl-create theme-system
/fdl-create ai-data-governance
/fdl-create ai-schema-designer
/fdl-create ai-content-assistant
/fdl-create workspace-control-plane
```
