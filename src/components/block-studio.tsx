'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CATEGORY_ORDER, CATEGORY_META } from '@/lib/block-presets';

// Monaco must be client-only (browser-only deps, worker loader).
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
type MonacoEditorInstance = any;
type MonacoNamespace = any;

type Viewport = 'desktop' | 'tablet' | 'mobile';
type Step = 'paste' | 'slots' | 'bind' | 'map';

const VP_LABELS: Record<Viewport, string> = {
  desktop: '1280 × auto',
  tablet: '768 × 1024',
  mobile: '375 × 812'
};

const SAMPLE = `<section className="py-16 bg-white">
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

export function BlockStudio({
  initial,
  collections,
  collectionFieldsByName,
  mode
}: {
  initial: { id?: string; name: string; title?: string | null; description?: string | null; source: string; collection?: string | null; slotMap: Record<string, string>; category?: string | null };
  collections: Array<{ name: string; label: string }>;
  collectionFieldsByName: Record<string, string[]>;
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [title, setTitle] = useState(initial.title ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [category, setCategory] = useState(initial.category ?? '');
  const [source, setSource] = useState(initial.source || SAMPLE);
  const [collection, setCollection] = useState<string>(initial.collection ?? '');
  const [slotMap, setSlotMap] = useState<Record<string, string>>(initial.slotMap);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [step, setStep] = useState<Step>('paste');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const detectedSlots = useMemo(() => {
    const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    const out = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) out.add(m[1]);
    return [...out];
  }, [source]);

  const availableFields = collection ? collectionFieldsByName[collection] ?? [] : [];
  const mappedCount = detectedSlots.filter((s) => slotMap[s]).length;

  // Slots used inside href="..." or action="..." attributes are link-type slots.
  const linkSlots = useMemo(() => {
    const re = /(?:href|action)="[^"]*\{\{(\w+)\}\}[^"]*"/g;
    const out = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) out.add(m[1]);
    return out;
  }, [source]);
  const boundCollection = collections.find((c) => c.name === collection);

  const preview = useMemo(() => {
    let html = source;
    for (const slot of detectedSlots) {
      const field = slotMap[slot];
      const placeholder = field ? `[${collection}.${field}]` : `[${slot}]`;
      html = html.replace(new RegExp(`\\{\\{\\s*${slot}\\s*\\}\\}`, 'g'), placeholder);
    }
    // Strip className → class so the browser renders Tailwind utilities in preview.
    return html.replace(/className=/g, 'class=');
  }, [source, detectedSlots, slotMap, collection]);

  // Paint slot highlights in Monaco after each edit / mount.
  const applySlotDecorations = () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;
    const text: string = model.getValue();
    const re = /\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}\}/g;
    const decorations: any[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = model.getPositionAt(m.index);
      const end = model.getPositionAt(m.index + m[0].length);
      decorations.push({
        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
        options: { inlineClassName: 'monaco-slot-highlight' }
      });
    }
    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations);
  };

  useEffect(() => {
    applySlotDecorations();
  }, [source]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        source,
        slotMap,
        collection: collection || null,
        title: title || null,
        description: description || null,
        category: category || null,
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
    } catch {
      // Clipboard blocked — silent, user can paste manually.
    }
  }

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
          {boundCollection ? (
            <span className="chip bg-accent-soft text-accent">Bound to {boundCollection.label}</span>
          ) : detectedSlots.length === 0 ? (
            <span className="chip bg-ok/10 text-ok" title="Static block — drop anywhere, no collection required.">Static</span>
          ) : (
            <span className="chip bg-neutral-100 text-neutral-500">Unbound · {detectedSlots.length} slot{detectedSlots.length === 1 ? '' : 's'}</span>
          )}
          <span className="chip bg-ok/10 text-ok" title="Every block ships responsive by default.">
            Responsive by default
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <ViewportSwitch viewport={viewport} onChange={setViewport} />
          <span className="text-neutral-400 mono">{VP_LABELS[viewport]}</span>
          <span className="w-px h-5 bg-neutral-200" />
          <button
            type="button"
            className="px-2.5 py-1 border border-neutral-200 rounded-md hover:bg-neutral-50"
            title="Preview using the first record of the bound collection"
          >
            Preview with real data
          </button>
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

      {/* Stepper tabs */}
      <div className="border-b border-neutral-200 px-6 flex items-center gap-1 text-[12px] bg-white shrink-0">
        <StepTab step="paste" active={step} onClick={setStep} n={1} label="Paste markup" />
        <StepTab step="slots" active={step} onClick={setStep} n={2} label="Declare slots" />
        <StepTab step="bind" active={step} onClick={setStep} n={3} label="Bind collection" />
        <StepTab step="map" active={step} onClick={setStep} n={4} label="Map fields" />
        <span className="ml-auto text-[11px] text-neutral-400">
          Paste from shadcn/ui · Tailwind UI · HeroUI · hand-written JSX or HTML
        </span>
      </div>

      {error && (
        <div className="px-6 py-2 bg-danger/5 border-b border-danger/20 text-xs text-danger mono shrink-0">
          {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN — Preview on top, Monaco on bottom */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-neutral-200">
          {/* TOP — Preview */}
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
                    {boundCollection
                      ? `Live preview · using first ${boundCollection.label} record`
                      : 'Live preview · unbound (placeholders shown)'}
                  </span>
                  <span className="mono text-neutral-400">{viewport}</span>
                </div>
                <div className="p-6" dangerouslySetInnerHTML={{ __html: preview }} />
              </div>
              <div className="mt-3 text-[11px] text-neutral-500 flex items-center gap-3">
                <span>
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full inline-block mr-1',
                      mappedCount === detectedSlots.length && detectedSlots.length > 0
                        ? 'bg-ok'
                        : 'bg-warn'
                    )}
                  />
                  {mappedCount}/{detectedSlots.length} slots mapped
                </span>
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
                <span
                  key={s}
                  className={cn(
                    'chip',
                    slotMap[s] ? 'bg-accent-soft text-accent' : 'bg-neutral-100 text-neutral-500'
                  )}
                >
                  {'{' + s + '}'}
                </span>
              ))}
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
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    detectedSlots.length > 0 ? 'bg-ok' : 'bg-neutral-500'
                  )}
                />
                <span>
                  {detectedSlots.length > 0
                    ? `Parsed · ${detectedSlots.length} slot${detectedSlots.length === 1 ? '' : 's'} detected`
                    : 'No slots detected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="chip bg-white/10 text-white/60">JSX</span>
                <button
                  type="button"
                  onClick={paste}
                  className="text-white/50 hover:text-white"
                  title="Paste from clipboard"
                >
                  Paste
                </button>
                <button
                  type="button"
                  onClick={applySlotDecorations}
                  className="text-accent hover:text-accent/80"
                >
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

        {/* RIGHT — Slot mapping */}
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
          </div>
          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">Bind to collection</div>
              <span className="text-[10px] text-neutral-400">optional</span>
            </div>
            <select
              value={collection}
              onChange={(e) => {
                setCollection(e.target.value);
                setSlotMap({});
              }}
              className="mt-1 w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">— static (no collection) —</option>
              {collections.map((c) => (
                <option key={c.name} value={c.name}>
                  📦 {c.label}
                </option>
              ))}
            </select>
            {boundCollection ? (
              <div className="text-[11px] text-neutral-500 mt-1.5">
                {availableFields.length} field{availableFields.length === 1 ? '' : 's'} available
              </div>
            ) : (
              <div className="text-[11px] text-neutral-500 mt-1.5">
                Static blocks ship as-is. Drop them on any page without picking a collection.
              </div>
            )}
          </div>

          <div className="p-4 border-b border-neutral-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Slot → field map
            </div>
            {detectedSlots.length === 0 && (
              <p className="text-[11px] text-neutral-400">
                No slots declared yet. Use <code className="mono">{'{{name}}'}</code> in the source.
              </p>
            )}
            <div className="space-y-2.5">
              {detectedSlots.map((slot) => {
                const isLink = linkSlots.has(slot);
                return (
                  <div key={slot}>
                    <div className="flex items-center gap-2">
                      <code className={cn(
                        'mono text-[11px] px-1.5 py-0.5 rounded flex-shrink-0 w-24 truncate flex items-center gap-1',
                        isLink ? 'bg-purple-50 text-purple-600' : 'bg-accent/10 text-accent'
                      )}>
                        {isLink && <span title="Link slot (href/action)">🔗</span>}
                        {'{' + slot + '}'}
                      </code>
                      <span className="text-neutral-400">→</span>
                      <select
                        value={slotMap[slot] ?? ''}
                        onChange={(e) => setSlotMap({ ...slotMap, [slot]: e.target.value })}
                        disabled={!collection}
                        className="flex-1 text-[12px] px-2 py-1 border border-neutral-200 rounded disabled:bg-neutral-50 disabled:text-neutral-400"
                      >
                        <option value="">— unmapped —</option>
                        {availableFields.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    {isLink && !collection && (
                      <p className="text-[10px] text-purple-400 mt-0.5 pl-1">
                        Link slot — fill in on the page editor, e.g. <span className="mono">/sign-up</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-b border-neutral-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Props
            </div>
            <div className="space-y-1.5 text-[12px]">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-accent" defaultChecked />
                Allow use without binding{' '}
                <span className="text-neutral-400 text-[11px]">(static mode)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-accent" />
                Render server-side only
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-accent" defaultChecked />
                Available in slash menu
              </label>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-auto scrollbar">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Claude assist
              </div>
              <span className="chip bg-neutral-100 text-neutral-500">Off</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              When on, Claude auto-suggests slot → field mappings for new block imports. Off by default per
              POPIA policy.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function StepTab({
  step,
  active,
  onClick,
  n,
  label
}: {
  step: Step;
  active: Step;
  onClick: (s: Step) => void;
  n: number;
  label: string;
}) {
  const isActive = step === active;
  return (
    <button
      type="button"
      onClick={() => onClick(step)}
      className={cn(
        'px-3 py-2 border-b-2',
        isActive
          ? 'border-ink-950 font-medium text-ink-950'
          : 'border-transparent text-neutral-500 hover:text-neutral-900'
      )}
    >
      {n} · {label}
    </button>
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
