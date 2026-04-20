'use client';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Prototype column types — mapped to the FieldSchema enum on save.
const COL_TYPES = [
  'uuid', 'text', 'varchar(255)', 'number', 'decimal(12,2)',
  'boolean', 'datetime', 'date', 'enum', 'json', 'rich_text', 'file'
] as const;
type ColType = typeof COL_TYPES[number];

type Column = {
  name: string;
  type: ColType;
  default?: string;
  pk?: boolean;
  nn?: boolean;
  uq?: boolean;
};

const DEFAULT_COLUMNS: Column[] = [
  { name: 'id', type: 'uuid', default: 'gen_uuid()', pk: true, nn: true, uq: true },
  { name: '', type: 'text', default: '' },
  { name: 'created_at', type: 'datetime', default: 'now()', nn: true }
];

function mapType(t: ColType): 'text' | 'email' | 'number' | 'boolean' | 'date' | 'select' | 'textarea' {
  switch (t) {
    case 'number':
    case 'decimal(12,2)': return 'number';
    case 'boolean': return 'boolean';
    case 'date':
    case 'datetime': return 'date';
    case 'enum': return 'select';
    case 'json':
    case 'rich_text': return 'textarea';
    default: return 'text';
  }
}

export function NewCollectionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [versioning, setVersioning] = useState(true);
  const [aiRead, setAiRead] = useState(false);
  const [singleton, setSingleton] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ddl = useMemo(() => {
    const cols = columns.filter((c) => c.name.trim()).map((c) => c.name).join(', ');
    return `CREATE TABLE ${name || 'new_table'} (${cols || '...'})`;
  }, [name, columns]);

  function update(i: number, patch: Partial<Column>) {
    setColumns(columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function remove(i: number) {
    setColumns(columns.filter((_, idx) => idx !== i));
  }
  function add() {
    setColumns([...columns, { name: '', type: 'text', default: '' }]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const fields = columns
        .filter((c) => c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          type: mapType(c.type),
          required: !!c.nn,
          unique: !!c.uq,
          ...(c.default ? { default: c.default } : {})
        }));
      if (fields.length === 0) throw new Error('At least one column is required');
      const payload = {
        name: name.trim(),
        label: label.trim() || name.trim(),
        schema: { fields },
        description: [
          versioning && 'versioned',
          aiRead && 'ai:read',
          singleton && 'singleton'
        ].filter(Boolean).join(' · ') || undefined
      };
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(typeof e.error === 'string' ? e.error : JSON.stringify(e.error));
      }
      onClose();
      setName('');
      setLabel('');
      setColumns(DEFAULT_COLUMNS);
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
      <div className="bg-white rounded-xl shadow-2xl w-[720px] max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <div className="display text-xl">New collection</div>
            <div className="text-[12px] text-neutral-500">
              Like <code className="mono text-[11px]">CREATE TABLE</code> — define columns, flags, defaults. Live on save.
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-auto scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-400">Collection name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="e.g. subscriptions"
                className="mt-1 w-full mono text-sm px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-400">Display label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Subscriptions"
                className="mt-1 w-full text-sm px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] uppercase tracking-wider text-neutral-400">Columns</label>
              <button onClick={add} className="text-[11px] text-accent font-medium hover:underline">
                + add column
              </button>
            </div>
            <div className="border border-neutral-200 rounded-md overflow-hidden">
              <div
                className="grid px-3 py-1.5 bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-400 gap-2"
                style={{ gridTemplateColumns: '1.5fr 1fr 90px 36px 36px 36px 20px' }}
              >
                <div>Name</div>
                <div>Type</div>
                <div>Default</div>
                <div className="text-center">PK</div>
                <div className="text-center">NN</div>
                <div className="text-center">UQ</div>
                <div />
              </div>
              <div className="divide-y divide-neutral-100 text-[12px]">
                {columns.map((c, i) => (
                  <div
                    key={i}
                    className="grid items-center px-3 py-1.5 gap-2"
                    style={{ gridTemplateColumns: '1.5fr 1fr 90px 36px 36px 36px 20px' }}
                  >
                    <input
                      value={c.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="column_name"
                      className="mono px-2 py-1 border border-neutral-200 rounded text-[12px] focus:outline-none focus:border-accent"
                    />
                    <select
                      value={c.type}
                      onChange={(e) => update(i, { type: e.target.value as ColType })}
                      className="px-2 py-1 border border-neutral-200 rounded text-[12px] bg-white focus:outline-none focus:border-accent"
                    >
                      {COL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                      value={c.default ?? ''}
                      onChange={(e) => update(i, { default: e.target.value })}
                      placeholder="–"
                      className="px-2 py-1 border border-neutral-200 rounded text-[12px] focus:outline-none focus:border-accent"
                    />
                    <div className="text-center">
                      <input
                        type="checkbox"
                        checked={!!c.pk}
                        onChange={(e) => update(i, { pk: e.target.checked })}
                        className="accent-accent"
                      />
                    </div>
                    <div className="text-center">
                      <input
                        type="checkbox"
                        checked={!!c.nn}
                        onChange={(e) => update(i, { nn: e.target.checked })}
                        className="accent-accent"
                      />
                    </div>
                    <div className="text-center">
                      <input
                        type="checkbox"
                        checked={!!c.uq}
                        onChange={(e) => update(i, { uq: e.target.checked })}
                        className="accent-accent"
                      />
                    </div>
                    <button
                      onClick={() => remove(i)}
                      className="text-neutral-300 hover:text-danger"
                      title="Remove column"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {columns.length === 0 && (
                  <div className="px-3 py-6 text-center text-[11px] text-neutral-400">No columns yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="border border-neutral-200 rounded-md">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="w-full px-3 py-2 text-[12px] font-medium flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <span className={cn('transition-transform text-neutral-400', advancedOpen && 'rotate-90')}>›</span>
                Advanced
              </span>
              <span className="text-neutral-400 text-[11px]">indexes · versioning · access · POPIA</span>
            </button>
            {advancedOpen && (
              <div className="p-3 space-y-3 border-t border-neutral-100">
                <label className="flex items-center gap-2 text-[12px]">
                  <input type="checkbox" checked={versioning} onChange={(e) => setVersioning(e.target.checked)} className="accent-accent" />
                  Enable versioning (draft/publish workflow)
                </label>
                <label className="flex items-center gap-2 text-[12px]">
                  <input type="checkbox" checked={aiRead} onChange={(e) => setAiRead(e.target.checked)} className="accent-accent" />
                  Allow AI to read records
                  <span className="text-neutral-400 text-[11px]">(opt-in, POPIA audit logged)</span>
                </label>
                <label className="flex items-center gap-2 text-[12px]">
                  <input type="checkbox" checked={singleton} onChange={(e) => setSingleton(e.target.checked)} className="accent-accent" />
                  Singleton (one record only — good for settings)
                </label>
              </div>
            )}
          </div>

          {error && <div className="text-[11px] text-destructive mono break-all">{error}</div>}
        </div>

        <div className="p-4 border-t border-neutral-200 flex items-center justify-between">
          <div className="text-[11px] text-neutral-500 mono truncate">{ddl}</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-900">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !name || columns.filter((c) => c.name.trim()).length === 0}
              className="px-3 py-1.5 bg-ink-950 text-paper text-sm rounded-md disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Create collection'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
