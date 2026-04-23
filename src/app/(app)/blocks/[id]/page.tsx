import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { BlockStudio } from '@/components/block-studio';
import { getCollectionFieldMap } from '@/lib/collections';

export default async function EditBlockPage({ params }: { params: { id: string } }) {
  const [rows, collections, fieldMap] = await Promise.all([
    prisma.$queryRaw<any[]>`SELECT * FROM "CustomBlock" WHERE id = ${params.id} LIMIT 1`,
    prisma.collection.findMany({ orderBy: { label: 'asc' } }),
    getCollectionFieldMap()
  ]);
  const block = rows[0];
  if (!block) notFound();

  return (
    <BlockStudio
      mode="edit"
      collections={collections.map((c) => ({ name: c.name, label: c.label }))}
      collectionFieldsByName={fieldMap}
      initial={{
        id: block.id,
        name: block.name,
        title: block.title ?? '',
        description: block.description ?? '',
        source: block.source,
        collection: block.collection,
        slotMap: block.slotMap ? JSON.parse(block.slotMap) : {},
        category: block.category ?? '',
        themeId: block.themeId ?? null
      }}
    />
  );
}
