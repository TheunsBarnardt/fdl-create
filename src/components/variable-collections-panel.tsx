'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Plus, Trash2, ChevronDown, ChevronUp, Palette, Pencil, Wind, ALargeSmall, Copy, Check, FolderOpen, Layers, Eye, EyeOff, Info } from 'lucide-react';
import { getTwSuggestions, getTwHint } from '@/lib/tailwind-classes';
import { loadGoogleFont, getFontImport, searchFonts, getCategoryLabel, POPULAR_FONTS } from '@/lib/google-fonts-list';
import {
  type Effect, type EffectKind, type DropShadow, type InnerShadow, type LayerBlur, type BackgroundBlur,
  BLEND_MODES, blendModeLabel, defaultEffect, effectKindLabel, effectsToCss, effectsToTailwind, effectSummary, isEffectArray,
} from '@/lib/effect-types';
import { cn } from '@/lib/utils';
import { ScreenHeader, Chip } from './screen-header';

// ─── Types ────────────────────────────────────────────────────────────────────

type VariableType = 'color' | 'tailwind' | 'font' | 'effect';

type VariableValue = string | { light: string; dark: string } | Effect[];

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

const fmtColName = (n: string) => n.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

type Col = {
  id: string;
  name: string;
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
  if (t === 'effect')   return <Layers className={cls} />;
  return null;
}

function rowPreview(value: VariableValue, type: string) {
  if (type === 'color') {
    const raw = typeof value === 'string' ? value : (value as any).light;
    const hex = raw.startsWith('#') ? raw : hslToHex(raw);
    return <span className="w-3 h-3 rounded-sm border border-neutral-200 shrink-0" style={{ background: hex }} />;
  }
  if (type === 'effect' && isEffectArray(value)) {
    const css = effectsToCss(value);
    return (
      <span
        className="w-4 h-4 rounded-sm shrink-0 bg-white"
        style={{
          boxShadow: css.boxShadow || undefined,
          filter:    css.filter || undefined,
        }}
      />
    );
  }
  return null;
}

function fmtValue(v: VariableValue, type?: string) {
  if (type === 'tailwind' && typeof v === 'string') {
    const hint = getTwHint(v);
    return hint ? `${v} — ${hint.split(';')[0]}` : v;
  }
  if (type === 'effect' && isEffectArray(v)) {
    return effectsToTailwind(v) || effectSummary(v);
  }
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'light' in v) return `${v.light} / ${v.dark}`;
  return '';
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
        <div className="flex gap-1 p-0.5 bg-white/[0.04] rounded-md w-fit">
          <button onClick={() => setTab('google')} className="text-[11px] px-2.5 py-1 rounded text-white/50 hover:text-white/80 hover:bg-white/[0.06]">Google</button>
          <button className="text-[11px] px-2.5 py-1 rounded bg-white/[0.08] text-white/90 font-medium">Local</button>
        </div>
        <input ref={fileRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={pickLocalFont} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center gap-2 px-3 py-2.5 border border-dashed border-white/[0.15] rounded-md hover:border-accent/50 hover:bg-white/[0.04] text-sm text-white/60 transition-colors"
        >
          <FolderOpen className="w-4 h-4 text-white/40" />
          <span>Browse font files</span>
          <span className="ml-auto text-[10px] text-white/30">.ttf .otf .woff .woff2</span>
        </button>
        {localName && (
          <>
            <input
              type="text"
              className="w-full px-2.5 py-1.5 text-sm border border-white/[0.08] rounded-md bg-white/[0.03] text-white/90 placeholder-white/30 focus:outline-none focus:border-accent/60 font-mono"
              value={localName}
              onChange={e => { setLocalName(e.target.value); onChange(e.target.value); }}
              placeholder="Font family name"
            />
            <p className="text-[10px] text-white/30">Edit the family name if needed — this is what gets stored</p>
            <div className="p-3 border border-white/[0.08] rounded-md">
              <p className="text-[10px] text-white/40 mb-1">Preview</p>
              <p className="text-sm leading-relaxed text-white/80" style={{ fontFamily: localName }}>The quick brown fox jumps over the lazy dog</p>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 p-0.5 bg-white/[0.04] rounded-md w-fit">
        <button className="text-[11px] px-2.5 py-1 rounded bg-white/[0.08] text-white/90 font-medium">Google</button>
        <button onClick={() => { setTab('local'); setSearch(''); }} className="text-[11px] px-2.5 py-1 rounded text-white/50 hover:text-white/80 hover:bg-white/[0.06]">Local</button>
      </div>
      <input
        type="text"
        autoFocus
        className="w-full px-2.5 py-1.5 text-sm border border-white/[0.08] rounded-md bg-white/[0.03] text-white/90 placeholder-white/30 focus:outline-none focus:border-accent/60"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search fonts…"
      />
      <div className="flex flex-wrap gap-1">
        {(['', 'sans-serif', 'serif', 'monospace', 'display', 'handwriting'] as const).map(c => (
          <button
            key={c || 'all'}
            onClick={() => setCat(c)}
            className={cn('text-[10px] px-1.5 py-0.5 rounded', cat === c ? 'bg-accent text-neutral-900 font-medium' : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.10] hover:text-white/90')}
          >
            {c ? getCategoryLabel(c) : 'All'}
          </button>
        ))}
      </div>
      <div className="max-h-44 overflow-auto border border-white/[0.08] rounded-md divide-y divide-white/[0.04]">
        {fonts.slice(0, 30).map(f => (
          <button
            key={f.family}
            onClick={() => selectFont(f.family)}
            className={cn(
              'w-full px-3 py-2 flex items-center justify-between gap-2 text-left group/font',
              value === f.family ? 'bg-accent/10' : 'hover:bg-white/[0.06]'
            )}
          >
            <div className="flex-1 min-w-0">
              <span
                className={cn('text-sm block truncate text-white/90', usedFonts.includes(f.family) && 'font-bold')}
                style={{ fontFamily: f.family }}
              >
                {f.family}
              </span>
              <span className="text-[10px] text-white/40 capitalize">{f.category.replace('-', ' ')}</span>
            </div>
            <button
              onClick={e => copyImport(f.family, e)}
              className="shrink-0 opacity-0 group-hover/font:opacity-100 text-[10px] text-white/40 hover:text-white/80 px-1.5 py-0.5 rounded hover:bg-white/[0.08] flex items-center gap-1"
              title="Copy @import"
            >
              {copied === f.family ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </button>
        ))}
        {fonts.length === 0 && <p className="text-sm text-white/40 px-3 py-4 text-center">No fonts found</p>}
      </div>
      {value && (
        <div className="p-3 border border-white/[0.08] rounded-md">
          <p className="text-[10px] text-white/40 mb-1">Preview — <span className="font-mono">{value}</span></p>
          <p className="text-sm leading-relaxed text-white/80" style={{ fontFamily: value }}>The quick brown fox jumps over the lazy dog</p>
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
                {rowPreview(v.value, v.type)}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card glow-ring shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto text-white" onClick={(e) => e.stopPropagation()}>
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
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');

  async function submit() {
    if (!name.trim()) { setErr('Name is required'); return; }
    setBusy(true);
    try {
      const slug = name.trim().toLowerCase().replace(/\s+/g, '_');
      await onSave(col ? { id: col.id, name: slug } : { name: slug });
      onClose();
    } catch (e: any) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="display text-base text-white/95">{col ? 'Edit collection' : 'New collection'}</div>
        <button onClick={onClose} className="text-white/45 hover:text-white/90">✕</button>
      </div>
      <div className="p-5 space-y-4 text-xs">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">Name</span>
          <input
            className="mt-1 w-full px-2.5 py-1.5 text-sm border border-white/[0.08] rounded-md bg-white/[0.03] text-white/90 placeholder-white/30 focus:outline-none focus:border-accent/60"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="colors, typography…"
            autoFocus
          />
        </label>


        {err && <p className="text-xs text-rose-400">{err}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md text-white/70 hover:bg-white/[0.06] hover:text-white/95 transition-colors">Cancel</button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-3 py-1.5 text-xs bg-accent text-neutral-900 rounded-md hover:bg-amber-400 disabled:opacity-50 font-medium"
          >
            {busy ? 'Saving…' : col ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
}


function DarkSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const selected = options.find(o => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm border border-white/[0.08] rounded-md bg-white/[0.03] text-white/90 focus:outline-none hover:border-white/20 transition-colors"
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown className="w-3.5 h-3.5 text-white/40 shrink-0" />
      </button>
      {open && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-neutral-950 border border-white/[0.08] rounded-md shadow-xl overflow-hidden py-0.5 text-sm">
          {options.map(o => (
            <li
              key={o.value}
              className={cn('tilt-row px-3 py-1.5 cursor-pointer', value === o.value ? 'text-accent font-medium' : 'text-white/80')}
              onMouseDown={e => { e.preventDefault(); onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TwClassInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx]   = useState(-1);
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropRect, setDropRect] = useState<DOMRect | null>(null);
  const suggestions = open ? getTwSuggestions(value) : [];
  const hint = getTwHint(value);

  useEffect(() => { setIdx(-1); }, [value]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function openDropdown() {
    if (inputRef.current) setDropRect(inputRef.current.getBoundingClientRect());
    setOpen(true);
  }

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
        ref={inputRef}
        type="text"
        autoFocus
        className="mt-1 w-full px-2.5 py-1.5 text-sm border border-white/[0.08] rounded-md bg-white/[0.03] text-white/90 placeholder-white/30 focus:outline-none focus:border-accent/60 font-mono"
        value={value}
        placeholder="pt-4, text-lg, rounded-md…"
        onChange={e => { onChange(e.target.value); openDropdown(); }}
        onFocus={openDropdown}
        onKeyDown={onKey}
      />
      {hint && (
        <p className="mt-1 text-[10px] text-white/40 font-mono">→ {hint}</p>
      )}
      {open && suggestions.length > 0 && dropRect && createPortal(
        <ul
          style={{ position: 'fixed', top: dropRect.bottom + 2, left: dropRect.left, width: dropRect.width, zIndex: 9999 }}
          className="bg-neutral-950 border border-white/[0.08] rounded-md shadow-xl max-h-44 overflow-y-auto overflow-x-hidden py-0.5 text-[12px]"
        >
          {suggestions.map((s, i) => {
            const sh = getTwHint(s);
            return (
              <li
                key={s}
                className={cn('tilt-row px-3 py-1.5 cursor-pointer flex items-center justify-between gap-2', i === idx ? 'text-accent font-medium' : 'text-white/80')}
                onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
              >
                <span className="font-mono">{s}</span>
                {sh && <span className={cn('text-[10px] truncate max-w-[140px]', i === idx ? 'text-accent/60' : 'text-white/40')}>{sh.split(';')[0]}</span>}
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  );
}


// ─── Effect editor ────────────────────────────────────────────────────────────

function NumInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <label className="block">
      <span className="text-[10px] text-white/40">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={e => onChange(Number(e.target.value) || 0)}
        className="mt-0.5 w-full px-2 py-1 text-sm border border-white/[0.08] rounded-md bg-white/[0.03] text-white/90 placeholder-white/30 focus:outline-none focus:border-accent/60 font-mono"
      />
    </label>
  );
}

function ShadowFields({
  e, onChange,
}: { e: DropShadow | InnerShadow; onChange: (next: DropShadow | InnerShadow) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="X"      value={e.x}      onChange={x => onChange({ ...e, x })} />
        <NumInput label="Y"      value={e.y}      onChange={y => onChange({ ...e, y })} />
        <NumInput label="Blur"   value={e.blur}   onChange={blur   => onChange({ ...e, blur })} />
        <NumInput label="Spread" value={e.spread} onChange={spread => onChange({ ...e, spread })} />
      </div>

      <div>
        <span className="text-[10px] text-white/40">Color</span>
        <div className="mt-0.5 flex gap-2">
          <input
            type="color"
            value={e.color}
            onChange={ev => onChange({ ...e, color: ev.target.value })}
            className="w-9 h-9 rounded cursor-pointer border border-white/[0.08] p-0.5"
          />
          <input
            type="text"
            value={e.color}
            onChange={ev => onChange({ ...e, color: ev.target.value })}
            className="flex-1 px-2 py-1 text-sm border border-white/[0.08] rounded-md bg-white/[0.03] text-white/90 placeholder-white/30 focus:outline-none focus:border-accent/60 font-mono"
            placeholder="#000000"
          />
          <div className="w-20">
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round(e.opacity * 100)}
              onChange={ev => onChange({ ...e, opacity: Math.max(0, Math.min(100, Number(ev.target.value) || 0)) / 100 })}
              className="w-full px-2 py-1 text-sm border border-white/[0.08] rounded-md bg-white/[0.03] text-white/90 focus:outline-none focus:border-accent/60 font-mono"
            />
            <span className="text-[10px] text-white/30 block text-center mt-0.5">opacity %</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 items-end">
        <div>
          <span className="text-[10px] text-white/40 flex items-center gap-1">
            Blend mode
            <span title="Stored for Figma round-trip; not emitted in CSS — see docs">
              <Info className="w-3 h-3 text-white/30" />
            </span>
          </span>
          <div className="mt-0.5">
            <DarkSelect
              value={e.blendMode}
              onChange={(v) => onChange({ ...e, blendMode: v as any })}
              options={BLEND_MODES.map(m => ({ value: m, label: blendModeLabel(m) }))}
            />
          </div>
        </div>
        {e.kind === 'drop_shadow' && (
          <label className="flex items-center gap-2 px-2 py-1.5 border border-white/[0.08] rounded-md bg-white/[0.03] cursor-pointer">
            <input
              type="checkbox"
              checked={e.showBehindTransparent}
              onChange={ev => onChange({ ...e, showBehindTransparent: ev.target.checked })}
              className="accent-accent"
            />
            <span className="text-[11px] text-white/70 flex items-center gap-1">
              Show behind transparent
              <span title="Stored for Figma round-trip; not emitted in CSS — see docs">
                <Info className="w-3 h-3 text-white/30" />
              </span>
            </span>
          </label>
        )}
      </div>
    </div>
  );
}

function BlurFields({
  e, onChange,
}: { e: LayerBlur | BackgroundBlur; onChange: (next: LayerBlur | BackgroundBlur) => void }) {
  return (
    <div className="space-y-2">
      <NumInput label="Radius (px)" value={e.radius} onChange={radius => onChange({ ...e, radius })} />
      <div
        className="h-14 rounded border border-white/[0.08] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#f59e0b 0%,#8b5cf6 100%)' }}
      >
        <div
          className="absolute inset-0"
          style={
            e.kind === 'layer_blur'
              ? { filter: `blur(${e.radius}px)`, background: 'linear-gradient(135deg,#f59e0b 0%,#8b5cf6 100%)' }
              : { backdropFilter: `blur(${e.radius}px)`, background: 'rgba(255,255,255,0.04)' }
          }
        />
      </div>
    </div>
  );
}

function EffectLayerCard({
  e, idx, total, onChange, onRemove, onMove,
}: {
  e: Effect;
  idx: number;
  total: number;
  onChange: (next: Effect) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-white/[0.08] rounded-md bg-white/[0.02]">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={() => onChange({ ...e, visible: !e.visible } as Effect)}
          className="p-1 rounded hover:bg-white/[0.06] text-white/60"
          title={e.visible ? 'Hide layer' : 'Show layer'}
        >
          {e.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-white/30" />}
        </button>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center gap-1.5 text-left text-[11px] text-white/80 px-1"
        >
          <ChevronDown className={cn('w-3 h-3 text-white/40 transition-transform', !open && '-rotate-90')} />
          <span className="font-medium">{effectKindLabel(e.kind)}</span>
          {!e.visible && <span className="text-[10px] text-white/30 italic">(hidden)</span>}
        </button>
        <button
          type="button"
          disabled={idx === 0}
          onClick={() => onMove(-1)}
          className="p-1 rounded hover:bg-white/[0.06] text-white/50 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={idx === total - 1}
          onClick={() => onMove(1)}
          className="p-1 rounded hover:bg-white/[0.06] text-white/50 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded hover:bg-rose-500/10 text-rose-400/70 hover:text-rose-300"
          title="Remove layer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {open && (
        <div className="px-3 pt-2 pb-3 border-t border-white/[0.06]">
          {(e.kind === 'drop_shadow' || e.kind === 'inner_shadow') && (
            <ShadowFields e={e} onChange={onChange as any} />
          )}
          {(e.kind === 'layer_blur' || e.kind === 'background_blur') && (
            <BlurFields e={e} onChange={onChange as any} />
          )}
        </div>
      )}
    </div>
  );
}

function EffectEditor({ effects, onChange }: { effects: Effect[]; onChange: (next: Effect[]) => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const css = effectsToCss(effects);
  const tw  = effectsToTailwind(effects);
  const [copied, setCopied] = useState(false);

  function add(kind: EffectKind) {
    onChange([...effects, defaultEffect(kind)]);
    setAddOpen(false);
  }
  function update(idx: number, next: Effect) {
    onChange(effects.map((e, i) => i === idx ? next : e));
  }
  function remove(idx: number) {
    onChange(effects.filter((_, i) => i !== idx));
  }
  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= effects.length) return;
    const next = [...effects];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }
  function copyTw() {
    if (!tw) return;
    navigator.clipboard.writeText(tw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-white/45">Effects</span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setAddOpen(o => !o)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-white/[0.05] text-white/80 hover:bg-white/[0.10] hover:text-white/95 border border-white/[0.08]"
          >
            <Plus className="w-3 h-3" /> Add layer
          </button>
          {addOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-neutral-950 border border-white/[0.08] rounded-md shadow-xl py-0.5 text-[12px] min-w-[160px]">
              {(['drop_shadow', 'inner_shadow', 'layer_blur', 'background_blur'] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); add(k); }}
                  className="tilt-row w-full text-left px-3 py-1.5 text-white/80 cursor-pointer"
                >
                  {effectKindLabel(k)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {effects.length === 0 && (
          <p className="text-[11px] text-white/40 px-3 py-4 text-center border border-dashed border-white/[0.10] rounded-md">
            No layers yet — click <span className="text-white/70">Add layer</span> to start
          </p>
        )}
        {effects.map((e, i) => (
          <EffectLayerCard
            key={i}
            e={e}
            idx={i}
            total={effects.length}
            onChange={next => update(i, next)}
            onRemove={() => remove(i)}
            onMove={dir => move(i, dir)}
          />
        ))}
      </div>

      <div className="space-y-2 pt-3 border-t border-white/[0.06]">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-white/45">Preview</span>
          <div className="mt-1 h-20 rounded-md bg-white relative overflow-hidden flex items-center justify-center">
            <div
              className="w-12 h-12 rounded bg-white"
              style={{
                boxShadow:      css.boxShadow || undefined,
                filter:         css.filter || undefined,
                backdropFilter: css.backdropFilter || undefined,
              }}
            />
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-white/45">Tailwind class</span>
          <div className="mt-1 flex gap-2">
            <code className="flex-1 px-2 py-1.5 text-[11px] border border-white/[0.08] rounded-md bg-white/[0.03] text-accent/90 font-mono break-all">
              {tw || <span className="text-white/30">— no visible layers —</span>}
            </code>
            <button
              type="button"
              onClick={copyTw}
              disabled={!tw}
              className="shrink-0 px-2 py-1.5 text-[11px] rounded-md bg-white/[0.05] hover:bg-white/[0.10] text-white/80 border border-white/[0.08] disabled:opacity-40"
              title="Copy Tailwind class"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariableModal({
  v, col, onClose, onSave, usedFonts,
}: { v: Var | null; col: Col; onClose: () => void; onSave: (d: any) => Promise<void>; usedFonts: string[] }) {
  const [name,     setName]     = useState(v?.name ?? '');
  const [type,     setType]     = useState<VariableType>(v?.type ?? 'color');
  const initialEffects = isEffectArray(v?.value) ? (v!.value as Effect[]) : [];
  const initialLight   = typeof v?.value === 'string' ? v.value : (v?.value && typeof v.value === 'object' && 'light' in (v.value as any)) ? (v!.value as any).light : '';
  const initialDark    = (v?.value && typeof v.value === 'object' && 'dark' in (v.value as any)) ? (v!.value as any).dark : '';
  const [lv,       setLv]       = useState<string>(initialLight ?? '');
  const [dv,       setDv]       = useState<string>(initialDark ?? '');
  const [darkMode, setDarkMode] = useState(v?.value !== undefined && typeof v.value === 'object' && !Array.isArray(v.value));
  const [effects,  setEffects]  = useState<Effect[]>(initialEffects);
  const [desc,     setDesc]     = useState(v?.description ?? '');
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');

  async function submit() {
    if (!name.trim()) { setErr('Name is required'); return; }
    let value: any;
    if (type === 'effect') {
      if (effects.length === 0) { setErr('Add at least one effect layer'); return; }
      value = effects;
    } else {
      if (!lv.trim()) { setErr('Value is required'); return; }
      value = (darkMode && type === 'color') ? { light: lv.trim(), dark: dv.trim() } : lv.trim();
    }
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
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="display text-base text-white/95">{v ? 'Edit variable' : 'New variable'}</div>
        <button onClick={onClose} className="text-white/45 hover:text-white/90">✕</button>
      </div>
      <div className="p-5 space-y-4 text-xs">

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">Name</span>
          <input
            className="mt-1 w-full px-2.5 py-1.5 text-sm border border-white/[0.08] rounded-md bg-white/[0.03] text-white/90 placeholder-white/30 focus:outline-none focus:border-accent/60 font-mono"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="colors/primary/base"
            autoFocus
          />
          <p className="mt-1 text-[10px] text-white/30">Use slashes to create groups: colors/primary/base</p>
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">Type</span>
          <div className="mt-1">
            <DarkSelect
              value={type}
              onChange={(v) => {
                const t = v as VariableType;
                setType(t);
                if (t === 'tailwind' || type === 'tailwind' || t === 'font' || type === 'font') { setLv(''); setDv(''); }
              }}
              options={[
                { value: 'color', label: 'Color' },
                { value: 'tailwind', label: 'Tailwind' },
                { value: 'font', label: 'Font' },
                { value: 'effect', label: 'Effect (shadow / blur)' },
              ]}
            />
          </div>
        </label>

        {type === 'effect' ? (
          <EffectEditor effects={effects} onChange={setEffects} />
        ) : type === 'font' ? (
          <div>
            <span className="text-[11px] uppercase tracking-wider text-white/45">Font family</span>
            <div className="mt-2">
              <FontPicker value={lv} onChange={setLv} usedFonts={usedFonts} />
            </div>
          </div>
        ) : type === 'tailwind' ? (
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/45">Value</span>
            <TwClassInput value={lv} onChange={setLv} />
          </label>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-white/45">
                {darkMode ? 'Light value' : 'Value'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!darkMode) { setDv(lv); }
                  setDarkMode(d => !d);
                }}
                className={cn(
                  'flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded border transition-colors',
                  darkMode
                    ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                    : 'border-white/[0.08] text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', darkMode ? 'bg-sky-400' : 'bg-white/30')} />
                Dark mode
              </button>
            </div>
            {([darkMode ? (['light', 'dark'] as const) : (['light'] as const)][0]).map((m) => {
              const val = m === 'light' ? lv : dv;
              const set = m === 'light' ? setLv : setDv;
              return (
                <label key={m} className="block">
                  {darkMode && (
                    <span className="text-[10px] text-white/30 mb-1 block">
                      {m === 'light' ? '☀ Light' : '☽ Dark'}
                    </span>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={val.startsWith('#') ? val : (val ? hslToHex(val) : '#000000')}
                      onChange={(e) => set(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-white/[0.08] p-0.5"
                    />
                    <input
                      type="text"
                      className="flex-1 px-2.5 py-1.5 text-sm border border-white/[0.08] rounded-md bg-white/[0.03] text-white/90 placeholder-white/30 focus:outline-none focus:border-accent/60 font-mono"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder="#FF0000 or 222 47% 11%"
                    />
                  </div>
                </label>
              );
            })}
          </>
        )}


        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/45">Description</span>
          <textarea
            className="mt-1 w-full px-2.5 py-1.5 text-sm border border-white/[0.08] rounded-md bg-white/[0.03] text-white/90 placeholder-white/30 focus:outline-none focus:border-accent/60"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Optional…"
            rows={2}
          />
        </label>

        {err && <p className="text-xs text-rose-400">{err}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md text-white/70 hover:bg-white/[0.06] hover:text-white/95 transition-colors">Cancel</button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-3 py-1.5 text-xs bg-accent text-neutral-900 rounded-md hover:bg-amber-400 disabled:opacity-50 font-medium"
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
  const loadCols = useCallback(async () => {
    const r = await fetch('/api/variable-collections');
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || 'Failed to load');
    const list: Col[] = Array.isArray(data) ? data : [];
    setCols(list);
    setActive((prev) => list.find((c) => c.id === prev?.id) ?? list[0] ?? null);
  }, []);

  useEffect(() => { loadCols().catch((e) => setErr(String(e))); }, [loadCols]);

  // helpers to keep local state in sync without router.refresh()
  const updateCols = (next: Col[]) => { setCols(next); };

  // ── Collection CRUD ──────────────────────────────────────────────────────
  const saveCol = useCallback(async (data: any) => {
    if (data.id) {
      const { id, ...patch } = data;
      const res = await fetch(`/api/variable-collections/${id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(typeof j.error === 'string' ? j.error : (j.error?.message ?? 'Failed to save')); }
      const updated: Col = { ...(cols.find(c => c.id === id) ?? {}), ...patch, id } as Col;
      const next = cols.map((c) => c.id === id ? updated : c);
      updateCols(next);
      setActive(updated);
    } else {
      const res = await fetch('/api/variable-collections', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg: string = typeof json.error === 'string' ? json.error : (json.error?.message ?? '');
        if (msg.includes('Unique constraint')) { await loadCols(); throw new Error('A collection with that name already exists'); }
        throw new Error(msg || 'Failed to create collection');
      }
      const created: Col = { ...json, variables: [] };
      const next = [...cols, created];
      updateCols(next);
      setActive(created);
    }
  }, [cols, loadCols]);

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

  const totalVars = cols.reduce((s, c) => s + c.variables.length, 0);
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <ScreenHeader
        title="Design variables"
        chips={<>
          <Chip tone="accent">{cols.length} collection{cols.length === 1 ? '' : 's'}</Chip>
          <Chip tone="accent">{totalVars} variable{totalVars === 1 ? '' : 's'}</Chip>
        </>}
      />


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
                <span className="flex-1 truncate">{fmtColName(c.name)}</span>
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
                    className={cn('p-0.5 rounded transition-colors', active?.id === c.id ? 'hover:bg-rose-500/10 text-rose-400 hover:text-rose-300' : 'hover:bg-rose-500/10 text-red-600 hover:text-red-500')}
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
                <p className="font-semibold text-sm">{fmtColName(active.name)}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">{active.variables.length} variables</p>
              </div>
              <button
                onClick={() => { setSelVar(null); setVarModal('new'); }}
                className="px-3 py-1.5 text-sm bg-accent text-neutral-900 rounded-md hover:bg-amber-400 font-medium transition-colors"
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
                className="px-4 py-2 text-sm bg-accent text-neutral-900 rounded-md hover:bg-amber-400 font-medium transition-colors"
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

              {selVar.type === 'effect' && isEffectArray(selVar.value) && (() => {
                const css = effectsToCss(selVar.value);
                const tw = effectsToTailwind(selVar.value);
                return (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400">Layers</p>
                      <ul className="mt-1 space-y-0.5">
                        {(selVar.value as Effect[]).map((e, i) => (
                          <li key={i} className="text-[11px] text-neutral-600 flex items-center gap-1.5">
                            {e.visible ? <Eye className="w-3 h-3 text-neutral-400" /> : <EyeOff className="w-3 h-3 text-neutral-300" />}
                            <span className={cn(!e.visible && 'line-through text-neutral-400')}>{effectKindLabel(e.kind)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400">Tailwind</p>
                      <code className="mt-1 block text-[11px] text-neutral-700 font-mono break-all">{tw || '—'}</code>
                    </div>
                    <div className="h-20 rounded-md bg-neutral-100 border border-neutral-200 relative overflow-hidden flex items-center justify-center">
                      <div
                        className="w-12 h-12 rounded bg-white"
                        style={{
                          boxShadow:      css.boxShadow || undefined,
                          filter:         css.filter || undefined,
                          backdropFilter: css.backdropFilter || undefined,
                        }}
                      />
                    </div>
                    <details className="text-[11px] text-neutral-500">
                      <summary className="cursor-pointer hover:text-neutral-700">Show CSS</summary>
                      <div className="mt-1 space-y-1 font-mono">
                        {css.boxShadow      && <p><span className="text-neutral-400">box-shadow:</span> {css.boxShadow}</p>}
                        {css.filter         && <p><span className="text-neutral-400">filter:</span> {css.filter}</p>}
                        {css.backdropFilter && <p><span className="text-neutral-400">backdrop-filter:</span> {css.backdropFilter}</p>}
                      </div>
                    </details>
                    <Link href="/docs/effects/drop-shadows-and-blurs" className="text-[11px] text-accent hover:underline inline-block">
                      How effects map to Tailwind →
                    </Link>
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

              <div className="flex gap-2 pt-4 border-t border-white/10">
                <button
                  onClick={() => setVarModal('edit')}
                  className="flex-1 px-3 py-2 text-sm bg-accent text-neutral-900 rounded-md hover:bg-amber-400 font-medium transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteVar(selVar.id)}
                  className="px-3 py-2 text-sm rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-200 transition-colors"
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
