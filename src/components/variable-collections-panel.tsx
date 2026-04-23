'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Plus, Trash2, ChevronDown, Palette, Pencil, Wind, ALargeSmall, Copy, Check, FolderOpen } from 'lucide-react';
import { getTwSuggestions, getTwHint } from '@/lib/tailwind-classes';
import { loadGoogleFont, getFontImport, searchFonts, getCategoryLabel, POPULAR_FONTS } from '@/lib/google-fonts-list';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type VariableType = 'color' | 'tailwind' | 'font';

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
  if (t === 'color')    return <Palette className={cls} />;
  if (t === 'tailwind') return <Wind className={cls} />;
  if (t === 'font')     return <ALargeSmall className={cls} />;
  return null;
}

function colorSwatch(value: VariableValue, type: string) {
  if (type !== 'color') return null;
  const raw = typeof value === 'string' ? value : value.light;
  const hex = raw.startsWith('#') ? raw : hslToHex(raw);
  return <span className="w-3 h-3 rounded-sm border border-neutral-200 shrink-0" style={{ background: hex }} />;
}

function fmtValue(v: VariableValue, type?: string) {
  if (type === 'tailwind' && typeof v === 'string') {
    const hint = getTwHint(v);
    return hint ? `${v} — ${hint.split(';')[0]}` : v;
  }
  if (typeof v === 'string') return v;
  return `${v.light} / ${v.dark}`;
}

// ─── Font picker ──────────────────────────────────────────────────────────────

function FontPicker({ value, onChange, usedFonts }: { value: string; onChange: (v: string) => void; usedFonts: string[] }) {
  const [tab, setTab]       = useState<'google' | 'local'>('google');
  const [search, setSearch] = useState('');
  const [cat, setCat]       = useState('');
  const [copied, setCopied] = useState('');

  const fonts = searchFonts(search).filter(f => !cat || f.category === cat);

  useEffect(() => {
    fonts.slice(0, 25).forEach(f => loadGoogleFont(f.family));
  }, [search, cat]);

  function selectFont(family: string) {
    loadGoogleFont(family);
    onChange(family);
  }

  function copyImport(family: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(getFontImport(family));
    setCopied(family);
    setTimeout(() => setCopied(''), 1800);
  }

  const fileRef = useRef<HTMLInputElement>(null);
  const [localName, setLocalName] = useState(tab === 'local' ? value : '');

  async function pickLocalFont(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const guessed = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const url = URL.createObjectURL(file);
    try {
      const ff = new FontFace(guessed, `url(${url})`);
      await ff.load();
      (document.fonts as any).add(ff);
    } catch {}
    setLocalName(guessed);
    onChange(guessed);
  }

  if (tab === 'local') {
    return (
      <div className="space-y-2">
        <div className="flex gap-1 p-0.5 bg-neutral-100 rounded-md w-fit">
          <button onClick={() => setTab('google')} className="text-[11px] px-2.5 py-1 rounded hover:bg-white">Google</button>
          <button className="text-[11px] px-2.5 py-1 rounded bg-white shadow-sm font-medium">Local</button>
        </div>
        <input ref={fileRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={pickLocalFont} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center gap-2 px-3 py-2.5 border border-dashed border-neutral-300 rounded-md hover:border-neutral-400 hover:bg-neutral-50 text-sm text-neutral-600 transition-colors"
        >
          <FolderOpen className="w-4 h-4 text-neutral-400" />
          <span>Browse font files</span>
          <span className="ml-auto text-[10px] text-neutral-400">.ttf .otf .woff .woff2</span>
        </button>
        {localName && (
          <>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                value={localName}
                onChange={e => { setLocalName(e.target.value); onChange(e.target.value); }}
                placeholder="Font family name"
              />
            </div>
            <p className="text-[10px] text-neutral-400">Edit the family name if needed — this is what gets stored</p>
            <div className="p-3 border border-neutral-200 rounded-md">
              <p className="text-[10px] text-neutral-400 mb-1">Preview</p>
              <p className="text-sm leading-relaxed" style={{ fontFamily: localName }}>The quick brown fox jumps over the lazy dog</p>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 p-0.5 bg-neutral-100 rounded-md w-fit">
        <button className="text-[11px] px-2.5 py-1 rounded bg-white shadow-sm font-medium">Google</button>
        <button onClick={() => { setTab('local'); setSearch(''); }} className="text-[11px] px-2.5 py-1 rounded hover:bg-white">Local</button>
      </div>
      <input
        type="text"
        autoFocus
        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search fonts…"
      />
      <div className="flex flex-wrap gap-1">
        {(['', 'sans-serif', 'serif', 'monospace', 'display', 'handwriting'] as const).map(c => (
          <button
            key={c || 'all'}
            onClick={() => setCat(c)}
            className={cn('text-[10px] px-1.5 py-0.5 rounded', cat === c ? 'bg-neutral-900 text-white' : 'bg-neutral-100 hover:bg-neutral-200')}
          >
            {c ? getCategoryLabel(c) : 'All'}
          </button>
        ))}
      </div>
      <div className="max-h-44 overflow-auto border border-neutral-200 rounded-md divide-y divide-neutral-100">
        {fonts.slice(0, 30).map(f => (
          <button
            key={f.family}
            onClick={() => selectFont(f.family)}
            className={cn(
              'w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-neutral-50 text-left group/font',
              value === f.family && 'bg-sky-50'
            )}
          >
            <div className="flex-1 min-w-0">
              <span
                className={cn('text-sm block truncate', usedFonts.includes(f.family) && 'font-bold')}
                style={{ fontFamily: f.family }}
              >
                {f.family}
              </span>
              <span className="text-[10px] text-neutral-400 capitalize">{f.category.replace('-', ' ')}</span>
            </div>
            <button
              onClick={e => copyImport(f.family, e)}
              className="shrink-0 opacity-0 group-hover/font:opacity-100 text-[10px] text-neutral-400 hover:text-neutral-900 px-1.5 py-0.5 rounded hover:bg-neutral-100 flex items-center gap-1"
              title="Copy @import"
            >
              {copied === f.family ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </button>
        ))}
        {fonts.length === 0 && <p className="text-sm text-neutral-400 px-3 py-4 text-center">No fonts found</p>}
      </div>
      {value && (
        <div className="p-3 border border-neutral-200 rounded-md">
          <p className="text-[10px] text-neutral-400 mb-1">Preview — <span className="font-mono">{value}</span></p>
          <p className="text-sm leading-relaxed" style={{ fontFamily: value }}>The quick brown fox jumps over the lazy dog</p>
        </div>
      )}
    </div>
  );
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
              <div className="flex items-center gap-1.5 shrink-0 pr-2">
                <span className="text-[10px] text-neutral-400 max-w-[100px] truncate">{fmtValue(v.value, v.type)}</span>
                {colorSwatch(v.value, v.type)}
              </div>
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


function TwClassInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx]   = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const suggestions = open ? getTwSuggestions(value) : [];
  const hint = getTwHint(value);

  useEffect(() => { setIdx(-1); }, [value]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function onKey(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i - 1, -1)); }
    if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); onChange(suggestions[idx]); setOpen(false); }
    if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        autoFocus
        className="mt-1 w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent font-mono"
        value={value}
        placeholder="pt-4, text-lg, rounded-md…"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {hint && (
        <p className="mt-1 text-[10px] text-neutral-400 font-mono">→ {hint}</p>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white border border-neutral-200 rounded-md shadow-lg max-h-44 overflow-auto py-0.5 text-[12px]">
          {suggestions.map((s, i) => {
            const sh = getTwHint(s);
            return (
              <li
                key={s}
                className={cn('px-3 py-1.5 cursor-pointer flex items-center justify-between gap-2', i === idx ? 'bg-accent text-white' : 'hover:bg-neutral-50')}
                onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
              >
                <span className="font-mono">{s}</span>
                {sh && <span className={cn('text-[10px] truncate max-w-[140px]', i === idx ? 'text-white/70' : 'text-neutral-400')}>{sh.split(';')[0]}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


function VariableModal({
  v, col, onClose, onSave, usedFonts,
}: { v: Var | null; col: Col; onClose: () => void; onSave: (d: any) => Promise<void>; usedFonts: string[] }) {
  const [name,   setName]   = useState(v?.name ?? '');
  const [type,   setType]   = useState<VariableType>(v?.type ?? 'color');
  const [lv,     setLv]     = useState(typeof v?.value === 'string' ? v.value : (v?.value as any)?.light ?? '');
  const [dv,     setDv]     = useState(typeof v?.value === 'object' ? (v.value as any)?.dark ?? '' : '');
  const [desc,   setDesc]   = useState(v?.description ?? '');
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState('');

  async function submit() {
    if (!name.trim()) { setErr('Name is required'); return; }
    if (!lv.trim()) { setErr('Value is required'); return; }
    const value = (col.mode === 'multi' && type !== 'font') ? { light: lv.trim(), dark: dv.trim() } : lv.trim();
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
            onChange={(e) => {
              const t = e.target.value as VariableType;
              setType(t);
              if (t === 'tailwind' || type === 'tailwind' || t === 'font' || type === 'font') { setLv(''); setDv(''); }
            }}
          >
            <option value="color">Color</option>
            <option value="tailwind">Tailwind</option>
            <option value="font">Font</option>
          </select>
        </label>

        {type === 'font' ? (
          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">Font family</span>
            <div className="mt-2">
              <FontPicker value={lv} onChange={setLv} usedFonts={usedFonts} />
            </div>
          </div>
        ) : type === 'tailwind' ? (
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">Value</span>
            <TwClassInput value={lv} onChange={setLv} />
          </label>
        ) : (
          (['light', 'dark'] as const).filter(m => col.mode === 'multi' || m === 'light').map((m) => {
            const val = m === 'light' ? lv : dv;
            const set = m === 'light' ? setLv : setDv;
            return (
              <label key={m} className="block">
                <span className="text-[11px] uppercase tracking-wider text-neutral-500">
                  {col.mode === 'multi' ? (m === 'light' ? 'Light value' : 'Dark value') : 'Value'}
                </span>
                <div className="mt-1 flex gap-2">
                  <input
                    type="color"
                    value={val.startsWith('#') ? val : (val ? hslToHex(val) : '#000000')}
                    onChange={(e) => set(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-neutral-200 p-0.5"
                  />
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder="#FF0000 or 222 47% 11%"
                  />
                </div>
              </label>
            );
          })
        )}


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

              {selVar.type === 'tailwind' && typeof selVar.value === 'string' && (() => {
                const hint = getTwHint(selVar.value);
                return (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400">Class</p>
                    <p className="text-sm font-mono">{selVar.value}</p>
                    {hint && (
                      <>
                        <p className="text-[10px] uppercase tracking-wider text-neutral-400 mt-2">CSS</p>
                        <div className="font-mono text-[11px] text-neutral-600 space-y-0.5">
                          {hint.split(';').filter(Boolean).map((line, i) => (
                            <p key={i}>{line.trim()}</p>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {selVar.type === 'font' && typeof selVar.value === 'string' && (() => {
                loadGoogleFont(selVar.value);
                return (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400">Family</p>
                    <p className="text-sm font-mono">{selVar.value}</p>
                    <div className="p-3 border border-neutral-200 rounded-md">
                      <p className="text-[10px] text-neutral-400 mb-1">Preview</p>
                      <p className="text-sm leading-relaxed" style={{ fontFamily: selVar.value }}>
                        The quick brown fox jumps over the lazy dog
                      </p>
                    </div>
                  </div>
                );
              })()}


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
          usedFonts={active.variables.filter(v => v.type === 'font').map(v => typeof v.value === 'string' ? v.value : '').filter(Boolean)}
        />
      )}
    </div>
  );
}
