'use client';
import { useMemo, useState, useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Save, Sun, Moon, Sparkles, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Scope = 'both' | 'admin' | 'published';
type Mode = 'light' | 'dark';

type Tokens = {
  scope: Scope;
  mode: Mode;
  // Light mode colors
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  destructive: string;
  border: string;
  ring: string;
  // Dark mode color overrides
  darkBackground: string;
  darkForeground: string;
  darkPrimary: string;
  darkSecondary: string;
  darkAccent: string;
  darkMuted: string;
  darkDestructive: string;
  darkBorder: string;
  darkRing: string;
  radius: number;
  fontBody: string;
  fontDisplay: string;
  fontMono: string;
  // Typography scale
  h1Size: string; h1Weight: number; h1Tracking: string; h1Leading: string;
  h2Size: string; h2Weight: number; h2Tracking: string; h2Leading: string;
  h3Size: string; h3Weight: number; h3Tracking: string; h3Leading: string;
  h4Size: string; h4Weight: number; h4Tracking: string; h4Leading: string;
  h5Size: string; h5Weight: number; h5Tracking: string; h5Leading: string;
  h6Size: string; h6Weight: number; h6Tracking: string; h6Leading: string;
  bodySize: string; bodyWeight: number; bodyLeading: string;
  underlineOffset: string; underlineThickness: string;
};

type Theme = { id?: string; name: string; tokens: any; isDefault: boolean };
type Preset = { id: string; name: string; tokens: Partial<Tokens>; custom: boolean };

// ── Variable linking ──────────────────────────────────────────────────────────
type VarItem = { id: string; name: string; type: string; value: string | { light: string; dark: string } };

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

const COLOR_KEYS = [
  'background',
  'foreground',
  'primary',
  'secondary',
  'accent',
  'muted',
  'destructive',
  'border',
  'ring'
] as const;
type ColorKey = typeof COLOR_KEYS[number];

const DEFAULT_TOKENS: Tokens = {
  scope: 'both',
  mode: 'light',
  background: '0 0% 100%',
  foreground: '222 47% 11%',
  primary: '222 47% 11%',
  secondary: '210 40% 96%',
  accent: '210 40% 96%',
  muted: '210 40% 96%',
  destructive: '0 84% 60%',
  border: '214 32% 91%',
  ring: '222 47% 11%',
  darkBackground: '222 47% 11%',
  darkForeground: '210 40% 98%',
  darkPrimary: '210 40% 98%',
  darkSecondary: '217 33% 17%',
  darkAccent: '217 33% 17%',
  darkMuted: '217 33% 17%',
  darkDestructive: '0 84% 60%',
  darkBorder: '217 33% 17%',
  darkRing: '212 27% 84%',
  radius: 0.5,
  fontBody: 'Inter',
  fontDisplay: 'Fraunces',
  fontMono: 'JetBrains Mono',
  h1Size: '2.5rem',  h1Weight: 700, h1Tracking: '-0.025em', h1Leading: '1.15',
  h2Size: '2rem',    h2Weight: 700, h2Tracking: '-0.02em',  h2Leading: '1.2',
  h3Size: '1.5rem',  h3Weight: 600, h3Tracking: '-0.015em', h3Leading: '1.25',
  h4Size: '1.25rem', h4Weight: 600, h4Tracking: '-0.01em',  h4Leading: '1.3',
  h5Size: '1.125rem',h5Weight: 600, h5Tracking: '-0.005em', h5Leading: '1.35',
  h6Size: '1rem',    h6Weight: 600, h6Tracking: '0em',      h6Leading: '1.4',
  bodySize: '0.875rem', bodyWeight: 400, bodyLeading: '1.6',
  underlineOffset: '3px', underlineThickness: '1px',
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

const PRESETS: Record<string, Partial<Tokens>> = {
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

const DARK_PRESETS: Record<string, Partial<Tokens>> = {
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
  return { ...DEFAULT_TOKENS, ...(raw && typeof raw === 'object' ? raw : {}) };
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
    presets: true, colors: true, radius: false, fonts: false, typeScale: false, claude: false,
  });
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const [colorVars, setColorVars] = useState<VarItem[]>([]);
  const [varPickerOpen, setVarPickerOpen] = useState<string | null>(null);

  // Load custom presets and color variables on mount
  useEffect(() => {
    (async () => {
      try {
        const [presetsRes, varsRes] = await Promise.all([
          fetch('/api/presets'),
          fetch('/api/variable-collections'),
        ]);
        if (presetsRes.ok) setPresets(await presetsRes.json());
        if (varsRes.ok) {
          const cols = await varsRes.json();
          const all: VarItem[] = (Array.isArray(cols) ? cols : []).flatMap(
            (col: any) => (col.variables ?? []).filter((v: any) => v.type === 'color')
          );
          setColorVars(all);
        }
      } catch (e) {
        console.error('Failed to load', e);
      }
    })();
  }, []);

  const loadTheme = (t: typeof themes[number]) => {
    setSelectedId(t.id);
    setName(t.name);
    setTokens(normalizeTokens(t.tokens));
    setIsDefault(t.isDefault);
  };

  const applyPreset = (key: string, isCustom = false) => {
    if (isCustom) {
      const preset = presets.find((p) => p.id === key);
      if (!preset) return;
      setTokens({ ...tokens, ...preset.tokens });
    } else {
      const p = tokens.mode === 'dark' ? DARK_PRESETS[key] : PRESETS[key];
      if (!p) return;
      setTokens({ ...tokens, ...p });
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
          tokens: {
            background: tokens.background,
            foreground: tokens.foreground,
            primary: tokens.primary,
            secondary: tokens.secondary,
            accent: tokens.accent,
            muted: tokens.muted,
            destructive: tokens.destructive,
            border: tokens.border,
            ring: tokens.ring,
            darkBackground: tokens.darkBackground,
            darkForeground: tokens.darkForeground,
            darkPrimary: tokens.darkPrimary,
            darkSecondary: tokens.darkSecondary,
            darkAccent: tokens.darkAccent,
            darkMuted: tokens.darkMuted,
            darkDestructive: tokens.darkDestructive,
            darkBorder: tokens.darkBorder,
            darkRing: tokens.darkRing,
          }
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

  const darkKey = (key: ColorKey) =>
    `dark${key.charAt(0).toUpperCase()}${key.slice(1)}` as keyof Tokens;

  const activeColorKey = (key: ColorKey): keyof Tokens =>
    tokens.mode === 'dark' ? darkKey(key) : key;

  const getRawColor = (key: ColorKey): string => tokens[activeColorKey(key)] as string;
  const getColor = (key: ColorKey): string =>
    resolveColor(getRawColor(key), colorVars, tokens.mode);

  const setColor = (key: ColorKey, value: string) => {
    setTokens({ ...tokens, [activeColorKey(key)]: value });
  };

  const setMode = (mode: Mode) => setTokens({ ...tokens, mode });
  const setScope = (scope: Scope) => setTokens({ ...tokens, scope });

  const cssVars = useMemo(() => {
    const d = tokens.mode === 'dark';
    const rc = (val: string) => {
      const resolved = resolveColor(val, colorVars, tokens.mode);
      return resolved.startsWith('#') ? hexToHsl(resolved) : resolved;
    };
    return {
      '--bg': rc(d ? tokens.darkBackground : tokens.background),
      '--fg': rc(d ? tokens.darkForeground : tokens.foreground),
      '--card': rc(d ? tokens.darkBackground : tokens.background),
      '--card-fg': rc(d ? tokens.darkForeground : tokens.foreground),
      '--primary': rc(d ? tokens.darkPrimary : tokens.primary),
      '--primary-fg': rc(d ? tokens.darkBackground : tokens.background),
      '--secondary': rc(d ? tokens.darkSecondary : tokens.secondary),
      '--secondary-fg': rc(d ? tokens.darkForeground : tokens.foreground),
      '--muted': rc(d ? tokens.darkMuted : tokens.muted),
      '--muted-fg': d ? '215 20% 65%' : '215 16% 47%',
      '--accent': rc(d ? tokens.darkAccent : tokens.accent),
      '--accent-fg': rc(d ? tokens.darkForeground : tokens.foreground),
      '--destructive': rc(d ? tokens.darkDestructive : tokens.destructive),
      '--destructive-fg': '210 40% 98%',
      '--border': rc(d ? tokens.darkBorder : tokens.border),
      '--input': rc(d ? tokens.darkBorder : tokens.border),
      '--ring': rc(d ? tokens.darkRing : tokens.ring),
      '--radius': `${tokens.radius}rem`,
      '--theme-font': tokens.fontBody,
      '--h1-size': tokens.h1Size, '--h1-weight': String(tokens.h1Weight), '--h1-tracking': tokens.h1Tracking, '--h1-leading': tokens.h1Leading,
      '--h2-size': tokens.h2Size, '--h2-weight': String(tokens.h2Weight), '--h2-tracking': tokens.h2Tracking, '--h2-leading': tokens.h2Leading,
      '--h3-size': tokens.h3Size, '--h3-weight': String(tokens.h3Weight), '--h3-tracking': tokens.h3Tracking, '--h3-leading': tokens.h3Leading,
      '--h4-size': tokens.h4Size, '--h4-weight': String(tokens.h4Weight), '--h4-tracking': tokens.h4Tracking, '--h4-leading': tokens.h4Leading,
      '--h5-size': tokens.h5Size, '--h5-weight': String(tokens.h5Weight), '--h5-tracking': tokens.h5Tracking, '--h5-leading': tokens.h5Leading,
      '--h6-size': tokens.h6Size, '--h6-weight': String(tokens.h6Weight), '--h6-tracking': tokens.h6Tracking, '--h6-leading': tokens.h6Leading,
      '--body-size': tokens.bodySize, '--body-weight': String(tokens.bodyWeight), '--body-leading': tokens.bodyLeading,
      '--underline-offset': tokens.underlineOffset, '--underline-thickness': tokens.underlineThickness,
    } as CSSProperties;
  }, [tokens, colorVars]);

  const cssSource = useMemo(() => {
    const lines = [
      ':root {',
      `  --background: ${tokens.background};`,
      `  --foreground: ${tokens.foreground};`,
      `  --primary: ${tokens.primary};`,
      `  --secondary: ${tokens.secondary};`,
      `  --accent: ${tokens.accent};`,
      `  --muted: ${tokens.muted};`,
      `  --destructive: ${tokens.destructive};`,
      `  --border: ${tokens.border};`,
      `  --ring: ${tokens.ring};`,
      `  --radius: ${tokens.radius}rem;`,
      '}'
    ];
    return lines.join('\n');
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
                  {allPresets.map((p) => {
                    const swatch = PRESET_SWATCHES[p.id as keyof typeof PRESET_SWATCHES];
                    const fgColor = p.custom ? hslToHex(p.tokens.primary || '0 0% 0%') : swatch?.fg;
                    const bgColor = p.custom ? hslToHex(p.tokens.background || '0 0% 100%') : swatch?.bg;
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
                {COLOR_KEYS.map((key) => {
                  const raw = getRawColor(key);
                  const linked = isVarRef(raw);
                  const linkedName = linked ? parseVarRef(raw) : null;
                  const resolved = getColor(key);
                  return (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <label className="mono text-[11px] text-neutral-600 shrink-0">--{key}</label>
                      <div className="flex items-center gap-1.5">
                        {linked ? (
                          /* Linked state: show variable name + unlink button */
                          <div className="flex items-center gap-1 bg-accent/10 border border-accent/30 rounded px-1.5 py-0.5">
                            <Link2 className="w-3 h-3 text-accent shrink-0" />
                            <span className="text-[10px] text-accent font-mono truncate max-w-[90px]" title={linkedName ?? ''}>
                              {linkedName?.split('/').pop()}
                            </span>
                            <button
                              onClick={() => setColor(key, resolved)}
                              className="text-accent/60 hover:text-accent ml-0.5"
                              title="Unlink variable"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          /* Raw state: show HSL text input */
                          <input
                            className="mono text-[11px] w-20 px-1.5 py-0.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
                            value={raw}
                            onChange={(e) => setColor(key, e.target.value)}
                          />
                        )}

                        {/* color swatch */}
                        <span
                          className="w-7 h-7 rounded shrink-0 border border-neutral-200"
                          style={{ background: resolved.startsWith('#') ? resolved : `hsl(${resolved})` }}
                        />

                        {/* Variable picker button */}
                        {colorVars.length > 0 && (
                          <div className="relative">
                            <button
                              onClick={() => setVarPickerOpen(varPickerOpen === key ? null : key)}
                              className={cn(
                                'w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-100',
                                linked ? 'text-accent' : 'text-neutral-400 hover:text-neutral-700'
                              )}
                              title="Pick from variables"
                            >
                              <Link2 className="w-3 h-3" />
                            </button>
                            {varPickerOpen === key && (
                              <>
                              <div className="fixed inset-0 z-40" onClick={() => setVarPickerOpen(null)} />
                              <div className="absolute right-0 top-6 z-50 w-52 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden">
                                <div className="px-2 py-1.5 border-b border-neutral-100">
                                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">Color variables</p>
                                </div>
                                <div className="max-h-48 overflow-auto py-1">
                                  {colorVars.map((v) => {
                                    const val = resolveVarValue(v, tokens.mode);
                                    return (
                                      <button
                                        key={v.id}
                                        onClick={() => { setColor(key, makeVarRef(v.name)); setVarPickerOpen(null); }}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-50 text-left"
                                      >
                                        <span className="w-6 h-6 rounded shrink-0 border border-neutral-200" style={{ background: val.startsWith('#') ? val : `hsl(${val})` }} />
                                        <span className="text-[11px] text-neutral-700 truncate flex-1">{v.name.split('/').pop()}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="border-t border-neutral-100 px-2 py-1">
                                  <button
                                    onClick={() => setVarPickerOpen(null)}
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
                      </div>
                    </div>
                  );
                })}
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
                Fonts <span className="text-neutral-500 normal-case tracking-normal ml-1">{tokens.fontBody}</span>
              </span>
              <Chevron open={open.fonts} />
            </button>
            {open.fonts && (
              <div className="px-4 pb-4 space-y-2 text-[12px]">
                {([
                  ['Body', 'fontBody', ['Inter', 'Geist', 'system-ui', 'IBM Plex Sans']],
                  ['Display', 'fontDisplay', ['Fraunces', 'Inter', 'Playfair Display', 'Instrument Serif']],
                  ['Mono', 'fontMono', ['JetBrains Mono', 'Geist Mono', 'IBM Plex Mono']],
                ] as [string, keyof Tokens, string[]][]).map(([label, key, opts]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <label className="text-[11px] text-neutral-500 w-12 shrink-0">{label}</label>
                    <select
                      value={tokens[key] as string}
                      onChange={(e) => setTokens({ ...tokens, [key]: e.target.value } as Tokens)}
                      className="flex-1 text-[11px] px-1.5 py-0.5 border border-neutral-200 rounded bg-white"
                    >
                      {opts.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-b border-neutral-200">
            <button onClick={() => toggle('typeScale')} className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">Type scale</span>
              <Chevron open={open.typeScale} />
            </button>
          {open.typeScale && <div className="px-4 pb-4">
            <div className="grid grid-cols-[28px_52px_44px_54px_44px] gap-1 px-0 mb-1">
              <span />
              <span className="text-[10px] text-neutral-400">Size</span>
              <span className="text-[10px] text-neutral-400">Wt</span>
              <span className="text-[10px] text-neutral-400">Tracking</span>
              <span className="text-[10px] text-neutral-400">Leading</span>
            </div>
            <div className="mb-3 space-y-1.5">
              {(['h1','h2','h3','h4','h5','h6'] as const).map((tag) => (
                <div key={tag} className="grid grid-cols-[28px_52px_44px_54px_44px] gap-1 items-center">
                  <span className="mono text-[11px] text-neutral-500 uppercase">{tag}</span>
                  <input
                    title="Size"
                    className="mono text-[11px] px-1 py-0.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
                    value={tokens[`${tag}Size`]}
                    onChange={(e) => setTokens({ ...tokens, [`${tag}Size`]: e.target.value })}
                    placeholder="2rem"
                  />
                  <input
                    title="Weight"
                    type="number"
                    min={100} max={900} step={100}
                    className="mono text-[11px] px-1 py-0.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
                    value={tokens[`${tag}Weight`]}
                    onChange={(e) => setTokens({ ...tokens, [`${tag}Weight`]: Number(e.target.value) })}
                  />
                  <input
                    title="Letter spacing"
                    className="mono text-[11px] px-1 py-0.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
                    value={tokens[`${tag}Tracking`]}
                    onChange={(e) => setTokens({ ...tokens, [`${tag}Tracking`]: e.target.value })}
                    placeholder="-0.02em"
                  />
                  <input
                    title="Line height"
                    className="mono text-[11px] px-1 py-0.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
                    value={tokens[`${tag}Leading`]}
                    onChange={(e) => setTokens({ ...tokens, [`${tag}Leading`]: e.target.value })}
                    placeholder="1.2"
                  />
                </div>
              ))}
              <div className="grid grid-cols-[28px_52px_44px_1fr] gap-1 items-center pt-1 border-t border-neutral-100 mt-1">
                <span className="mono text-[11px] text-neutral-500">p</span>
                <input
                  title="Body size"
                  className="mono text-[11px] px-1 py-0.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
                  value={tokens.bodySize}
                  onChange={(e) => setTokens({ ...tokens, bodySize: e.target.value })}
                />
                <input
                  title="Body weight"
                  type="number" min={100} max={900} step={100}
                  className="mono text-[11px] px-1 py-0.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
                  value={tokens.bodyWeight}
                  onChange={(e) => setTokens({ ...tokens, bodyWeight: Number(e.target.value) })}
                />
                <input
                  title="Body line height"
                  className="mono text-[11px] px-1 py-0.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
                  value={tokens.bodyLeading}
                  onChange={(e) => setTokens({ ...tokens, bodyLeading: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">Underline</div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-neutral-500 w-14 shrink-0">Offset</label>
                <input
                  className="mono text-[11px] w-20 px-1.5 py-0.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
                  value={tokens.underlineOffset}
                  onChange={(e) => setTokens({ ...tokens, underlineOffset: e.target.value })}
                  placeholder="3px"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-neutral-500 w-14 shrink-0">Thickness</label>
                <input
                  className="mono text-[11px] w-20 px-1.5 py-0.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
                  value={tokens.underlineThickness}
                  onChange={(e) => setTokens({ ...tokens, underlineThickness: e.target.value })}
                  placeholder="1px"
                />
              </div>
            </div>
          </div>}
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
                <div className="text-xs tp-muted uppercase tracking-wider mb-3">Type scale</div>
                {(['h1','h2','h3','h4','h5','h6'] as const).map((tag) => (
                  <div key={tag} style={{
                    fontSize: `var(--${tag}-size)`,
                    fontWeight: `var(--${tag}-weight)`,
                    letterSpacing: `var(--${tag}-tracking)`,
                    lineHeight: `var(--${tag}-leading)`,
                    fontFamily: tokens.fontDisplay,
                    marginBottom: '0.15em',
                  }}>
                    {tag.toUpperCase()} — The quick brown fox
                  </div>
                ))}
                <p style={{
                  fontSize: 'var(--body-size)',
                  fontWeight: 'var(--body-weight)',
                  lineHeight: 'var(--body-leading)',
                  marginTop: '0.75rem',
                }} className="tp-muted">
                  Body — The quick brown fox jumps over the lazy dog. 0123456789
                </p>
                <p style={{ fontSize: 'var(--body-size)', textDecoration: 'underline', textUnderlineOffset: 'var(--underline-offset)', textDecorationThickness: 'var(--underline-thickness)', marginTop: '0.25rem' }}>
                  Underline style — click here to learn more
                </p>
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
                style={{ borderColor: `hsl(${tokens.destructive})`, background: `hsl(${tokens.destructive} / 0.08)` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: `${tokens.radius}rem`,
                      background: `hsl(${tokens.destructive})`,
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
                    <div className="text-sm font-semibold" style={{ color: `hsl(${tokens.destructive})` }}>
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
                    <tr style={{ borderTop: `1px solid hsl(${tokens.border})` }}>
                      <td className="px-4 py-2.5">Linen overshirt</td>
                      <td className="px-4 py-2.5"><span className="tp-badge tp-badge-secondary">active</span></td>
                      <td className="px-4 py-2.5 text-right mono">R 1,450</td>
                    </tr>
                    <tr style={{ borderTop: `1px solid hsl(${tokens.border})` }}>
                      <td className="px-4 py-2.5">Wool scarf</td>
                      <td className="px-4 py-2.5"><span className="tp-badge tp-badge-secondary">active</span></td>
                      <td className="px-4 py-2.5 text-right mono">R 880</td>
                    </tr>
                    <tr style={{ borderTop: `1px solid hsl(${tokens.border})` }}>
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
                        selectedId === t.id
                          ? 'border-accent ring-2 ring-accent/30'
                          : 'border-neutral-200 hover:border-accent'
                      )}
                    >
                      <div className="flex gap-0.5">
                        <span className="w-3 h-3 rounded-sm" style={{ background: hslToHex(tk.primary) }} />
                        <span className="w-3 h-3 rounded-sm border border-neutral-200" style={{ background: hslToHex(tk.background) }} />
                      </div>
                      <span className="truncate w-full text-center">{t.id === selectedId ? name : t.name}</span>
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
                    selectedId === t.id ? 'bg-accent-soft text-accent' : 'hover:bg-neutral-50'
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
