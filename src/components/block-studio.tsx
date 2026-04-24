'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CATEGORY_ORDER, CATEGORY_META } from '@/lib/block-presets';
import { applyThemeTypography, flattenVarsFromCollections, type VarItem } from '@/lib/theme-typography';
import {
  SLOT_TYPE_LABELS,
  SLOT_FORMAT_PRESETS,
  type SlotSchema,
  type SlotType,
  type SlotTypeDef,
} from '@/lib/slots';
import { BLOCK_RUNTIME } from '@/lib/block-runtime';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
type MonacoEditorInstance = any;
type MonacoNamespace = any;

type Viewport = 'desktop' | 'tablet' | 'mobile';
type Shape = 'single' | 'list';
type Kind = 'template' | 'component';

const VP_LABELS: Record<Viewport, string> = {
  desktop: '1280 × auto',
  tablet: '768 × 1024',
  mobile: '375 × 812'
};

const SAMPLE_SINGLE = `<section className="py-16 bg-white">
  <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 gap-10 items-center">
    <div>
      <span className="chip bg-accent-soft text-accent">{{badge}}</span>
      <h1 className="display text-4xl mt-4">{{title}}</h1>
      <p className="text-neutral-600 mt-3 leading-relaxed">{{description}}</p>
      <a href="{{cta_url}}" className="inline-flex px-4 py-2 mt-5 bg-ink-950 text-paper rounded-md text-sm">
        {{cta_label}}
      </a>
    </div>
    <img src="{{image}}" alt="" className="rounded-2xl" />
  </div>
</section>`;

const SAMPLE_LIST = `<div className="grid grid-cols-3 gap-4">
  {{#each rows}}
    <div className="border border-neutral-200 rounded-md p-4">
      <img src="{{avatar}}" alt="" className="w-16 h-16 rounded-full mb-3" />
      <div className="font-semibold">{{name}}</div>
      <div className="text-[12px] text-neutral-500">{{role}}</div>
    </div>
  {{/each}}
</div>`;

const SAMPLE_COMPONENT = `'use client';
import React, { useState } from 'react';

export const propSchema = {
  title:       { type: 'string', fallback: 'Hello' },
  description: { type: 'string', fallback: 'Edit me' },
};

export default function Block({ title, description }) {
  const [count, setCount] = useState(0);
  return (
    <section className="py-12 bg-white">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="display text-3xl">{title}</h2>
        <p className="text-neutral-600 mt-3">{description}</p>
        <button
          onClick={() => setCount(c => c + 1)}
          className="mt-5 px-4 py-2 bg-ink-950 text-paper rounded-md text-sm"
        >
          Clicked {count} times
        </button>
      </div>
    </section>
  );
}
`;

export function BlockStudio({
  initial,
  mode
}: {
  initial: { id?: string; name: string; title?: string | null; description?: string | null; source: string; kind?: Kind | null; shape?: Shape | null; slotSchema?: SlotSchema | null; category?: string | null; themeId?: string | null };
  // collections + field map still accepted by the server page for future use, but no longer needed here.
  collections?: Array<{ name: string; label: string }>;
  collectionFieldsByName?: Record<string, string[]>;
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [title, setTitle] = useState(initial.title ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [category, setCategory] = useState(initial.category ?? '');
  const [kind, setKind] = useState<Kind>(initial.kind === 'component' ? 'component' : 'template');
  const [shape, setShape] = useState<Shape>(initial.shape === 'list' ? 'list' : 'single');
  const [slotSchema, setSlotSchema] = useState<SlotSchema>(initial.slotSchema ?? {});
  const [source, setSource] = useState(initial.source || (initial.kind === 'component' ? SAMPLE_COMPONENT : SAMPLE_SINGLE));
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [themeId, setThemeId] = useState<string>(initial.themeId ?? '');
  const [themes, setThemes] = useState<Array<{ id: string; name: string; tokens: any }>>([]);
  const [allVars, setAllVars] = useState<VarItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [tRes, vRes] = await Promise.all([
          fetch('/api/themes'),
          fetch('/api/variable-collections')
        ]);
        if (tRes.ok) setThemes(await tRes.json());
        if (vRes.ok) {
          const cols = await vRes.json();
          setAllVars(flattenVarsFromCollections(Array.isArray(cols) ? cols : []));
        }
      } catch {}
    })();
  }, []);

  const activeTheme = themes.find((t) => t.id === themeId);
  const typeBindings: Record<string, string> = activeTheme?.tokens?.typeBindings ?? {};

  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoNamespace | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const [editorHeight, setEditorHeight] = useState(300);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartHRef = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = dragStartYRef.current - e.clientY;
      setEditorHeight(Math.max(60, Math.min(700, dragStartHRef.current + delta)));
    };
    const onUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartHRef.current = editorHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // Detect `{{#each rows}} ... {{/each}}` region for list mode.
  const eachMatch = useMemo(() => source.match(/\{\{#each\s+rows\}\}([\s\S]*?)\{\{\/each\}\}/), [source]);
  const rowTemplate = eachMatch ? eachMatch[1] : source;
  const hasEachBlock = !!eachMatch;

  const detectedSlots = useMemo(() => {
    if (kind === 'component') {
      // Parse propSchema object literal from source — same regex the server uses.
      const m = source.match(/export\s+const\s+propSchema\s*=\s*(\{[\s\S]*?\n\})\s*;?/);
      if (!m) return [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        const obj = new Function('return ' + m[1])();
        return Object.keys(obj ?? {});
      } catch {
        return [];
      }
    }
    const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    const out = new Set<string>();
    const scanText = shape === 'list' ? rowTemplate : source;
    let m: RegExpExecArray | null;
    while ((m = re.exec(scanText)) !== null) out.add(m[1]);
    return [...out];
  }, [source, rowTemplate, shape, kind]);

  // Preview: render row placeholders `[slot]`; for list shape, repeat 3×.
  const preview = useMemo(() => {
    const fillRow = (tmpl: string) =>
      tmpl.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, name) => `[${name}]`);
    let html: string;
    if (shape === 'list') {
      const rows = Array.from({ length: 3 }, () => fillRow(rowTemplate)).join('\n');
      html = hasEachBlock
        ? source.replace(/\{\{#each\s+rows\}\}[\s\S]*?\{\{\/each\}\}/, rows)
        : rows;
    } else {
      html = fillRow(source);
    }
    html = html.replace(/className=/g, 'class=');
    return applyThemeTypography(html, typeBindings, allVars);
  }, [source, shape, rowTemplate, hasEachBlock, typeBindings, allVars]);

  // Paint slot highlights + `{{#each}}` tag highlights in Monaco.
  const applySlotDecorations = () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;
    const text: string = model.getValue();
    const decorations: any[] = [];
    const slotRe = /\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = slotRe.exec(text)) !== null) {
      const start = model.getPositionAt(m.index);
      const end = model.getPositionAt(m.index + m[0].length);
      decorations.push({
        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
        options: { inlineClassName: 'monaco-slot-highlight' }
      });
    }
    const eachRe = /\{\{#each\s+rows\}\}|\{\{\/each\}\}/g;
    while ((m = eachRe.exec(text)) !== null) {
      const start = model.getPositionAt(m.index);
      const end = model.getPositionAt(m.index + m[0].length);
      decorations.push({
        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
        options: { inlineClassName: 'monaco-each-highlight' }
      });
    }
    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations);
  };

  useEffect(() => { applySlotDecorations(); }, [source]);

  async function save() {
    setSaving(true);
    setError(null);
    setCompileError(null);
    try {
      const prunedSchema: SlotSchema = {};
      for (const s of detectedSlots) {
        if (slotSchema[s]) prunedSchema[s] = slotSchema[s];
      }
      const payload: any = {
        source,
        kind,
        shape,
        slotSchema: Object.keys(prunedSchema).length ? prunedSchema : null,
        title: title || null,
        description: description || null,
        category: category || null,
        themeId: themeId || null,
        ...(mode === 'create' ? { name } : { name: name || undefined })
      };
      const res = await fetch(
        mode === 'create' ? '/api/blocks' : `/api/blocks/${initial.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 422 && body?.error?.compile) {
          setCompileError((body.error.compile as string[]).join('\n'));
          return;
        }
        throw new Error(JSON.stringify(body.error ?? body));
      }
      router.push('/blocks');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!initial.id || !confirm('Delete block?')) return;
    await fetch(`/api/blocks/${initial.id}`, { method: 'DELETE' });
    router.push('/blocks');
    router.refresh();
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setSource(text);
    } catch {}
  }

  const loadSample = () => {
    setSource(shape === 'list' ? SAMPLE_LIST : SAMPLE_SINGLE);
  };

  const listLintWarn = shape === 'list' && !hasEachBlock;

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-neutral-200 bg-white/60 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/blocks" className="text-xs text-neutral-400 hover:text-neutral-700">
            Block studio
          </Link>
          <span className="text-xs text-neutral-400">›</span>
          <input
            value={title || name}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Block title"
            className="display text-lg bg-transparent focus:outline-none focus:ring-0 min-w-[140px] max-w-[280px]"
          />
          <span className={cn('chip', kind === 'component' ? 'bg-emerald-50 text-emerald-700' : shape === 'list' ? 'bg-purple-50 text-purple-700' : 'bg-accent-soft text-accent')}>
            {kind === 'component' ? 'React component' : shape === 'list' ? 'List template' : 'Single template'}
          </span>
          <span className="chip bg-neutral-100 text-neutral-500">
            {detectedSlots.length} slot{detectedSlots.length === 1 ? '' : 's'}
          </span>
          <span className="chip bg-ok/10 text-ok" title="Every block ships responsive by default.">
            Responsive by default
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <ViewportSwitch viewport={viewport} onChange={setViewport} />
          <span className="text-neutral-400 mono">{VP_LABELS[viewport]}</span>
          <span className="w-px h-5 bg-neutral-200" />
          {mode === 'edit' && (
            <button
              type="button"
              onClick={destroy}
              className="px-2.5 py-1 text-[11px] rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !name || !source}
            className="px-2.5 py-1 bg-ink-950 text-paper rounded-md disabled:opacity-50"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Save to library' : 'Save changes'}
          </button>
          <Link href="/blocks" className="px-2 py-1 text-neutral-400 hover:text-neutral-700" title="Close">
            ✕
          </Link>
        </div>
      </header>

      {error && (
        <div className="px-6 py-2 bg-danger/5 border-b border-danger/20 text-xs text-danger mono shrink-0">
          {error}
        </div>
      )}
      {compileError && (
        <div className="px-6 py-2 bg-danger/5 border-b border-danger/20 text-[11px] text-danger mono shrink-0 whitespace-pre-wrap">
          Compile failed:
          {'\n'}{compileError}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN — VSCode-style tabs between Preview and Code */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-neutral-200">
          {/* Tab bar */}
          <div className="shrink-0 flex items-stretch bg-[#1e1e1e] border-b border-black/40 text-[12px] text-white/70">
            <button
              type="button"
              onClick={() => setView('preview')}
              className={cn(
                'px-4 py-2 flex items-center gap-2 border-r border-black/40',
                view === 'preview'
                  ? 'bg-neutral-100 text-ink-950'
                  : 'hover:bg-white/5'
              )}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-80">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview
            </button>
            <button
              type="button"
              onClick={() => setView('code')}
              className={cn(
                'px-4 py-2 flex items-center gap-2 border-r border-black/40',
                view === 'code'
                  ? 'bg-[#1e1e1e] text-white border-t-2 border-t-accent'
                  : 'hover:bg-white/5'
              )}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-80">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              Code
              <span className="chip bg-white/10 text-white/60 text-[10px]">
                {kind === 'component' ? 'TSX' : 'JSX'}
              </span>
            </button>
            {/* Right-side actions, contextual to active tab */}
            <div className="ml-auto flex items-center gap-2 pr-3 text-[11px]">
              {view === 'code' ? (
                <>
                  <span className={cn('w-2 h-2 rounded-full', detectedSlots.length > 0 ? 'bg-ok' : 'bg-neutral-500')} />
                  <span className="text-white/60">
                    {detectedSlots.length > 0
                      ? `${detectedSlots.length} slot${detectedSlots.length === 1 ? '' : 's'}`
                      : 'No slots'}
                  </span>
                  <button type="button" onClick={loadSample} className="text-white/50 hover:text-white" title="Load sample template">
                    Sample
                  </button>
                  <button type="button" onClick={paste} className="text-white/50 hover:text-white" title="Paste from clipboard">
                    Paste
                  </button>
                  {kind === 'template' && (
                    <button type="button" onClick={applySlotDecorations} className="text-accent hover:text-accent/80">
                      Detect slots
                    </button>
                  )}
                </>
              ) : (
                <span className="text-white/40 mono">
                  {kind === 'component'
                    ? 'live React render'
                    : shape === 'list'
                    ? 'row template ×3'
                    : 'placeholders'}
                </span>
              )}
            </div>
          </div>

          {/* Preview pane */}
          {view === 'preview' && (
            <div className="flex-1 overflow-auto scrollbar bg-neutral-100 flex flex-col min-h-0">
              <div className="flex-1 p-6">
                <div
                  className={cn(
                    'vp-frame bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden',
                    viewport === 'desktop' && 'vp-desktop',
                    viewport === 'tablet' && 'vp-tablet',
                    viewport === 'mobile' && 'vp-mobile'
                  )}
                >
                  <div className="px-4 py-2 text-[11px] text-neutral-500 border-b border-neutral-100 flex items-center justify-between">
                    <span>
                      {kind === 'component'
                        ? 'Live React render with fallback prop values'
                        : shape === 'list'
                        ? 'Row template repeated 3× with placeholder values'
                        : 'Placeholders shown'}
                    </span>
                    <span className="mono text-neutral-400">{viewport}</span>
                  </div>
                  {kind === 'component' ? (
                    <div className="p-6">
                      <ComponentPreview source={source} slotNames={detectedSlots} slotSchema={slotSchema} />
                    </div>
                  ) : (
                    <div className="p-6" dangerouslySetInnerHTML={{ __html: preview }} />
                  )}
                </div>
                <div className="mt-3 text-[11px] text-neutral-500 flex items-center gap-3">
                  <span>Callers bind a collection + map slots on the page editor.</span>
                  <span>·</span>
                  <span>
                    {kind === 'component'
                      ? 'Hydrates on the client (interactive)'
                      : 'Renders as static HTML (fast), cache-safe'}
                  </span>
                </div>
              </div>

              {/* Detected slots strip */}
              <div className="border-t border-neutral-200 bg-white px-4 py-2 flex items-center gap-2 text-[11px] text-neutral-500 shrink-0 overflow-auto scrollbar">
                <span className="mr-1">Detected slots</span>
                {detectedSlots.length === 0 && (
                  <span className="text-neutral-400 italic">
                    {kind === 'component'
                      ? 'none — declare keys in export const propSchema = { … }'
                      : 'none — add {{slot_name}} to the source'}
                  </span>
                )}
                {detectedSlots.map((s) => (
                  <span key={s} className="chip bg-neutral-100 text-neutral-500">
                    {'{' + s + '}'}
                  </span>
                ))}
                {kind === 'template' && shape === 'list' && (
                  <span className={cn('chip ml-2', hasEachBlock ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn')}>
                    {hasEachBlock ? '{{#each rows}} found' : 'whole template will repeat per row'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Code pane */}
          {view === 'code' && (
          <div className="flex-1 bg-[#1e1e1e] text-white flex flex-col min-h-0">
            {kind === 'template' && listLintWarn && (
              <div className="px-4 py-1.5 border-b border-white/10 text-[11px] text-warn">
                Tip: wrap rows in <code className="mono">{'{{#each rows}} … {{/each}}'}</code>
              </div>
            )}
            <div className="flex-1 min-h-0">
              <MonacoEditor
                height="100%"
                language={kind === 'component' ? 'typescript' : 'html'}
                theme="vs-dark"
                value={source}
                onChange={(v) => setSource(v ?? '')}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
                  try {
                    const ts = monaco.languages.typescript.typescriptDefaults;
                    ts.setCompilerOptions({
                      target: monaco.languages.typescript.ScriptTarget.ESNext,
                      module: monaco.languages.typescript.ModuleKind.ESNext,
                      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
                      allowNonTsExtensions: true,
                      allowJs: true,
                      esModuleInterop: true,
                      allowSyntheticDefaultImports: true,
                      noEmit: true,
                    });
                    ts.setDiagnosticsOptions({
                      noSemanticValidation: true,
                      noSyntaxValidation: false,
                      noSuggestionDiagnostics: true,
                    });
                  } catch {}
                  applySlotDecorations();
                }}
                options={{
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  renderLineHighlight: 'none',
                  padding: { top: 12, bottom: 12 },
                  tabSize: 2
                }}
              />
            </div>
          </div>
          )}
        </div>

        {/* RIGHT — Block info */}
        <aside className="w-80 border-l border-neutral-200 bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-200 space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">Block info</div>
            <div>
              <label className="text-[10px] text-neutral-400">Slug (machine name)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-'))}
                placeholder="my-block-name"
                className="mt-0.5 w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[12px] mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description shown in the block library"
                className="mt-0.5 w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[12px]"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400">Category</label>
              <input
                list="block-category-options"
                value={category}
                onChange={(e) => setCategory(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-'))}
                placeholder="— uncategorised —"
                className="mt-0.5 w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[12px]"
              />
              <datalist id="block-category-options">
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                ))}
              </datalist>
              <p className="text-[10px] text-neutral-400 mt-1">Pick an existing category or type a new one.</p>
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 flex items-center justify-between">
                <span>Theme</span>
                <span className="text-neutral-400">optional</span>
              </label>
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value)}
                className="mt-0.5 w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[12px] bg-white"
              >
                <option value="">— none (raw Tailwind only) —</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Kind toggle */}
          <div className="p-4 border-b border-neutral-200">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">Kind</div>
            <div className="inline-flex items-center bg-neutral-100 rounded-md p-0.5 w-full">
              <button
                type="button"
                onClick={() => {
                  setKind('template');
                  if (!source || source === SAMPLE_COMPONENT) setSource(shape === 'list' ? SAMPLE_LIST : SAMPLE_SINGLE);
                }}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded text-[12px]',
                  kind === 'template' ? 'bg-white shadow-sm font-medium' : 'text-neutral-500'
                )}
              >
                Template
              </button>
              <button
                type="button"
                onClick={() => {
                  setKind('component');
                  if (!source || source === SAMPLE_SINGLE || source === SAMPLE_LIST) setSource(SAMPLE_COMPONENT);
                }}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded text-[12px]',
                  kind === 'component' ? 'bg-white shadow-sm font-medium' : 'text-neutral-500'
                )}
              >
                Component
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
              {kind === 'template'
                ? 'HTML/JSX string with {{slot}} placeholders — fast, static, cache-safe.'
                : 'Paste a React component. Declare slots with export const propSchema = {…}. Runs client-side on published pages.'}
            </p>
          </div>

          {/* Shape toggle — hidden for component kind */}
          {kind === 'template' && (
          <div className="p-4 border-b border-neutral-200">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">Shape</div>
            <div className="inline-flex items-center bg-neutral-100 rounded-md p-0.5 w-full">
              <button
                type="button"
                onClick={() => setShape('single')}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded text-[12px]',
                  shape === 'single' ? 'bg-white shadow-sm font-medium' : 'text-neutral-500'
                )}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => setShape('list')}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded text-[12px]',
                  shape === 'list' ? 'bg-white shadow-sm font-medium' : 'text-neutral-500'
                )}
              >
                List
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
              {shape === 'single'
                ? 'Renders once. Each slot resolves to one value (a literal, or a field on a single record).'
                : 'Renders per-row. Wrap the repeating markup in {{#each rows}} … {{/each}} — slots inside resolve per-record.'}
            </p>
          </div>
          )}

          {/* Detected slots — type + format editor */}
          <div className="p-4 border-b border-neutral-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Slots detected in source
            </div>
            {detectedSlots.length === 0 ? (
              <p className="text-[11px] text-neutral-400">
                No slots declared yet. Use <code className="mono">{'{{name}}'}</code> in the source.
              </p>
            ) : (
              <>
                <p className="text-[11px] text-neutral-500 mb-3 leading-relaxed">
                  Declare the type + display format here — it's enforced at every placement and applied when the page renders.
                </p>
                <div className="space-y-2.5">
                  {detectedSlots.map((slot) => (
                    <SlotSchemaRow
                      key={slot}
                      slot={slot}
                      def={slotSchema[slot]}
                      onChange={(def) =>
                        setSlotSchema((prev) => {
                          const next = { ...prev };
                          if (!def) delete next[slot];
                          else next[slot] = def;
                          return next;
                        })
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-4 flex-1 overflow-auto scrollbar">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Binding
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Blocks are collection-agnostic. When you drop this block on a page, the page editor lets you bind it to
              the page's default collection (or any collection related to it) and map slots → fields.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SlotSchemaRow({
  slot,
  def,
  onChange,
}: {
  slot: string;
  def: SlotTypeDef | undefined;
  onChange: (def: SlotTypeDef | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const effective: SlotTypeDef = def ?? { type: 'string' };
  const presets = SLOT_FORMAT_PRESETS[effective.type] ?? [];
  const hasFormat = presets.length > 0 || effective.type === 'number' || effective.type === 'date';

  const update = (patch: Partial<SlotTypeDef>) => {
    const merged: SlotTypeDef = { ...effective, ...patch };
    // Clear format when type changes to one without formatters.
    if (patch.type && (patch.type === 'string' || patch.type === 'link' || patch.type === 'image' || patch.type === 'richtext')) {
      merged.format = undefined;
    }
    onChange(merged);
  };

  return (
    <div className="border border-neutral-200 rounded-md bg-neutral-50/50">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <code className="mono text-[11px] px-1.5 py-0.5 rounded bg-accent/10 text-accent shrink-0">
            {'{' + slot + '}'}
          </code>
          <span className="text-[11px] text-neutral-500 truncate">
            {SLOT_TYPE_LABELS[effective.type]}
            {effective.format ? ` · ${effective.format}` : ''}
          </span>
        </div>
        <span className="text-neutral-400 text-[11px] shrink-0">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-neutral-200 pt-2">
          <div>
            <label className="text-[10px] text-neutral-400">Type</label>
            <select
              value={effective.type}
              onChange={(e) => update({ type: e.target.value as SlotType })}
              className="mt-0.5 w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[12px] bg-white"
            >
              {(Object.keys(SLOT_TYPE_LABELS) as SlotType[]).map((t) => (
                <option key={t} value={t}>{SLOT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          {hasFormat && (
            <div>
              <label className="text-[10px] text-neutral-400">Format</label>
              {presets.length > 0 ? (
                <select
                  value={effective.format ?? ''}
                  onChange={(e) => update({ format: e.target.value || undefined })}
                  className="mt-0.5 w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[12px] bg-white"
                >
                  <option value="">— raw value —</option>
                  {presets.map((p) => (
                    <option key={p.value} value={p.value}>{p.label} — {p.value}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={effective.format ?? ''}
                  onChange={(e) => update({ format: e.target.value || undefined })}
                  placeholder="e.g. yyyy-MM-dd"
                  className="mt-0.5 w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[12px] mono"
                />
              )}
            </div>
          )}
          <div>
            <label className="text-[10px] text-neutral-400">Fallback</label>
            <input
              value={effective.fallback ?? ''}
              onChange={(e) => update({ fallback: e.target.value || undefined })}
              placeholder="shown when value is empty"
              className="mt-0.5 w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[12px]"
            />
          </div>
          {def && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[11px] text-neutral-400 hover:text-danger"
            >
              Reset to defaults
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function sampleValueFor(def: SlotTypeDef | undefined, name: string): unknown {
  if (def?.fallback !== undefined && def.fallback !== '') return def.fallback;
  switch (def?.type) {
    case 'number':    return 0;
    case 'boolean':   return true;
    case 'date':      return new Date().toISOString();
    case 'image':     return { url: 'https://placehold.co/800x450', alt: name };
    case 'link':      return { href: '#', label: name };
    case 'richtext':
    case 'string':
    default:          return `[${name}]`;
  }
}

class ComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-4 border border-dashed border-red-400 rounded-md text-xs text-red-700 mono whitespace-pre-wrap">
          Render error: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

function ComponentPreview({ source, slotNames, slotSchema }: { source: string; slotNames: string[]; slotSchema: SlotSchema }) {
  const [rendered, setRendered] = useState<React.ReactElement | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { compileBlock } = await import('@/lib/compile-block');
        const result = compileBlock(source);
        if (cancelled) return;
        if (result.errors.length) {
          setErr(result.errors.join('\n'));
          setRendered(null);
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        const factory = new Function('RT', result.compiled) as (rt: typeof BLOCK_RUNTIME) => { default: React.ComponentType<any> };
        const mod = factory(BLOCK_RUNTIME);
        const props: Record<string, unknown> = {};
        for (const name of slotNames) props[name] = sampleValueFor(slotSchema[name], name);
        setErr(null);
        setRendered(React.createElement(mod.default, props));
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? String(e));
          setRendered(null);
        }
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [source, JSON.stringify(slotSchema), slotNames.join('|')]);

  if (err) {
    return (
      <div className="p-4 border border-dashed border-red-400 rounded-md text-xs text-red-700 mono whitespace-pre-wrap">
        Compile error:{'\n'}{err}
      </div>
    );
  }
  if (!rendered) {
    return <div className="p-4 text-xs text-neutral-400">Compiling…</div>;
  }
  return <ComponentErrorBoundary resetKey={source}>{rendered}</ComponentErrorBoundary>;
}

function ViewportSwitch({
  viewport,
  onChange
}: {
  viewport: Viewport;
  onChange: (v: Viewport) => void;
}) {
  const Btn = ({ v, label, icon }: { v: Viewport; label: string; icon: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      className={cn(
        'vp-btn px-2.5 py-1 rounded flex items-center gap-1.5',
        viewport === v && 'vp-btn-active'
      )}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
  return (
    <div className="inline-flex items-center bg-neutral-100 rounded-md p-0.5">
      <Btn
        v="desktop"
        label="Desktop"
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="13" rx="2" />
            <path d="M8 20h8M12 17v3" />
          </svg>
        }
      />
      <Btn
        v="tablet"
        label="Tablet"
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M11 18h2" />
          </svg>
        }
      />
      <Btn
        v="mobile"
        label="Mobile"
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <path d="M11 18h2" />
          </svg>
        }
      />
    </div>
  );
}
