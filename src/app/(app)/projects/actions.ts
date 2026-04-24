'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { ACTIVE_PROJECT_COOKIE } from '@/lib/active-project';
import { auth } from '@/auth';

async function requireAdmin() {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) throw new Error('unauthenticated');
  const me = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
  if (me?.role !== 'admin') throw new Error('forbidden');
}

export async function activateProject(slug: string, redirectTo: string = '/dashboard') {
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) throw new Error('project not found');
  const jar = await cookies();
  jar.set(ACTIVE_PROJECT_COOKIE, slug, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  revalidatePath('/', 'layout');
  redirect(redirectTo);
}

export async function createProject(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get('name') ?? '').trim();
  const rawSlug = String(formData.get('slug') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  if (!name) throw new Error('name required');
  const slug = (rawSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).slice(0, 40);
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) throw new Error('invalid slug');
  const existing = await prisma.project.findUnique({ where: { slug } });
  if (existing) throw new Error('slug already in use');
  await prisma.project.create({ data: { slug, name, description } });
  const jar = await cookies();
  jar.set(ACTIVE_PROJECT_COOKIE, slug, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function deleteProject(slug: string) {
  await requireAdmin();
  if (slug === 'default') throw new Error('cannot delete Default');
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) throw new Error('project not found');
  await prisma.project.delete({ where: { id: project.id } });
  const jar = await cookies();
  if (jar.get(ACTIVE_PROJECT_COOKIE)?.value === slug) {
    jar.set(ACTIVE_PROJECT_COOKIE, 'default', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  }
  revalidatePath('/', 'layout');
  redirect('/');
}
