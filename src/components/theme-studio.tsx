'use client';
import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Save, Sun, Moon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Scope = 'both' | 'admin' | 'published';
type Mode = 'light' | 'dark';

type Tokens = {
  scope: Scope;
  mode: Mode;
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  destructive: string;
  border: string;
  ring: string;
  radius: number;
  fontBody: string;
  fontDisplay: string;
  fontMono: string;
};

type Theme = { id?: string; name: string; tokens: any; isDefault: boolean };

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
  radius: 0.5,
  fontBody: 'Inter',
  fontDisplay: 'Fraunces',
  fontMono: 'JetBrains Mono'
};

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
  if (raw && typeof raw === 'object' && typeof raw.background === 'string' && typeof raw.primary === 'string') {
    return { ...DEFAULT_TOKENS, ...raw };
  }
  // Migrate legacy { mode, radius, font, accent, surface, ink }
  const out: Tokens = { ...DEFAULT_TOKENS };
  if (raw?.mode === 'dark') out.mode = 'dark';
  if (typeof raw?.radius === 'number') out.radius = raw.radius;
  if (raw?.font === 'jetbrains') out.fontBody = 'JetBrains Mono';
  else if (raw?.font === 'geist') out.fontBody = 'Geist';
  return out;
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

  const loadTheme = (t: typeof themes[number]) => {
    setSelectedId(t.id);
    setName(t.name);
    setTokens(normalizeTokens(t.tokens));
    setIsDefault(t.isDefault);
  };

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (!p) return;
    setTokens({ ...tokens, ...p });
    setActivePreset(key);
  };

  const setColor = (key: ColorKey, value: string) => {
    setTokens({ ...tokens, [key]: value });
  };

  const setMode = (mode: Mode) => setTokens({ ...tokens, mode });
  const setScope = (scope: Scope) => setTokens({ ...tokens, scope });

  const cssVars = useMemo(() => {
    const darkOverrides = tokens.mode === 'dark'
      ? {
          background: '222 47% 11%',
          foreground: '210 40% 98%',
          secondary: '217 33% 17%',
          muted: '217 33% 17%',
          accent: '217 33% 17%',
          border: '217 33% 17%'
        }
      : {};
    return {
      '--bg': (darkOverrides as any).background ?? tokens.background,
      '--fg': (darkOverrides as any).foreground ?? tokens.foreground,
      '--card': (darkOverrides as any).background ?? tokens.background,
      '--card-fg': (darkOverrides as any).foreground ?? tokens.foreground,
      '--primary': tokens.primary,
      '--primary-fg': tokens.mode === 'dark' ? tokens.foreground : '210 40% 98%',
      '--secondary': (darkOverrides as any).secondary ?? tokens.secondary,
      '--secondary-fg': tokens.foreground,
      '--muted': (darkOverrides as any).muted ?? tokens.muted,
      '--muted-fg': tokens.mode === 'dark' ? '215 20% 65%' : '215 16% 47%',
      '--accent': (darkOverrides as any).accent ?? tokens.accent,
      '--accent-fg': tokens.foreground,
      '--destructive': tokens.destructive,
      '--destructive-fg': '210 40% 98%',
      '--border': (darkOverrides as any).border ?? tokens.border,
      '--input': (darkOverrides as any).border ?? tokens.border,
      '--ring': tokens.ring,
      '--radius': `${tokens.radius}rem`,
      '--theme-font': tokens.fontBody
    } as CSSProperties;
  }, [tokens]);

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
      if (!res.ok) throw new Error(JSON.stringify((await res.json()).error));
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
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-900">Workspace</Link>
          <span className="text-xs text-neutral-400">›</span>
          <div className="display text-lg">Theme studio</div>
          <span className="text-xs text-neutral-400">›</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-sm bg-transparent outline-none focus:bg-neutral-100 px-1.5 py-0.5 rounded"
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
            className="px-2.5 py-1 bg-neutral-900 text-white rounded-md flex items-center gap-1.5 disabled:opacity-60"
          >
            <Save className="w-3 h-3" /> {saving ? 'Saving…' : selectedId ? 'Save theme' : 'Create theme'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <aside className="w-80 border-r border-neutral-200 bg-white overflow-auto scrollbar shrink-0">
          <div className="p-4 border-b border-neutral-200">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">Base preset</div>
            <select
              value={activePreset}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-md bg-white"
            >
              <option value="slate">Slate (default)</option>
              <option value="stone">Stone</option>
              <option value="zinc">Zinc</option>
              <option value="neutral">Neutral</option>
              <option value="rose">Rose</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="violet">Violet</option>
              <option value="otto1890">Otto 1890 (paper · vermilion · gold)</option>
            </select>
          </div>

          <div className="p-4 border-b border-neutral-200">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-3">
              Colors · {tokens.mode} mode
            </div>
            <div className="space-y-2.5 text-[12px]">
              {COLOR_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <label className="mono text-[11px] text-neutral-600">--{key}</label>
                  <div className="flex items-center gap-2">
                    <div className="swatch" style={{ background: `hsl(${tokens[key]})` }} />
                    <input
                      className="mono text-[11px] w-24 px-1.5 py-0.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
                      value={tokens[key]}
                      onChange={(e) => setColor(key, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-neutral-200">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-3">Radius</div>
            <input
              type="range"
              min={0}
              max={16}
              step={1}
              value={Math.round(tokens.radius * 16)}
              onChange={(e) => setTokens({ ...tokens, radius: Number(e.target.value) / 16 })}
              className="w-full accent-accent"
            />
            <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1">
              <span>0</span>
              <span>{tokens.radius.toFixed(2)}rem</span>
              <span>1rem</span>
            </div>
          </div>

          <div className="p-4 border-b border-neutral-200">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">Typography</div>
            <div className="space-y-2 text-[12px]">
              <div>
                <label className="text-[11px] text-neutral-500">Body</label>
                <select
                  value={tokens.fontBody}
                  onChange={(e) => setTokens({ ...tokens, fontBody: e.target.value })}
                  className="w-full mt-0.5 text-[12px] px-2 py-1 border border-neutral-200 rounded bg-white"
                >
                  <option>Inter</option>
                  <option>Geist</option>
                  <option>system-ui</option>
                  <option>IBM Plex Sans</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-neutral-500">Display</label>
                <select
                  value={tokens.fontDisplay}
                  onChange={(e) => setTokens({ ...tokens, fontDisplay: e.target.value })}
                  className="w-full mt-0.5 text-[12px] px-2 py-1 border border-neutral-200 rounded bg-white"
                >
                  <option>Fraunces</option>
                  <option>Inter</option>
                  <option>Playfair Display</option>
                  <option>Instrument Serif</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-neutral-500">Mono</label>
                <select
                  value={tokens.fontMono}
                  onChange={(e) => setTokens({ ...tokens, fontMono: e.target.value })}
                  className="w-full mt-0.5 text-[12px] px-2 py-1 border border-neutral-200 rounded bg-white"
                >
                  <option>JetBrains Mono</option>
                  <option>Geist Mono</option>
                  <option>IBM Plex Mono</option>
                </select>
              </div>
            </div>
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
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="text-xs tp-muted uppercase tracking-wider">Preview</div>
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
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">Quick presets</div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PRESET_SWATCHES).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={cn(
                    'rounded-md p-2 text-[11px] flex flex-col items-center gap-1 border transition-colors',
                    activePreset === key
                      ? 'border-accent ring-2 ring-accent/30'
                      : 'border-neutral-200 hover:border-accent'
                  )}
                >
                  <div className="flex gap-0.5">
                    <span className="w-3 h-3 rounded-sm" style={{ background: s.fg }} />
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ background: s.bg, border: `1px solid ${s.bgBorder ?? '#e4e4e7'}` }}
                    />
                  </div>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-neutral-200">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">Export</div>
            <div className="space-y-1.5">
              <button
                onClick={copyCss}
                className="w-full text-left border border-neutral-200 rounded-md px-3 py-2 hover:border-accent text-[12px] flex items-center justify-between"
              >
                <span>CSS variables</span>
                <span className="mono text-[10px] text-neutral-400">:root</span>
              </button>
              <button className="w-full text-left border border-neutral-200 rounded-md px-3 py-2 hover:border-accent text-[12px] flex items-center justify-between">
                <span>Tailwind config</span>
                <span className="mono text-[10px] text-neutral-400">.js</span>
              </button>
              <button className="w-full text-left border border-neutral-200 rounded-md px-3 py-2 hover:border-accent text-[12px] flex items-center justify-between">
                <span>FDL theme blueprint</span>
                <span className="mono text-[10px] text-neutral-400">.yaml</span>
              </button>
              <button className="w-full text-left border border-neutral-200 rounded-md px-3 py-2 hover:border-accent text-[12px] flex items-center justify-between">
                <span>Figma tokens</span>
                <span className="mono text-[10px] text-neutral-400">.json</span>
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">Saved themes</div>
              <button onClick={newTheme} className="text-[10px] text-accent hover:underline">+ new</button>
            </div>
            <div className="space-y-1 text-[12px]">
              {themes.length === 0 && (
                <div className="text-[11px] text-neutral-400 px-2 py-1.5">No saved themes yet.</div>
              )}
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
    </div>
  );
}
