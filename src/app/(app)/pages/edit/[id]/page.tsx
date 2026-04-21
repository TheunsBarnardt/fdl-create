import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageEditor } from '@/components/page-editor';
import { getCollectionFieldMap } from '@/lib/collections';
import { ensureBuiltInBlocks } from '@/lib/seed-blocks';

export default async function EditPagePage({ params }: { params: { id: string } }) {
  await ensureBuiltInBlocks();

  const [page, collections, pages, fieldMap, blocks] = await Promise.all([
    prisma.page.findUnique({ where: { id: params.id } }),
    prisma.collection.findMany({ orderBy: { label: 'asc' } }),
    prisma.page.findMany({ orderBy: { updatedAt: 'desc' } }),
    getCollectionFieldMap().catch(() => ({})),
    prisma.$queryRaw<any[]>`SELECT id, name, title, description, category, source FROM "CustomBlock" ORDER BY category ASC, title ASC`.catch(() => [])
  ]);
  if (!page) notFound();

  return (
    <PageEditor
      mode="edit"
      collections={collections.map((c) => ({ name: c.name, label: c.label }))}
      collectionFieldsByName={fieldMap}
      pages={pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
      libraryBlocks={blocks}
      initial={{
        id: page.id,
        slug: page.slug,
        title: page.title,
        tree: JSON.parse(page.tree),
        published: page.published
      }}
    />
  );
}
