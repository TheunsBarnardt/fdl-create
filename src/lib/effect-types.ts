import { z } from 'zod';

// ─── Blend modes (Figma parity) ──────────────────────────────────────────────

export const BLEND_MODES = [
  'pass_through', 'normal',
  'darken', 'multiply', 'color_burn',
  'lighten', 'screen', 'color_dodge',
  'overlay', 'soft_light', 'hard_light',
  'difference', 'exclusion',
  'hue', 'saturation', 'color', 'luminosity',
] as const;

export type BlendMode = typeof BLEND_MODES[number];

export function blendModeLabel(m: BlendMode): string {
  return m.split('_').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
}

// ─── Effect schema ───────────────────────────────────────────────────────────

const ShadowFields = {
  visible: z.boolean(),
  blendMode: z.enum(BLEND_MODES),
  x: z.number(),
  y: z.number(),
  blur: z.number().min(0),
  spread: z.number(),
  color: z.string(),    // "#RRGGBB"
  opacity: z.number().min(0).max(1),
};

export const DropShadowSchema = z.object({
  kind: z.literal('drop_shadow'),
  ...ShadowFields,
  showBehindTransparent: z.boolean(),
});

export const InnerShadowSchema = z.object({
  kind: z.literal('inner_shadow'),
  ...ShadowFields,
});

export const LayerBlurSchema = z.object({
  kind: z.literal('layer_blur'),
  visible: z.boolean(),
  radius: z.number().min(0),
});

export const BackgroundBlurSchema = z.object({
  kind: z.literal('background_blur'),
  visible: z.boolean(),
  radius: z.number().min(0),
});

export const EffectSchema = z.discriminatedUnion('kind', [
  DropShadowSchema,
  InnerShadowSchema,
  LayerBlurSchema,
  BackgroundBlurSchema,
]);

export type DropShadow = z.infer<typeof DropShadowSchema>;
export type InnerShadow = z.infer<typeof InnerShadowSchema>;
export type LayerBlur = z.infer<typeof LayerBlurSchema>;
export type BackgroundBlur = z.infer<typeof BackgroundBlurSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type EffectValue = Effect[];

export const EffectValueSchema = z.array(EffectSchema);

export type EffectKind = Effect['kind'];

export function effectKindLabel(k: EffectKind): string {
  switch (k) {
    case 'drop_shadow':     return 'Drop shadow';
    case 'inner_shadow':    return 'Inner shadow';
    case 'layer_blur':      return 'Layer blur';
    case 'background_blur': return 'Background blur';
  }
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export function defaultEffect(kind: EffectKind): Effect {
  switch (kind) {
    case 'drop_shadow':
      return { kind, visible: true, blendMode: 'normal', x: 0, y: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.05, showBehindTransparent: false };
    case 'inner_shadow':
      return { kind, visible: true, blendMode: 'normal', x: 0, y: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.05 };
    case 'layer_blur':
      return { kind, visible: true, radius: 4 };
    case 'background_blur':
      return { kind, visible: true, radius: 8 };
  }
}

// ─── Color helpers ───────────────────────────────────────────────────────────

function alphaByte(opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity));
  return Math.round(clamped * 255).toString(16).padStart(2, '0');
}

function colorWithAlpha(hex: string, opacity: number): string {
  // Hex must be #RRGGBB. If shorter, pad. Output #RRGGBBAA.
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const rgb = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  return `#${rgb}${alphaByte(opacity)}`;
}

function rgbaCss(hex: string, opacity: number): string {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const rgb = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, opacity));
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(4).replace(/\.?0+$/, '')})`;
}

// ─── CSS emission (for live preview) ─────────────────────────────────────────

export function effectsToCss(effects: Effect[]): {
  boxShadow: string;
  filter: string;
  backdropFilter: string;
} {
  const visible = effects.filter(e => e.visible);

  const shadowParts: string[] = [];
  let filter = '';
  let backdropFilter = '';

  for (const e of visible) {
    if (e.kind === 'drop_shadow') {
      shadowParts.push(`${e.x}px ${e.y}px ${e.blur}px ${e.spread}px ${rgbaCss(e.color, e.opacity)}`);
    } else if (e.kind === 'inner_shadow') {
      shadowParts.push(`inset ${e.x}px ${e.y}px ${e.blur}px ${e.spread}px ${rgbaCss(e.color, e.opacity)}`);
    } else if (e.kind === 'layer_blur') {
      filter = filter ? `${filter} blur(${e.radius}px)` : `blur(${e.radius}px)`;
    } else if (e.kind === 'background_blur') {
      backdropFilter = backdropFilter ? `${backdropFilter} blur(${e.radius}px)` : `blur(${e.radius}px)`;
    }
  }

  return {
    boxShadow: shadowParts.join(', '),
    filter,
    backdropFilter,
  };
}

// ─── Tailwind emission ───────────────────────────────────────────────────────

const BLUR_PRESETS: Array<[number, string]> = [
  [0, 'blur-none'],
  [4, 'blur-sm'],
  [8, 'blur'],
  [12, 'blur-md'],
  [16, 'blur-lg'],
  [24, 'blur-xl'],
  [40, 'blur-2xl'],
  [64, 'blur-3xl'],
];

const BACKDROP_BLUR_PRESETS: Array<[number, string]> = [
  [0, 'backdrop-blur-none'],
  [4, 'backdrop-blur-sm'],
  [8, 'backdrop-blur'],
  [12, 'backdrop-blur-md'],
  [16, 'backdrop-blur-lg'],
  [24, 'backdrop-blur-xl'],
  [40, 'backdrop-blur-2xl'],
  [64, 'backdrop-blur-3xl'],
];

function blurPreset(radius: number, table: Array<[number, string]>): string | null {
  const found = table.find(([r]) => r === radius);
  return found ? found[1] : null;
}

// Tailwind preset shadows: only attempt to match the simple single-layer ones.
// (shadow-sm, shadow-2xl, shadow-inner, shadow-none — the rest are multi-layer
// with negative spread offsets that hand-authored Figma specs rarely match.)
function shadowPreset(shadows: Array<DropShadow | InnerShadow>): string | null {
  if (shadows.length === 0) return 'shadow-none';
  if (shadows.length !== 1) return null;
  const s = shadows[0];
  if (s.x !== 0 || s.color.toLowerCase() !== '#000000') return null;

  if (s.kind === 'drop_shadow') {
    if (s.y === 1 && s.blur === 2 && s.spread === 0 && Math.abs(s.opacity - 0.05) < 0.001) return 'shadow-sm';
    if (s.y === 25 && s.blur === 50 && s.spread === -12 && Math.abs(s.opacity - 0.25) < 0.001) return 'shadow-2xl';
  }
  if (s.kind === 'inner_shadow') {
    if (s.y === 2 && s.blur === 4 && s.spread === 0 && Math.abs(s.opacity - 0.05) < 0.001) return 'shadow-inner';
  }
  return null;
}

function shadowArbitraryPart(s: DropShadow | InnerShadow): string {
  // Tailwind arbitrary values: spaces replaced with underscores, no spaces around commas.
  const prefix = s.kind === 'inner_shadow' ? 'inset_' : '';
  return `${prefix}${s.x}px_${s.y}px_${s.blur}px_${s.spread}px_${colorWithAlpha(s.color, s.opacity)}`;
}

export function effectsToTailwind(effects: Effect[]): string {
  const visible = effects.filter(e => e.visible);
  const shadows = visible.filter((e): e is DropShadow | InnerShadow =>
    e.kind === 'drop_shadow' || e.kind === 'inner_shadow'
  );
  const layerBlurs = visible.filter((e): e is LayerBlur => e.kind === 'layer_blur');
  const bgBlurs = visible.filter((e): e is BackgroundBlur => e.kind === 'background_blur');

  const classes: string[] = [];

  // Shadow part
  const preset = shadowPreset(shadows);
  if (preset) {
    classes.push(preset);
  } else if (shadows.length > 0) {
    const parts = shadows.map(shadowArbitraryPart).join(',');
    classes.push(`shadow-[${parts}]`);
  }

  // Layer blur — Tailwind allows only one filter blur per element; if multiple, sum.
  if (layerBlurs.length > 0) {
    const radius = layerBlurs.reduce((a, b) => a + b.radius, 0);
    const lp = blurPreset(radius, BLUR_PRESETS);
    classes.push(lp ?? `blur-[${radius}px]`);
  }

  // Background blur — same rule.
  if (bgBlurs.length > 0) {
    const radius = bgBlurs.reduce((a, b) => a + b.radius, 0);
    const bp = blurPreset(radius, BACKDROP_BLUR_PRESETS);
    classes.push(bp ?? `backdrop-blur-[${radius}px]`);
  }

  return classes.join(' ');
}

// ─── Type guards / utilities ─────────────────────────────────────────────────

export function isEffectArray(v: unknown): v is Effect[] {
  return Array.isArray(v) && v.every(e => typeof e === 'object' && e !== null && 'kind' in e);
}

export function effectSummary(effects: Effect[]): string {
  if (effects.length === 0) return 'empty';
  const counts = { drop_shadow: 0, inner_shadow: 0, layer_blur: 0, background_blur: 0 };
  for (const e of effects) counts[e.kind]++;
  const parts: string[] = [];
  if (counts.drop_shadow)     parts.push(`${counts.drop_shadow} drop`);
  if (counts.inner_shadow)    parts.push(`${counts.inner_shadow} inner`);
  if (counts.layer_blur)      parts.push(`${counts.layer_blur} blur`);
  if (counts.background_blur) parts.push(`${counts.background_blur} bg-blur`);
  return parts.join(' + ');
}
