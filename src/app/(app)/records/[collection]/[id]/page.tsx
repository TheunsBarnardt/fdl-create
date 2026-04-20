import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { parseCollectionSchema, buildRecordValidator } from '@/lib/schema-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RecordEditPage({
  params
}: { params: { collection: string; id: string } }) {
  const col = await prisma.collection.findUnique({ where: { name: params.collection } });
  if (!col) notFound();
  const schema = parseCollectionSchema(col.schema);
  const isNew = params.id === 'new';

  const record = isNew
    ? null
    : await prisma.record.findUnique({ where: { id: params.id } });
  if (!isNew && !record) notFound();

  const data = record ? (JSON.parse(record.data) as Record<string, unknown>) : {};

  async function save(formData: FormData) {
    'use server';
    const validator = buildRecordValidator(schema);
    const raw: Record<string, unknown> = {};
    for (const f of schema.fields) {
      const v = formData.get(f.name);
      raw[f.name] = v === '' ? undefined : v;
    }
    const parsed = validator.parse(raw);
    if (isNew) {
      await prisma.record.create({ data: { collectionId: col!.id, data: JSON.stringify(parsed) } });
    } else {
      await prisma.record.update({ where: { id: params.id }, data: { data: JSON.stringify(parsed) } });
    }
    redirect(`/records/${col!.name}`);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href={`/records/${col.name}`} className="text-xs text-muted-foreground hover:text-foreground">← {col.label}</Link>
        <h1 className="display text-2xl mt-1">{isNew ? 'New record' : 'Edit record'}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Fields</CardTitle></CardHeader>
        <CardContent>
          <form action={save} className="space-y-4">
            {schema.fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {f.label ?? f.name}{f.required && <span className="text-destructive"> *</span>}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    name={f.name}
                    defaultValue={(data[f.name] as string) ?? ''}
                    className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                ) : f.type === 'select' ? (
                  <select
                    name={f.name}
                    defaultValue={(data[f.name] as string) ?? ''}
                    className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">—</option>
                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <Input
                    name={f.name}
                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'}
                    defaultValue={(data[f.name] as string) ?? ''}
                    required={f.required}
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button type="submit">Save</Button>
              <Link href={`/records/${col.name}`}><Button variant="ghost" type="button">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
