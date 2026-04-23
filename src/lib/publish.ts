// Publish pass for static pages.
// Walks a page's block tree and records every (collection, recordId?) touched
// so record writes can selectively revalidate dependent pages.
//
// This is the "runtime instrumentation" dep-tracker from the blueprint — but
// lightweight: we walk the Lexical tree and record the binding mode per block
// rather than executing the full render. That covers every path a render would
// read, without needing to replay the renderer.

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

type LexNode = { type: string; children?: LexNode[]; [k: string]: any };
type Dep = { collection: string; recordId: string | null };

function collectDeps(tree: LexNode[], defaultCollection: string | null): Dep[] {
  const deps: Dep[] = [];
  const seen = new Set<string>();
  const push = (collection: string, recordId: string | null) => {
    const key = `${collection}::${recordId ?? '*'}`;
    if (seen.has(key)) return;
    seen.add(key);
    deps.push({ collection, recordId });
  };

  const walk = (n: LexNode) => {
    if (n.type === 'fdl-collection-list' && n.collection) {
      // List blocks subscribe to the whole collection (null recordId).
      push(n.collection, null);
    }
    if (n.type === 'fdl-preset-block') {
      const col = n.collection || defaultCollection;
      const mode = n.bindingMode ?? 'literal';
      if (col && mode !== 'literal') {
        if (mode === 'route' || mode === 'related') {
          // Specific record resolved at request time from route params — we can't
          // know the id at publish time, so subscribe to the whole collection.
          push(col, null);
        } else if (mode === 'query-list' || mode === 'related-list') {
          push(col, null);
        }
      }
    }
    (n.children ?? []).forEach(walk);
  };
  tree.forEach(walk);
  return deps;
}

export async function runPublishPass(pageId: string): Promise<{ deps: Dep[] }> {
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) return { deps: [] };

  let children: LexNode[] = [];
  try {
    const parsed = JSON.parse(page.tree);
    children = Array.isArray(parsed?.root?.children) ? parsed.root.children : [];
  } catch {}

  const defaultCollection = (page as any).defaultCollection ?? null;
  const deps = collectDeps(children, defaultCollection);

  await prisma.pageDependency.deleteMany({ where: { pageId } });
  if (deps.length > 0) {
    await prisma.pageDependency.createMany({
      data: deps.map((d) => ({ pageId, collection: d.collection, recordId: d.recordId })),
    });
  }
  await prisma.page.update({
    where: { id: pageId },
    data: { lastBuiltAt: new Date() },
  });

  try { revalidatePath(`/pages/${page.slug}`); } catch {}

  return { deps };
}

// Called from record write handlers. Cheap query against the indexed join table.
export async function invalidatePagesFor(collection: string, recordId?: string | null) {
  const deps = await prisma.pageDependency.findMany({
    where: {
      collection,
      // null recordId = collection-level subscription (covers query-list blocks)
      OR: [{ recordId: null }, ...(recordId ? [{ recordId }] : [])],
    },
    include: { page: { select: { slug: true, renderMode: true } } },
  });
  const slugs = new Set<string>();
  for (const d of deps) {
    if ((d.page as any).renderMode === 'static') slugs.add(d.page.slug);
  }
  for (const slug of slugs) {
    try { revalidatePath(`/pages/${slug}`); } catch {}
  }
  return { invalidated: [...slugs] };
}
