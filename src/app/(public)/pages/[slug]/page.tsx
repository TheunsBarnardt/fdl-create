import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { renderPageTree } from '@/lib/page-render';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.page.findUnique({ where: { slug }, select: { title: true, seo: true } }).catch(() => null);
  if (!page) return {};
  const seo = page.seo ? JSON.parse(page.seo) : {};
  return {
    title: seo.metaTitle || page.title,
    description: seo.metaDescription || undefined,
    robots: seo.noIndex ? { index: false, follow: false } : undefined,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    openGraph: {
      title: seo.ogTitle || seo.metaTitle || page.title,
      description: seo.ogDescription || seo.metaDescription || undefined,
      images: seo.ogImage ? [{ url: seo.ogImage }] : undefined,
    },
  };
}

export default async function PublicPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;

  const page = await prisma.page.findUnique({ where: { slug } }).catch(() => null);
  if (!page) notFound();

  const session = preview === '1' ? await auth() : null;
  const canPreview = !!session?.user;

  if (!page.published && !canPreview) notFound();

  const body = await renderPageTree(page.tree, {
    defaultCollection: (page as any).defaultCollection ?? null,
    routeParams: {},
  });

  return (
    <main className="min-h-screen bg-paper">
      {!page.published && canPreview && (
        <div className="bg-warn/10 text-warn text-center text-[11px] py-1.5 border-b border-warn/20">
          Draft preview · not published ·{' '}
          <Link href={`/pages/edit/${page.id}`} className="underline">
            edit
          </Link>
        </div>
      )}
      <article className="max-w-4xl mx-auto px-6 py-16 text-neutral-800">
        <h1 className="display text-4xl mb-10">{page.title}</h1>
        <div className="prose-like">{body}</div>
      </article>
    </main>
  );
}
