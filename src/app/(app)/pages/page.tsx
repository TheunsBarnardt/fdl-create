import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { relativeTime } from '@/lib/logs';
import { getActiveProject } from '@/lib/active-project';

export default async function PagesListPage() {
  const project = await getActiveProject();
  const pages = await prisma.page.findMany({ where: { projectId: project.id }, orderBy: { updatedAt: 'desc' } }).catch(() => []);

  const publishedCount = pages.filter((p) => p.published).length;
  const draftCount = pages.length - publishedCount;

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Page editor"
        chips={
          <>
            <Chip tone="accent">{pages.length} pages</Chip>
            <Chip tone="accent">{publishedCount} published</Chip>
            <Chip tone="accent">{draftCount} drafts</Chip>
          </>
        }
        actions={
          <Link
            href="/pages/new"
            className="px-2.5 py-1.5 text-xs rounded-md bg-sky-500 hover:bg-sky-400 text-white font-medium shadow-accent-glow transition-colors"
          >
            + New page
          </Link>
        }
      />

      <div className="flex-1 overflow-auto scrollbar bg-paper p-6 space-y-4">
        <div className="bg-white border border-neutral-200 rounded-md">
          {pages.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              No pages yet.{' '}
              <Link href="/pages/new" className="text-accent hover:underline">
                Create one →
              </Link>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                  <th className="text-left font-semibold px-4 py-2">Title</th>
                  <th className="text-left font-semibold px-2 py-2">Slug</th>
                  <th className="text-left font-semibold px-2 py-2">Status</th>
                  <th className="text-left font-semibold px-2 py-2">Updated</th>
                  <th className="text-right font-semibold px-4 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2">
                      <Link href={`/pages/edit/${p.id}`} className="hover:text-accent font-medium">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-2 py-2 mono text-neutral-600">
                      <Link
                        href={p.published ? `/pages/${p.slug}` : `/pages/${p.slug}?preview=1`}
                        target="_blank"
                        className="hover:text-accent"
                      >
                        /pages/{p.slug} ↗
                      </Link>
                    </td>
                    <td className="px-2 py-2">
                      {p.published ? (
                        <Chip tone="ok">Published</Chip>
                      ) : (
                        <Chip tone="neutral">Draft</Chip>
                      )}
                    </td>
                    <td className="px-2 py-2 text-neutral-600">{relativeTime(p.updatedAt)}</td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/pages/edit/${p.id}`}
                        className="text-accent hover:underline text-[11px]"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-md p-4 text-[11px] text-neutral-500 leading-relaxed">
          <div className="text-sm font-semibold text-neutral-900 mb-1">About pages</div>
          <p>
            Compose pages from blocks. Every page is responsive by default — preview at desktop, tablet, and mobile before publishing.
          </p>
        </div>
      </div>
    </section>
  );
}
