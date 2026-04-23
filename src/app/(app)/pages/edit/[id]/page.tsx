import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageEditor } from '@/components/page-editor';
import { getCollectionFieldMap } from '@/lib/collections';
import { ensureBuiltInBlocks } from '@/lib/seed-blocks';
import { getRelatedCollections, type RelationRef } from '@/lib/collection-relations';

export default async function EditPagePage({ params }: { params: { id: string } }) {
  await ensureBuiltInBlocks();

  const [pageRows, collections, pages, fieldMap, blocks, themes] = await Promise.all([
    prisma.$queryRaw<any[]>`SELECT * FROM "Page" WHERE id = ${params.id} LIMIT 1`,
    prisma.collection.findMany({ orderBy: { label: 'asc' } }),
    prisma.page.findMany({ orderBy: { updatedAt: 'desc' } }),
    getCollectionFieldMap().catch(() => ({})),
    prisma.$queryRaw<any[]>`SELECT id, name, title, description, category, source, shape, slotSchema FROM "CustomBlock" ORDER BY category ASC, title ASC`.catch(() => []),
    prisma.theme.findMany({ orderBy: { name: 'asc' } }).catch(() => []),
  ]);
  const page = pageRows[0];
  if (!page) notFound();

  const allNames = collections.map((c) => c.name);
  const relationsByCollection: Record<string, RelationRef[]> = {};
  for (const c of collections) relationsByCollection[c.name] = getRelatedCollections(c, allNames);

  return (
    <PageEditor
      mode="edit"
      collections={collections.map((c) => ({ name: c.name, label: c.label }))}
      collectionFieldsByName={fieldMap}
      relationsByCollection={relationsByCollection}
      pages={pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
      libraryBlocks={blocks.map((b) => ({
        ...b,
        slotSchema: b.slotSchema ? (() => { try { return JSON.parse(b.slotSchema); } catch { return null; } })() : null,
      }))}
      themes={themes.map((t) => ({ id: t.id, name: t.name, tokens: t.tokens }))}
      initial={{
        id: page.id,
        slug: page.slug,
        title: page.title,
        tree: JSON.parse(page.tree),
        published: !!page.published,
        themeId: page.themeId,
        params: page.params,
        defaultCollection: page.defaultCollection ?? null,
        seo: page.seo ? JSON.parse(page.seo) : null,
        renderMode: (page.renderMode as 'dynamic' | 'static') ?? 'dynamic',
        lastBuiltAt: page.lastBuiltAt ? new Date(page.lastBuiltAt).toISOString() : null,
      }}
    />
  );
}
