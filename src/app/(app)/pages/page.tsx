import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Plus } from 'lucide-react';

export default async function PagesListPage() {
  const pages = await prisma.page.findMany({ orderBy: { updatedAt: 'desc' } }).catch(() => []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          <h1 className="display text-2xl">Page editor</h1>
        </div>
        <Link href="/pages/new"><Button><Plus className="h-4 w-4" />New page</Button></Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Compose pages from blocks. Every page is responsive by default — preview at desktop, tablet, and mobile before publishing.
      </p>

      <Card>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {pages.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No pages yet. <Link href="/pages/new" className="text-accent hover:underline">Create one →</Link>
                </td></tr>
              )}
              {pages.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-3 py-2">
                    <Link href={`/pages/edit/${p.id}`} className="hover:text-accent">{p.title}</Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    <Link href={p.published ? `/pages/${p.slug}` : `/pages/${p.slug}?preview=1`} target="_blank" className="hover:text-accent">
                      /pages/{p.slug} ↗
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Badge>{p.published ? 'published' : 'draft'}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
