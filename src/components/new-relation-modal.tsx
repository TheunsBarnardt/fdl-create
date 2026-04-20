'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Cardinality = 'one-many' | 'one-one' | 'many-many';
type OnDelete = 'RESTRICT' | 'CASCADE' | 'SET NULL';

const CARD_LABELS: Record<Cardinality, string> = {
  'one-many': 'one → many',
  'one-one': 'one → one',
  'many-many': 'many ↔ many'
};

export function NewRelationModal({
  open,
  onClose,
  collections
}: {
  open: boolean;
  onClose: () => void;
  collections: Array<{ name: string; label: string }>;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(collections[0]?.name ?? '');
  const [to, setTo] = useState(collections[1]?.name ?? collections[0]?.name ?? '');
  const [cardinality, setCardinality] = useState<Cardinality>('one-many');
  const [fk, setFk] = useState('');
  const [onDelete, setOnDelete] = useState<OnDelete>('RESTRICT');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!to) return;
    const suggested = `${to.replace(/s$/, '')}_id`;
    setFk(suggested);
  }, [to]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (!from || !to) throw new Error('Pick a from and to collection');
      if (!fk.trim()) throw new Error('FK column is required');
      const res = await fetch(`/api/collections/${from}`);
      if (!res.ok) throw new Error('Could not load source collection');
      const current = await res.json();
      const existing = (current.schema?.fields ?? []) as Array<{ name: string }>;
      if (existing.some((f) => f.name === fk.trim())) {
        throw new Error(`Column "${fk}" already exists on ${from}`);
      }
      const nextFields = [
        ...existing,
        {
          name: fk.trim(),
          type: 'text',
          required: onDelete === 'RESTRICT',
          label: `→ ${to} (${CARD_LABELS[cardinality]})`
        }
      ];
      const patch = await fetch(`/api/collections/${from}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ schema: { fields: nextFields } })
      });
      if (!patch.ok) {
        const e = await patch.json();
        throw new Error(typeof e.error === 'string' ? e.error : JSON.stringify(e.error));
      }
      onClose();
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[520px]">
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <div className="display text-xl">New relation</div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-400">From collection</label>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full text-sm px-3 py-2 border border-neutral-200 rounded-md bg-white focus:outline-none focus:border-accent"
              >
                {collections.map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-400">To collection</label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full text-sm px-3 py-2 border border-neutral-200 rounded-md bg-white focus:outline-none focus:border-accent"
              >
                {collections.map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-neutral-400">Cardinality</label>
            <div className="mt-1 grid grid-cols-3 gap-2 text-[12px]">
              {(['one-many', 'one-one', 'many-many'] as Cardinality[]).map((k) => (
                <label
                  key={k}
                  className={cn(
                    'border rounded-md px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors',
                    cardinality === k ? 'border-accent bg-accent-soft' : 'border-neutral-200 hover:border-accent'
                  )}
                >
                  <input
                    type="radio"
                    name="card"
                    checked={cardinality === k}
                    onChange={() => setCardinality(k)}
                    className="accent-accent"
                  />
                  {CARD_LABELS[k]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-400">FK column</label>
              <input
                value={fk}
                onChange={(e) => setFk(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="mt-1 w-full mono text-sm px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-400">On delete</label>
              <select
                value={onDelete}
                onChange={(e) => setOnDelete(e.target.value as OnDelete)}
                className="mt-1 w-full text-sm px-3 py-2 border border-neutral-200 rounded-md bg-white focus:outline-none focus:border-accent"
              >
                <option>RESTRICT</option>
                <option>CASCADE</option>
                <option>SET NULL</option>
              </select>
            </div>
          </div>

          {error && <div className="text-[11px] text-destructive mono break-all">{error}</div>}
        </div>

        <div className="p-4 border-t border-neutral-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-900">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !from || !to || !fk}
            className="px-3 py-1.5 bg-ink-950 text-paper text-sm rounded-md disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Create relation'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
