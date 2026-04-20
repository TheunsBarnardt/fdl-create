import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { parseCollectionSchema } from '@/lib/schema-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';

export default async function RecordsList({ params }: { params: { collection: string } }) {
  const col = await prisma.collection.findUnique({ where: { name: params.collection } });
  if (!col) notFound();
  const schema = parseCollectionSchema(col.schema);
  const records = await prisma.record.findMany({
    where: { collectionId: col.id },
    orderBy: { updatedAt: 'desc' },
    take: 100
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-2xl">{col.label}</h1>
          <p className="text-sm text-muted-foreground mt-1">{col.description ?? 'No description'}</p>
        </div>
        <Link href={`/records/${col.name}/new`}>
          <Button><Plus className="h-4 w-4" />New record</Button>
        </Link>
      </div>

      <Card>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                {schema.fields.slice(0, 5).map((f) => (
                  <th key={f.name} className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                    {f.label ?? f.name}
                  </th>
                ))}
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No records yet.</td></tr>
              )}
              {records.map((r) => {
                const data = JSON.parse(r.data) as Record<string, unknown>;
                return (
                  <tr key={r.id} className="border-b border-border hover:bg-secondary/30">
                    {schema.fields.slice(0, 5).map((f) => (
                      <td key={f.name} className="px-3 py-2">{String(data[f.name] ?? '')}</td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <Link href={`/records/${col.name}/${r.id}`} className="text-accent text-xs hover:underline">Edit</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
