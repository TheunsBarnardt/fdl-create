import Link from 'next/link';
import { prisma } from '@/lib/db';
import { jsxToHtml } from '@/lib/editor/jsx-to-html';
import { applyThemeTypography, type VarItem } from '@/lib/theme-typography';
import { formatSlot, resolveLinkTarget, type SlotSchema, type SlotTypeDef, type LinkTarget } from '@/lib/slots';

// Server-side renderer for Lexical page trees → HTML.
// Keep this in sync with the decorator node types in src/lib/editor/nodes.tsx.

type LexNode = { type: string; children?: LexNode[]; [k: string]: any };
type SlotBinding =
  | { kind: 'literal'; value: string }
  | { kind: 'field'; template?: string; fields?: string[]; separator?: string; field?: string }
  | { kind: 'link'; target: LinkTarget };
type BlockMeta = { slotSchema: SlotSchema };
type PageRef = { id: string; slug: string; title?: string };

export type RenderCtx = {
  defaultCollection?: string | null;
  routeParams?: Record<string, string | string[] | undefined>;
};

export async function renderPageTree(
  raw: string | null | undefined,
  ctx: RenderCtx = {}
): Promise<React.ReactNode> {
  if (!raw) return null;
  let tree: any;
  try { tree = JSON.parse(raw); } catch { return null; }

  const root = tree?.root;
  const children: LexNode[] = Array.isArray(root?.children) ? root.children : [];
  if (children.length === 0 && Array.isArray(tree?.blocks)) {
    return <pre className="text-xs text-neutral-500">Legacy block tree — resave in the editor to migrate.</pre>;
  }

  const collectionNames = new Set<string>();
  const presetIds = new Set<string>();
  const walk = (n: LexNode) => {
    if (n.type === 'fdl-collection-list' && n.collection) collectionNames.add(n.collection);
    if (n.type === 'fdl-preset-block') {
      if (n.presetId) presetIds.add(n.presetId);
      if (n.collection) collectionNames.add(n.collection);
    }
    (n.children ?? []).forEach(walk);
  };
  children.forEach(walk);
  if (ctx.defaultCollection) collectionNames.add(ctx.defaultCollection);

  const [collectionData, blockThemes, blockMeta, currentRecord, pages] = await Promise.all([
    loadCollectionData([...collectionNames]),
    loadBlockThemes([...presetIds]),
    loadBlockMeta([...presetIds]),
    loadCurrentRecord(ctx),
    loadPages(),
  ]);

  return <>{children.map((n, i) => renderNode(n, `${i}`, collectionData, blockThemes, currentRecord, ctx, blockMeta, pages))}</>;
}

async function loadBlockMeta(blockIds: string[]): Promise<Record<string, BlockMeta>> {
  if (blockIds.length === 0) return {};
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; slotSchema: string | null }>>(
    `SELECT id, slotSchema FROM "CustomBlock" WHERE id IN (${blockIds.map(() => '?').join(',')})`,
    ...blockIds
  ).catch(() => [] as Array<{ id: string; slotSchema: string | null }>);
  const out: Record<string, BlockMeta> = {};
  for (const r of rows) {
    let schema: SlotSchema = {};
    if (r.slotSchema) { try { schema = JSON.parse(r.slotSchema); } catch {} }
    out[r.id] = { slotSchema: schema };
  }
  return out;
}

async function loadPages(): Promise<PageRef[]> {
  const pages = await prisma.page.findMany({ select: { id: true, slug: true, title: true } }).catch(() => []);
  return pages as PageRef[];
}

type BlockTheme = { typeBindings: Record<string, string>; vars: VarItem[] };

async function loadBlockThemes(blockIds: string[]): Promise<Record<string, BlockTheme>> {
  if (blockIds.length === 0) return {};
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; themeId: string | null }>>(
    `SELECT id, themeId FROM "CustomBlock" WHERE id IN (${blockIds.map(() => '?').join(',')})`,
    ...blockIds
  ).catch(() => [] as Array<{ id: string; themeId: string | null }>);

  const themeIds = Array.from(new Set(rows.map((r) => r.themeId).filter((x): x is string => !!x)));
  if (themeIds.length === 0) return {};

  const [themes, varCols] = await Promise.all([
    prisma.theme.findMany({ where: { id: { in: themeIds } } }),
    prisma.variableCollection.findMany({ include: { variables: true } }).catch(() => [])
  ]);
  const vars: VarItem[] = (varCols as any[]).flatMap((c) =>
    (c.variables || []).map((v: any) => ({
      name: v.name,
      type: v.type,
      value: (() => { try { return JSON.parse(v.value); } catch { return v.value; } })()
    }))
  );
  const themeById: Record<string, BlockTheme> = {};
  for (const t of themes) {
    let tokens: any = {};
    try { tokens = JSON.parse(t.tokens); } catch {}
    themeById[t.id] = { typeBindings: tokens.typeBindings ?? {}, vars };
  }
  const out: Record<string, BlockTheme> = {};
  for (const r of rows) {
    if (r.themeId && themeById[r.themeId]) out[r.id] = themeById[r.themeId];
  }
  return out;
}

async function loadCollectionData(names: string[]) {
  if (names.length === 0) return {};
  const collections = await prisma.collection.findMany({ where: { name: { in: names } } });
  const data: Record<string, { label: string; records: any[] }> = {};
  for (const c of collections) {
    const records = await prisma.record.findMany({
      where: { collectionId: c.id },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });
    data[c.name] = {
      label: c.label,
      records: records.map((r) => {
        try { return { id: r.id, ...JSON.parse(r.data) }; } catch { return { id: r.id }; }
      })
    };
  }
  return data;
}

async function loadCurrentRecord(ctx: RenderCtx) {
  if (!ctx.defaultCollection) return null;
  const idParam = ctx.routeParams?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) return null;
  const col = await prisma.collection.findUnique({ where: { name: ctx.defaultCollection } }).catch(() => null);
  if (!col) return null;
  const rec = await prisma.record.findFirst({ where: { collectionId: col.id, id } }).catch(() => null);
  if (!rec) return null;
  try { return { id: rec.id, ...JSON.parse(rec.data) }; } catch { return { id: rec.id }; }
}

function resolveRecords(
  n: LexNode,
  data: Record<string, { label: string; records: any[] }>,
  currentRecord: any | null
): { mode: 'none' | 'single' | 'list'; records: any[] } {
  const mode: string = n.bindingMode ?? 'literal';
  const collection: string | undefined = n.collection;
  const relatedFk: string | undefined = n.relatedFk;
  const selector = n.listSelector ?? {};

  if (mode === 'literal') return { mode: 'none', records: [] };

  if (mode === 'route') {
    return { mode: 'single', records: currentRecord ? [currentRecord] : [] };
  }

  if (!collection || !data[collection]) return { mode: 'none', records: [] };
  const pool = data[collection].records;

  if (mode === 'related') {
    const pk = currentRecord?.id;
    if (!pk || !relatedFk) return { mode: 'single', records: [] };
    const found = pool.find((r) => r[relatedFk] === pk);
    return { mode: 'single', records: found ? [found] : [] };
  }

  if (mode === 'related-list') {
    const pk = currentRecord?.id;
    if (!pk || !relatedFk) return { mode: 'list', records: [] };
    return { mode: 'list', records: pool.filter((r) => r[relatedFk] === pk) };
  }

  if (mode === 'query-list') {
    let rows = pool.slice();
    if (selector.filter) {
      // Simple `field=value` parsing — enough for the common case.
      const m = String(selector.filter).match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
      if (m) {
        const [, field, rawVal] = m;
        const val = rawVal.replace(/^['"]|['"]$/g, '');
        rows = rows.filter((r) => String(r[field] ?? '') === val);
      }
    }
    if (selector.sort) {
      const [field, dir = 'asc'] = String(selector.sort).split(':');
      rows = rows.slice().sort((a, b) => {
        const av = a[field]; const bv = b[field];
        return (av > bv ? 1 : av < bv ? -1 : 0) * (dir === 'desc' ? -1 : 1);
      });
    }
    if (selector.limit && selector.limit > 0) rows = rows.slice(0, selector.limit);
    return { mode: 'list', records: rows };
  }

  return { mode: 'none', records: [] };
}

function fillSlots(html: string, slots: Record<string, string>) {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => slots[name] ?? `[${name}]`);
}

function resolveSlotValues(
  slotMap: Record<string, SlotBinding> | undefined,
  legacyLiteral: Record<string, string> | undefined,
  record: any | null,
  schema: SlotSchema,
  pages: PageRef[]
): Record<string, string> {
  const out: Record<string, string> = {};
  const apply = (slot: string, raw: any) => {
    const def: SlotTypeDef | undefined = schema[slot];
    out[slot] = formatSlot(raw, def);
  };
  if (slotMap && typeof slotMap === 'object') {
    for (const [slot, b] of Object.entries(slotMap)) {
      if (!b) continue;
      if (b.kind === 'literal') {
        apply(slot, b.value);
      } else if (b.kind === 'field') {
        // Normalize legacy shapes → template.
        let template = b.template;
        if (typeof template !== 'string') {
          if (Array.isArray(b.fields)) {
            template = b.fields.map((f) => `{${f}}`).join(b.separator ?? ' ');
          } else if (b.field) {
            template = `{${b.field}}`;
          } else {
            template = '';
          }
        }
        if (!record || !template) {
          apply(slot, template || null);
        } else {
          // Single-field template (`{fieldName}` with no surrounding text) keeps the raw
          // value so type formatting (numbers/dates) applies. Otherwise substitute.
          const singleMatch = template.match(/^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/);
          if (singleMatch) {
            apply(slot, record[singleMatch[1]]);
          } else {
            const filled = template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, name) => String(record[name] ?? ''));
            out[slot] = filled;
          }
        }
      } else if (b.kind === 'link') {
        // Link slots emit just the href string — templates should place the slot inside href="{{slot}}".
        const resolved = resolveLinkTarget(b.target, pages);
        out[slot] = resolved.href;
      }
    }
  } else if (legacyLiteral) {
    for (const [slot, v] of Object.entries(legacyLiteral)) apply(slot, v);
  }
  return out;
}

function renderPresetBlock(
  n: LexNode,
  data: Record<string, { label: string; records: any[] }>,
  currentRecord: any | null,
  blockThemes: Record<string, BlockTheme>,
  blockMeta: Record<string, BlockMeta>,
  pages: PageRef[]
): string {
  const rawSource: string = n.source ?? '';
  if (!rawSource) return '';
  const templateHtml = jsxToHtml(rawSource);

  const resolved = resolveRecords(n, data, currentRecord);
  const slotMap = n.slotMap as Record<string, SlotBinding> | undefined;
  const legacy = n.slots as Record<string, string> | undefined;
  const schema = (n.presetId && blockMeta[n.presetId as string]?.slotSchema) || {};

  let rendered: string;
  if (resolved.mode === 'list') {
    // Split the template at `{{#each rows}} … {{/each}}`. If none, the whole
    // template is treated as the row template and repeated.
    const m = templateHtml.match(/\{\{#each\s+rows\}\}([\s\S]*?)\{\{\/each\}\}/);
    if (m) {
      const [full, inner] = m;
      const rows = resolved.records.map((rec) => fillSlots(inner, resolveSlotValues(slotMap, legacy, rec, schema, pages))).join('');
      rendered = templateHtml.replace(full, rows);
    } else {
      rendered = resolved.records.map((rec) => fillSlots(templateHtml, resolveSlotValues(slotMap, legacy, rec, schema, pages))).join('');
    }
  } else if (resolved.mode === 'single') {
    rendered = fillSlots(templateHtml, resolveSlotValues(slotMap, legacy, resolved.records[0] ?? null, schema, pages));
  } else {
    // literal / unbound
    rendered = fillSlots(templateHtml, resolveSlotValues(slotMap, legacy, null, schema, pages));
  }

  const theme = n.presetId ? blockThemes[n.presetId as string] : undefined;
  return theme ? applyThemeTypography(rendered, theme.typeBindings, theme.vars) : rendered;
}

function renderNode(
  n: LexNode,
  key: string,
  data: Record<string, { label: string; records: any[] }>,
  blockThemes: Record<string, BlockTheme> = {},
  currentRecord: any | null = null,
  ctx: RenderCtx = {},
  blockMeta: Record<string, BlockMeta> = {},
  pages: PageRef[] = []
): React.ReactNode {
  switch (n.type) {
    case 'paragraph':
      return <p key={key} className="my-3 leading-relaxed">{renderChildren(n.children, key, data, blockThemes, currentRecord, ctx, blockMeta, pages)}</p>;

    case 'heading': {
      const tag = (n.tag as string) || 'h2';
      const cls = tag === 'h1' ? 'display text-4xl mt-8 mb-3'
        : tag === 'h2' ? 'display text-3xl mt-6 mb-2'
        : 'display text-xl mt-5 mb-2';
      const Tag = tag as keyof React.JSX.IntrinsicElements;
      return <Tag key={key} className={cls}>{renderChildren(n.children, key, data, blockThemes, currentRecord, ctx, blockMeta, pages)}</Tag>;
    }

    case 'quote':
      return (
        <blockquote key={key} className="border-l-4 border-accent pl-4 my-4 italic text-neutral-700">
          {renderChildren(n.children, key, data, blockThemes, currentRecord, ctx, blockMeta, pages)}
        </blockquote>
      );

    case 'list': {
      const Tag = n.tag === 'ol' ? 'ol' : 'ul';
      const cls = Tag === 'ol' ? 'list-decimal ml-6 my-3 space-y-1' : 'list-disc ml-6 my-3 space-y-1';
      return <Tag key={key} className={cls}>{renderChildren(n.children, key, data, blockThemes, currentRecord, ctx, blockMeta, pages)}</Tag>;
    }
    case 'listitem':
      return <li key={key}>{renderChildren(n.children, key, data, blockThemes, currentRecord, ctx, blockMeta, pages)}</li>;

    case 'link': {
      const href = (n.url as string) || '#';
      return <Link key={key} href={href} className="text-accent hover:underline">{renderChildren(n.children, key, data, blockThemes, currentRecord, ctx, blockMeta, pages)}</Link>;
    }

    case 'text': {
      const text: string = n.text ?? '';
      const fmt: number = n.format ?? 0;
      let el: React.ReactNode = text;
      if (fmt & 1) el = <strong>{el}</strong>;
      if (fmt & 2) el = <em>{el}</em>;
      if (fmt & 8) el = <u>{el}</u>;
      if (fmt & 16) el = <code className="mono bg-neutral-100 px-1 py-0.5 rounded text-[0.9em]">{el}</code>;
      return <span key={key}>{el}</span>;
    }

    case 'fdl-image': {
      const src = (n.src as string) || '';
      const alt = (n.alt as string) || '';
      if (!src) return null;
      return <img key={key} src={src} alt={alt} className="rounded-lg my-6 w-full" />;
    }

    case 'fdl-button': {
      const label = (n.label as string) || 'Button';
      const href = (n.href as string) || '#';
      return (
        <div key={key} className="my-6">
          <Link href={href} className="inline-block px-5 py-2.5 bg-ink-950 text-paper rounded-md text-sm font-medium">
            {label}
          </Link>
        </div>
      );
    }

    case 'fdl-collection-list': {
      const coll = n.collection as string | undefined;
      const limit = (n.limit as number) ?? 6;
      const fields = (n.fields as string[]) ?? [];
      if (!coll || !data[coll]) {
        return (
          <div key={key} className="my-6 rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
            Unbound card list — open this page in the editor and pick a collection.
          </div>
        );
      }
      const rows = data[coll].records.slice(0, limit);
      const shownFields = fields.length > 0 ? fields : Object.keys(rows[0] ?? {}).filter((k) => k !== 'id').slice(0, 4);
      return (
        <div key={key} className="my-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r: any) => (
            <div key={r.id} className="bg-white border border-neutral-200 rounded-md p-4">
              {shownFields.map((f) => (
                <div key={f} className="mb-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400">{f}</div>
                  <div className="text-sm text-neutral-800">{String(r[f] ?? '—')}</div>
                </div>
              ))}
            </div>
          ))}
          {rows.length === 0 && (
            <div className="col-span-full text-center text-sm text-neutral-500 py-8 border border-dashed border-neutral-200 rounded-md">
              No records in <span className="mono">{coll}</span> yet.
            </div>
          )}
        </div>
      );
    }

    case 'fdl-preset-block': {
      const html = renderPresetBlock(n, data, currentRecord, blockThemes, blockMeta, pages);
      if (!html) return null;
      return <div key={key} dangerouslySetInnerHTML={{ __html: html }} />;
    }

    default:
      if (Array.isArray(n.children)) return <div key={key}>{renderChildren(n.children, key, data, blockThemes, currentRecord, ctx, blockMeta, pages)}</div>;
      return null;
  }
}

function renderChildren(
  children: LexNode[] | undefined,
  parentKey: string,
  data: Record<string, { label: string; records: any[] }>,
  blockThemes: Record<string, BlockTheme> = {},
  currentRecord: any | null = null,
  ctx: RenderCtx = {},
  blockMeta: Record<string, BlockMeta> = {},
  pages: PageRef[] = []
) {
  if (!children) return null;
  return children.map((c, i) => renderNode(c, `${parentKey}.${i}`, data, blockThemes, currentRecord, ctx, blockMeta, pages));
}
