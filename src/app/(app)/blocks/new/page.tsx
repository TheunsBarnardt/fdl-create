import { prisma } from '@/lib/db';
import { BlockStudio } from '@/components/block-studio';
import { getCollectionFieldMap } from '@/lib/collections';
import { BLOCK_PRESETS } from '@/lib/block-presets';

export default async function NewBlockPage({
  searchParams
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const sp = await searchParams;
  const preset = sp.preset ? BLOCK_PRESETS.find((p) => p.id === sp.preset) : undefined;

  const [collections, fieldMap] = await Promise.all([
    prisma.collection.findMany({ orderBy: { label: 'asc' } }),
    getCollectionFieldMap()
  ]);

  return (
    <BlockStudio
      mode="create"
      collections={collections.map((c) => ({ name: c.name, label: c.label }))}
      collectionFieldsByName={fieldMap}
      initial={{
        name: preset?.name ?? '',
        source: preset?.source ?? '',
        slotMap: {}
      }}
    />
  );
}
