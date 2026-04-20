import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { parseCollectionSchema } from '@/lib/schema-types';
import { SchemaEditor } from '@/components/schema-editor';
import { Button } from '@/components/ui/button';

export default async function EditCollectionPage({ params }: { params: { name: string } }) {
  const c = await prisma.collection.findUnique({ where: { name: params.name } });
  if (!c) notFound();
  const schema = parseCollectionSchema(c.schema);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/schema" className="text-xs text-muted-foreground hover:text-foreground">← Schema designer</Link>
          <h1 className="display text-2xl mt-1">{c.label}</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.name}</p>
        </div>
        <Link href={`/records/${c.name}`}><Button variant="outline" size="sm">View records →</Button></Link>
      </div>
      <SchemaEditor
        mode="edit"
        initial={{
          name: c.name,
          label: c.label,
          description: c.description ?? '',
          fields: schema.fields as any
        }}
      />
    </div>
  );
}
