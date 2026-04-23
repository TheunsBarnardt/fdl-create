'use client';
import { useMemo, useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Save, Sun, Moon, Sparkles, Link2, Search, ChevronDown, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTwHint } from '@/lib/tailwind-classes';
import { loadGoogleFont } from '@/lib/google-fonts-list';

type Scope = 'both' | 'admin' | 'published';
type Mode = 'light' | 'dark';

type Tokens = {
  scope: Scope;
  mode: Mode;
  colorBindings: Record<string, { light: string; dark: string }>;
  radius: number;
  fontBindings: Record<string, string>; // { body: 'Inter', display: 'Fraunces', mono: 'JetBrains Mono', … }
  // Dynamic type scale: element → variable group path
  typeBindings: Record<string, string>; // { h1: 'display-2xl/book', p: 'body/regular', … }
};

type Theme = { id?: string; name: string; tokens: any; isDefault: boolean };
type Preset = { id: string; name: string; tokens: any; custom: boolean };

// ── Variable linking ──────────────────────────────────────────────────────────
type VarItem = { id: string; name: string; type: string; value: string | { light: string; dark: string }; collectionLabel?: string };

function isVarRef(val: string) { return val.startsWith('{') && val.endsWith('}'); }
function makeVarRef(name: string) { return `{${name}}`; }
function parseVarRef(val: string) { return val.slice(1, -1); }

function resolveVarValue(v: VarItem, mode: 'light' | 'dark'): string {
  if (typeof v.value === 'string') return v.value;
  return mode === 'dark' ? v.value.dark : v.value.light;
}

function resolveColor(val: string, vars: VarItem[], mode: 'light' | 'dark'): string {
  if (!isVarRef(val)) return val;
  const name = parseVarRef(val);
  const found = vars.find((v) => v.name === name);
  return found ? resolveVarValue(found, mode) : '0 0% 50%';
}


const DEFAULT_COLOR_BINDINGS: Record<string, { light: string; dark: string }> = {
  background:  { light: '0 0% 100%',   dark: '222 47% 11%' },
  foreground:  { light: '222 47% 11%', dark: '210 40% 98%' },
  primary:     { light: '222 47% 11%', dark: '210 40% 98%' },
  secondary:   { light: '210 40% 96%', dark: '217 33% 17%' },
  accent:      { light: '210 40% 96%', dark: '217 33% 17%' },
  muted:       { light: '210 40% 96%', dark: '217 33% 17%' },
  destructive: { light: '0 84% 60%',   dark: '0 84% 60%'  },
  border:      { light: '214 32% 91%', dark: '217 33% 17%' },
  ring:        { light: '222 47% 11%', dark: '212 27% 84%' },
};

const DEFAULT_TOKENS: Tokens = {
  scope: 'both',
  mode: 'light',
  colorBindings: DEFAULT_COLOR_BINDINGS,
  radius: 0.5,
  fontBindings: { body: 'Inter', display: 'Fraunces', mono: 'JetBrains Mono' },
  typeBindings: {},
};

function hslToHex(hsl: string): string {
  try {
    const parts = hsl.trim().split(/\s+/);
    const h = parseFloat(parts[0] || '0');
    const s = parseFloat(parts[1] || '0');
    const l = parseFloat(parts[2] || '0');
    if (isNaN(h) || isNaN(s) || isNaN(l)) return '#000000';
    const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l / 100 - c / 2;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
    else if (h >= 60 && h < 120) [r, g, b] = [x, c, 0];
    else if (h >= 120 && h < 180) [r, g, b] = [0, c, x];
    else if (h >= 180 && h < 240) [r, g, b] = [0, x, c];
    else if (h >= 240 && h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const toHex = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return '#000000';
  }
}

function hexToHsl(hex: string): string {
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
  } catch {
    return '0 0% 0%';
  }
}

const PRESETS: Record<string, Record<string, string>> = {
  slate:    { primary: '222 47% 11%',   secondary: '210 40% 96%',  accent: '210 40% 96%',  muted: '210 40% 96%',  border: '214 32% 91%',  ring: '222 47% 11%' },
  stone:    { primary: '24 10% 10%',    secondary: '60 5% 96%',    accent: '60 5% 96%',    muted: '60 5% 96%',    border: '20 6% 90%',    ring: '24 10% 10%' },
  zinc:     { primary: '240 6% 10%',    secondary: '240 5% 96%',   accent: '240 5% 96%',   muted: '240 5% 96%',   border: '240 6% 90%',   ring: '240 6% 10%' },
  neutral:  { primary: '0 0% 9%',       secondary: '0 0% 96%',     accent: '0 0% 96%',     muted: '0 0% 96%',     border: '0 0% 89%',     ring: '0 0% 9%' },
  rose:     { primary: '346 77% 49%',   secondary: '350 100% 96%', accent: '350 100% 96%', muted: '355 100% 97%', border: '350 50% 90%',  ring: '346 77% 49%' },
  blue:     { primary: '221 83% 53%',   secondary: '210 100% 96%', accent: '210 100% 96%', muted: '213 100% 97%', border: '214 95% 90%',  ring: '221 83% 53%' },
  green:    { primary: '142 72% 29%',   secondary: '138 76% 96%',  accent: '138 76% 96%',  muted: '138 76% 97%',  border: '142 43% 88%',  ring: '142 72% 29%' },
  violet:   { primary: '262 83% 58%',   secondary: '270 100% 97%', accent: '270 100% 97%', muted: '270 100% 98%', border: '270 50% 92%',  ring: '262 83% 58%' },
  otto1890: { primary: '12 84% 40%',    secondary: '40 50% 92%',   accent: '43 74% 52%',   muted: '40 30% 94%',   border: '36 28% 82%',   ring: '12 84% 40%' }
};

const DARK_PRESETS: Record<string, Record<string, string>> = {
  slate:    { darkBackground: '222 47% 11%', darkForeground: '210 40% 98%', darkPrimary: '210 40% 98%', darkSecondary: '217 33% 17%', darkAccent: '217 33% 17%', darkMuted: '217 33% 17%', darkBorder: '217 33% 17%', darkRing: '212 27% 84%' },
  stone:    { darkBackground: '20 14% 9%',   darkForeground: '60 9% 98%',   darkPrimary: '60 9% 98%',   darkSecondary: '12 6% 15%',   darkAccent: '12 6% 15%',   darkMuted: '12 6% 15%',   darkBorder: '12 6% 15%',   darkRing: '24 6% 83%' },
  zinc:     { darkBackground: '240 10% 4%',  darkForeground: '0 0% 98%',    darkPrimary: '0 0% 98%',    darkSecondary: '240 4% 16%',  darkAccent: '240 4% 16%',  darkMuted: '240 4% 16%',  darkBorder: '240 4% 16%',  darkRing: '240 5% 84%' },
  neutral:  { darkBackground: '0 0% 9%',     darkForeground: '0 0% 98%',    darkPrimary: '0 0% 98%',    darkSecondary: '0 0% 15%',    darkAccent: '0 0% 15%',    darkMuted: '0 0% 15%',    darkBorder: '0 0% 15%',    darkRing: '0 0% 84%' },
  rose:     { darkBackground: '20 14% 5%',   darkForeground: '0 0% 98%',    darkPrimary: '346 77% 65%', darkSecondary: '346 10% 15%', darkAccent: '346 10% 15%', darkMuted: '346 10% 15%', darkBorder: '346 10% 18%', darkRing: '346 77% 65%' },
  blue:     { darkBackground: '222 47% 7%',  darkForeground: '210 40% 98%', darkPrimary: '217 91% 60%', darkSecondary: '217 25% 15%', darkAccent: '217 25% 15%', darkMuted: '217 25% 15%', darkBorder: '217 25% 18%', darkRing: '217 91% 60%' },
  green:    { darkBackground: '150 60% 5%',  darkForeground: '150 80% 98%', darkPrimary: '142 71% 45%', darkSecondary: '142 20% 14%', darkAccent: '142 20% 14%', darkMuted: '142 20% 14%', darkBorder: '142 20% 17%', darkRing: '142 71% 45%' },
  violet:   { darkBackground: '260 47% 7%',  darkForeground: '270 100% 98%',darkPrimary: '262 83% 68%', darkSecondary: '262 25% 15%', darkAccent: '262 25% 15%', darkMuted: '262 25% 15%', darkBorder: '262 25% 18%', darkRing: '262 83% 68%' },
  otto1890: { darkBackground: '20 15% 8%',   darkForeground: '40 30% 92%',  darkPrimary: '12 84% 55%',  darkSecondary: '30 20% 15%',  darkAccent: '43 70% 45%',  darkMuted: '30 20% 15%',  darkBorder: '30 20% 18%',  darkRing: '12 84% 55%' },
};

const PRESET_SWATCHES: Record<string, { label: string; fg: string; bg: string; bgBorder?: string }> = {
  slate:    { label: 'Slate',     fg: '#0f172a',  bg: '#f1f5f9',  bgBorder: '#e2e8f0' },
  stone:    { label: 'Stone',     fg: '#1c1917',  bg: '#f5f5f4',  bgBorder: '#e7e5e4' },
  zinc:     { label: 'Zinc',      fg: '#18181b',  bg: '#f4f4f5',  bgBorder: '#e4e4e7' },
  rose:     { label: 'Rose',      fg: '#e11d48',  bg: '#fff1f2',  bgBorder: '#fecdd3' },
  blue:     { label: 'Blue',      fg: '#2563eb',  bg: '#eff6ff',  bgBorder: '#bfdbfe' },
  green:    { label: 'Green',     fg: '#16a34a',  bg: '#f0fdf4',  bgBorder: '#bbf7d0' },
  violet:   { label: 'Violet',    fg: '#7c3aed',  bg: '#f5f3ff',  bgBorder: '#ddd6fe' },
  neutral:  { label: 'Neutral',   fg: '#171717',  bg: '#f5f5f5',  bgBorder: '#e5e5e5' },
  otto1890: { label: 'Otto 1890', fg: '#c1440e',  bg: '#f5ecd9',  bgBorder: '#e7d9b8' }
};

function normalizeTokens(raw: any): Tokens {
  const merged = { ...DEFAULT_TOKENS, ...(raw && typeof raw === 'object' ? raw : {}) };
  // Migrate flat color fields to colorBindings if missing
  if (!merged.colorBindings || typeof merged.colorBindings !== 'object') {
    const cb: Record<string, { light: string; dark: string }> = { ...DEFAULT_COLOR_BINDINGS };
    for (const role of ['background','foreground','primary','secondary','accent','muted','destructive','border','ring']) {
      if (raw?.[role] !== undefined) cb[role] = { ...cb[role], light: raw[role] };
      const dk = `dark${role.charAt(0).toUpperCase()}${role.slice(1)}`;
      if (raw?.[dk] !== undefined) cb[role] = { ...cb[role], dark: raw[dk] };
    }
    merged.colorBindings = cb;
  }
  if (!merged.typeBindings || typeof merged.typeBindings !== 'object') merged.typeBindings = {};
  if (!merged.fontBindings || typeof merged.fontBindings !== 'object') {
    merged.fontBindings = {
      body:    merged.fontBody    ?? 'Inter',
      display: merged.fontDisplay ?? 'Fraunces',
      mono:    merged.fontMono    ?? 'JetBrains Mono',
    };
  }
  return merged;
}

// ── Type scale helpers ────────────────────────────────────────────────────────

const COMMON_ELEMENTS = ['h1','h2','h3','h4','h5','h6','p','a','label','small','code','blockquote','caption'];

const ALL_ELEMENTS = [
  // Document structure
  'body','main','section','article','header','footer','nav','aside','div','span',
  // Headings
  'h1','h2','h3','h4','h5','h6',
  // Text content
  'p','a','strong','em','b','i','mark','del','ins','sub','sup','s','u','small',
  'abbr','acronym','cite','dfn','time','address','bdi','bdo','wbr',
  // Inline semantic
  'q','blockquote','pre','code','kbd','samp','var','data',
  // Lists
  'ul','ol','li','dl','dt','dd','menu',
  // Media & figures
  'figure','figcaption','picture','img','video','audio','canvas','svg',
  // Forms & inputs
  'form','fieldset','legend','label','input','textarea','select','option','optgroup','button','datalist','output','progress','meter',
  // Tables
  'table','thead','tbody','tfoot','tr','th','td','caption','colgroup','col',
  // Interactive
  'details','summary','dialog','iframe','embed','object',
  // Other semantic
  'hgroup','search','noscript',
];

function ElementSearchInput({ existing, onAdd }: { existing: string[]; onAdd: (el: string) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const suggestions = ALL_ELEMENTS.filter(e => !existing.includes(e) && (!query || e.includes(query.toLowerCase())));

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function pick(el: string) { onAdd(el); setQuery(''); setOpen(false); }

  return (
    <div ref={ref} className="relative">
      <input
        className="text-[11px] font-mono px-2 py-1.5 border border-dashed border-neutral-200 rounded w-full focus:outline-none focus:border-accent placeholder:text-neutral-400"
        placeholder="Search element… (body, section, button…)"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' && query.trim()) {
            pick(query.trim());
          }
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 top-full mt-0.5 bg-white border border-neutral-200 rounded-md shadow-lg max-h-52 overflow-auto py-0.5 w-full">
          {suggestions.map(e => (
            <li
              key={e}
              className="px-3 py-1.5 text-[11px] font-mono font-normal cursor-pointer hover:bg-neutral-50"
              onMouseDown={ev => { ev.preventDefault(); pick(e); }}
            >
              {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Font binding helpers ──────────────────────────────────────────────────────

const FONT_ROLES = ['body','display','mono','heading','ui','code','caption','label','brand'];

function FontValuePicker({ value, onChange, fontVars }: {
  value: string; onChange: (v: string) => void; fontVars: VarItem[];
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const options = fontVars.filter(v => {
    const family = typeof v.value === 'string' ? v.value : '';
    return !query || family.toLowerCase().includes(query.toLowerCase()) || v.name.toLowerCase().includes(query.toLowerCase());
  });

  useEffect(() => {
    fontVars.forEach(v => { if (typeof v.value === 'string' && v.value) loadGoogleFont(v.value); });
  }, [fontVars]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn('w-full flex items-center justify-between px-2 py-1 border rounded text-[11px] hover:border-neutral-300 transition-colors', value ? 'border-neutral-200' : 'border-dashed border-neutral-300 text-neutral-400')}
        style={{ fontFamily: value || 'inherit' }}
      >
        <span className="truncate">{value || 'pick font…'}</span>
        <ChevronDown className="w-3 h-3 shrink-0 text-neutral-400 ml-1" />
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-0.5 w-full min-w-[200px] bg-white border border-neutral-200 rounded-md shadow-lg">
          <div className="p-1.5 border-b border-neutral-100">
            <input
              autoFocus
              className="w-full px-2 py-1 text-[11px] border border-neutral-200 rounded focus:outline-none"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search or type family name…"
            />
          </div>
          <ul className="max-h-48 overflow-auto py-0.5">
            {options.map(v => {
              const family = typeof v.value === 'string' ? v.value : '';
              return (
                <li
                  key={v.id}
                  className={cn('px-3 py-2 cursor-pointer', value === family ? 'bg-sky-50' : 'hover:bg-neutral-50')}
                  onMouseDown={e => { e.preventDefault(); onChange(family); setOpen(false); setQuery(''); }}
                >
                  <span className="text-sm block" style={{ fontFamily: family }}>{family}</span>
                  <span className="text-[9px] text-neutral-400 font-mono">{v.name}</span>
                </li>
              );
            })}
            {query && !options.some(v => (typeof v.value === 'string' ? v.value : '') === query) && (
              <li
                className="px-3 py-2 cursor-pointer hover:bg-neutral-50 text-[11px] text-neutral-500 italic"
                onMouseDown={e => { e.preventDefault(); onChange(query); setOpen(false); setQuery(''); }}
              >
                Use &ldquo;{query}&rdquo; directly
              </li>
            )}
            {options.length === 0 && !query && (
              <li className="px-3 py-3 text-[11px] text-neutral-400 text-center">No font variables — add fonts in Variables</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function FontRoleInput({ existing, onAdd }: { existing: string[]; onAdd: (role: string) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const suggestions = FONT_ROLES.filter(r => !existing.includes(r) && (!query || r.includes(query.toLowerCase())));

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        className="text-[11px] font-mono px-2 py-1.5 border border-dashed border-neutral-200 rounded w-full focus:outline-none focus:border-accent placeholder:text-neutral-400"
        placeholder="Add font role… (heading, ui, brand…)"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' && query.trim()) { onAdd(query.trim()); setQuery(''); setOpen(false); }
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 top-full mt-0.5 bg-white border border-neutral-200 rounded-md shadow-lg max-h-52 overflow-auto py-0.5 w-full">
          {suggestions.map(r => (
            <li
              key={r}
              className="px-3 py-1.5 text-[11px] font-mono font-normal cursor-pointer hover:bg-neutral-50"
              onMouseDown={ev => { ev.preventDefault(); onAdd(r); setQuery(''); setOpen(false); }}
            >
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function resolveToCssValue(v: VarItem): string {
  const raw = typeof v.value === 'string' ? v.value : (v.value as any).light ?? '';
  if (v.type === 'tailwind') {
    const hint = getTwHint(raw);
    if (!hint) return raw;
    const firstPart = hint.split(';')[0].split('/')[0].trim();
    const idx = firstPart.indexOf(':');
    return idx >= 0 ? firstPart.slice(idx + 1).trim() : raw;
  }
  return raw;
}

function buildBindingStyles(groupPath: string, allVars: VarItem[]): CSSProperties {
  if (!groupPath) return {};
  const styles: Record<string, string> = {};
  for (const gv of allVars) {
    const parts = gv.name.split('/');
    if (parts.slice(0, -1).join('/') !== groupPath) continue;
    const prop = parts[parts.length - 1];
    const val = resolveToCssValue(gv);
    if (val) (styles as any)[prop.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())] = val;
  }
  return styles as CSSProperties;
}

// ── GroupSelector ─────────────────────────────────────────────────────────────

function GroupSelector({ value, onChange, groups, allVars }: {
  value: string; onChange: (v: string) => void; groups: string[]; allVars: VarItem[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const filtered = groups.filter(g => !search || g.toLowerCase().includes(search.toLowerCase()));
  const preview = value ? allVars.filter(v => v.name.split('/').slice(0, -1).join('/') === value) : [];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn('w-full flex items-center justify-between px-2 py-1 border rounded text-[11px] font-mono hover:border-neutral-300 transition-colors', value ? 'border-neutral-200' : 'border-dashed border-neutral-300 text-neutral-400')}
      >
        <span className="truncate">{value || 'assign group…'}</span>
        <ChevronDown className="w-3 h-3 shrink-0 text-neutral-400 ml-1" />
      </button>
      {value && preview.length > 0 && (
        <div className="mt-0.5 flex flex-wrap gap-1">
          {preview.map(v => (
            <span key={v.id} className="text-[9px] bg-neutral-100 rounded px-1 py-0.5 font-mono text-neutral-500">
              {v.name.split('/').pop()}: <span className="text-neutral-700">{typeof v.value === 'string' ? v.value : (v.value as any).light}</span>
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="absolute z-50 left-0 top-full mt-0.5 w-full min-w-[200px] bg-white border border-neutral-200 rounded-md shadow-lg">
          <div className="p-1.5 border-b border-neutral-100">
            <input
              autoFocus
              className="w-full px-2 py-1 text-[11px] border border-neutral-200 rounded focus:outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search groups…"
            />
          </div>
          <ul className="max-h-44 overflow-auto py-0.5">
            {filtered.map(g => (
              <li
                key={g}
                className={cn('px-3 py-1.5 text-[11px] font-mono cursor-pointer', value === g ? 'bg-sky-50 text-sky-700 font-medium' : 'hover:bg-neutral-50')}
                onMouseDown={e => { e.preventDefault(); onChange(g); setOpen(false); setSearch(''); }}
              >
                {g}
              </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-3 text-[11px] text-neutral-400 text-center">No variable groups found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

const ALL_COLOR_ROLES = [
  'background','foreground','card','card-foreground','popover','popover-foreground',
  'primary','primary-foreground','secondary','secondary-foreground',
  'muted','muted-foreground','accent','accent-foreground',
  'destructive','destructive-foreground','border','input','ring',
  'success','success-foreground','warning','warning-foreground',
  'info','info-foreground','surface','surface-foreground',
  'sidebar','sidebar-border','sidebar-foreground',
  'chart-1','chart-2','chart-3','chart-4','chart-5',
];

function ColorRoleInput({ existing, onAdd }: { existing: string[]; onAdd: (role: string) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const suggestions = ALL_COLOR_ROLES.filter(r => !existing.includes(r) && (!query || r.includes(query.toLowerCase())));
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <input
        className="text-[11px] font-mono px-2 py-1.5 border border-dashed border-neutral-200 rounded w-full focus:outline-none focus:border-accent placeholder:text-neutral-400"
        placeholder="Add color role… (card, sidebar, chart-1…)"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' && query.trim()) { onAdd(query.trim()); setQuery(''); setOpen(false); }
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 top-full mt-0.5 bg-white border border-neutral-200 rounded-md shadow-lg max-h-52 overflow-auto py-0.5 w-full">
          {suggestions.map(r => (
            <li
              key={r}
              className="px-3 py-1.5 text-[11px] font-mono font-normal cursor-pointer hover:bg-neutral-50"
              onMouseDown={ev => { ev.preventDefault(); onAdd(r); setQuery(''); setOpen(false); }}
            >
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ThemeStudio({
  themes, initial
}: {
  themes: Array<{ id: string; name: string; isDefault: boolean; tokens: any }>;
  initial: Theme;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initial.id ?? null);
  const [name, setName] = useState(initial.name);
  const [tokens, setTokens] = useState<Tokens>(normalizeTokens(initial.tokens));
  const [isDefault, setIsDefault] = useState(initial.isDefault);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string>('slate');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [claudeOn, setClaudeOn] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({
    presets: true, colors: true, radius: false, fonts: false, typography: false, claude: false,
  });
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const [allVars, setAllVars] = useState<VarItem[]>([]);
  const colorVars = useMemo(() => allVars.filter(v => v.type === 'color'), [allVars]);
  const typeVars  = useMemo(() => allVars.filter(v => v.type === 'tailwind'), [allVars]);
  const fontVars  = useMemo(() => allVars.filter(v => v.type === 'font'), [allVars]);
  const varGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const v of typeVars) {
      const parts = v.name.split('/');
      if (parts.length >= 2) groups.add(parts.slice(0, -1).join('/'));
    }
    return Array.from(groups).sort();
  }, [typeVars]);
  const [varPickerOpen, setVarPickerOpen] = useState<string | null>(null);
  const [varSearch, setVarSearch] = useState('');

  // Load presets and all variables — also re-fetch when tab becomes visible (handles HMR stale state)
  const loadVars = useCallback(async () => {
    try {
      const [presetsRes, varsRes] = await Promise.all([
        fetch('/api/presets'),
        fetch('/api/variable-collections'),
      ]);
      if (presetsRes.ok) setPresets(await presetsRes.json());
      if (varsRes.ok) {
        const cols = await varsRes.json();
        const all: VarItem[] = (Array.isArray(cols) ? cols : []).flatMap(
          (col: any) => (col.variables ?? []).map((v: any) => ({ ...v, collectionLabel: col.label || col.name || 'Variables' }))
        );
        setAllVars(all);
      }
    } catch (e) {
      console.error('Failed to load', e);
    }
  }, []);

  useEffect(() => {
    loadVars();
    const onVisible = () => { if (document.visibilityState === 'visible') loadVars(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadVars]);

  const loadTheme = (t: typeof themes[number]) => {
    setSelectedId(t.id);
    setActivePreset(t.id);
    setName(t.name);
    setTokens(normalizeTokens(t.tokens));
    setIsDefault(t.isDefault);
  };

  const applyPreset = (key: string, isCustom = false) => {
    if (isCustom) {
      const preset = presets.find((p) => p.id === key);
      if (!preset) return;
      setTokens(normalizeTokens({ ...tokens, ...preset.tokens }));
    } else {
      const lp = PRESETS[key] || {};
      const dp = DARK_PRESETS[key] || {};
      setTokens(t => {
        const cur = t.colorBindings || {};
        const nb: Record<string, { light: string; dark: string }> = {};
        for (const [role, binding] of Object.entries(cur)) {
          nb[role] = {
            light: isVarRef(binding.light) ? (DEFAULT_COLOR_BINDINGS[role]?.light ?? binding.light) : binding.light,
            dark:  isVarRef(binding.dark)  ? (DEFAULT_COLOR_BINDINGS[role]?.dark  ?? binding.dark)  : binding.dark,
          };
        }
        for (const [role, val] of Object.entries(lp)) {
          if (typeof val === 'string') nb[role] = { ...(nb[role] || { light: '', dark: '' }), light: val };
        }
        for (const [dk, val] of Object.entries(dp)) {
          if (typeof val === 'string' && dk.startsWith('dark')) {
            const role = dk.charAt(4).toLowerCase() + dk.slice(5);
            nb[role] = { ...(nb[role] || { light: '', dark: '' }), dark: val };
          }
        }
        return { ...t, colorBindings: nb };
      });
    }
    setActivePreset(key);
  };

  const allPresets = useMemo(() => {
    const hardcoded = Object.entries(PRESET_SWATCHES).map(([key, swatch]) => ({
      id: key,
      name: swatch.label,
      tokens: tokens.mode === 'dark' ? DARK_PRESETS[key] : PRESETS[key],
      custom: false,
    }));
    const custom = presets.map((p) => ({ ...p, custom: true }));
    return [...hardcoded, ...custom];
  }, [presets, tokens.mode]);

  async function saveAsPreset() {
    if (!presetName.trim()) return;
    setSavingPreset(true);
    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: presetName,
          tokens: { colorBindings: tokens.colorBindings }
        })
      });
      if (res.ok) {
        const newPreset = await res.json();
        setPresets((p) => [...p, newPreset]);
        setShowPresetModal(false);
        setPresetName('');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingPreset(false);
    }
  }

  async function deletePreset(id: string) {
    if (!confirm('Delete this preset?')) return;
    try {
      await fetch(`/api/presets/${id}`, { method: 'DELETE' });
      setPresets((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      setError(String(e));
    }
  }

  const getRawColor = (role: string): string =>
    (tokens.colorBindings?.[role] as any)?.[tokens.mode === 'dark' ? 'dark' : 'light'] ?? '';

  const getColor = (role: string): string =>
    resolveColor(getRawColor(role), colorVars, tokens.mode);

  const setColor = (role: string, value: string) =>
    setTokens(t => ({
      ...t,
      colorBindings: {
        ...t.colorBindings,
        [role]: { ...(t.colorBindings?.[role] || { light: '', dark: '' }), [t.mode]: value }
      }
    }));

  const setMode = (mode: Mode) => setTokens({ ...tokens, mode });
  const setScope = (scope: Scope) => setTokens({ ...tokens, scope });

  const cssVars = useMemo(() => {
    const bindings = tokens.colorBindings || {};
    const m = tokens.mode === 'dark' ? 'dark' : 'light';
    const rc = (role: string) => {
      const raw = (bindings[role] as any)?.[m] ?? '';
      const resolved = resolveColor(raw, colorVars, tokens.mode);
      return resolved.startsWith('#') ? hexToHsl(resolved) : resolved;
    };
    return {
      '--bg': rc('background'),
      '--fg': rc('foreground'),
      '--card': rc('background'),
      '--card-fg': rc('foreground'),
      '--primary': rc('primary'),
      '--primary-fg': rc('background'),
      '--secondary': rc('secondary'),
      '--secondary-fg': rc('foreground'),
      '--muted': rc('muted'),
      '--muted-fg': tokens.mode === 'dark' ? '215 20% 65%' : '215 16% 47%',
      '--accent': rc('accent'),
      '--accent-fg': rc('foreground'),
      '--destructive': rc('destructive'),
      '--destructive-fg': '210 40% 98%',
      '--border': rc('border'),
      '--input': rc('border'),
      '--ring': rc('ring'),
      '--radius': `${tokens.radius}rem`,
      '--theme-font': tokens.fontBindings?.body ?? 'Inter',
    } as CSSProperties;
  }, [tokens, colorVars]);

  const cssSource = useMemo(() => {
    const bindings = Object.entries(tokens.colorBindings || {});
    const lightLines = bindings.map(([role, b]) => `  --${role}: ${b.light};`);
    const darkLines  = bindings.map(([role, b]) => `  --${role}: ${b.dark};`);
    return [
      ':root {',
      ...lightLines,
      `  --radius: ${tokens.radius}rem;`,
      '}',
      '',
      '.dark {',
      ...darkLines,
      '}',
    ].join('\n');
  }, [tokens]);

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(cssSource);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1200);
    } catch {
      /* ignore */
    }
  }

  const newTheme = () => {
    setSelectedId(null);
    setName('New theme');
    setTokens({ ...DEFAULT_TOKENS });
    setIsDefault(false);
    setActivePreset('slate');
  };

  async function saveName() {
    if (!selectedId || !name.trim()) return;
    await fetch(`/api/themes/${selectedId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    router.refresh();
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        selectedId ? `/api/themes/${selectedId}` : '/api/themes',
        {
          method: selectedId ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, tokens, isDefault })
        }
      );
      const saved = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(saved.error));
      if (!selectedId && saved.id) setSelectedId(saved.id);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!selectedId || !confirm('Delete theme?')) return;
    await fetch(`/api/themes/${selectedId}`, { method: 'DELETE' });
    newTheme();
    router.refresh();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <header className="h-14 border-b border-neutral-200 bg-white/60 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-900 shrink-0">Workspace</Link>
          <span className="text-xs text-neutral-400 shrink-0">›</span>
          <div className="display text-lg shrink-0">Theme studio</div>
          <span className="text-xs text-neutral-400 shrink-0">›</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
            className="text-sm bg-transparent outline-none focus:bg-neutral-100 px-1.5 py-0.5 rounded min-w-0 max-w-[160px]"
          />
          <span className="chip bg-accent-soft text-accent">System-wide</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="inline-flex items-center bg-neutral-100 rounded-md p-0.5">
            {(['both', 'admin', 'published'] as Scope[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  'px-2.5 py-1 rounded transition-colors',
                  tokens.scope === s ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                )}
              >
                {s === 'both' ? 'Both surfaces' : s === 'admin' ? 'Admin UI' : 'Published pages'}
              </button>
            ))}
          </div>
          <span className="w-px h-5 bg-neutral-200" />
          <div className="inline-flex items-center bg-neutral-100 rounded-md p-0.5">
            <button
              onClick={() => setMode('light')}
              className={cn(
                'px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors',
                tokens.mode === 'light' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              )}
            >
              <Sun className="w-3 h-3" /> Light
            </button>
            <button
              onClick={() => setMode('dark')}
              className={cn(
                'px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors',
                tokens.mode === 'dark' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              )}
            >
              <Moon className="w-3 h-3" /> Dark
            </button>
          </div>
          <span className="w-px h-5 bg-neutral-200" />
          <button
            onClick={copyCss}
            className="px-2.5 py-1 border border-neutral-200 rounded-md flex items-center gap-1.5 hover:border-neutral-300"
          >
            <Copy className="w-3 h-3" /> {copyState === 'copied' ? 'Copied' : 'Copy CSS'}
          </button>
          <button
            onClick={save}
            disabled={saving || !name}
            className="px-2.5 py-1 bg-neutral-900 text-white rounded-md flex items-center gap-1.5 disabled:opacity-60 shrink-0"
          >
            <Save className="w-3 h-3" /> {saving ? 'Saving…' : 'Save theme'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <aside className="w-80 border-r border-neutral-200 bg-white overflow-auto scrollbar shrink-0">
          {/* Presets — accordion */}
          <div className="border-b border-neutral-200">
            <button onClick={() => toggle('presets')} className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">Presets</span>
              <Chevron open={open.presets} />
            </button>
            {open.presets && (
              <div className="px-4 pb-4 space-y-3">
                <button
                  onClick={() => setShowPresetModal(true)}
                  className="w-full text-[11px] text-accent hover:underline text-left"
                >
                  + Save current as preset
                </button>
                <div className="grid grid-cols-3 gap-2">
                  {allPresets.filter((p) => !p.custom).map((p) => {
                    const swatch = PRESET_SWATCHES[p.id as keyof typeof PRESET_SWATCHES];
                    const fgColor = p.custom ? hslToHex((p.tokens as any).colorBindings?.primary?.light || '0 0% 0%') : swatch?.fg;
                    const bgColor = p.custom ? hslToHex((p.tokens as any).colorBindings?.background?.light || '0 0% 100%') : swatch?.bg;
                    const bgBorder = swatch?.bgBorder ?? '#e4e4e7';
                    return (
                      <div key={p.id} className="relative group">
                        <button
                          onClick={() => applyPreset(p.id, p.custom)}
                          className={cn(
                            'rounded-md p-2 text-[11px] flex flex-col items-center gap-1 border transition-colors w-full',
                            activePreset === p.id
                              ? 'border-accent ring-2 ring-accent/30'
                              : 'border-neutral-200 hover:border-accent'
                          )}
                        >
                          <div className="flex gap-0.5">
                            <span className="w-3 h-3 rounded-sm" style={{ background: fgColor }} />
                            <span className="w-3 h-3 rounded-sm" style={{ background: bgColor, border: `1px solid ${bgBorder}` }} />
                          </div>
                          <span className="truncate">{p.id === activePreset && p.custom ? name : p.name}</span>
                        </button>
                        {p.custom && (
                          <button
                            onClick={() => deletePreset(p.id)}
                            className="absolute -top-1 -right-1 hidden group-hover:block w-4 h-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Colors — always visible, mode-aware */}
          <div className="border-b border-neutral-200">
            <button onClick={() => toggle('colors')} className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                Colors · <span className={tokens.mode === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}>{tokens.mode}</span>
              </span>
              <Chevron open={open.colors} />
            </button>
            {open.colors && (
              <div className="px-4 pb-4 space-y-2.5 text-[12px]">
                {Object.entries(tokens.colorBindings || {}).map(([role]) => {
                  const raw = getRawColor(role);
                  const linked = isVarRef(raw);
                  const linkedName = linked ? parseVarRef(raw) : null;
                  const resolved = getColor(role);
                  return (
                    <div key={role} className="flex items-center justify-between gap-2">
                      <label className="mono text-[11px] text-neutral-600 shrink-0">--{role}</label>
                      <div className="flex items-center gap-1.5">
                        {linked ? (
                          <div className="flex items-center gap-1 bg-accent/10 border border-accent/30 rounded px-1.5 py-0.5">
                            <Link2 className="w-3 h-3 text-accent shrink-0" />
                            <span className="text-[10px] text-accent font-mono truncate max-w-[90px]" title={linkedName ?? ''}>
                              {linkedName?.split('/').pop()}
                            </span>
                            <button
                              onClick={() => setColor(role, resolved)}
                              className="text-accent/60 hover:text-accent ml-0.5"
                              title="Unlink variable"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <input
                            className="mono text-[11px] w-20 px-1.5 py-0.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
                            value={raw}
                            onChange={(e) => setColor(role, e.target.value)}
                          />
                        )}
                        <span
                          className="w-7 h-7 rounded shrink-0 border border-neutral-200"
                          style={{ background: resolved.startsWith('#') ? resolved : `hsl(${resolved})` }}
                        />
                        {colorVars.length > 0 && (
                          <div className="relative">
                            <button
                              onClick={() => { setVarPickerOpen(varPickerOpen === role ? null : role); setVarSearch(''); }}
                              className={cn(
                                'w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-100',
                                linked ? 'text-accent' : 'text-neutral-400 hover:text-neutral-700'
                              )}
                              title="Pick from variables"
                            >
                              <Link2 className="w-3 h-3" />
                            </button>
                            {varPickerOpen === role && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setVarPickerOpen(null)} />
                                <div className="absolute right-0 top-6 z-50 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden">
                                  <div className="px-2 py-1.5 border-b border-neutral-100 flex items-center gap-1.5">
                                    <Search className="w-3 h-3 text-neutral-400 shrink-0" />
                                    <input
                                      autoFocus
                                      placeholder="Search variables…"
                                      className="flex-1 text-[11px] outline-none bg-transparent"
                                      value={varSearch}
                                      onChange={(e) => setVarSearch(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  <div className="max-h-52 overflow-auto py-1">
                                    {(() => {
                                      const q = varSearch.toLowerCase();
                                      const filtered = colorVars.filter(v => !q || v.name.toLowerCase().includes(q));
                                      const groups = filtered.reduce<Record<string, VarItem[]>>((acc, v) => {
                                        const parts = v.name.split('/');
                                        const g = parts.length > 1
                                          ? parts[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                          : (v.collectionLabel || 'Other');
                                        (acc[g] ??= []).push(v);
                                        return acc;
                                      }, {});
                                      if (Object.keys(groups).length === 0) return (
                                        <p className="px-3 py-3 text-[11px] text-neutral-400">No results</p>
                                      );
                                      return Object.entries(groups).map(([group, vars]) => (
                                        <div key={group}>
                                          <p className="px-2 pt-2 pb-0.5 text-[9px] uppercase tracking-wider text-neutral-400">{group}</p>
                                          {vars.map((v) => {
                                            const val = resolveVarValue(v, tokens.mode);
                                            return (
                                              <button
                                                key={v.id}
                                                onClick={() => { setColor(role, makeVarRef(v.name)); setVarPickerOpen(null); setVarSearch(''); }}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-50 text-left"
                                              >
                                                <span className="text-[11px] text-neutral-700 truncate flex-1">{v.name.split('/').pop()}</span>
                                                <span className="w-4 h-4 rounded-sm shrink-0 border border-neutral-200" style={{ background: val.startsWith('#') ? val : `hsl(${val})` }} />
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                  <div className="border-t border-neutral-100 px-2 py-1">
                                    <button
                                      onClick={() => { setVarPickerOpen(null); setVarSearch(''); }}
                                      className="text-[10px] text-neutral-400 hover:text-neutral-700 w-full text-center py-0.5"
                                    >
                                      Close
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => setTokens(t => { const { [role]: _, ...rest } = t.colorBindings || {}; return { ...t, colorBindings: rest }; })}
                          className="shrink-0 text-neutral-300 hover:text-destructive transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <ColorRoleInput
                  existing={Object.keys(tokens.colorBindings || {})}
                  onAdd={role => setTokens(t => ({ ...t, colorBindings: { ...t.colorBindings, [role]: { light: '0 0% 100%', dark: '0 0% 10%' } } }))}
                />
              </div>
            )}
          </div>

          {/* Radius — accordion */}
          <div className="border-b border-neutral-200">
            <button onClick={() => toggle('radius')} className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                Radius <span className="text-neutral-500 normal-case tracking-normal ml-1">{tokens.radius.toFixed(2)}rem</span>
              </span>
              <Chevron open={open.radius} />
            </button>
            {open.radius && (
              <div className="px-4 pb-4">
                <input
                  type="range" min={0} max={16} step={1}
                  value={Math.round(tokens.radius * 16)}
                  onChange={(e) => setTokens({ ...tokens, radius: Number(e.target.value) / 16 })}
                  className="w-full accent-accent"
                />
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1">
                  <span>0</span><span>{tokens.radius.toFixed(2)}rem</span><span>1rem</span>
                </div>
              </div>
            )}
          </div>

          {/* Fonts — accordion */}
          <div className="border-b border-neutral-200">
            <button onClick={() => toggle('fonts')} className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                Fonts
                {Object.keys(tokens.fontBindings || {}).length > 0 && (
                  <span className="ml-1.5 text-neutral-500 normal-case tracking-normal font-normal">
                    {tokens.fontBindings?.body ?? ''}
                  </span>
                )}
              </span>
              <Chevron open={open.fonts} />
            </button>
            {open.fonts && (
              <div className="px-4 pb-4 space-y-2">
                {Object.entries(tokens.fontBindings || {}).map(([role, family]) => (
                  <div key={role} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-neutral-600 w-12 shrink-0">{role}</span>
                    <FontValuePicker
                      value={family}
                      onChange={f => setTokens(t => ({ ...t, fontBindings: { ...t.fontBindings, [role]: f } }))}
                      fontVars={fontVars}
                    />
                    <button
                      onClick={() => setTokens(t => {
                        const { [role]: _, ...rest } = t.fontBindings || {};
                        return { ...t, fontBindings: rest };
                      })}
                      className="shrink-0 text-neutral-300 hover:text-destructive transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <FontRoleInput
                  existing={Object.keys(tokens.fontBindings || {})}
                  onAdd={role => setTokens(t => ({ ...t, fontBindings: { ...(t.fontBindings || {}), [role]: '' } }))}
                />
              </div>
            )}
          </div>

          <div className="border-b border-neutral-200">
            <button onClick={() => toggle('typography')} className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                Typography
                {Object.keys(tokens.typeBindings || {}).length > 0 && (
                  <span className="ml-1.5 text-neutral-400 normal-case tracking-normal font-normal">
                    ({Object.keys(tokens.typeBindings).length})
                  </span>
                )}
              </span>
              <Chevron open={open.typography} />
            </button>
            {open.typography && (
              <div className="px-4 pb-4 space-y-2">
                {Object.entries(tokens.typeBindings || {}).map(([element, group]) => (
                  <div key={element} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="mono text-[11px] text-neutral-600 font-medium w-10 shrink-0">{element}</span>
                      <GroupSelector
                        value={group}
                        onChange={g => setTokens(t => ({ ...t, typeBindings: { ...t.typeBindings, [element]: g } }))}
                        groups={varGroups}
                        allVars={typeVars}
                      />
                      <button
                        onClick={() => setTokens(t => {
                          const { [element]: _, ...rest } = t.typeBindings || {};
                          return { ...t, typeBindings: rest };
                        })}
                        className="shrink-0 text-neutral-300 hover:text-destructive transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add element row */}
                <div className="pt-1">
                  <div className="text-[10px] text-neutral-400 mb-1.5">Add element</div>
                  <ElementSearchInput
                    existing={Object.keys(tokens.typeBindings || {})}
                    onAdd={el => setTokens(t => ({ ...t, typeBindings: { ...(t.typeBindings || {}), [el]: '' } }))}
                  />
                </div>

                {varGroups.length === 0 && (
                  <p className="text-[10px] text-neutral-400 italic pt-1">
                    No variable groups yet — add variables with group paths (e.g. <span className="font-mono">display-2xl/book/font-size</span>) in the Variables section.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Claude assist
              </div>
              <button
                onClick={() => setClaudeOn((v) => !v)}
                className={cn(
                  'relative w-8 h-4 rounded-full transition-colors',
                  claudeOn ? 'bg-accent' : 'bg-neutral-200'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform',
                    claudeOn ? 'translate-x-4' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Describe a mood — <i>&ldquo;warm editorial, paper background, vermilion accent&rdquo;</i> — and Claude drafts a token set. Off by default.
            </p>
          </div>
        </aside>

        <div className="flex-1 overflow-auto scrollbar bg-neutral-100 min-w-0">
          <div className="p-8">
            <div
              className={cn('theme-preview p-10 rounded-xl shadow-sm border', tokens.mode === 'dark' && 'dark')}
              style={cssVars}
            >
              <div className="mb-6">
                <div className="text-xs tp-muted uppercase tracking-wider mb-3">Typography</div>
                {Object.keys(tokens.typeBindings || {}).length === 0 ? (
                  <p className="text-[11px] tp-muted italic">No type bindings yet — assign variable groups to elements in the Typography panel.</p>
                ) : (
                  Object.entries(tokens.typeBindings || {}).map(([element, group]) => {
                    const styles = buildBindingStyles(group, typeVars);
                    return (
                      <div
                        key={element}
                        style={{ ...styles, fontFamily: tokens.fontBindings?.display ?? tokens.fontBindings?.body ?? 'inherit', marginBottom: '0.25em' }}
                      >
                        <span className="tp-muted text-[10px] font-mono normal-case mr-2" style={{ fontFamily: 'inherit', fontSize: undefined, fontWeight: undefined }}>
                          {element}
                        </span>
                        — The quick brown fox jumps over the lazy dog
                      </div>
                    );
                  })
                )}
              </div>

              <div className="tp-divider mb-8" />

              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="text-xs tp-muted uppercase tracking-wider">Components</div>
                  <h1 className="text-3xl font-semibold mt-1" style={{ letterSpacing: '-0.02em' }}>
                    Component preview
                  </h1>
                  <p className="tp-muted mt-1 text-sm">All admin UI and published pages use these tokens.</p>
                </div>
                <div className="flex gap-2">
                  <span className="tp-badge">Live</span>
                  <span className="tp-badge tp-badge-secondary">v2.4.1</span>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-xs tp-muted uppercase tracking-wider mb-2">Buttons</div>
                <div className="flex flex-wrap gap-2">
                  <button className="tp-btn-primary">Primary</button>
                  <button className="tp-btn-secondary">Secondary</button>
                  <button className="tp-btn-outline">Outline</button>
                  <button className="tp-btn-ghost">Ghost</button>
                  <button className="tp-btn-destructive">Destructive</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="tp-card p-5">
                  <div className="text-sm font-semibold mb-1">Card title</div>
                  <div className="tp-muted text-xs mb-4">A compact summary of a record or widget.</div>
                  <div className="space-y-2">
                    <input className="tp-input" placeholder="you@example.com" />
                    <input className="tp-input" placeholder="Password" type="password" />
                    <button className="tp-btn-primary" style={{ width: '100%', marginTop: 4 }}>
                      Sign in
                    </button>
                  </div>
                </div>

                <div className="tp-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Orders this week</div>
                    <span className="tp-badge tp-badge-secondary">+12%</span>
                  </div>
                  <div className="text-3xl font-semibold" style={{ letterSpacing: '-0.02em' }}>R 48,210</div>
                  <div className="tp-muted text-xs mb-4">vs last week</div>
                  <div className="tp-divider pt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs"><span>Linen overshirt</span><span className="tp-muted">42</span></div>
                    <div className="flex items-center justify-between text-xs"><span>Wool scarf</span><span className="tp-muted">31</span></div>
                    <div className="flex items-center justify-between text-xs"><span>Corduroy trouser</span><span className="tp-muted">18</span></div>
                  </div>
                </div>
              </div>

              <div
                className="tp-card p-4 mb-6"
                style={{ borderColor: `hsl(${getColor('destructive')})`, background: `hsl(${getColor('destructive')} / 0.08)` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: `${tokens.radius}rem`,
                      background: `hsl(${getColor('destructive')})`,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 'bold'
                    }}
                  >
                    !
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: `hsl(${getColor('destructive')})` }}>
                      Migration requires review
                    </div>
                    <div className="text-xs tp-muted mt-0.5">
                      Renaming <code className="mono">products.cost</code> will update 134 records. Confirm before applying.
                    </div>
                  </div>
                  <button className="tp-btn-destructive">Review</button>
                </div>
              </div>

              <div className="tp-card overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Recent records</div>
                    <div className="tp-muted text-xs">Products collection</div>
                  </div>
                  <button className="tp-btn-outline">Export CSV</button>
                </div>
                <div className="tp-divider" />
                <table className="w-full text-sm">
                  <thead>
                    <tr className="tp-muted text-[11px] uppercase tracking-wider">
                      <th className="text-left px-4 py-2 font-medium">Name</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                      <th className="text-right px-4 py-2 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderTop: `1px solid hsl(${getColor('border')})` }}>
                      <td className="px-4 py-2.5">Linen overshirt</td>
                      <td className="px-4 py-2.5"><span className="tp-badge tp-badge-secondary">active</span></td>
                      <td className="px-4 py-2.5 text-right mono">R 1,450</td>
                    </tr>
                    <tr style={{ borderTop: `1px solid hsl(${getColor('border')})` }}>
                      <td className="px-4 py-2.5">Wool scarf</td>
                      <td className="px-4 py-2.5"><span className="tp-badge tp-badge-secondary">active</span></td>
                      <td className="px-4 py-2.5 text-right mono">R 880</td>
                    </tr>
                    <tr style={{ borderTop: `1px solid hsl(${getColor('border')})` }}>
                      <td className="px-4 py-2.5">Leather belt</td>
                      <td className="px-4 py-2.5"><span className="tp-badge tp-badge-destructive">archived</span></td>
                      <td className="px-4 py-2.5 text-right mono">R 620</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 text-[11px] text-neutral-500 flex items-center gap-4">
              <span>
                <span className="w-1.5 h-1.5 rounded-full bg-ok inline-block mr-1" />
                Scope: {tokens.scope === 'both' ? 'Both surfaces' : tokens.scope === 'admin' ? 'Admin UI' : 'Published pages'}
              </span>
              <span>·</span>
              <span>Changes apply instantly across all workspaces on save.</span>
            </div>

            {error && (
              <div className="mt-4 text-[11px] text-destructive mono break-all">{error}</div>
            )}
          </div>
        </div>

        <aside className="w-72 border-l border-neutral-200 bg-white overflow-auto scrollbar shrink-0">
          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">Custom presets</div>
              <button onClick={newTheme} className="text-[10px] text-accent hover:underline">+ new</button>
            </div>
            {themes.length === 0 ? (
              <div className="text-[11px] text-neutral-400 py-2">
                Save a theme to create a custom preset.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {themes.map((t) => {
                  const tk = normalizeTokens(t.tokens);
                  return (
                    <button
                      key={t.id}
                      onClick={() => loadTheme(t)}
                      className={cn(
                        'rounded-md p-2 text-[11px] flex flex-col items-center gap-1 border transition-colors',
                        activePreset === t.id
                          ? 'border-accent ring-2 ring-accent/30'
                          : 'border-neutral-200 hover:border-accent'
                      )}
                    >
                      <div className="flex gap-0.5">
                        <span className="w-3 h-3 rounded-sm" style={{ background: hslToHex(tk.colorBindings?.primary?.light ?? '0 0% 9%') }} />
                        <span className="w-3 h-3 rounded-sm border border-neutral-200" style={{ background: hslToHex(tk.colorBindings?.background?.light ?? '0 0% 100%') }} />
                      </div>
                      <span className="truncate w-full text-center">{t.id === activePreset ? name : t.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 border-b border-neutral-200">
            <div className="space-y-1 text-[12px]">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => loadTheme(t)}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-1.5 rounded text-left',
                    activePreset === t.id ? 'bg-accent-soft text-accent' : 'hover:bg-neutral-50'
                  )}
                >
                  <span>{t.name}</span>
                  <span className={cn('text-[10px]', selectedId === t.id ? '' : 'text-neutral-400')}>
                    {t.isDefault ? 'active' : 'draft'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <label className="flex items-center justify-between text-[12px]">
              <span>Set as default</span>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-3.5 w-3.5 accent-accent"
              />
            </label>
            {selectedId && (
              <button
                onClick={destroy}
                className="w-full mt-3 text-[11px] text-destructive border border-destructive/30 rounded-md px-2 py-1.5 hover:bg-destructive/5"
              >
                Delete theme
              </button>
            )}
          </div>
        </aside>
      </div>

      {showPresetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Save as preset</h2>
            <input
              type="text"
              placeholder="Preset name (e.g., 'Brand Blue', 'Editorial')"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveAsPreset();
                if (e.key === 'Escape') setShowPresetModal(false);
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowPresetModal(false)}
                className="px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={saveAsPreset}
                disabled={!presetName.trim() || savingPreset}
                className="px-3 py-2 text-sm bg-accent text-white rounded-md disabled:opacity-60"
              >
                {savingPreset ? 'Saving…' : 'Save preset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      className={cn('text-neutral-400 transition-transform', open && 'rotate-180')}
    >
      <path d="M2 4l4 4 4-4" />
    </svg>
  );
}
