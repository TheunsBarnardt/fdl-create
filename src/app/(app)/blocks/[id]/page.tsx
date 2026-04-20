import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { BlockStudio } from '@/components/block-studio';
import { getCollectionFieldMap } from '@/lib/collections';

export default async function EditBlockPage({ params }: { params: { id: string } }) {
  const [block, collections, fieldMap] = await Promise.all([
    prisma.customBlock.findUnique({ where: { id: params.id } }),
    prisma.collection.findMany({ orderBy: { label: 'asc' } }),
    getCollectionFieldMap()
  ]);
  if (!block) notFound();

  return (
    <BlockStudio
      mode="edit"
      collections={collections.map((c) => ({ name: c.name, label: c.label }))}
      collectionFieldsByName={fieldMap}
      initial={{
        id: block.id,
        name: block.name,
        source: block.source,
        collection: block.collection,
        slotMap: block.slotMap ? JSON.parse(block.slotMap) : {}
      }}
    />
  );
}
