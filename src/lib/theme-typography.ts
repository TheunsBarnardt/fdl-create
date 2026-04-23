// Applies a theme's typography bindings to raw HTML by injecting inline
// styles onto matching semantic tags. Used by both the Block Studio live
// preview (client) and the published page renderer (server).

import { getTwHint } from '@/lib/tailwind-classes';

export type VarItem = {
  name: string; // e.g. "display-2xl/book/font-size"
  type: string;
  value: string | { light: string; dark: string };
};

function resolveToCssValue(v: VarItem): string {
  const raw = typeof v.value === 'string' ? v.value : v.value?.light ?? '';
  if (v.type === 'tailwind') {
    const hint = getTwHint(raw);
    if (!hint) return raw;
    const firstPart = hint.split(';')[0].split('/')[0].trim();
    const idx = firstPart.indexOf(':');
    return idx >= 0 ? firstPart.slice(idx + 1).trim() : raw;
  }
  return raw;
}

function buildInlineStyle(groupPath: string, allVars: VarItem[]): string {
  if (!groupPath) return '';
  const decls: string[] = [];
  for (const gv of allVars) {
    const parts = gv.name.split('/');
    if (parts.slice(0, -1).join('/') !== groupPath) continue;
    const prop = parts[parts.length - 1];
    const val = resolveToCssValue(gv);
    if (val) decls.push(`${prop}: ${val}`);
  }
  return decls.join('; ');
}

// Inject inline style on the FIRST occurrence of each bound tag.
// If multiple tags exist, all are styled. Inline styles win over Tailwind
// classes by specificity, so users can strip redundant utility classes at
// their leisure without fighting the theme.
export function applyThemeTypography(
  html: string,
  typeBindings: Record<string, string> | null | undefined,
  vars: VarItem[] | null | undefined
): string {
  if (!html || !typeBindings || !vars || Object.keys(typeBindings).length === 0) {
    return html;
  }
  let out = html;
  for (const [element, groupPath] of Object.entries(typeBindings)) {
    if (!groupPath) continue;
    const style = buildInlineStyle(groupPath, vars);
    if (!style) continue;
    const tagRe = new RegExp(`<(${element})(\\s[^>]*?)?(/?)>`, 'gi');
    out = out.replace(tagRe, (_m, tag, attrs = '', selfClose = '') => {
      const a: string = attrs || '';
      const styleMatch = a.match(/\sstyle\s*=\s*"([^"]*)"/i);
      if (styleMatch) {
        const merged = `${styleMatch[1].replace(/;\s*$/, '')}; ${style}`;
        const newAttrs = a.replace(styleMatch[0], ` style="${merged}"`);
        return `<${tag}${newAttrs}${selfClose}>`;
      }
      return `<${tag}${a} style="${style}"${selfClose}>`;
    });
  }
  return out;
}

export function flattenVarsFromCollections(cols: Array<{ variables?: VarItem[] }>): VarItem[] {
  return (cols || []).flatMap((c) => c.variables || []);
}
