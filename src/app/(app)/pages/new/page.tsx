import { prisma } from '@/lib/db';
import { PageEditor } from '@/components/page-editor';
import { getCollectionFieldMap } from '@/lib/collections';
import { ensureBuiltInBlocks } from '@/lib/seed-blocks';
import { getRelatedCollections, type RelationRef } from '@/lib/collection-relations';

export default async function NewPagePage() {
  await ensureBuiltInBlocks();
  const [collections, pages, fieldMap, blocks, themes] = await Promise.all([
    prisma.collection.findMany({ orderBy: { label: 'asc' } }).catch(() => []),
    prisma.page.findMany({ orderBy: { updatedAt: 'desc' } }).catch(() => []),
    getCollectionFieldMap().catch(() => ({})),
    prisma.$queryRaw<any[]>`SELECT id, name, title, description, category, source, shape, slotSchema FROM "CustomBlock" ORDER BY category ASC, title ASC`.catch(() => []),
    prisma.theme.findMany({ orderBy: { name: 'asc' } }).catch(() => []),
  ]);

  const allNames = collections.map((c) => c.name);
  const relationsByCollection: Record<string, RelationRef[]> = {};
  for (const c of collections) relationsByCollection[c.name] = getRelatedCollections(c, allNames);

  return (
    <PageEditor
      mode="create"
      collections={collections.map((c) => ({ name: c.name, label: c.label }))}
      collectionFieldsByName={fieldMap}
      relationsByCollection={relationsByCollection}
      pages={pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
      libraryBlocks={blocks.map((b) => ({
        ...b,
        slotSchema: b.slotSchema ? (() => { try { return JSON.parse(b.slotSchema); } catch { return null; } })() : null,
      }))}
      themes={themes.map((t) => ({ id: t.id, name: t.name, tokens: t.tokens }))}
      initial={{ slug: '', title: '', tree: { blocks: [] }, published: false, defaultCollection: null }}
    />
  );
}
