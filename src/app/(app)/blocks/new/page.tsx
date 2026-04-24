import { prisma } from '@/lib/db';
import { BlockStudio } from '@/components/block-studio';

export default async function NewBlockPage({
  searchParams
}: {
  searchParams: Promise<{ clone?: string }>;
}) {
  const sp = await searchParams;

  let initial: { name: string; title?: string; description?: string; source: string; kind?: 'template' | 'component'; shape?: 'single' | 'list'; slotSchema?: any; category?: string; themeId?: string | null } = {
    name: '', title: '', description: '', source: '', kind: 'template', shape: 'single'
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
        kind: src.kind === 'component' ? 'component' : 'template',
        shape: src.shape === 'list' ? 'list' : 'single',
        slotSchema: src.slotSchema ? JSON.parse(src.slotSchema) : null,
        category: src.category ?? '',
        themeId: src.themeId ?? null,
      };
    }
  }

  return <BlockStudio mode="create" initial={initial} />;
}
