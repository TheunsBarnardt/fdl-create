import { prisma } from '@/lib/db';
import { BlockStudio } from '@/components/block-studio';
import { getCollectionFieldMap } from '@/lib/collections';

export default async function NewBlockPage({
  searchParams
}: {
  searchParams: Promise<{ clone?: string }>;
}) {
  const sp = await searchParams;

  const [collections, fieldMap] = await Promise.all([
    prisma.collection.findMany({ orderBy: { label: 'asc' } }),
    getCollectionFieldMap()
  ]);

  let initial: { name: string; title?: string; description?: string; source: string; slotMap: Record<string, string>; collection?: string; category?: string } = {
    name: '', title: '', description: '', source: '', slotMap: {}
  };

  if (sp.clone) {
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "CustomBlock" WHERE id = ${sp.clone} LIMIT 1`.catch(() => []);
    const src = rows[0];
    if (src) {
      initial = {
        name: `${src.name}-copy`,
        title: src.title ?? '',
        description: src.description ?? '',
        source: src.source,
        slotMap: src.slotMap ? JSON.parse(src.slotMap) : {},
        collection: src.collection ?? '',
        category: src.category ?? ''
      };
    }
  }

  return (
    <BlockStudio
      mode="create"
      collections={collections.map((c) => ({ name: c.name, label: c.label }))}
      collectionFieldsByName={fieldMap}
      initial={initial}
    />
  );
}
