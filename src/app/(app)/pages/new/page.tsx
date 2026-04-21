import { prisma } from '@/lib/db';
import { PageEditor } from '@/components/page-editor';
import { getCollectionFieldMap } from '@/lib/collections';
import { ensureBuiltInBlocks } from '@/lib/seed-blocks';

export default async function NewPagePage() {
  await ensureBuiltInBlocks();
  const [collections, pages, fieldMap, blocks] = await Promise.all([
    prisma.collection.findMany({ orderBy: { label: 'asc' } }).catch(() => []),
    prisma.page.findMany({ orderBy: { updatedAt: 'desc' } }).catch(() => []),
    getCollectionFieldMap().catch(() => ({})),
    prisma.$queryRaw<any[]>`SELECT id, name, title, description, category, source FROM "CustomBlock" ORDER BY category ASC, title ASC`.catch(() => [])
  ]);
  return (
    <PageEditor
      mode="create"
      collections={collections.map((c) => ({ name: c.name, label: c.label }))}
      collectionFieldsByName={fieldMap}
      pages={pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
      libraryBlocks={blocks}
      initial={{ slug: '', title: '', tree: { blocks: [] }, published: false }}
    />
  );
}
