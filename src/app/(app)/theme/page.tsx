import { prisma } from '@/lib/db';
import { ThemeStudio } from '@/components/theme-studio';

export default async function ThemePage() {
  const themes = await prisma.theme.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []);
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
    : { id: undefined, name: 'Lattice default', tokens: {}, isDefault: true };

  return <ThemeStudio themes={parsed} initial={initial} />;
}
