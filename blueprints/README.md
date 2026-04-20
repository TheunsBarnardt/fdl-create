# Blueprints

This project's blueprints are authored and validated in the sibling repo:
**`C:\Work\ai-fdl-kit`** (the FDL — Feature Definition Language kit).

## Why split?
- `ai-fdl-kit` = framework-agnostic YAML specs + validator + docs site + Claude skills
- `fdl-create` (this project) = the reference *implementation* of those specs for Next.js + Prisma + MSSQL

## Relevant blueprints
The 13 blueprints for this project (full list, priorities, and rationale):
→ **`../../Work/ai-fdl-kit/docs/brainstorm/visual-cms/PLAN.md`**

## Build order
1. `schema-registry` (foundation — the `Collection` model is its implementation here)
2. `live-schema-migration`
3. `workspace-data-plane`
4. `visual-schema-builder` (M2 surface)
5. `page-canvas-builder` + `data-binding-panel` + `inline-data-embed` (M3 surface)
6. `form-builder` (record editor — partially implemented)
7. `ai-data-governance` **first**, then `ai-schema-designer`, then `ai-content-assistant`
8. `workspace-control-plane` (SaaS deployment target)

## How to build next feature
From sibling `ai-fdl-kit` repo:
```
/fdl-build visual-schema-builder
```
Claude reads the blueprint, generates the implementation for this project's stack, lands files here.
