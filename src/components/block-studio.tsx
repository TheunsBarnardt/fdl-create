'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
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

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
type MonacoEditorInstance = any;
type MonacoNamespace = any;

type Viewport = 'desktop' | 'tablet' | 'mobile';
type Shape = 'single' | 'list';

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

export function BlockStudio({
  initial,
  mode
}: {
  initial: { id?: string; name: string; title?: string | null; description?: string | null; source: string; shape?: Shape | null; slotSchema?: SlotSchema | null; category?: string | null; themeId?: string | null };
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
  const [shape, setShape] = useState<Shape>(initial.shape === 'list' ? 'list' : 'single');
  const [slotSchema, setSlotSchema] = useState<SlotSchema>(initial.slotSchema ?? {});
  const [source, setSource] = useState(initial.source || SAMPLE_SINGLE);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    const out = new Set<string>();
    // For slots, scan the row template when in list mode (the repeating content), else the whole source.
    const scanText = shape === 'list' ? rowTemplate : source;
    let m: RegExpExecArray | null;
    while ((m = re.exec(scanText)) !== null) out.add(m[1]);
    return [...out];
  }, [source, rowTemplate, shape]);

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
    try {
      // Only persist schema entries for slots currently detected in source.
      const prunedSchema: SlotSchema = {};
      for (const s of detectedSlots) {
        if (slotSchema[s]) prunedSchema[s] = slotSchema[s];
      }
      const payload: any = {
        source,
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
      if (!res.ok) throw new Error(JSON.stringify((await res.json()).error));
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
          <span className={cn('chip', shape === 'list' ? 'bg-purple-50 text-purple-700' : 'bg-accent-soft text-accent')}>
            {shape === 'list' ? 'List template' : 'Single template'}
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

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN — Preview on top, Monaco on bottom */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-neutral-200">
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
                    {shape === 'list'
                      ? 'Preview · row template repeated 3× with placeholder values'
                      : 'Preview · placeholders shown'}
                  </span>
                  <span className="mono text-neutral-400">{viewport}</span>
                </div>
                <div className="p-6" dangerouslySetInnerHTML={{ __html: preview }} />
              </div>
              <div className="mt-3 text-[11px] text-neutral-500 flex items-center gap-3">
                <span>Callers bind a collection + map slots on the page editor.</span>
                <span>·</span>
                <span>Renders as static HTML (fast), cache-safe</span>
              </div>
            </div>

            {/* Detected slots strip */}
            <div className="border-t border-neutral-200 bg-white px-4 py-2 flex items-center gap-2 text-[11px] text-neutral-500 shrink-0 overflow-auto scrollbar">
              <span className="mr-1">Detected slots</span>
              {detectedSlots.length === 0 && (
                <span className="text-neutral-400 italic">none — add {'{{slot_name}}'} to the source</span>
              )}
              {detectedSlots.map((s) => (
                <span key={s} className="chip bg-neutral-100 text-neutral-500">
                  {'{' + s + '}'}
                </span>
              ))}
              {shape === 'list' && (
                <span className={cn('chip ml-2', hasEachBlock ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn')}>
                  {hasEachBlock ? '{{#each rows}} found' : 'whole template will repeat per row'}
                </span>
              )}
            </div>
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={startResize}
            className="h-2 bg-[#1e1e1e] border-t border-neutral-200 cursor-row-resize flex items-center justify-center shrink-0 group"
          >
            <div className="w-10 h-0.5 rounded-full bg-white/20 group-hover:bg-accent/60 transition-colors" />
          </div>

          {/* BOTTOM — Monaco source */}
          <div className="border-neutral-200 bg-[#1e1e1e] text-white flex flex-col shrink-0" style={{ height: editorHeight }}>
            <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', detectedSlots.length > 0 ? 'bg-ok' : 'bg-neutral-500')} />
                <span>
                  {detectedSlots.length > 0
                    ? `Parsed · ${detectedSlots.length} slot${detectedSlots.length === 1 ? '' : 's'} detected`
                    : 'No slots detected'}
                </span>
                {listLintWarn && (
                  <span className="ml-3 text-warn">
                    Tip: wrap rows in <code className="mono">{'{{#each rows}} … {{/each}}'}</code>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="chip bg-white/10 text-white/60">JSX</span>
                <button type="button" onClick={loadSample} className="text-white/50 hover:text-white" title="Load sample template">
                  Sample
                </button>
                <button type="button" onClick={paste} className="text-white/50 hover:text-white" title="Paste from clipboard">
                  Paste
                </button>
                <button type="button" onClick={applySlotDecorations} className="text-accent hover:text-accent/80">
                  Detect slots
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <MonacoEditor
                height="100%"
                language="html"
                theme="vs-dark"
                value={source}
                onChange={(v) => setSource(v ?? '')}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
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
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-0.5 w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[12px] bg-white"
              >
                <option value="">— uncategorised —</option>
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                ))}
              </select>
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

          {/* Shape toggle */}
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
