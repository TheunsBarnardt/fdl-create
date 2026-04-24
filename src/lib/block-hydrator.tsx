'use client';

// Client-side hydrator for component blocks on published pages.
//
// Server-side renderer emits `<div data-fdl-block="<id>" data-fdl-props="<b64-json>" />`
// placeholders. This component, mounted once at the end of the rendered tree,
// scans for those nodes, evaluates the compiled JS for each unique block once,
// and mounts the React element into each placeholder.

import { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BLOCK_RUNTIME } from '@/lib/block-runtime';

type CompiledModule = {
  default: React.ComponentType<any>;
  propSchema?: Record<string, unknown>;
};

const evaluatedCache = new Map<string, CompiledModule | null>();
const mountedRoots = new WeakMap<Element, Root>();

function evaluateBlock(id: string, compiled: string): CompiledModule | null {
  if (evaluatedCache.has(id)) return evaluatedCache.get(id) ?? null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const factory = new Function('RT', compiled) as (rt: typeof BLOCK_RUNTIME) => CompiledModule;
    const mod = factory(BLOCK_RUNTIME);
    evaluatedCache.set(id, mod);
    return mod;
  } catch (err) {
    console.error(`[block-hydrator] Failed to evaluate block ${id}:`, err);
    evaluatedCache.set(id, null);
    return null;
  }
}

function decodeProps(encoded: string): Record<string, unknown> {
  try {
    const json = typeof atob === 'function' ? atob(encoded) : Buffer.from(encoded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function BlockHydrator({ blocks }: { blocks: Record<string, string> }) {
  useEffect(() => {
    const placeholders = document.querySelectorAll<HTMLElement>('[data-fdl-block][data-fdl-props]');
    placeholders.forEach((el) => {
      const id = el.getAttribute('data-fdl-block');
      const propsAttr = el.getAttribute('data-fdl-props');
      if (!id || !propsAttr) return;
      if (mountedRoots.has(el)) return; // already mounted

      const compiled = blocks[id];
      if (!compiled) {
        el.innerHTML = `<div style="padding:1rem;border:1px dashed #ef4444;color:#b91c1c;font-size:.75rem">Component block "${id}" has no compiled code.</div>`;
        return;
      }
      const mod = evaluateBlock(id, compiled);
      if (!mod) {
        el.innerHTML = `<div style="padding:1rem;border:1px dashed #ef4444;color:#b91c1c;font-size:.75rem">Component block "${id}" failed to evaluate — see console.</div>`;
        return;
      }

      const props = decodeProps(propsAttr);
      try {
        const root = createRoot(el);
        root.render(BLOCK_RUNTIME.React.createElement(mod.default, props));
        mountedRoots.set(el, root);
      } catch (err) {
        console.error(`[block-hydrator] Render failed for block ${id}:`, err);
      }
    });

    return () => {
      placeholders.forEach((el) => {
        const root = mountedRoots.get(el);
        if (root) {
          try { root.unmount(); } catch {}
          mountedRoots.delete(el);
        }
      });
    };
  }, [blocks]);

  return null;
}
