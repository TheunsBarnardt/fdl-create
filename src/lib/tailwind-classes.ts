export type TwEntry = { css: string; category: string };

const SPACING: Array<[string | number, string]> = [
  [0, '0px'], ['px', '1px'], [0.5, '2px'], [1, '4px'], [1.5, '6px'], [2, '8px'],
  [2.5, '10px'], [3, '12px'], [3.5, '14px'], [4, '16px'], [5, '20px'], [6, '24px'],
  [7, '28px'], [8, '32px'], [9, '36px'], [10, '40px'], [11, '44px'], [12, '48px'],
  [14, '56px'], [16, '64px'], [20, '80px'], [24, '96px'], [28, '112px'], [32, '128px'],
  [36, '144px'], [40, '160px'], [44, '176px'], [48, '192px'], [52, '208px'],
  [56, '224px'], [60, '240px'], [64, '256px'], [72, '288px'], [80, '320px'], [96, '384px'],
];

export const TW_CLASSES: Record<string, TwEntry> = {};

for (const [n, px] of SPACING) {
  TW_CLASSES[`p-${n}`]     = { css: `padding: ${px}`,                                  category: 'Padding' };
  TW_CLASSES[`px-${n}`]    = { css: `padding-left: ${px}; padding-right: ${px}`,        category: 'Padding' };
  TW_CLASSES[`py-${n}`]    = { css: `padding-top: ${px}; padding-bottom: ${px}`,        category: 'Padding' };
  TW_CLASSES[`pt-${n}`]    = { css: `padding-top: ${px}`,                               category: 'Padding' };
  TW_CLASSES[`pr-${n}`]    = { css: `padding-right: ${px}`,                             category: 'Padding' };
  TW_CLASSES[`pb-${n}`]    = { css: `padding-bottom: ${px}`,                            category: 'Padding' };
  TW_CLASSES[`pl-${n}`]    = { css: `padding-left: ${px}`,                              category: 'Padding' };

  TW_CLASSES[`m-${n}`]     = { css: `margin: ${px}`,                                   category: 'Margin' };
  TW_CLASSES[`mx-${n}`]    = { css: `margin-left: ${px}; margin-right: ${px}`,          category: 'Margin' };
  TW_CLASSES[`my-${n}`]    = { css: `margin-top: ${px}; margin-bottom: ${px}`,          category: 'Margin' };
  TW_CLASSES[`mt-${n}`]    = { css: `margin-top: ${px}`,                                category: 'Margin' };
  TW_CLASSES[`mr-${n}`]    = { css: `margin-right: ${px}`,                              category: 'Margin' };
  TW_CLASSES[`mb-${n}`]    = { css: `margin-bottom: ${px}`,                             category: 'Margin' };
  TW_CLASSES[`ml-${n}`]    = { css: `margin-left: ${px}`,                               category: 'Margin' };

  TW_CLASSES[`gap-${n}`]   = { css: `gap: ${px}`,                                       category: 'Gap' };
  TW_CLASSES[`gap-x-${n}`] = { css: `column-gap: ${px}`,                                category: 'Gap' };
  TW_CLASSES[`gap-y-${n}`] = { css: `row-gap: ${px}`,                                   category: 'Gap' };

  TW_CLASSES[`w-${n}`]     = { css: `width: ${px}`,                                     category: 'Sizing' };
  TW_CLASSES[`h-${n}`]     = { css: `height: ${px}`,                                    category: 'Sizing' };
  TW_CLASSES[`min-w-${n}`] = { css: `min-width: ${px}`,                                 category: 'Sizing' };
  TW_CLASSES[`max-w-${n}`] = { css: `max-width: ${px}`,                                 category: 'Sizing' };
  TW_CLASSES[`min-h-${n}`] = { css: `min-height: ${px}`,                                category: 'Sizing' };
  TW_CLASSES[`max-h-${n}`] = { css: `max-height: ${px}`,                                category: 'Sizing' };

  TW_CLASSES[`top-${n}`]    = { css: `top: ${px}`,    category: 'Position' };
  TW_CLASSES[`right-${n}`]  = { css: `right: ${px}`,  category: 'Position' };
  TW_CLASSES[`bottom-${n}`] = { css: `bottom: ${px}`, category: 'Position' };
  TW_CLASSES[`left-${n}`]   = { css: `left: ${px}`,   category: 'Position' };
  TW_CLASSES[`inset-${n}`]  = { css: `inset: ${px}`,  category: 'Position' };
}

// Sizing specials
for (const [cls, css] of [
  ['w-auto', 'width: auto'], ['w-full', 'width: 100%'], ['w-screen', 'width: 100vw'],
  ['w-min', 'width: min-content'], ['w-max', 'width: max-content'], ['w-fit', 'width: fit-content'],
  ['h-auto', 'height: auto'], ['h-full', 'height: 100%'], ['h-screen', 'height: 100vh'],
  ['h-min', 'height: min-content'], ['h-max', 'height: max-content'], ['h-fit', 'height: fit-content'],
  ['max-w-xs', 'max-width: 320px'], ['max-w-sm', 'max-width: 384px'], ['max-w-md', 'max-width: 448px'],
  ['max-w-lg', 'max-width: 512px'], ['max-w-xl', 'max-width: 576px'], ['max-w-2xl', 'max-width: 672px'],
  ['max-w-3xl', 'max-width: 768px'], ['max-w-4xl', 'max-width: 896px'], ['max-w-5xl', 'max-width: 1024px'],
  ['max-w-6xl', 'max-width: 1152px'], ['max-w-7xl', 'max-width: 1280px'],
  ['max-w-full', 'max-width: 100%'], ['max-w-screen-sm', 'max-width: 640px'],
  ['max-w-screen-md', 'max-width: 768px'], ['max-w-screen-lg', 'max-width: 1024px'],
  ['max-w-screen-xl', 'max-width: 1280px'], ['max-w-screen-2xl', 'max-width: 1536px'],
] as [string, string][]) {
  TW_CLASSES[cls] = { css, category: 'Sizing' };
}

// Typography — font size
for (const [size, fs, lh] of [
  ['xs', '12px', '16px'], ['sm', '14px', '20px'], ['base', '16px', '24px'],
  ['lg', '18px', '28px'], ['xl', '20px', '28px'], ['2xl', '24px', '32px'],
  ['3xl', '30px', '36px'], ['4xl', '36px', '40px'], ['5xl', '48px', '1'],
  ['6xl', '60px', '1'], ['7xl', '72px', '1'], ['8xl', '96px', '1'], ['9xl', '128px', '1'],
] as [string, string, string][]) {
  TW_CLASSES[`text-${size}`] = { css: `font-size: ${fs} / line-height: ${lh}`, category: 'Typography' };
}

// Font weight
for (const [name, weight] of [
  ['thin', '100'], ['extralight', '200'], ['light', '300'], ['normal', '400'],
  ['medium', '500'], ['semibold', '600'], ['bold', '700'], ['extrabold', '800'], ['black', '900'],
] as [string, string][]) {
  TW_CLASSES[`font-${name}`] = { css: `font-weight: ${weight}`, category: 'Typography' };
}

// Line height
for (const [name, val] of [
  ['none', '1'], ['tight', '1.25'], ['snug', '1.375'], ['normal', '1.5'],
  ['relaxed', '1.625'], ['loose', '2'],
  ['3', '12px'], ['4', '16px'], ['5', '20px'], ['6', '24px'], ['7', '28px'],
  ['8', '32px'], ['9', '36px'], ['10', '40px'],
] as [string, string][]) {
  TW_CLASSES[`leading-${name}`] = { css: `line-height: ${val}`, category: 'Typography' };
}

// Letter spacing
for (const [name, val] of [
  ['tighter', '-0.05em'], ['tight', '-0.025em'], ['normal', '0em'],
  ['wide', '0.025em'], ['wider', '0.05em'], ['widest', '0.1em'],
] as [string, string][]) {
  TW_CLASSES[`tracking-${name}`] = { css: `letter-spacing: ${val}`, category: 'Typography' };
}

// Border radius
for (const [suffix, val] of [
  ['none', '0px'], ['sm', '2px'], ['', '4px'], ['md', '6px'], ['lg', '8px'],
  ['xl', '12px'], ['2xl', '16px'], ['3xl', '24px'], ['full', '9999px'],
] as [string, string][]) {
  const cls = suffix ? `rounded-${suffix}` : 'rounded';
  TW_CLASSES[cls] = { css: `border-radius: ${val}`, category: 'Border' };
}

// Border width
for (const [suffix, val] of [
  ['', '1px'], ['0', '0px'], ['2', '2px'], ['4', '4px'], ['8', '8px'],
] as [string, string][]) {
  const cls = suffix ? `border-${suffix}` : 'border';
  TW_CLASSES[cls] = { css: `border-width: ${val}`, category: 'Border' };
}

// Opacity
for (const n of [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]) {
  TW_CLASSES[`opacity-${n}`] = { css: `opacity: ${n / 100}`, category: 'Effects' };
}

// Z-index
for (const [n, v] of [['0','0'],['10','10'],['20','20'],['30','30'],['40','40'],['50','50'],['auto','auto']] as [string,string][]) {
  TW_CLASSES[`z-${n}`] = { css: `z-index: ${v}`, category: 'Layout' };
}

// Flex / grid gap aliases already covered above
// Space between
for (const [n, px] of SPACING) {
  TW_CLASSES[`space-x-${n}`] = { css: `margin-left: ${px} (between children)`, category: 'Spacing' };
  TW_CLASSES[`space-y-${n}`] = { css: `margin-top: ${px} (between children)`,  category: 'Spacing' };
}

export function getTwSuggestions(query: string): string[] {
  const q = query.toLowerCase();
  if (!q) return Object.keys(TW_CLASSES).slice(0, 40);
  const starts   = Object.keys(TW_CLASSES).filter(c =>  c.startsWith(q));
  const contains = Object.keys(TW_CLASSES).filter(c => !c.startsWith(q) && c.includes(q));
  const byCss    = Object.keys(TW_CLASSES).filter(c => !c.startsWith(q) && !c.includes(q) && TW_CLASSES[c].css.toLowerCase().includes(q));
  return [...starts, ...contains, ...byCss].slice(0, 40);
}

export function getTwHint(cls: string): string | null {
  return TW_CLASSES[cls]?.css ?? null;
}

export function getTwCategory(cls: string): string | null {
  return TW_CLASSES[cls]?.category ?? null;
}
