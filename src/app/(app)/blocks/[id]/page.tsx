import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { BlockStudio } from '@/components/block-studio';

export default async function EditBlockPage({ params }: { params: { id: string } }) {
  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "CustomBlock" WHERE id = ${params.id} LIMIT 1`;
  const block = rows[0];
  if (!block) notFound();

  return (
    <BlockStudio
      mode="edit"
      initial={{
        id: block.id,
        name: block.name,
        title: block.title ?? '',
        description: block.description ?? '',
        source: block.source,
        kind: block.kind === 'component' ? 'component' : 'template',
        shape: block.shape === 'list' ? 'list' : 'single',
        slotSchema: block.slotSchema ? JSON.parse(block.slotSchema) : null,
        category: block.category ?? '',
        themeId: block.themeId ?? null,
      }}
    />
  );
}
