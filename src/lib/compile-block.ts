// Server-side TSX → JS compiler for component blocks.
//
// Flow:
//   1. Strip `'use client'` (informational only — all blocks execute client-side).
//   2. Rewrite allowlisted imports into destructures from the runtime closure `RT`.
//      Unknown imports → compile error.
//   3. sucrase transforms TSX → JS (types stripped, JSX → createElement).
//   4. Rewrite `export default ...` and `export const ...` into local bindings.
//   5. Append `return { default: __default, propSchema };` so the hydrator can
//      evaluate the compiled JS via `new Function('RT', compiled)(RT)`.
//   6. Extract propSchema at compile time so the studio can populate the slot panel.

import { transform } from 'sucrase';
import type { SlotSchema, SlotType } from './slots';

// Imports the runtime exposes — maps module specifier → allowed named members.
// The compiler replaces each matching `import { x, y } from '<specifier>'`
// with `const { x, y } = RT;`. Default imports (e.g. `import React from 'react'`)
// resolve to `RT.React`.
const IMPORT_ALLOWLIST: Record<string, { defaultExport?: string; named: string[] }> = {
  react: {
    defaultExport: 'React',
    named: ['useState', 'useEffect', 'useRef', 'useId', 'useMemo', 'useCallback', 'useLayoutEffect', 'useReducer', 'Fragment'],
  },
  '@/utilities/scheme': { named: ['getSchemeClasses'] },
  '@/components/admin/components/Media/ImageMedia': { named: ['ImageMedia'] },
  '@/components/ImageMedia': { named: ['ImageMedia'] },
};

export type CompileResult = {
  compiled: string;
  propSchema: SlotSchema;
  errors: string[];
  warnings: string[];
};

export function compileBlock(source: string): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- 1. Strip 'use client' directive ---
  let src = source.replace(/^\s*['"]use client['"]\s*;?\s*\n?/m, '');

  // --- 2. Parse + rewrite imports ---
  // Match: import X from 'Y'; import { a, b } from 'Y'; import X, { a, b } from 'Y';
  // Also strip type-only imports (sucrase handles but regex catches early).
  const importRe = /^\s*import\s+(?:type\s+)?(?:([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:,\s*)?)?(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"];?\s*$/gm;
  const typeOnlyImportRe = /^\s*import\s+type\s+[^;]+;?\s*$/gm;
  src = src.replace(typeOnlyImportRe, '');

  src = src.replace(importRe, (_full, defaultImport, namedBlock, specifier) => {
    const spec = String(specifier);
    const entry = IMPORT_ALLOWLIST[spec];
    if (!entry) {
      errors.push(`Import not allowed: "${spec}". Allowed: ${Object.keys(IMPORT_ALLOWLIST).join(', ')}.`);
      return ''; // continue compile; errors surfaced in result
    }
    const lines: string[] = [];
    if (defaultImport) {
      if (!entry.defaultExport) {
        errors.push(`Default import from "${spec}" is not supported.`);
      } else {
        lines.push(`const ${defaultImport} = RT.${entry.defaultExport};`);
      }
    }
    if (namedBlock) {
      const names = namedBlock
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .map((s: string) => {
          // Drop `type` marker on inline type imports.
          const m = s.match(/^(?:type\s+)?([A-Za-z_$][A-Za-z0-9_$]*)(?:\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*))?$/);
          if (!m) return null;
          const [, orig, alias] = m;
          if (!entry.named.includes(orig)) {
            errors.push(`"${orig}" is not exported from "${spec}". Available: ${entry.named.join(', ')}.`);
            return null;
          }
          return alias ? `${orig}: ${alias}` : orig;
        })
        .filter(Boolean);
      if (names.length) lines.push(`const { ${names.join(', ')} } = RT;`);
    }
    return lines.join('\n');
  });

  // --- 3. sucrase transform ---
  let transformed: string;
  try {
    const out = transform(src, {
      transforms: ['typescript', 'jsx'],
      production: true,
      jsxRuntime: 'classic',
      jsxPragma: 'RT.React.createElement',
      jsxFragmentPragma: 'RT.React.Fragment',
    });
    transformed = out.code;
  } catch (e: any) {
    errors.push(`Compile error: ${e?.message ?? String(e)}`);
    return { compiled: '', propSchema: {}, errors, warnings };
  }

  // --- 4. Rewrite exports ---
  // `export default <expr>` → `var __default = <expr>;`
  // For `export default function X(...) {}` — keep the function but drop the keyword and assign.
  transformed = transformed.replace(
    /export\s+default\s+function\s+([A-Za-z_$][A-Za-z0-9_$]*)?\s*/,
    (_m, name) => {
      const n = name || '__Block';
      return `function ${n}`;
    },
  );
  // Detect the function we just normalized or any remaining `export default <expr>`.
  if (/export\s+default\s+/.test(transformed)) {
    transformed = transformed.replace(/export\s+default\s+/, 'var __default = ');
  } else {
    // Find the last named function declaration to wire as default.
    const fnNames = [...transformed.matchAll(/\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)].map((m) => m[1]);
    const last = fnNames[fnNames.length - 1];
    if (last) transformed += `\nvar __default = ${last};`;
    else errors.push('No default export found — component blocks must `export default` the component.');
  }
  // `export const X = ...` and `export function X(...)` → strip `export`.
  transformed = transformed.replace(/^\s*export\s+(const|let|var|function)\s+/gm, '$1 ');

  // --- 5. Epilogue — return the module object ---
  const hasPropSchema = /\bconst\s+propSchema\s*=|\bvar\s+propSchema\s*=|\blet\s+propSchema\s*=/.test(transformed);
  const epilogue = hasPropSchema
    ? `\nreturn { default: __default, propSchema: propSchema };`
    : `\nreturn { default: __default, propSchema: {} };`;
  const compiled = transformed + epilogue;

  // --- 6. Extract propSchema from the ORIGINAL source for the studio UI ---
  const propSchema = extractPropSchema(source);

  if (Object.keys(propSchema).length === 0 && !hasPropSchema) {
    warnings.push('No propSchema found — declare `export const propSchema = { ... }` to expose slots.');
  }

  return { compiled, propSchema, errors, warnings };
}

// Parses `export const propSchema = { ... };` out of a TSX source string and
// returns the decoded SlotSchema. Uses `new Function('return ...')` in a
// server-side trusted context — the caller is the admin author.
function extractPropSchema(source: string): SlotSchema {
  const m = source.match(/(?:export\s+)?const\s+propSchema\s*(?::\s*[^=]+)?=\s*(\{[\s\S]*?\})\s*(?:as\s+const)?\s*;/);
  if (!m) return {};
  const literal = m[1];
  try {
    // Strip TypeScript `as` assertions inside the literal (e.g., `type: 'string' as const`).
    const cleaned = literal.replace(/\s+as\s+const\b/g, '').replace(/\s+as\s+[A-Za-z_][\w.<>]*/g, '');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const obj = new Function(`return (${cleaned});`)();
    if (!obj || typeof obj !== 'object') return {};
    const out: SlotSchema = {};
    const validTypes: SlotType[] = ['string', 'number', 'date', 'boolean', 'link', 'image', 'document', 'richtext'];
    for (const [k, raw] of Object.entries(obj as Record<string, any>)) {
      if (!raw || typeof raw !== 'object') continue;
      const type = validTypes.includes(raw.type) ? (raw.type as SlotType) : 'string';
      const def: SlotSchema[string] = { type };
      if (typeof raw.format === 'string') def.format = raw.format;
      if (typeof raw.fallback === 'string') def.fallback = raw.fallback;
      out[k] = def;
    }
    return out;
  } catch {
    return {};
  }
}
