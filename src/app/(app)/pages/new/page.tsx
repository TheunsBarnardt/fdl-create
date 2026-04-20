import { prisma } from '@/lib/db';
import { PageEditor } from '@/components/page-editor';
import { getCollectionFieldMap } from '@/lib/collections';

export default async function NewPagePage() {
  const [collections, pages, fieldMap] = await Promise.all([
    prisma.collection.findMany({ orderBy: { label: 'asc' } }).catch(() => []),
    prisma.page.findMany({ orderBy: { updatedAt: 'desc' } }).catch(() => []),
    getCollectionFieldMap().catch(() => ({}))
  ]);
  return (
    <PageEditor
      mode="create"
      collections={collections.map((c) => ({ name: c.name, label: c.label }))}
      collectionFieldsByName={fieldMap}
      pages={pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
      initial={{ slug: '', title: '', tree: { blocks: [] }, published: false }}
    />
  );
}
