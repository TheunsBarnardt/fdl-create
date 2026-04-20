'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

type Field = {
  name: string;
  type: 'text' | 'email' | 'number' | 'boolean' | 'date' | 'select' | 'textarea';
  label?: string;
  required?: boolean;
  unique?: boolean;
  options?: string[];
};

const FIELD_TYPES: Field['type'][] = ['text', 'email', 'number', 'boolean', 'date', 'select', 'textarea'];

export function SchemaEditor({
  initial,
  mode
}: {
  initial: { name: string; label: string; description: string; fields: Field[] };
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [label, setLabel] = useState(initial.label);
  const [description, setDescription] = useState(initial.description);
  const [fields, setFields] = useState<Field[]>(initial.fields);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<Field>) =>
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const remove = (i: number) => setFields(fields.filter((_, idx) => idx !== i));
  const add = () =>
    setFields([...fields, { name: `field_${fields.length + 1}`, type: 'text', required: false }]);

  async function save() {
    setSaving(true); setError(null);
    try {
      const payload = {
        label, description,
        ...(mode === 'create' && { name }),
        schema: { fields }
      };
      const res = await fetch(
        mode === 'create' ? '/api/collections' : `/api/collections/${initial.name}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(mode === 'create' ? { ...payload, name } : payload)
        }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(JSON.stringify(e.error));
      }
      router.push(`/schema/${mode === 'create' ? name : initial.name}`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!confirm(`Delete collection "${initial.name}"? All records will be lost.`)) return;
    await fetch(`/api/collections/${initial.name}`, { method: 'DELETE' });
    router.push('/schema');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Collection</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name (identifier)</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={mode === 'edit'}
                placeholder="customers"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Label</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Customers" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fields</CardTitle>
            <Button size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3" />Add field</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2 text-center">Required</th>
                <th className="px-3 py-2 text-center">Unique</th>
                <th className="px-3 py-2">Options</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-3 py-2">
                    <Input value={f.name} onChange={(e) => update(i, { name: e.target.value })} className="h-8" />
                  </td>
                  <td className="px-3 py-2">
                    <Select value={f.type} onChange={(e) => update(i, { type: e.target.value as Field['type'] })} className="h-8">
                      {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input value={f.label ?? ''} onChange={(e) => update(i, { label: e.target.value })} className="h-8" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Switch checked={!!f.required} onCheckedChange={(v) => update(i, { required: v })} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Switch checked={!!f.unique} onCheckedChange={(v) => update(i, { unique: v })} />
                  </td>
                  <td className="px-3 py-2">
                    {f.type === 'select' ? (
                      <Input
                        value={(f.options ?? []).join(',')}
                        onChange={(e) => update(i, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                        className="h-8"
                        placeholder="a,b,c"
                      />
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {fields.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-xs">No fields yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {error && <div className="text-xs text-destructive font-mono">{error}</div>}

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving || !name || !label || fields.length === 0}>
          {saving ? 'Saving…' : mode === 'create' ? 'Create collection' : 'Save changes'}
        </Button>
        {mode === 'edit' && (
          <Button variant="destructive" onClick={destroy}>Delete</Button>
        )}
      </div>
    </div>
  );
}
