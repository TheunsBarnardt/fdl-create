'use client';
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Plus, Trash2, ChevronDown, Palette, Hash, Type, ToggleLeft, Ruler, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type VariableType = 'color' | 'number' | 'string' | 'boolean' | 'dimension';

type VariableValue = string | { light: string; dark: string };

type Var = {
  id: string;
  collectionId: string;
  name: string;
  path: string[];
  type: VariableType;
  value: VariableValue;
  description?: string;
  order: number;
};

type Col = {
  id: string;
  name: string;
  label: string;
  mode: 'single' | 'multi';
  order: number;
  variables: Var[];
};

// ─── HSL <-> Hex ──────────────────────────────────────────────────────────────

function hslToHex(hsl: string) {
  try {
    const [h, s, l] = hsl.trim().split(/\s+/).map(parseFloat);
    if ([h, s, l].some(isNaN)) return '#000000';
    const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l / 100 - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60)       [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else              [r, g, b] = [c, 0, x];
    const hex = (v: number) => Math.round(Math.min(255, Math.max(0, (v + m) * 255))).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  } catch { return '#000000'; }
}

function hexToHsl(hex: string) {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch { return '0 0% 0%'; }
}

// ─── Tree ─────────────────────────────────────────────────────────────────────

type Group = { label: string; pathKey: string; vars: Var[]; children: Group[] };

function buildTree(vars: Var[]): Group {
  const root: Group = { label: '', pathKey: '', vars: [], children: [] };
  const map = new Map<string, Group>([['', root]]);

  for (const v of [...vars].sort((a, b) => a.order - b.order)) {
    const parts = v.name.split('/');
    // ensure every parent group exists
    for (let i = 1; i < parts.length; i++) {
      const key = parts.slice(0, i).join('/');
      if (!map.has(key)) {
        const parent = map.get(parts.slice(0, i - 1).join('/'))!;
        const g: Group = { label: parts[i - 1], pathKey: key, vars: [], children: [] };
        map.set(key, g);
        parent.children.push(g);
      }
    }
    const parentKey = parts.slice(0, -1).join('/');
    map.get(parentKey)!.vars.push(v);
  }
  return root;
}

function typeIcon(t: string) {
  const cls = 'w-3 h-3 shrink-0 text-neutral-400';
  if (t === 'color')     return <Palette className={cls} />;
  if (t === 'number')    return <Hash className={cls} />;
  if (t === 'string')    return <Type className={cls} />;
  if (t === 'boolean')   return <ToggleLeft className={cls} />;
  if (t === 'dimension') return <Ruler className={cls} />;
  return null;
}

function colorSwatch(value: VariableValue, type: string) {
  if (type !== 'color') return null;
  const raw = typeof value === 'string' ? value : value.light;
  const hex = raw.startsWith('#') ? raw : hslToHex(raw);
  return <span className="w-3 h-3 rounded-sm border border-neutral-200 shrink-0" style={{ background: hex }} />;
}

function fmtValue(v: VariableValue, type?: string) {
  if (typeof v === 'string') return v;
  return `${v.light} / ${v.dark}`;
}

function GroupNode({
  group, depth, selected, onSelect,
}: {
  group: Group; depth: number; selected: Var | null; onSelect: (v: Var) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const pl = depth * 14;

  return (
    <div>
      {depth > 0 && (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-1.5 py-1 hover:bg-neutral-50 rounded text-left"
          style={{ paddingLeft: pl }}
        >
          <ChevronDown className={cn('w-3 h-3 text-neutral-400 transition-transform shrink-0', !open && '-rotate-90')} />
          <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
            {group.label}
            <span className="ml-1.5 text-neutral-400 normal-case tracking-normal font-normal">
              ({group.vars.length + group.children.reduce((s, c) => s + c.vars.length, 0)})
            </span>
          </span>
        </button>
      )}

      {(open || depth === 0) && (
        <>
          {group.vars.map((v) => (
            <button
              key={v.id}
              onClick={() => onSelect(v)}
              className={cn(
                'w-full flex items-center gap-2 py-1.5 rounded text-left group/row',
                selected?.id === v.id ? 'bg-accent-soft text-accent' : 'hover:bg-neutral-50 text-neutral-700'
              )}
              style={{ paddingLeft: pl + (depth === 0 ? 8 : 24) }}
            >
              {typeIcon(v.type)}
              <span className="flex-1 text-[12px] truncate">{v.name.split('/').pop()}</span>
              {colorSwatch(v.value, v.type)}
              <span className="text-[10px] text-neutral-400 truncate max-w-[80px] pr-2">{fmtValue(v.value)}</span>
            </button>
          ))}
          {group.children.map((c) => (
            <GroupNode key={c.pathKey} group={c} depth={depth + 1} selected={selected} onSelect={onSelect} />
          ))}
        </>
      )}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-96 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

function CollectionModal({
  col, onClose, onSave,
}: { col: Col | null; onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [name, setName]   = useState(col?.name ?? '');
  const [label, setLabel] = useState(col?.label ?? '');
  const [mode, setMode]   = useState<'single' | 'multi'>(col?.mode ?? 'single');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');

  async function submit() {
    if (!label.trim()) { setErr('Label is required'); return; }
    if (!col && !name.trim()) { setErr('Name is required'); return; }
    setBusy(true);
    try {
      await onSave(col ? { label, mode } : { name: name.trim().toLowerCase().replace(/\s+/g, '_'), label, mode });
      onClose();
    } catch (e: any) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 space-y-4">
        <h2 className="text-base font-semibold">{col ? 'Edit collection' : 'New collection'}</h2>

        {!col && (
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">Name</span>
            <input
              className="mt-1 w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="colors, typography…"
              autoFocus
            />
            <p className="mt-1 text-[10px] text-neutral-400">Lowercase, underscores only — used as the collection key</p>
          </label>
        )}

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-neutral-500">Label</span>
          <input
            className="mt-1 w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Colors, Typography…"
            autoFocus={!!col}
          />
        </label>

        <div>
          <span className="text-[11px] uppercase tracking-wider text-neutral-500">Mode</span>
          <div className="mt-1 flex rounded-md overflow-hidden border border-neutral-200">
            {(['single', 'multi'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn('flex-1 py-2 text-sm transition-colors', mode === m ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50')}
              >
                {m === 'single' ? 'Single' : 'Light / Dark'}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-neutral-400">
            {mode === 'multi' ? 'Each variable stores a light and dark value.' : 'Each variable stores one value.'}
          </p>
        </div>

        {err && <p className="text-xs text-destructive">{err}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md hover:bg-neutral-100">Cancel</button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-4 py-2 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? 'Saving…' : col ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function VariableModal({
  v, col, onClose, onSave,
}: { v: Var | null; col: Col; onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [name,  setName]  = useState(v?.name ?? '');
  const [type,  setType]  = useState<VariableType>(v?.type ?? 'color');
  const [lv,    setLv]    = useState(typeof v?.value === 'string' ? v.value : (v?.value as any)?.light ?? '');
  const [dv,    setDv]    = useState(typeof v?.value === 'object' ? (v.value as any)?.dark ?? '' : '');
  const [desc,  setDesc]  = useState(v?.description ?? '');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');

  async function submit() {
    if (!name.trim()) { setErr('Name is required'); return; }
    if (!lv.trim()) { setErr('Value is required'); return; }
    const value = col.mode === 'multi' ? { light: lv.trim(), dark: dv.trim() } : lv.trim();
    setBusy(true);
    try {
      await onSave({ name: name.trim().toLowerCase().replace(/\s+/g, '-'), type, value, description: desc.trim() || undefined });
      onClose();
    } catch (e: any) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 space-y-4">
        <h2 className="text-base font-semibold">{v ? 'Edit variable' : 'New variable'}</h2>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-neutral-500">Name</span>
          <input
            className="mt-1 w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent font-mono"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="colors/primary/base"
            autoFocus
          />
          <p className="mt-1 text-[10px] text-neutral-400">Use slashes to create groups: colors/primary/base</p>
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-neutral-500">Type</span>
          <select
            className="mt-1 w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent bg-white"
            value={type}
            onChange={(e) => setType(e.target.value as VariableType)}
          >
            <option value="color">Color</option>
            <option value="number">Number</option>
            <option value="string">String</option>
            <option value="boolean">Boolean</option>
            <option value="dimension">Dimension</option>
          </select>
        </label>

        {(['light', 'dark'] as const).filter(m => col.mode === 'multi' || m === 'light').map((m) => {
          const val = m === 'light' ? lv : dv;
          const set = m === 'light' ? setLv : setDv;
          return (
            <label key={m} className="block">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500">
                {col.mode === 'multi' ? (m === 'light' ? 'Light value' : 'Dark value') : 'Value'}
              </span>
              <div className="mt-1 flex gap-2">
                {type === 'color' && (
                  <input
                    type="color"
                    value={val.startsWith('#') ? val : (val ? hslToHex(val) : '#000000')}
                    onChange={(e) => set(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-neutral-200 p-0.5"
                  />
                )}
                {type === 'boolean' ? (
                  <select
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                  >
                    <option value="">Pick one</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    type={type === 'number' ? 'number' : 'text'}
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={type === 'color' ? '#FF0000 or 222 47% 11%' : type === 'dimension' ? '16px or 1rem' : 'Enter value'}
                  />
                )}
              </div>
            </label>
          );
        })}

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-neutral-500">Description</span>
          <textarea
            className="mt-1 w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Optional…"
            rows={2}
          />
        </label>

        {err && <p className="text-xs text-destructive">{err}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md hover:bg-neutral-100">Cancel</button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-4 py-2 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? 'Saving…' : v ? 'Save' : 'Add variable'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function VariableCollectionsPanel() {
  const [cols, setCols]       = useState<Col[]>([]);
  const [active, setActive]   = useState<Col | null>(null);
  const [selVar, setSelVar]   = useState<Var | null>(null);
  const [err, setErr]         = useState('');

  // modal state
  const [colModal,  setColModal]  = useState<'new' | 'edit' | null>(null);
  const [varModal,  setVarModal]  = useState<'new' | 'edit' | null>(null);

  // load
  useEffect(() => {
    fetch('/api/variable-collections')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load');
        const list: Col[] = Array.isArray(data) ? data : [];
        setCols(list);
        if (list.length) setActive(list[0]);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  // helpers to keep local state in sync without router.refresh()
  const updateCols = (next: Col[]) => { setCols(next); };

  // ── Collection CRUD ──────────────────────────────────────────────────────
  const saveCol = useCallback(async (data: any) => {
    if (colModal === 'edit' && active) {
      const res = await fetch(`/api/variable-collections/${active.id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const updated: Col = { ...active, ...data };
      const next = cols.map((c) => c.id === active.id ? updated : c);
      updateCols(next);
      setActive(updated);
    } else {
      const res = await fetch('/api/variable-collections', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const created: Col = { ...(await res.json()), variables: [] };
      const next = [...cols, created];
      updateCols(next);
      setActive(created);
    }
  }, [colModal, active, cols]);

  const deleteCol = async (id: string) => {
    if (!confirm('Delete collection and all its variables?')) return;
    const res = await fetch(`/api/variable-collections/${id}`, { method: 'DELETE' });
    if (!res.ok) { setErr('Failed to delete'); return; }
    const next = cols.filter((c) => c.id !== id);
    updateCols(next);
    setActive(next[0] ?? null);
    setSelVar(null);
  };

  // ── Variable CRUD ────────────────────────────────────────────────────────
  const saveVar = useCallback(async (data: any) => {
    if (!active) return;
    if (varModal === 'edit' && selVar) {
      const res = await fetch(`/api/variable-collections/${active.id}/variables/${selVar.id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed');
      const updated: Var = await res.json();
      const vars = active.variables.map((v) => v.id === selVar.id ? updated : v);
      const col: Col = { ...active, variables: vars };
      updateCols(cols.map((c) => c.id === active.id ? col : c));
      setActive(col);
      setSelVar(updated);
    } else {
      const res = await fetch(`/api/variable-collections/${active.id}/variables`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed');
      const created: Var = await res.json();
      const col: Col = { ...active, variables: [...active.variables, created] };
      updateCols(cols.map((c) => c.id === active.id ? col : c));
      setActive(col);
      setSelVar(created);
    }
  }, [varModal, active, selVar, cols]);

  const deleteVar = async (id: string) => {
    if (!active || !confirm('Delete variable?')) return;
    const res = await fetch(`/api/variable-collections/${active.id}/variables/${id}`, { method: 'DELETE' });
    if (!res.ok) { setErr('Failed to delete'); return; }
    const col: Col = { ...active, variables: active.variables.filter((v) => v.id !== id) };
    updateCols(cols.map((c) => c.id === active.id ? col : c));
    setActive(col);
    if (selVar?.id === id) setSelVar(null);
  };

  const tree = active ? buildTree(active.variables) : null;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-neutral-200 bg-white/60 backdrop-blur px-6 flex items-center gap-3">
        <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-900">Workspace</Link>
        <span className="text-xs text-neutral-300">›</span>
        <span className="display text-lg">Design Variables</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: collections ── */}
        <aside className="w-60 shrink-0 border-r border-neutral-200 bg-white flex flex-col overflow-hidden">
          <div className="p-3 border-b border-neutral-200 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">Collections</span>
            <button
              onClick={() => setColModal('new')}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2 space-y-0.5">
            {cols.length === 0 && (
              <p className="text-[11px] text-neutral-400 px-2 py-3">No collections yet.</p>
            )}
            {cols.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'group w-full flex items-center gap-1 px-3 py-2 rounded-md text-sm cursor-pointer',
                  active?.id === c.id ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
                )}
                onClick={() => { setActive(c); setSelVar(null); }}
              >
                <span className="flex-1 truncate">{c.label}</span>
                <span className={cn('text-[10px] group-hover:hidden', active?.id === c.id ? 'text-white/50' : 'text-neutral-400')}>
                  {c.variables.length}
                </span>
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActive(c); setColModal('edit'); }}
                    className={cn('p-0.5 rounded', active?.id === c.id ? 'hover:bg-white/20' : 'hover:bg-neutral-200')}
                    title="Edit collection"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCol(c.id); }}
                    className={cn('p-0.5 rounded', active?.id === c.id ? 'hover:bg-white/20 text-red-300' : 'hover:bg-neutral-200 text-destructive')}
                    title="Delete collection"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </aside>

        {/* ── Center: variable tree ── */}
        {active ? (
          <main className="flex-1 flex flex-col overflow-hidden border-r border-neutral-200">
            <div className="p-3 border-b border-neutral-200 flex items-center justify-between shrink-0">
              <div>
                <p className="font-semibold text-sm">{active.label}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">{active.mode === 'multi' ? 'Light / Dark' : 'Single'} · {active.variables.length} variables</p>
              </div>
              <button
                onClick={() => { setSelVar(null); setVarModal('new'); }}
                className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-800"
              >
                + Add variable
              </button>
            </div>

            <div className="flex-1 overflow-auto p-3">
              {tree && active.variables.length > 0 ? (
                <GroupNode group={tree} depth={0} selected={selVar} onSelect={setSelVar} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-neutral-500 mb-1">No variables yet</p>
                  <p className="text-[11px] text-neutral-400">Click + Add variable to start</p>
                </div>
              )}
            </div>
          </main>
        ) : cols.length === 0 ? null : (
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-sm text-neutral-500">No collection selected</p>
              <button
                onClick={() => setColModal('new')}
                className="px-4 py-2 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-800"
              >
                Create first collection
              </button>
            </div>
          </main>
        )}

        {/* ── Right: inspector ── */}
        {selVar && (
          <aside className="w-72 shrink-0 border-l border-neutral-200 bg-white overflow-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">Variable</p>
                  <p className="text-sm font-mono mt-1 break-all">{selVar.name}</p>
                </div>
                <span className="text-[10px] bg-neutral-100 rounded px-1.5 py-0.5 capitalize">{selVar.type}</span>
              </div>

              {selVar.type === 'color' && (
                <div className="flex gap-2">
                  {(typeof selVar.value === 'object' ? [
                    { label: 'Light', val: (selVar.value as any).light },
                    { label: 'Dark', val: (selVar.value as any).dark },
                  ] : [{ label: 'Value', val: selVar.value as string }]).map(({ label, val }) => (
                    <div key={label} className="flex-1">
                      <p className="text-[10px] text-neutral-400 mb-1">{label}</p>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded border border-neutral-200" style={{ background: val?.startsWith('#') ? val : hslToHex(val) }} />
                        <span className="text-[11px] font-mono">{val}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selVar.type !== 'color' && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">Value</p>
                  <p className="text-sm font-mono mt-1 break-all">
                    {typeof selVar.value === 'string' ? selVar.value : JSON.stringify(selVar.value)}
                  </p>
                </div>
              )}

              {selVar.description && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">Description</p>
                  <p className="text-sm mt-1 text-neutral-600">{selVar.description}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-neutral-200">
                <button
                  onClick={() => setVarModal('edit')}
                  className="flex-1 px-3 py-2 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteVar(selVar.id)}
                  className="px-3 py-2 text-sm border border-neutral-200 text-destructive rounded-md hover:bg-destructive/5"
                >
                  Delete
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Error toast */}
      {err && (
        <div className="fixed bottom-4 right-4 bg-destructive text-white text-sm px-4 py-2 rounded-md shadow-lg">
          {err}
          <button onClick={() => setErr('')} className="ml-3 opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      {/* Modals */}
      {colModal && (
        <CollectionModal
          col={colModal === 'edit' ? active : null}
          onClose={() => setColModal(null)}
          onSave={saveCol}
        />
      )}
      {varModal && active && (
        <VariableModal
          v={varModal === 'edit' ? selVar : null}
          col={active}
          onClose={() => setVarModal(null)}
          onSave={saveVar}
        />
      )}
    </div>
  );
}
