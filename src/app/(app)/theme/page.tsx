import { prisma } from '@/lib/db';
import { ThemeStudio } from '@/components/theme-studio';
import { getActiveProject } from '@/lib/active-project';

export default async function ThemePage() {
  const project = await getActiveProject();
  const themes = await prisma.theme.findMany({ where: { projectId: project.id }, orderBy: { createdAt: 'desc' } }).catch(() => []);
  const active = themes.find((t) => t.isDefault) ?? themes[0];
  const parsed = themes.map((t) => ({
    id: t.id,
    name: t.name,
    isDefault: t.isDefault,
    tokens: (() => { try { return JSON.parse(t.tokens); } catch { return {}; } })()
  }));
  const initial = active
    ? {
        id: active.id,
        name: active.name,
        tokens: (() => { try { return JSON.parse(active.tokens); } catch { return {}; } })(),
        isDefault: active.isDefault
      }
    : { id: undefined, name: 'FDL-Create default', tokens: {}, isDefault: true };

  return <ThemeStudio themes={parsed} initial={initial} />;
}
