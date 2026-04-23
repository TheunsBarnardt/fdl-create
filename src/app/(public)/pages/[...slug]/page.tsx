import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { renderPageTree } from '@/lib/page-render';

// Map the trailing URL segments onto the page's declared params array.
// URL `/pages/posts/abc-123` + page { slug: "posts", params: "id" }
//   → { id: "abc-123" }.
function buildRouteParams(page: { params: string | null }, rest: string[]): Record<string, string> {
  const names = (page.params ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const out: Record<string, string> = {};
  names.forEach((name, i) => {
    if (rest[i] !== undefined) out[name] = rest[i];
  });
  return out;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const pageSlug = slug?.[0];
  if (!pageSlug) return {};
  const page = await prisma.page.findUnique({ where: { slug: pageSlug }, select: { title: true, seo: true } }).catch(() => null);
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
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;

  const pageSlug = slug?.[0];
  if (!pageSlug) notFound();
  const rest = slug.slice(1);

  const page = await prisma.page.findUnique({ where: { slug: pageSlug } }).catch(() => null);
  if (!page) notFound();

  const session = preview === '1' ? await auth() : null;
  const canPreview = !!session?.user;

  if (!page.published && !canPreview) notFound();

  const routeParams = buildRouteParams(page, rest);

  const body = await renderPageTree(page.tree, {
    defaultCollection: (page as any).defaultCollection ?? null,
    routeParams,
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
