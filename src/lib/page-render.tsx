import Link from 'next/link';
import { prisma } from '@/lib/db';
import { jsxToHtml } from '@/lib/editor/jsx-to-html';
import { applyThemeTypography, type VarItem } from '@/lib/theme-typography';

// Server-side renderer for Lexical page trees → HTML.
// Keep this in sync with the decorator node types in src/lib/editor/nodes.tsx.

type LexNode = { type: string; children?: LexNode[]; [k: string]: any };

export async function renderPageTree(raw: string | null | undefined): Promise<React.ReactNode> {
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
    if (n.type === 'fdl-preset-block' && n.presetId) presetIds.add(n.presetId);
    (n.children ?? []).forEach(walk);
  };
  children.forEach(walk);

  const [collectionData, blockThemes] = await Promise.all([
    loadCollectionData([...collectionNames]),
    loadBlockThemes([...presetIds])
  ]);

  return <>{children.map((n, i) => renderNode(n, `${i}`, collectionData, blockThemes))}</>;
}

type BlockTheme = { typeBindings: Record<string, string>; vars: VarItem[] };

async function loadBlockThemes(blockIds: string[]): Promise<Record<string, BlockTheme>> {
  if (blockIds.length === 0) return {};
  // Gather each block's themeId, then unique themes + all variables once.
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

function renderNode(n: LexNode, key: string, data: Record<string, { label: string; records: any[] }>, blockThemes: Record<string, BlockTheme> = {}): React.ReactNode {
  switch (n.type) {
    case 'paragraph':
      return <p key={key} className="my-3 leading-relaxed">{renderChildren(n.children, key, data)}</p>;

    case 'heading': {
      const tag = (n.tag as string) || 'h2';
      const cls = tag === 'h1' ? 'display text-4xl mt-8 mb-3'
        : tag === 'h2' ? 'display text-3xl mt-6 mb-2'
        : 'display text-xl mt-5 mb-2';
      const Tag = tag as keyof React.JSX.IntrinsicElements;
      return <Tag key={key} className={cls}>{renderChildren(n.children, key, data)}</Tag>;
    }

    case 'quote':
      return (
        <blockquote key={key} className="border-l-4 border-accent pl-4 my-4 italic text-neutral-700">
          {renderChildren(n.children, key, data)}
        </blockquote>
      );

    case 'list': {
      const Tag = n.tag === 'ol' ? 'ol' : 'ul';
      const cls = Tag === 'ol' ? 'list-decimal ml-6 my-3 space-y-1' : 'list-disc ml-6 my-3 space-y-1';
      return <Tag key={key} className={cls}>{renderChildren(n.children, key, data)}</Tag>;
    }
    case 'listitem':
      return <li key={key}>{renderChildren(n.children, key, data)}</li>;

    case 'link': {
      const href = (n.url as string) || '#';
      return <Link key={key} href={href} className="text-accent hover:underline">{renderChildren(n.children, key, data)}</Link>;
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
      const src = (n.source as string) || '';
      if (!src) return null;
      const slots = (n.slots as Record<string, string>) ?? {};
      let html = jsxToHtml(src).replace(/\{\{(\w+)\}\}/g, (_, name) => slots[name] ?? '');
      const theme = n.presetId ? blockThemes[n.presetId as string] : undefined;
      if (theme) html = applyThemeTypography(html, theme.typeBindings, theme.vars);
      return <div key={key} dangerouslySetInnerHTML={{ __html: html }} />;
    }

    default:
      if (Array.isArray(n.children)) return <div key={key}>{renderChildren(n.children, key, data, blockThemes)}</div>;
      return null;
  }
}

function renderChildren(children: LexNode[] | undefined, parentKey: string, data: Record<string, { label: string; records: any[] }>, blockThemes: Record<string, BlockTheme> = {}) {
  if (!children) return null;
  return children.map((c, i) => renderNode(c, `${parentKey}.${i}`, data, blockThemes));
}
