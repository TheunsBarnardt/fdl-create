import 'server-only';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

const COOKIE = 'fdl_project';

export type ActiveProject = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

async function defaultProject(): Promise<ActiveProject | null> {
  const p = await prisma.project.findUnique({ where: { slug: 'default' } }).catch(() => null);
  return p ? { id: p.id, slug: p.slug, name: p.name, description: p.description } : null;
}

export async function getActiveProject(): Promise<ActiveProject> {
  const jar = await cookies();
  const slug = jar.get(COOKIE)?.value;
  if (slug) {
    const p = await prisma.project.findUnique({ where: { slug } }).catch(() => null);
    if (p) return { id: p.id, slug: p.slug, name: p.name, description: p.description };
  }
  const fallback = await defaultProject();
  if (fallback) return fallback;
  const created = await prisma.project.create({
    data: { slug: 'default', name: 'Default', description: 'Default project.' }
  });
  return { id: created.id, slug: created.slug, name: created.name, description: created.description };
}

export async function listProjects() {
  return prisma.project.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function setActiveProjectCookie(slug: string) {
  const jar = await cookies();
  jar.set(COOKIE, slug, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}

export const ACTIVE_PROJECT_COOKIE = COOKIE;
