import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageEditor } from '@/components/page-editor';
import { getCollectionFieldMap } from '@/lib/collections';

export default async function EditPagePage({ params }: { params: { id: string } }) {
  const [page, collections, pages, fieldMap] = await Promise.all([
    prisma.page.findUnique({ where: { id: params.id } }),
    prisma.collection.findMany({ orderBy: { label: 'asc' } }),
    prisma.page.findMany({ orderBy: { updatedAt: 'desc' } }),
    getCollectionFieldMap().catch(() => ({}))
  ]);
  if (!page) notFound();

  return (
    <PageEditor
      mode="edit"
      collections={collections.map((c) => ({ name: c.name, label: c.label }))}
      collectionFieldsByName={fieldMap}
      pages={pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
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
