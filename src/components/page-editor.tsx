'use client';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin';
import { HeadingNode, QuoteNode, $createHeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getNodeByKey,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey
} from 'lexical';
import { SELECT_DECORATOR_COMMAND } from '@/lib/editor/nodes';
import { VisualSelCtx, DragCtx, type VisualSel } from '@/lib/editor/visual-renderer';
import { COMPONENT_REGISTRY, REGISTRY_MAP, COMPONENT_CATEGORIES, updatePropsInTree, findNodeInTree, removeFromTree, addToSlot, type PropDef, type ActionDef } from '@/lib/editor/visual-registry';
import { ShadcnBlockNode, getShadcnNodeInfo } from '@/lib/editor/nodes';
import {
  Heading1,
  Heading2,
  Heading3,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  LayoutGrid,
  Minus,
  Quote,
  Search,
  Eye,
  Sparkles,
  Send,
  ChevronDown,
  X
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { editorTheme } from '@/lib/editor/theme';
import { CATEGORY_META } from '@/lib/block-presets';
import {
  DECORATOR_NODES,
  CollectionsProvider,
  SelectedKeyProvider,
  getSelectedDecorator,
  useInsertNode,
  useUpdateSelectedNode,
  useRemoveNode,
  ImageNode,
  ButtonNode,
  CollectionListNode,
  PresetBlockNode
} from '@/lib/editor/nodes';
import { SelectionSyncPlugin, SlashMenuPlugin, DecoratorDeletePlugin, ToolbarPlugin } from '@/lib/editor/plugins';
import { treeToEditorState } from '@/lib/editor/migrate';

type Viewport = 'desktop' | 'tablet' | 'mobile';

const VP_LABELS: Record<Viewport, string> = {
  desktop: '1280 × auto',
  tablet: '768 × 1024',
  mobile: '375 × 812'
};

type PaletteItem = {
  t: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
};

type PaletteGroup = { heading: string; items: PaletteItem[] };

const PALETTE: PaletteGroup[] = [
  {
    heading: 'Content',
    items: [
      { t: 'heading-1', label: 'Heading 1', icon: Heading1 },
      { t: 'heading-2', label: 'Heading 2', icon: Heading2 },
      { t: 'heading-3', label: 'Heading 3', icon: Heading3 },
      { t: 'text', label: 'Rich text', icon: Type },
      { t: 'image', label: 'Image', icon: ImageIcon },
      { t: 'button', label: 'Button', icon: MousePointerClick },
      { t: 'quote', label: 'Pull quote', icon: Quote },
      { t: 'divider', label: 'Divider', icon: Minus }
    ]
  },
  {
    heading: 'Data',
    items: [
      { t: 'collection-list', label: 'Card list', icon: LayoutGrid, sub: 'bindable' }
    ]
  }
];

type LibraryBlock = { id: string; name: string; title: string; description: string; category: string; source: string; shape?: string | null; slotSchema?: Record<string, { type: string; format?: string; fallback?: string }> | null };
type SideTab = 'blocks' | 'pages' | 'library';
type RightTab = 'props' | 'seo';

type SeoData = {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
};

type RelationRef = { name: string; fkField: string; cardinality: 'one-one' | 'one-many' | 'many-many' };

export function PageEditor({
  initial,
  collections,
  collectionFieldsByName,
  relationsByCollection = {},
  pages,
  libraryBlocks = [],
  themes = [],
  mode
}: {
  initial: { id?: string; slug: string; title: string; tree: any; published: boolean; themeId?: string | null; params?: string | null; defaultCollection?: string | null; seo?: SeoData | null };
  collections: Array<{ name: string; label: string }>;
  collectionFieldsByName: Record<string, string[]>;
  relationsByCollection?: Record<string, RelationRef[]>;
  pages: Array<{ id: string; title: string; slug: string }>;
  libraryBlocks?: LibraryBlock[];
  themes?: Array<{ id: string; name: string; tokens: string }>;
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [published, setPublished] = useState(initial.published);
  const [pageTheme, setPageTheme] = useState<string>(initial.themeId ?? '');
  const [pageParams, setPageParams] = useState<string>(initial.params ?? '');
  const [defaultCollection, setDefaultCollection] = useState<string>(initial.defaultCollection ?? '');
  const [seo, setSeo] = useState<SeoData>(initial.seo ?? {});
  const [rightTab, setRightTab] = useState<RightTab>('props');

  const activeThemeTokens = useMemo(() => {
    if (!pageTheme) return null;
    const t = themes.find((th) => th.id === pageTheme);
    if (!t) return null;
    try { return JSON.parse(t.tokens) as Record<string, string>; } catch { return null; }
  }, [pageTheme, themes]);

  const canvasThemeStyle = useMemo((): React.CSSProperties => {
    if (!activeThemeTokens) return {};
    const tk = activeThemeTokens;
    return {
      '--bg': tk.background,
      '--fg': tk.foreground,
      '--primary': tk.primary,
      '--primary-fg': '0 0% 98%',
      '--secondary': tk.secondary,
      '--secondary-fg': tk.foreground,
      '--muted': tk.muted,
      '--muted-fg': tk.foreground,
      '--accent': tk.accent,
      '--accent-fg': tk.foreground,
      '--destructive': tk.destructive,
      '--destructive-fg': '0 0% 98%',
      '--border': tk.border,
      '--input': tk.border,
      '--ring': tk.ring,
      '--radius': `${tk.radius ?? 0.5}rem`,
      '--theme-font': tk.fontBody || 'Inter',
      background: `hsl(${tk.background})`,
      color: `hsl(${tk.foreground})`,
      fontFamily: tk.fontBody || 'Inter',
    } as React.CSSProperties;
  }, [activeThemeTokens]);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<NodeKey | null>(null);
  const [nativeKey, setNativeKey] = useState<NodeKey | null>(null);
  const [search, setSearch] = useState('');
  const [sideTab, setSideTab] = useState<SideTab>('library');
  const editorRef = useRef<LexicalEditor | null>(null);
  const draggedPresetRef = useRef<{ id: string; source: string } | null>(null);
  const draggedShadcnRef = useRef<string | null>(null);
  const [sel, setSel] = useState<VisualSel>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const initialEditorState = JSON.stringify(treeToEditorState(initial.tree));

  const lexicalConfig = {
    namespace: 'fdl-page-editor',
    theme: editorTheme,
    onError: (e: Error) => console.error('[lexical]', e),
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, ...DECORATOR_NODES],
    editorState: initialEditorState
  };

  async function save(publishedOverride?: boolean) {
    const editor = editorRef.current;
    if (!editor) { setError('Editor not ready'); return; }
    const pub = publishedOverride !== undefined ? publishedOverride : published;
    if (publishedOverride !== undefined) setPublished(publishedOverride);
    setSaving(true);
    setError(null);
    try {
      const treeJson = editor.getEditorState().toJSON();
      const payload = {
        title,
        slug,
        tree: treeJson,
        published: pub,
        themeId: pageTheme || null,
        params: pageParams || null,
        defaultCollection: defaultCollection || null,
        seo: Object.keys(seo).length > 0 ? seo : null,
      };
      const res = await fetch(
        mode === 'create' ? '/api/pages' : `/api/pages/${initial.id}`,
        { method: mode === 'create' ? 'POST' : 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }
      );
      if (!res.ok) throw new Error(JSON.stringify((await res.json()).error));
      const data = await res.json();
      // Create: route into edit so subsequent saves target the new id.
      // Edit: stay on the page so the author can keep working after save.
      if (mode === 'create') router.push(`/pages/edit/${data.id}`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!initial.id || !confirm('Delete page?')) return;
    await fetch(`/api/pages/${initial.id}`, { method: 'DELETE' });
    router.push('/pages');
    router.refresh();
  }

  return (
    <VisualSelCtx.Provider value={{ sel, setSel }}>
    <DragCtx.Provider value={{ dragging, setDragging }}>
    <section className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-neutral-200 bg-white/60 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0 text-sm">
          <Link href="/pages" className="text-xs text-neutral-400 hover:text-neutral-700">
            Pages
          </Link>
          <span className="text-xs text-neutral-400">/</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={mode === 'create' ? 'Untitled page' : ''}
            className="display text-lg bg-transparent focus:outline-none focus:ring-0 min-w-[140px] max-w-[280px]"
          />
          {published ? (
            <span className="chip bg-ok/10 text-ok">Published</span>
          ) : (
            <span className="chip bg-warn/10 text-warn">Draft</span>
          )}
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <span>/pages/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="slug"
              className="mono bg-transparent focus:outline-none text-neutral-500 w-28"
            />
          </div>
          {themes.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <span className="text-neutral-400">Theme:</span>
              <select
                value={pageTheme}
                onChange={(e) => setPageTheme(e.target.value)}
                className="bg-transparent focus:outline-none text-neutral-600 text-xs border-none py-0"
              >
                <option value="">Default</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <span className="text-neutral-400">Params:</span>
            <input
              value={pageParams}
              onChange={(e) => setPageParams(e.target.value)}
              placeholder="id,type"
              className="mono bg-transparent focus:outline-none text-neutral-500 w-20"
              title="Comma-separated URL params (e.g. id,type)"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-500" title="Default collection — blocks on this page bind to this collection or one related to it">
            <span className="text-neutral-400">Collection:</span>
            <select
              value={defaultCollection}
              onChange={(e) => setDefaultCollection(e.target.value)}
              className="bg-transparent focus:outline-none text-neutral-600 text-xs border-none py-0"
            >
              <option value="">— none (static) —</option>
              {collections.map((c) => (
                <option key={c.name} value={c.name}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <ViewportSwitch viewport={viewport} onChange={setViewport} />
          <span className="text-neutral-400 mono hidden xl:inline">{VP_LABELS[viewport]}</span>
          <span className="w-px h-5 bg-neutral-200" />

          {/* Preview */}
          {slug ? (
            <a
              href={published ? `/pages/${slug}` : `/pages/${slug}?preview=1`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 border border-neutral-200 rounded-md hover:bg-neutral-50 flex items-center gap-1.5 text-neutral-600"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </a>
          ) : (
            <span className="px-2.5 py-1 border border-neutral-200 rounded-md text-neutral-300 flex items-center gap-1.5 cursor-not-allowed">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </span>
          )}

          {/* Ask */}
          <button
            type="button"
            className="px-2.5 py-1 bg-gradient-to-br from-accent to-purple-500 text-white rounded-md flex items-center gap-1.5"
            title="Draft page content with Claude"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask
          </button>

          {/* Save split button */}
          <SaveButton
            saving={saving}
            disabled={!title || !slug}
            mode={mode}
            onSave={() => save()}
            onPublish={() => save(true)}
            onUnpublish={() => save(false)}
            onDelete={mode === 'edit' ? destroy : undefined}
          />

          {/* Close */}
          <Link
            href="/pages"
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-100 transition-colors"
            title="Close editor"
          >
            <X className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {error && (
        <div className="px-6 py-2 bg-danger/5 border-b border-danger/20 text-xs text-danger mono">{error}</div>
      )}

      <LexicalComposer initialConfig={lexicalConfig}>
        <CollectionsProvider value={collections}>
          <SelectedKeyProvider value={selectedKey}>
            <EditorRefPlugin editorRef={editorRef} />
            <SelectionSyncPlugin onSelect={setSelectedKey} selectedKey={selectedKey} />
            <DecoratorDeletePlugin selectedKey={selectedKey} onCleared={() => setSelectedKey(null)} />
            <NativeOverlayPlugin nativeKey={nativeKey} onClear={() => setNativeKey(null)} />
            <SlashMenuPlugin collections={collections} />
            <HistoryPlugin />
            <ListPlugin />
            <LinkPlugin />

            <div className="flex-1 flex overflow-hidden">
              {/* Left — tabbed sidebar */}
              <aside className="w-64 border-r border-neutral-200 bg-white/60 flex flex-col shrink-0 overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-neutral-200 shrink-0">
                  {(['blocks', 'library', 'pages'] as SideTab[]).map((tab) => {
                    const label = tab === 'blocks' ? 'Blocks' : tab === 'pages' ? 'Outline' : 'Library';
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setSideTab(tab)}
                        className={cn(
                          'flex-1 py-2 text-[11px] font-medium border-b-2 -mb-px transition-colors',
                          sideTab === tab
                            ? 'border-ink-950 text-ink-950'
                            : 'border-transparent text-neutral-400 hover:text-neutral-700'
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Search — hidden on Outline tab */}
                {sideTab !== 'pages' && (
                  <div className="relative px-3 pt-3 pb-2 shrink-0">
                    <Search className="h-3.5 w-3.5 absolute left-5.5 top-1/2 translate-y-[-25%] text-neutral-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search blocks…"
                      className="w-full pl-8 pr-2 py-1.5 text-[12px] border border-neutral-200 rounded-md bg-white focus:outline-none focus:border-accent"
                    />
                  </div>
                )}

                <div className={cn('flex-1 overflow-auto scrollbar p-3 text-sm', sideTab !== 'pages' && 'pt-0')}>
                  {sideTab === 'blocks' && (
                    <BlockPalette search={search} collections={collections} draggedShadcnRef={draggedShadcnRef} setDragging={setDragging} />
                  )}

                  {sideTab === 'pages' && (
                    <PageTree selectedKey={selectedKey} onSelect={setSelectedKey} onNativeSelect={setNativeKey} />
                  )}

                  {sideTab === 'library' && (
                    <LibraryBrowser search={search} blocks={libraryBlocks} draggedPresetRef={draggedPresetRef} />
                  )}
                </div>
              </aside>

              {/* Canvas */}
              <CanvasArea viewport={viewport} draggedPresetRef={draggedPresetRef} draggedShadcnRef={draggedShadcnRef} themeStyle={canvasThemeStyle} />

              {/* Right — Properties / SEO */}
              <aside className="w-80 border-l border-neutral-200 bg-white flex flex-col overflow-hidden shrink-0">
                <div className="flex border-b border-neutral-200 shrink-0">
                  {(['props', 'seo'] as RightTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setRightTab(tab)}
                      className={cn(
                        'flex-1 py-2 text-[11px] font-medium border-b-2 -mb-px transition-colors',
                        rightTab === tab
                          ? 'border-ink-950 text-ink-950'
                          : 'border-transparent text-neutral-400 hover:text-neutral-700'
                      )}
                    >
                      {tab === 'props' ? 'Properties' : 'SEO'}
                    </button>
                  ))}
                </div>
                {rightTab === 'props' ? (
                  <BlockPropsPanel
                    selectedKey={selectedKey}
                    collections={collections}
                    collectionFieldsByName={collectionFieldsByName}
                    relationsByCollection={relationsByCollection}
                    defaultCollection={defaultCollection}
                    pageParams={pageParams}
                    pages={pages}
                    libraryBlocks={libraryBlocks}
                  />
                ) : (
                  <SeoPanel seo={seo} onChange={setSeo} title={title} slug={slug} />
                )}
              </aside>
            </div>
          </SelectedKeyProvider>
        </CollectionsProvider>
      </LexicalComposer>
    </section>
    </DragCtx.Provider>
    </VisualSelCtx.Provider>
  );
}

function SeoPanel({ seo, onChange, title, slug }: { seo: SeoData; onChange: (s: SeoData) => void; title: string; slug: string }) {
  const set = (k: keyof SeoData, v: string | boolean) => onChange({ ...seo, [k]: v });
  const previewTitle = seo.metaTitle || title || 'Untitled';
  const previewDesc  = seo.metaDescription || '';
  const previewUrl   = `yourdomain.com/pages/${slug}`;

  return (
    <div className="flex-1 overflow-auto scrollbar p-4 space-y-5 text-sm">
      {/* Google preview */}
      <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50">
        <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">Search preview</p>
        <p className="text-[11px] text-neutral-400 truncate">{previewUrl}</p>
        <p className="text-[15px] text-blue-600 truncate font-medium leading-snug">{previewTitle}</p>
        <p className="text-[12px] text-neutral-600 line-clamp-2 leading-relaxed">{previewDesc || <span className="italic text-neutral-400">No description set</span>}</p>
      </div>

      {/* Meta */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-neutral-400">Meta</p>
        <label className="block">
          <span className="text-[11px] text-neutral-500 flex items-center justify-between">
            Title <span className={cn('tabular-nums', (seo.metaTitle?.length ?? 0) > 60 ? 'text-destructive' : 'text-neutral-400')}>{seo.metaTitle?.length ?? 0}/60</span>
          </span>
          <input
            className="mt-1 w-full px-2 py-1.5 text-[12px] border border-neutral-200 rounded focus:outline-none focus:border-accent"
            value={seo.metaTitle ?? ''}
            onChange={e => set('metaTitle', e.target.value)}
            placeholder={title || 'Page title'}
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-neutral-500 flex items-center justify-between">
            Description <span className={cn('tabular-nums', (seo.metaDescription?.length ?? 0) > 160 ? 'text-destructive' : 'text-neutral-400')}>{seo.metaDescription?.length ?? 0}/160</span>
          </span>
          <textarea
            className="mt-1 w-full px-2 py-1.5 text-[12px] border border-neutral-200 rounded focus:outline-none focus:border-accent resize-none"
            rows={3}
            value={seo.metaDescription ?? ''}
            onChange={e => set('metaDescription', e.target.value)}
            placeholder="Brief description for search results…"
          />
        </label>
      </div>

      <div className="border-t border-neutral-100" />

      {/* Open Graph */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-neutral-400">Open Graph</p>
        <label className="block">
          <span className="text-[11px] text-neutral-500">OG Title</span>
          <input
            className="mt-1 w-full px-2 py-1.5 text-[12px] border border-neutral-200 rounded focus:outline-none focus:border-accent"
            value={seo.ogTitle ?? ''}
            onChange={e => set('ogTitle', e.target.value)}
            placeholder={seo.metaTitle || title || 'Inherits meta title'}
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-neutral-500">OG Description</span>
          <textarea
            className="mt-1 w-full px-2 py-1.5 text-[12px] border border-neutral-200 rounded focus:outline-none focus:border-accent resize-none"
            rows={2}
            value={seo.ogDescription ?? ''}
            onChange={e => set('ogDescription', e.target.value)}
            placeholder={seo.metaDescription || 'Inherits meta description'}
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-neutral-500">OG Image URL</span>
          <input
            className="mt-1 w-full px-2 py-1.5 text-[12px] border border-neutral-200 rounded focus:outline-none focus:border-accent font-mono"
            value={seo.ogImage ?? ''}
            onChange={e => set('ogImage', e.target.value)}
            placeholder="https://…"
          />
          {seo.ogImage && (
            <img src={seo.ogImage} alt="" className="mt-2 w-full rounded border border-neutral-200 object-cover max-h-32" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
        </label>
      </div>

      <div className="border-t border-neutral-100" />

      {/* Advanced */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-neutral-400">Advanced</p>
        <label className="block">
          <span className="text-[11px] text-neutral-500">Canonical URL</span>
          <input
            className="mt-1 w-full px-2 py-1.5 text-[12px] border border-neutral-200 rounded focus:outline-none focus:border-accent font-mono"
            value={seo.canonicalUrl ?? ''}
            onChange={e => set('canonicalUrl', e.target.value)}
            placeholder="https://… (leave blank to use page URL)"
          />
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={seo.noIndex ?? false}
            onChange={e => set('noIndex', e.target.checked)}
            className="accent-accent"
          />
          <div>
            <span className="text-[12px] text-neutral-700">No index</span>
            <p className="text-[10px] text-neutral-400">Tell search engines not to index this page</p>
          </div>
        </label>
      </div>
    </div>
  );
}

function SaveButton({
  saving, disabled, mode, onSave, onPublish, onUnpublish, onDelete
}: {
  saving: boolean;
  disabled: boolean;
  mode: 'create' | 'edit';
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-stretch">
      <button
        type="button"
        onClick={onSave}
        disabled={saving || disabled}
        className="px-3 py-1 bg-ink-950 text-paper rounded-l-md disabled:opacity-50 flex items-center gap-1.5 border-r border-white/20"
      >
        <Send className="h-3.5 w-3.5" />
        {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        disabled={saving}
        className="px-1.5 py-1 bg-ink-950 text-paper rounded-r-md disabled:opacity-50 hover:bg-ink-800 transition-colors"
        aria-label="More save options"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 py-1 text-[12px]">
          <button
            type="button"
            onClick={() => { setOpen(false); onPublish(); }}
            className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 text-neutral-700"
          >
            Publish
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onUnpublish(); }}
            className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 text-neutral-700"
          >
            Save as draft
          </button>
          {onDelete && (
            <>
              <div className="my-1 border-t border-neutral-100" />
              <button
                type="button"
                onClick={() => { setOpen(false); onDelete(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-danger/5 text-danger"
              >
                Delete page
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EditorRefPlugin({ editorRef }: { editorRef: React.MutableRefObject<LexicalEditor | null> }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor, editorRef]);
  return null;
}

function CanvasArea({ viewport, draggedPresetRef, draggedShadcnRef, themeStyle }: { viewport: Viewport; draggedPresetRef: React.MutableRefObject<{ id: string; source: string } | null>; draggedShadcnRef: React.MutableRefObject<string | null>; themeStyle?: React.CSSProperties }) {
  const [anchorElem, setAnchorElem] = useState<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement | null>(null);
  const [editor] = useLexicalComposerContext();
  // { y: pixels from top of content wrapper, afterIndex: -1 = before first, n = after nth child }
  const [dropLine, setDropLine] = useState<{ y: number; afterIndex: number } | null>(null);

  const calcDropLine = (mouseY: number) => {
    const wrapper = contentWrapperRef.current;
    if (!wrapper) return null;
    const contentEl = wrapper.querySelector('[contenteditable]') as HTMLElement | null;
    if (!contentEl) return null;
    const children = Array.from(contentEl.children) as HTMLElement[];
    const wrapperTop = wrapper.getBoundingClientRect().top;

    if (children.length === 0) return { y: 0, afterIndex: -1 };

    // Default: after last child
    let afterIndex = children.length - 1;
    let lineY = children[children.length - 1].getBoundingClientRect().bottom - wrapperTop;

    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (mouseY < rect.top + rect.height / 2) {
        afterIndex = i - 1;
        lineY = i === 0
          ? rect.top - wrapperTop - 2
          : (children[i - 1].getBoundingClientRect().bottom + rect.top) / 2 - wrapperTop;
        break;
      }
    }
    return { y: lineY, afterIndex };
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!draggedPresetRef.current && !draggedShadcnRef.current) return;
    e.preventDefault();
    setDropLine(calcDropLine(e.clientY));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropLine(null);
  };

  // Clear drop line whenever ANY drag ends (incl. drops into nested slots that stopPropagation)
  useEffect(() => {
    const clear = () => setDropLine(null);
    window.addEventListener('dragend', clear);
    return () => window.removeEventListener('dragend', clear);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const preset = draggedPresetRef.current;
    const shadcnName = draggedShadcnRef.current;
    const line = dropLine;
    setDropLine(null);
    draggedPresetRef.current = null;
    draggedShadcnRef.current = null;

    const insertNode = (factory: () => any) => {
      editor.update(() => {
        const node = factory();
        const root = $getRoot();
        const children = root.getChildren();

        if (!line || line.afterIndex < 0) {
          children.length > 0 && line?.afterIndex === -1
            ? children[0].insertBefore(node)
            : root.append(node);
        } else {
          const target = children[line.afterIndex];
          target ? target.insertAfter(node) : root.append(node);
        }

        if (!node.getNextSibling()) {
          const p = $createParagraphNode();
          node.insertAfter(p);
        }
        editor.dispatchCommand(SELECT_DECORATOR_COMMAND, node.getKey());
      });
    };

    if (shadcnName) {
      const def = REGISTRY_MAP[shadcnName];
      if (!def) return;
      insertNode(() => new ShadcnBlockNode(def.defaultNode()));
      return;
    }

    if (preset) {
      insertNode(() => new PresetBlockNode(preset.id, preset.source));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
    <ToolbarPlugin />
    <div
      className="flex-1 overflow-auto scrollbar bg-neutral-100 p-10"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        ref={(el) => { setAnchorElem(el); }}
        className={cn(
          'vp-frame rounded-xl shadow-sm border border-neutral-200 relative',
          themeStyle ? 'theme-preview' : 'bg-white',
          viewport === 'desktop' && 'vp-desktop',
          viewport === 'tablet' && 'vp-tablet',
          viewport === 'mobile' && 'vp-mobile'
        )}
        style={themeStyle}
      >
        <div className="relative" ref={contentWrapperRef}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="outline-none min-h-[400px] text-neutral-700" />
            }
            placeholder={
              <div className="absolute top-0 left-0 pointer-events-none text-neutral-400 text-sm italic">
                Type <span className="kbd">/</span> or drag a block from the left rail.
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          {dropLine !== null && (
            <div
              className="absolute left-0 right-0 flex items-center gap-1 pointer-events-none z-20"
              style={{ top: dropLine.y }}
            >
              <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
              <div className="flex-1 h-0.5 bg-accent" />
              <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
            </div>
          )}
        </div>
        {anchorElem && (
          <DraggableBlockPlugin_EXPERIMENTAL
            anchorElem={anchorElem}
            menuRef={menuRef}
            targetLineRef={targetLineRef}
            menuComponent={
              <div
                ref={menuRef}
                className="absolute left-0 top-0 px-1 py-1 cursor-grab opacity-0 data-[show=true]:opacity-100 transition-opacity bg-white border border-neutral-200 rounded shadow-sm text-neutral-400 hover:text-neutral-700"
                data-show="true"
              >
                <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                  <circle cx="2" cy="2" r="1.2" />
                  <circle cx="8" cy="2" r="1.2" />
                  <circle cx="2" cy="7" r="1.2" />
                  <circle cx="8" cy="7" r="1.2" />
                  <circle cx="2" cy="12" r="1.2" />
                  <circle cx="8" cy="12" r="1.2" />
                </svg>
              </div>
            }
            targetLineComponent={
              <div
                ref={targetLineRef}
                className="pointer-events-none absolute left-0 right-0 h-0.5 bg-accent opacity-0 data-[show=true]:opacity-100"
              />
            }
            isOnMenu={(el) => !!menuRef.current && menuRef.current.contains(el)}
          />
        )}
      </div>
    </div>
    </div>
  );
}

function BlockPalette({
  search,
  collections,
  draggedShadcnRef,
  setDragging,
}: {
  search: string;
  collections: Array<{ name: string; label: string }>;
  draggedShadcnRef: React.MutableRefObject<string | null>;
  setDragging: (v: string | null) => void;
}) {
  const insert = useInsertNode();
  const q = search.trim().toLowerCase();

  const run = (kind: string) => {
    switch (kind) {
      case 'heading-1':
      case 'heading-2':
      case 'heading-3': {
        const level = kind.endsWith('1') ? 'h1' : kind.endsWith('2') ? 'h2' : 'h3';
        insert(() => {
          const h = $createHeadingNode(level as 'h1' | 'h2' | 'h3');
          h.append($createTextNode('Heading'));
          return h;
        });
        break;
      }
      case 'text': {
        insert(() => {
          const p = $createParagraphNode();
          p.append($createTextNode('Paragraph text…'));
          return p;
        });
        break;
      }
      case 'quote': {
        insert(() => {
          const { $createQuoteNode } = require('@lexical/rich-text');
          const q = $createQuoteNode();
          q.append($createTextNode('Pull quote'));
          return q;
        });
        break;
      }
      case 'divider': {
        insert(() => {
          const p = $createParagraphNode();
          p.append($createTextNode('— — —'));
          return p;
        });
        break;
      }
      case 'image':
        insert(() => new ImageNode());
        break;
      case 'button':
        insert(() => new ButtonNode());
        break;
      case 'collection-list':
        insert(() => new CollectionListNode(collections[0]?.name ?? '', 6));
        break;
    }
  };

  const [open, setOpen] = useState<string | null>(null);
  const toggle = (h: string) => setOpen((p) => (p === h ? null : h));

  return (
    <div className="space-y-1">
      {PALETTE.map((group) => {
        const items = q
          ? group.items.filter((i) => i.label.toLowerCase().includes(q))
          : group.items;
        if (items.length === 0) return null;
        const isOpen = open === group.heading || !!q;
        return (
          <div key={group.heading} className="border border-neutral-100 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(group.heading)}
              className="w-full flex items-center justify-between px-2 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-left"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{group.heading}</span>
              <span className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                {items.length}
                <svg className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </span>
            </button>
            {isOpen && (
              <div className="p-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isData = group.heading === 'Data';
                    return (
                      <button
                        key={item.t}
                        type="button"
                        onClick={() => run(item.t)}
                        className={cn(
                          'border rounded-md p-2.5 text-[11px] flex flex-col items-center gap-1 cursor-pointer transition-colors',
                          isData
                            ? 'border-accent/40 bg-accent-soft/40 text-neutral-700 hover:border-accent'
                            : 'border-neutral-200 hover:border-accent hover:bg-neutral-50'
                        )}
                      >
                        <Icon className="h-4 w-4 text-neutral-500" />
                        <span className="text-center">{item.label}</span>
                        {item.sub && <span className="text-[9px] text-accent">{item.sub}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Shadcn components grouped by category */}
      {(() => {
        const catOrder = Object.entries(COMPONENT_CATEGORIES).sort((a, b) => a[1].order - b[1].order);
        return catOrder.map(([catKey, catMeta]) => {
          const comps = COMPONENT_REGISTRY.filter(
            (c) => c.category === catKey && (!q || c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
          );
          if (comps.length === 0) return null;
          const groupKey = `shadcn-${catKey}`;
          const isOpen = open === groupKey || !!q;
          return (
            <div key={groupKey} className="border border-neutral-100 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(groupKey)}
                className="w-full flex items-center justify-between px-2 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-left"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{catMeta.label}</span>
                <span className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                  {comps.length}
                  <svg className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </span>
              </button>
              {isOpen && (
                <div className="p-1.5 space-y-1">
                  {comps.map((compDef) => (
                    <div
                      key={compDef.name}
                      draggable
                      onDragStart={() => {
                        draggedShadcnRef.current = compDef.name;
                        setDragging(compDef.name);
                      }}
                      onDragEnd={() => {
                        draggedShadcnRef.current = null;
                        setDragging(null);
                      }}
                      onClick={() => insert(() => new ShadcnBlockNode(compDef.defaultNode()))}
                      className="border border-neutral-200 rounded-md p-2 text-[11px] flex flex-col gap-0.5 cursor-pointer hover:border-accent hover:bg-neutral-50 transition-colors select-none"
                    >
                      <span className="font-medium text-neutral-700">{compDef.label}</span>
                      <span className="text-[10px] text-neutral-400 truncate">{compDef.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        });
      })()}
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
      className={cn('vp-btn px-2 py-1 rounded', viewport === v && 'vp-btn-active')}
      title={label}
    >
      {icon}
    </button>
  );
  return (
    <div className="inline-flex items-center bg-neutral-100 rounded-md p-0.5">
      <Btn
        v="desktop"
        label="Desktop"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="13" rx="2" />
            <path d="M8 20h8M12 17v3" />
          </svg>
        }
      />
      <Btn
        v="tablet"
        label="Tablet"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M11 18h2" />
          </svg>
        }
      />
      <Btn
        v="mobile"
        label="Mobile"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <path d="M11 18h2" />
          </svg>
        }
      />
    </div>
  );
}

function BlockPropsPanel({
  selectedKey,
  collections,
  collectionFieldsByName,
  relationsByCollection,
  defaultCollection,
  pageParams,
  pages,
  libraryBlocks,
}: {
  selectedKey: NodeKey | null;
  collections: Array<{ name: string; label: string }>;
  collectionFieldsByName: Record<string, string[]>;
  relationsByCollection: Record<string, RelationRef[]>;
  defaultCollection: string;
  pageParams: string;
  pages: Array<{ id: string; title: string; slug: string }>;
  libraryBlocks: LibraryBlock[];
}) {
  const [editor] = useLexicalComposerContext();
  const update = useUpdateSelectedNode();
  const remove = useRemoveNode();
  const { sel, setSel } = useContext(VisualSelCtx);
  const [, tick] = useState(0);
  useEffect(() => {
    return editor.registerUpdateListener(() => tick((n) => n + 1));
  }, [editor]);

  // Check for ShadcnBlockNode first
  const shadcnInfo = getShadcnNodeInfo(editor, selectedKey);
  if (shadcnInfo) {
    return (
      <ShadcnPropsPanel
        sel={sel}
        setSel={setSel}
        editor={editor}
        selectedKey={selectedKey!}
        pages={pages}
        collections={Object.keys(collectionFieldsByName)}
        collectionFieldsByName={collectionFieldsByName}
      />
    );
  }

  const selected = getSelectedDecorator(editor, selectedKey);

  if (!selected) {
    return (
      <div className="p-6 text-sm text-neutral-500 space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400">Nothing selected</div>
        <p className="text-[12px] leading-relaxed">
          Data binding lives on <Link href="/blocks" className="text-accent">Block studio</Link> —
          here you bind a page only when you drop a <em>Card list</em> or <em>Table</em> block.
        </p>
        <p className="text-[12px] leading-relaxed text-neutral-400">
          Select a block on the canvas to see its options.
        </p>
      </div>
    );
  }

  if (selected.type === 'fdl-collection-list') {
    return (
      <DataBindingPanel
        selected={selected}
        collections={collections}
        collectionFieldsByName={collectionFieldsByName}
        update={update}
        remove={remove}
      />
    );
  }

  // Preset block — placement-time binding UI.
  if (selected.type === 'fdl-preset-block') {
    return (
      <PresetBlockInspector
        selected={selected}
        update={update}
        remove={remove}
        defaultCollection={defaultCollection}
        pageParams={pageParams}
        collections={collections}
        collectionFieldsByName={collectionFieldsByName}
        relationsByCollection={relationsByCollection}
        libraryBlocks={libraryBlocks}
        pages={pages}
      />
    );
  }

  // Image / Button — simple props.
  return (
    <>
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-400">Block</div>
          <div className="text-sm font-semibold">
            {selected.type === 'fdl-image' ? 'Image' : 'Button'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => remove(selected.key)}
          className="text-[11px] text-neutral-400 hover:text-danger"
          title="Delete block"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-auto scrollbar p-4 space-y-4 text-sm">
        {selected.type === 'fdl-image' && (
          <>
            <Field label="Source URL">
              <input
                value={selected.props.src ?? ''}
                onChange={(e) =>
                  update(selected.key, (n) => (n as ImageNode).setSrc(e.target.value))
                }
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm mono"
              />
            </Field>
            <Field label="Alt text">
              <input
                value={selected.props.alt ?? ''}
                onChange={(e) =>
                  update(selected.key, (n) => (n as ImageNode).setAlt(e.target.value))
                }
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm"
              />
            </Field>
          </>
        )}

        {selected.type === 'fdl-button' && (
          <>
            <Field label="Label">
              <input
                value={selected.props.label ?? ''}
                onChange={(e) =>
                  update(selected.key, (n) => (n as ButtonNode).setLabel(e.target.value))
                }
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Href">
              <input
                value={selected.props.href ?? ''}
                onChange={(e) =>
                  update(selected.key, (n) => (n as ButtonNode).setHref(e.target.value))
                }
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm mono"
              />
            </Field>
          </>
        )}
      </div>
    </>
  );
}

function DataBindingPanel({
  selected,
  collections,
  collectionFieldsByName,
  update,
  remove
}: {
  selected: { key: NodeKey; type: string; props: Record<string, any> };
  collections: Array<{ name: string; label: string }>;
  collectionFieldsByName: Record<string, string[]>;
  update: (key: NodeKey, mutate: (n: any) => void) => void;
  remove: (key: NodeKey) => void;
}) {
  const collection = (selected.props.collection as string) ?? '';
  const limit = (selected.props.limit as number) ?? 6;
  const fields = (selected.props.fields as string[]) ?? [];
  const filter = (selected.props.filter as string) ?? '';
  const sort = (selected.props.sort as string) ?? '';
  const availableFields = collection ? collectionFieldsByName[collection] ?? [] : [];

  const toggleField = (f: string) => {
    const next = fields.includes(f) ? fields.filter((x) => x !== f) : [...fields, f];
    update(selected.key, (n) => (n as CollectionListNode).setFields(next));
  };

  return (
    <>
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">Data binding</div>
            <div className="text-sm font-semibold">Card list</div>
          </div>
          <span className="chip bg-accent-soft text-accent ml-1">
            {collection ? 'explicit' : 'unbound'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => remove(selected.key)}
          className="text-[11px] text-neutral-400 hover:text-danger"
          title="Delete block"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-auto scrollbar p-4 space-y-4 text-sm">
        <Field label="Collection">
          <select
            value={collection}
            onChange={(e) =>
              update(selected.key, (n) => {
                const node = n as CollectionListNode;
                node.setCollection(e.target.value);
                node.setFields([]);
              })
            }
            className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">— unbound —</option>
            {collections.map((c) => (
              <option key={c.name} value={c.name}>
                📦 {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fields">
          {availableFields.length === 0 ? (
            <p className="text-[11px] text-neutral-400">Pick a collection to choose fields.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {availableFields.map((f) => {
                const on = fields.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleField(f)}
                    className={cn(
                      'chip cursor-pointer',
                      on ? 'bg-accent-soft text-accent' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                    )}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="Filter">
          <input
            value={filter}
            onChange={(e) =>
              update(selected.key, (n) => (n as CollectionListNode).setFilter(e.target.value))
            }
            placeholder='status = "published"'
            className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm mono"
            disabled={!collection}
          />
        </Field>

        <Field label="Sort">
          <input
            value={sort}
            onChange={(e) =>
              update(selected.key, (n) => (n as CollectionListNode).setSort(e.target.value))
            }
            placeholder="-published_at"
            className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm mono"
            disabled={!collection}
          />
        </Field>

        <Field label="Limit">
          <input
            type="number"
            value={limit}
            onChange={(e) =>
              update(selected.key, (n) =>
                (n as CollectionListNode).setLimit(Number(e.target.value))
              )
            }
            className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm"
          />
        </Field>

        <div className="rounded-md bg-neutral-50 border border-neutral-200 p-3 text-[11px] text-neutral-500 leading-relaxed">
          <div className="font-semibold text-neutral-700 mb-1">Preview</div>
          {collection ? (
            <>
              Up to <span className="mono">{limit}</span> record{limit === 1 ? '' : 's'} from{' '}
              <span className="mono">{collection}</span>
              {filter && <> where <span className="mono">{filter}</span></>}
              {sort && <>, sorted by <span className="mono">{sort}</span></>}.
            </>
          ) : (
            <>Bind a collection to see a live preview.</>
          )}
        </div>
      </div>
    </>
  );
}

function LibraryBrowser({ search, blocks, draggedPresetRef }: { search: string; blocks: LibraryBlock[]; draggedPresetRef: React.MutableRefObject<{ id: string; source: string } | null> }) {
  const q = search.trim().toLowerCase();
  const insert = useInsertNode();

  const filtered = q
    ? blocks.filter((b) => b.title.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || (b.description ?? '').toLowerCase().includes(q))
    : blocks;

  const grouped: Record<string, LibraryBlock[]> = {};
  for (const b of filtered) {
    const key = b.category || 'other';
    (grouped[key] ??= []).push(b);
  }
  const cats = Object.keys(grouped).sort();

  const [openCat, setOpenCat] = useState<string | null>(null);
  const toggle = (cat: string) => setOpenCat((p) => (p === cat ? null : cat));

  if (filtered.length === 0) {
    return <p className="text-[12px] text-neutral-400 px-1 py-2">No blocks match &quot;{search}&quot;.</p>;
  }

  return (
    <div className="space-y-1">
      {cats.map((cat) => {
        const open = openCat === cat || !!q;
        return (
          <div key={cat} className="border border-neutral-100 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(cat)}

              className="w-full flex items-center justify-between px-2 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-left"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                {CATEGORY_META[cat as keyof typeof CATEGORY_META]?.label ?? cat}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                {grouped[cat].length}
                <svg className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </span>
            </button>
            {open && (
              <div className="p-1.5 space-y-1.5">
                {grouped[cat].map((b) => (
                  <div
                    key={b.id}
                    draggable
                    onDragStart={() => { draggedPresetRef.current = { id: b.id, source: b.source }; }}
                    onDragEnd={() => { draggedPresetRef.current = null; }}
                    onClick={() => insert(() => new PresetBlockNode(b.id, b.source))}
                    className="bg-white border border-neutral-200 rounded p-1.5 cursor-pointer hover:border-accent transition-colors select-none"
                    title={b.description}
                  >
                    <div className="font-medium text-[11px] truncate">{b.title || b.name}</div>
                    <div className="text-[10px] text-neutral-400 truncate mb-1">{b.description}</div>
                    <div className="h-14 overflow-hidden rounded border border-neutral-100 relative bg-white">
                      <div
                        className="absolute inset-0 origin-top-left pointer-events-none"
                        style={{ transform: 'scale(0.28)', width: '357%', height: '357%' }}
                        dangerouslySetInnerHTML={{ __html: b.source.replace(/className=/g, 'class=') }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/70" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Node type helpers ──────────────────────────────────────────────────────────
function nodeTypeLabel(node: LexicalNode): string {
  const t = node.getType();
  if (t === 'heading') return `H${(node as any).getTag?.()?.slice(1) ?? ''}`;
  if (t === 'paragraph') return 'P';
  if (t === 'list') return (node as any).getListType?.() === 'number' ? 'OL' : 'UL';
  if (t === 'quote') return '"';
  if (t === 'fdl-image') return 'IMG';
  if (t === 'fdl-button') return 'BTN';
  if (t === 'fdl-collection-list') return 'DATA';
  if (t === 'fdl-preset-block') return 'BLK';
  if (t === 'fdl-shadcn-block') return (node as any).__tree?.component?.slice(0, 4).toUpperCase() ?? 'UI';
  return t.slice(0, 4).toUpperCase();
}

const TRUNC = 10;
function trunc(s: string) { return s.length > TRUNC ? s.slice(0, TRUNC) + '…' : s; }

function nodeDisplayName(node: LexicalNode): string {
  const t = node.getType();
  if (t === 'fdl-preset-block') {
    const label = (node as any).__label;
    return trunc(label || (node as any).__presetId || 'Block');
  }
  if (t === 'fdl-shadcn-block') return (node as any).__tree?.component ?? 'Component';
  if (t === 'heading') return trunc(node.getTextContent?.() || 'Heading');
  if (t === 'paragraph') return trunc(node.getTextContent?.() || 'Paragraph');
  if (t === 'list') return (node as any).getListType?.() === 'number' ? 'Numbered' : 'Bullets';
  if (t === 'quote') return trunc(node.getTextContent?.() || 'Quote');
  if (t === 'fdl-image') return trunc((node as any).__alt || 'Image');
  if (t === 'fdl-button') return trunc((node as any).__label2 || (node as any).__data?.label || 'Button');
  if (t === 'fdl-collection-list') return trunc((node as any).__collection || 'Card list');
  return trunc(t);
}

function nodeBadgeClass(node: LexicalNode): string {
  const t = node.getType();
  if (t.startsWith('heading')) return 'bg-purple-100 text-purple-700';
  if (t === 'fdl-preset-block') return 'bg-accent-soft text-accent';
  if (t === 'fdl-shadcn-block') return 'bg-violet-100 text-violet-700';
  if (t === 'fdl-collection-list') return 'bg-ok/10 text-ok';
  if (t === 'fdl-button') return 'bg-warn/10 text-warn';
  return 'bg-neutral-100 text-neutral-500';
}

// ── Page tree (outline of current page, draggable to reorder) ─────────────────
function PageTree({ selectedKey, onSelect, onNativeSelect }: { selectedKey: NodeKey | null; onSelect: (k: NodeKey) => void; onNativeSelect: (k: NodeKey | null) => void }) {
  const [editor] = useLexicalComposerContext();
  const { sel, setSel } = useContext(VisualSelCtx);
  const [items, setItems] = useState<Array<{ key: string; nodeType: string; typeLabel: string; displayName: string; badgeClass: string; visualTree?: import('@/lib/editor/visual-registry').VisualNode }>>([]);
  const dragKey = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ key: string; pos: 'before' | 'after' } | null>(null);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [localLabels, setLocalLabels] = useState<Record<string, string>>({});
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const read = () => {
      editor.getEditorState().read(() => {
        const children = $getRoot().getChildren();
        setItems(children.map((n) => ({
          key: n.getKey(),
          nodeType: n.getType(),
          typeLabel: nodeTypeLabel(n),
          displayName: nodeDisplayName(n),
          badgeClass: nodeBadgeClass(n),
          visualTree: n.getType() === 'fdl-shadcn-block' ? (n as any).__tree : undefined,
        })));
      });
    };
    read();
    return editor.registerUpdateListener(read);
  }, [editor]);

  useEffect(() => { if (renamingKey) renameRef.current?.focus(); }, [renamingKey]);

  const startRename = (key: string, currentName: string) => {
    setRenamingKey(key);
    setRenameVal(localLabels[key] ?? (currentName === 'Block' ? '' : currentName));
  };

  const commitRename = () => {
    if (!renamingKey) return;
    const key = renamingKey;
    const val = renameVal.trim();
    setRenamingKey(null);
    // Persist on block nodes via Lexical; all others use local label map
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(key) as any;
      if (node?.setLabel) {
        editor.update(() => { ($getNodeByKey(key) as any).setLabel(val); });
      }
    });
    setLocalLabels((prev) => ({ ...prev, [key]: val }));
  };

  const clearOutlineHighlight = () => {
    document.querySelectorAll('.outline-node-selected').forEach((el) => el.classList.remove('outline-node-selected'));
  };

  const handleNodeClick = (key: string, type: string) => {
    clearOutlineHighlight();
    onSelect(key as NodeKey);
    const isDecorator = ['fdl-preset-block', 'fdl-image', 'fdl-button', 'fdl-collection-list', 'fdl-shadcn-block'].includes(type);
    if (isDecorator) {
      onNativeSelect(null);
      editor.dispatchCommand(SELECT_DECORATOR_COMMAND, key);
    } else {
      onNativeSelect(key as NodeKey);
      const el = editor.getElementByKey(key);
      if (el) {
        el.classList.add('outline-node-selected');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  // Clear highlight when user clicks directly in canvas
  useEffect(() => {
    const remove = editor.registerUpdateListener(({ tags }) => {
      if (tags.has('selection-change')) {
        clearOutlineHighlight();
        onNativeSelect(null);
      }
    });
    return remove;
  }, [editor, onNativeSelect]);

  const handleDragStart = (key: string) => { dragKey.current = key; };
  const handleDragEnd = () => { dragKey.current = null; setDropTarget(null); };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    if (!dragKey.current || dragKey.current === key) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropTarget({ key, pos: e.clientY < rect.top + rect.height / 2 ? 'before' : 'after' });
  };

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    const fromKey = dragKey.current;
    const dt = dropTarget;
    dragKey.current = null;
    setDropTarget(null);
    if (!fromKey || fromKey === targetKey || !dt) return;
    editor.update(() => {
      const from = $getNodeByKey(fromKey);
      const to = $getNodeByKey(targetKey);
      if (!from || !to) return;
      dt.pos === 'before' ? to.insertBefore(from) : to.insertAfter(from);
    });
  };

  if (items.length === 0) {
    return (
      <p className="text-[12px] text-neutral-400 px-1 py-4 text-center">
        Canvas is empty.<br />
        <span className="text-neutral-300">Drag a block from Library or type / on the canvas.</span>
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const isSelected = item.key === selectedKey;
        const isDT = dropTarget?.key === item.key;
        const isRenaming = renamingKey === item.key;
        return (
          <div key={item.key}>
            <div
              draggable={!isRenaming}
              onDragStart={() => handleDragStart(item.key)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, item.key)}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => handleDrop(e, item.key)}
              onClick={() => !isRenaming && handleNodeClick(item.key, item.nodeType)}
              onDoubleClick={() => startRename(item.key, item.displayName)}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded select-none transition-colors text-[12px]',
                isRenaming ? 'bg-neutral-50 ring-1 ring-accent' : isSelected ? 'bg-accent-soft text-accent' : 'hover:bg-neutral-100 cursor-pointer',
                isDT && dropTarget?.pos === 'before' && 'border-t-2 border-accent',
                isDT && dropTarget?.pos === 'after' && 'border-b-2 border-accent',
              )}
            >
              <svg className="h-3 w-3 text-neutral-300 shrink-0 cursor-grab" viewBox="0 0 10 14" fill="currentColor">
                <circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/>
                <circle cx="2" cy="7" r="1.2"/><circle cx="8" cy="7" r="1.2"/>
                <circle cx="2" cy="12" r="1.2"/><circle cx="8" cy="12" r="1.2"/>
              </svg>
              <span className={cn('text-[9px] font-bold px-1 py-0.5 rounded shrink-0', item.badgeClass)}>
                {item.typeLabel}
              </span>
              {isRenaming ? (
                <input
                  ref={renameRef}
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingKey(null); }}
                  placeholder="Block name…"
                  className="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-neutral-800"
                />
              ) : (
                <span className="truncate text-neutral-700" title="Double-click to rename">
                  {localLabels[item.key] || item.displayName}
                </span>
              )}
            </div>
            {/* Visual component tree for ShadcnBlockNodes */}
            {item.visualTree && (
              <VisualOutlineTree
                node={item.visualTree}
                lexicalKey={item.key as NodeKey}
                depth={1}
                sel={sel}
                setSel={setSel}
                editor={editor}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

type VisualNode = import('@/lib/editor/visual-registry').VisualNode;

function VisualOutlineTree({
  node, lexicalKey, depth, sel, setSel, editor
}: {
  node: VisualNode; lexicalKey: NodeKey; depth: number;
  sel: import('@/lib/editor/visual-renderer').VisualSel;
  setSel: (v: import('@/lib/editor/visual-renderer').VisualSel) => void;
  editor: LexicalEditor;
}) {
  const { dragging } = useContext(DragCtx);
  const [dropOver, setDropOver] = useState(false);
  const allChildren = Object.values(node.slots).flat();
  const hasChildren = allChildren.length > 0;
  const [expanded, setExpanded] = useState(true);
  const isSelected = sel?.visualId === node.id;

  const def = REGISTRY_MAP[node.component];
  const canAcceptDrop = dragging && def && def.slots.length > 0;

  // Display name: first string prop value, or component name
  const firstStrProp = Object.values(node.props).find((v) => typeof v === 'string' && (v as string).length > 0) as string | undefined;
  const label = firstStrProp ? (firstStrProp.length > 12 ? firstStrProp.slice(0, 12) + '…' : firstStrProp) : node.component;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropOver(false);
    const compName = e.dataTransfer.getData('text/plain') || dragging;
    if (!compName || !def || def.slots.length === 0) return;
    const compDef = REGISTRY_MAP[compName];
    if (!compDef) return;
    const slotName = def.slots[0].name;
    const newChild = compDef.defaultNode();
    editor.update(() => {
      const n = $getNodeByKey(lexicalKey) as ShadcnBlockNode | null;
      if (!n) return;
      n.setTree(addToSlot(n.getTree(), node.id, slotName, newChild));
    });
    setSel({ nodeKey: lexicalKey, visualId: newChild.id });
    setExpanded(true);
  };

  return (
    <div>
      <div
        style={{ paddingLeft: `${depth * 14}px` }}
        onClick={() => setSel({ nodeKey: lexicalKey, visualId: node.id })}
        onDragOver={(e) => { if (canAcceptDrop) { e.preventDefault(); setDropOver(true); } }}
        onDragLeave={() => setDropOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex items-center gap-1.5 py-1 pr-2 rounded text-[11px] cursor-pointer select-none transition-colors',
          isSelected ? 'bg-accent-soft text-accent' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700',
          dropOver && 'bg-sky-50 ring-1 ring-sky-400 ring-inset'
        )}
      >
        {/* expand toggle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
          className={cn('shrink-0 w-3 h-3 flex items-center justify-center', !hasChildren && 'invisible')}
        >
          <svg className={cn('h-2.5 w-2.5 transition-transform', expanded && 'rotate-90')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
        </button>
        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-violet-100 text-violet-700 shrink-0">
          {node.component.slice(0, 4).toUpperCase()}
        </span>
        <span className="truncate">{label}</span>
        {dropOver && canAcceptDrop && (
          <span className="ml-auto text-[9px] text-sky-500 font-medium shrink-0">+ {def.slots[0].label}</span>
        )}
      </div>
      {hasChildren && expanded && allChildren.map((child) => (
        <VisualOutlineTree key={child.id} node={child} lexicalKey={lexicalKey} depth={depth + 1} sel={sel} setSel={setSel} editor={editor} />
      ))}
    </div>
  );
}

function NativeOverlayPlugin({ nativeKey, onClear }: { nativeKey: NodeKey | null; onClear: () => void }) {
  const [editor] = useLexicalComposerContext();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [info, setInfo] = useState<{ typeLabel: string; displayName: string } | null>(null);

  useEffect(() => {
    if (!nativeKey) { setRect(null); setInfo(null); return; }
    const update = () => {
      const el = editor.getElementByKey(nativeKey);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    editor.getEditorState().read(() => {
      const n = $getNodeByKey(nativeKey);
      if (n) setInfo({ typeLabel: nodeTypeLabel(n), displayName: nodeDisplayName(n) });
    });
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    const unsub = editor.registerUpdateListener(update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      unsub();
    };
  }, [editor, nativeKey]);

  // Clear when canvas selection changes
  useEffect(() => {
    return editor.registerUpdateListener(({ tags }) => {
      if (tags.has('selection-change')) onClear();
    });
  }, [editor, onClear]);

  if (!nativeKey || !rect || !info) return null;

  const handleDelete = () => {
    editor.update(() => {
      const n = $getNodeByKey(nativeKey);
      if (n) n.remove();
    });
    onClear();
  };

  return createPortal(
    <>
      <span
        style={{ position: 'fixed', top: rect.top - 10, left: rect.left + 8, zIndex: 9999 }}
        className="bg-accent text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none select-none"
      >
        {info.typeLabel} · {info.displayName}
      </span>
      <button
        type="button"
        style={{ position: 'fixed', top: rect.top - 10, left: rect.right - 28, zIndex: 9999 }}
        onClick={handleDelete}
        className="bg-white border border-neutral-200 text-danger text-[10px] w-5 h-5 rounded flex items-center justify-center hover:bg-danger hover:text-white"
        title="Delete node"
      >
        ✕
      </button>
    </>,
    document.body
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-neutral-400">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ── Shadcn visual component panels ──────────────────────────────────────────

function ShadcnPropsPanel({
  sel,
  setSel,
  editor,
  selectedKey,
  pages,
  collections,
  collectionFieldsByName,
}: {
  sel: VisualSel;
  setSel: (v: VisualSel) => void;
  editor: LexicalEditor;
  selectedKey: NodeKey;
  pages: Array<{ id: string; title: string; slug: string }>;
  collections: string[];
  collectionFieldsByName: Record<string, string[]>;
}) {
  const [, tick] = useState(0);
  useEffect(() => editor.registerUpdateListener(() => tick((n) => n + 1)), [editor]);

  if (!sel || sel.nodeKey !== selectedKey) {
    return (
      <div className="p-4 text-[12px] text-neutral-400">
        Select a component to edit its properties.
      </div>
    );
  }

  const shadcnInfo = getShadcnNodeInfo(editor, selectedKey);
  if (!shadcnInfo) return null;

  const node = findNodeInTree(shadcnInfo.tree, sel.visualId);
  if (!node) return null;

  const def = REGISTRY_MAP[node.component];
  if (!def) return null;

  const updateProp = (key: string, value: any) => {
    editor.update(() => {
      const n = $getNodeByKey(selectedKey) as ShadcnBlockNode | null;
      if (n) n.setTree(updatePropsInTree(n.getTree(), sel.visualId, { [key]: value }));
    });
  };

  const updateBinding = (key: string, binding: { collection: string; field: string } | null) => {
    editor.update(() => {
      const n = $getNodeByKey(selectedKey) as ShadcnBlockNode | null;
      if (!n) return;
      const tree = n.getTree();
      const target = findNodeInTree(tree, sel.visualId);
      if (!target) return;
      const newBindings = { ...(target.bindings ?? {}) };
      if (binding) {
        newBindings[key] = binding;
      } else {
        delete newBindings[key];
      }
      // We patch bindings by rebuilding the node — use a small helper
      const patchBindingsInTree = (root: import('@/lib/editor/visual-registry').VisualNode): import('@/lib/editor/visual-registry').VisualNode => {
        if (root.id === sel.visualId) return { ...root, bindings: newBindings };
        return {
          ...root,
          slots: Object.fromEntries(
            Object.entries(root.slots).map(([sn, sNodes]) => [sn, sNodes.map(patchBindingsInTree)])
          ),
        };
      };
      n.setTree(patchBindingsInTree(tree));
    });
  };

  const isLeaf = def.slots.length === 0;

  return (
    <>
      <div className="p-4 border-b border-neutral-200">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400">Component</div>
        <div className="text-sm font-semibold">{def.label}</div>
        {def.description && <div className="text-[11px] text-neutral-500 mt-0.5">{def.description}</div>}
      </div>
      <div className="flex-1 overflow-auto scrollbar p-4 space-y-4 text-sm">
        {Object.entries(def.props).map(([key, pd]) => (
          <PropEditor
            key={key}
            propKey={key}
            def={pd}
            value={node.props[key]}
            onChange={(v) => updateProp(key, v)}
            pages={pages}
            collections={collections}
            collectionFieldsByName={collectionFieldsByName}
          />
        ))}
        {Object.keys(def.props).length === 0 && (
          <p className="text-[12px] text-neutral-400">No configurable properties.</p>
        )}

        {/* Data binding section — leaf nodes only */}
        {isLeaf && Object.keys(def.props).length > 0 && (
          <div className="pt-2 border-t border-neutral-100">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">Data Binding</div>
            <div className="space-y-2">
              {Object.entries(def.props).map(([key, pd]) => {
                if (pd.kind === 'action' || pd.kind === 'binding') return null;
                const binding = (node.bindings ?? {})[key];
                return (
                  <div key={key} className="text-[11px]">
                    <div className="text-neutral-500 mb-0.5">{pd.label}</div>
                    <BindingEditor
                      value={binding ?? null}
                      onChange={(b) => updateBinding(key, b)}
                      collections={collections}
                      collectionFieldsByName={collectionFieldsByName}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {def.slots.length > 0 && (
          <div className="pt-2 border-t border-neutral-100">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">Slots</div>
            {def.slots.map((slot) => {
              const slotNodes = node.slots[slot.name] ?? [];
              return (
                <div key={slot.name} className="text-[11px] text-neutral-500">
                  {slot.label}: {slotNodes.length} item{slotNodes.length !== 1 ? 's' : ''}
                </div>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            editor.update(() => {
              const n = $getNodeByKey(selectedKey) as ShadcnBlockNode | null;
              if (!n) return;
              const newTree = removeFromTree(n.getTree(), sel.visualId);
              if (newTree === null) {
                n.remove();
              } else {
                n.setTree(newTree);
              }
            });
            setSel(null);
          }}
          className="w-full mt-2 px-3 py-1.5 text-[11px] text-danger border border-danger/30 rounded-md hover:bg-danger/5"
        >
          Remove component
        </button>
      </div>
    </>
  );
}

function PropEditor({
  propKey,
  def,
  value,
  onChange,
  pages = [],
  collections = [],
  collectionFieldsByName = {},
}: {
  propKey: string;
  def: PropDef;
  value: any;
  onChange: (v: any) => void;
  pages?: Array<{ id: string; title: string; slug: string }>;
  collections?: string[];
  collectionFieldsByName?: Record<string, string[]>;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-neutral-400">{def.label}</label>
      <div className="mt-1">
        {def.kind === 'string' && (
          <input
            value={String(value ?? def.default ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm"
          />
        )}
        {def.kind === 'text' && (
          <textarea
            value={String(value ?? def.default ?? '')}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm resize-none"
          />
        )}
        {def.kind === 'number' && (
          <input
            type="number"
            min={def.min}
            max={def.max}
            value={Number(value ?? def.default ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm"
          />
        )}
        {def.kind === 'boolean' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value ?? def.default)}
              onChange={(e) => onChange(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-neutral-600">{Boolean(value ?? def.default) ? 'Yes' : 'No'}</span>
          </label>
        )}
        {def.kind === 'select' && (
          <select
            value={String(value ?? def.default ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-white"
          >
            {def.options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        )}
        {def.kind === 'array' && (
          <ArrayEditor
            value={Array.isArray(value) ? (value as string[]) : (def.default ?? [])}
            onChange={onChange}
          />
        )}
        {def.kind === 'action' && (
          <ActionEditor
            value={value as ActionDef | null}
            onChange={onChange}
            pages={pages}
          />
        )}
        {def.kind === 'binding' && (
          <BindingEditor
            value={value as { collection: string; field: string } | null}
            onChange={onChange}
            collections={collections}
            collectionFieldsByName={collectionFieldsByName}
          />
        )}
      </div>
    </div>
  );
}

function ArrayEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      {value.map((item, i) => (
        <div key={i} className="flex gap-1">
          <input
            value={item}
            onChange={(e) => {
              const next = [...value];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="flex-1 border border-neutral-200 rounded-md px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="text-neutral-400 hover:text-danger px-1 text-sm"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, ''])}
        className="text-[11px] text-accent hover:underline"
      >
        + Add item
      </button>
    </div>
  );
}

function ActionEditor({
  value,
  onChange,
  pages,
}: {
  value: ActionDef | null;
  onChange: (v: ActionDef | null) => void;
  pages: Array<{ id: string; title: string; slug: string }>;
}) {
  const type = value?.type ?? 'none';

  const setType = (t: string) => {
    if (t === 'none') { onChange(null); return; }
    if (t === 'navigate') onChange({ type: 'navigate', pageId: '' });
    else if (t === 'url') onChange({ type: 'url', href: '' });
    else if (t === 'submit') onChange({ type: 'submit' });
    else if (t === 'delete') onChange({ type: 'delete', collection: '' });
  };

  return (
    <div className="space-y-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm bg-white"
      >
        <option value="none">None</option>
        <option value="navigate">Navigate to page</option>
        <option value="url">Open URL</option>
        <option value="submit">Submit form</option>
        <option value="delete">Delete record</option>
      </select>

      {type === 'navigate' && (
        <select
          value={(value as any)?.pageId ?? ''}
          onChange={(e) => {
            const pg = pages.find((p) => p.id === e.target.value);
            onChange({ type: 'navigate', pageId: e.target.value, pageSlug: pg?.slug, pageTitle: pg?.title });
          }}
          className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm bg-white"
        >
          <option value="">— select page —</option>
          {pages.map((pg) => (
            <option key={pg.id} value={pg.id}>{pg.title || pg.slug}</option>
          ))}
        </select>
      )}

      {type === 'url' && (
        <div className="space-y-1.5">
          <input
            value={(value as any)?.href ?? ''}
            onChange={(e) => onChange({ type: 'url', href: e.target.value, newTab: (value as any)?.newTab })}
            placeholder="https://…"
            className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm"
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean((value as any)?.newTab)}
              onChange={(e) => onChange({ type: 'url', href: (value as any)?.href ?? '', newTab: e.target.checked })}
            />
            <span className="text-neutral-600">Open in new tab</span>
          </label>
        </div>
      )}

      {type === 'delete' && (
        <div className="space-y-1.5">
          <input
            value={(value as any)?.collection ?? ''}
            onChange={(e) => onChange({ type: 'delete', collection: e.target.value, confirmMsg: (value as any)?.confirmMsg })}
            placeholder="collection name"
            className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm"
          />
          <input
            value={(value as any)?.confirmMsg ?? ''}
            onChange={(e) => onChange({ type: 'delete', collection: (value as any)?.collection ?? '', confirmMsg: e.target.value })}
            placeholder="Confirm message (optional)"
            className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-sm"
          />
        </div>
      )}
    </div>
  );
}

function BindingEditor({
  value,
  onChange,
  collections,
  collectionFieldsByName,
}: {
  value: { collection: string; field: string } | null;
  onChange: (v: { collection: string; field: string } | null) => void;
  collections: string[];
  collectionFieldsByName: Record<string, string[]>;
}) {
  const selectedCollection = value?.collection ?? '';
  const selectedField = value?.field ?? '';
  const fields = selectedCollection ? (collectionFieldsByName[selectedCollection] ?? []) : [];

  return (
    <div className="flex gap-1">
      <select
        value={selectedCollection}
        onChange={(e) => {
          const col = e.target.value;
          if (!col) { onChange(null); return; }
          onChange({ collection: col, field: '' });
        }}
        className="flex-1 border border-neutral-200 rounded-md px-2 py-1 text-xs bg-white"
      >
        <option value="">None</option>
        {collections.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      {selectedCollection && (
        <select
          value={selectedField}
          onChange={(e) => onChange({ collection: selectedCollection, field: e.target.value })}
          className="flex-1 border border-neutral-200 rounded-md px-2 py-1 text-xs bg-white"
        >
          <option value="">— field —</option>
          {fields.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      )}
    </div>
  );
}

// Inspector for `fdl-preset-block` — bind a collection + slot map at placement time.
type SlotLinkTarget =
  | { type: 'page'; pageId: string; query?: string; hash?: string; newTab?: boolean }
  | { type: 'record'; collection: string; recordId: string; pagePattern?: string; newTab?: boolean }
  | { type: 'external'; url: string; newTab?: boolean }
  | { type: 'anchor'; id: string };
type SlotBinding =
  | { kind: 'literal'; value: string }
  | { kind: 'field'; template: string }
  | { kind: 'link'; target: SlotLinkTarget };
type PresetBindingMode = 'literal' | 'route' | 'related' | 'related-list' | 'query-list';
type SlotTypeDef = { type: string; format?: string; fallback?: string };

function PresetBlockInspector({
  selected,
  update,
  remove,
  defaultCollection,
  pageParams,
  collections,
  collectionFieldsByName,
  relationsByCollection,
  libraryBlocks,
  pages,
}: {
  selected: { key: NodeKey; type: string; props: Record<string, any> };
  update: (key: NodeKey, fn: (n: LexicalNode) => void) => void;
  remove: (key: NodeKey) => void;
  defaultCollection: string;
  pageParams: string;
  collections: Array<{ name: string; label: string }>;
  collectionFieldsByName: Record<string, string[]>;
  relationsByCollection: Record<string, RelationRef[]>;
  libraryBlocks: LibraryBlock[];
  pages: Array<{ id: string; title: string; slug: string }>;
}) {
  const source: string = selected.props.source ?? '';
  const presetId: string = selected.props.presetId ?? '';
  const collection: string | null = selected.props.collection ?? null;
  const bindingMode: PresetBindingMode = selected.props.bindingMode ?? 'literal';
  const relatedFk: string | null = selected.props.relatedFk ?? null;
  const slotMap: Record<string, SlotBinding> = selected.props.slotMap ?? {};
  const libraryBlock = libraryBlocks.find((b) => b.id === presetId || b.name === presetId);
  const slotSchema: Record<string, SlotTypeDef> = (libraryBlock?.slotSchema as any) ?? {};

  // Slots detected from the row template (between {{#each rows}} … {{/each}}) or whole source.
  const eachMatch = source.match(/\{\{#each\s+rows\}\}([\s\S]*?)\{\{\/each\}\}/);
  const rowTemplate = eachMatch ? eachMatch[1] : source;
  const isListMode = bindingMode === 'related-list' || bindingMode === 'query-list';
  const scanText = isListMode ? rowTemplate : source;
  const slotNames = [...new Set([...scanText.matchAll(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g)].map((m) => m[1]))];
  const [slotSearch, setSlotSearch] = useState('');
  const filteredSlotNames = slotSearch
    ? slotNames.filter((s) => s.toLowerCase().includes(slotSearch.toLowerCase()))
    : slotNames;

  const params = pageParams.split(',').map((s) => s.trim()).filter(Boolean);
  const hasIdParam = params.includes('id');
  const hasDefault = !!defaultCollection;
  const rels = hasDefault ? (relationsByCollection[defaultCollection] ?? []) : [];
  const relByName = Object.fromEntries(rels.map((r) => [r.name, r]));

  // Possible modes based on page context.
  const modes: Array<{ value: PresetBindingMode; label: string; disabled: boolean; hint?: string }> = [
    { value: 'literal', label: 'Literal', disabled: false, hint: 'Type slot values directly' },
    { value: 'route', label: 'Route record', disabled: !(hasDefault && hasIdParam), hint: hasDefault && hasIdParam ? `${defaultCollection} where id = params.id` : 'Requires page with default collection + id param' },
    { value: 'related', label: 'Related · one', disabled: rels.length === 0, hint: 'First matching related record' },
    { value: 'related-list', label: 'Related · list', disabled: rels.length === 0, hint: 'All matching related records' },
    { value: 'query-list', label: 'Query · list', disabled: !hasDefault, hint: hasDefault ? `List ${defaultCollection} records` : 'Requires page default collection' },
  ];

  const setMode = (next: PresetBindingMode) => {
    update(selected.key, (n) => {
      const node = n as PresetBlockNode;
      node.setBindingMode(next);
      if (next === 'literal') {
        node.setCollection(null);
        node.setRelatedFk(null);
      } else if (next === 'route') {
        node.setCollection(defaultCollection);
        node.setRelatedFk(null);
      } else if (next === 'query-list') {
        node.setCollection(defaultCollection);
        node.setRelatedFk(null);
      } else if (next === 'related' || next === 'related-list') {
        const first = rels[0];
        if (first) {
          node.setCollection(first.name);
          node.setRelatedFk(first.fkField);
        }
      }
    });
  };

  const setCollectionFor = (colName: string) => {
    update(selected.key, (n) => {
      const node = n as PresetBlockNode;
      node.setCollection(colName);
      if (bindingMode === 'related' || bindingMode === 'related-list') {
        node.setRelatedFk(relByName[colName]?.fkField ?? null);
      }
    });
  };

  const setSlotBinding = (slot: string, b: SlotBinding) => {
    update(selected.key, (n) => {
      const node = n as PresetBlockNode;
      node.setSlotMap({ ...slotMap, [slot]: b });
    });
  };

  // Fields available for slot mapping. Prefer the block's explicit collection
  // (when bound via route/related/query-list) — fall back to the page default
  // so callers can pull fields even while the block is in literal mode.
  const effectiveCollection = collection ?? (defaultCollection || null);
  const fieldsForBound = effectiveCollection
    ? ['id', ...(collectionFieldsByName[effectiveCollection] ?? []).filter((f) => f !== 'id')]
    : [];

  // Collection picker options depend on mode.
  const pickerOptions: Array<{ name: string; label: string }> =
    bindingMode === 'route' || bindingMode === 'query-list'
      ? (hasDefault ? [{ name: defaultCollection, label: collections.find((c) => c.name === defaultCollection)?.label ?? defaultCollection }] : [])
      : bindingMode === 'related' || bindingMode === 'related-list'
      ? rels.map((r) => ({ name: r.name, label: collections.find((c) => c.name === r.name)?.label ?? r.name }))
      : [];

  return (
    <>
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-400">Preset block</div>
          <div className="text-sm font-semibold mono">{selected.props.presetId}</div>
        </div>
        <button
          type="button"
          onClick={() => remove(selected.key)}
          className="text-[11px] text-neutral-400 hover:text-danger"
          title="Delete block"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-auto scrollbar p-4 space-y-5 text-sm">
        {/* Binding mode */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">Binding</div>
          <div className="grid grid-cols-1 gap-1">
            {modes.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => !m.disabled && setMode(m.value)}
                disabled={m.disabled}
                className={cn(
                  'text-left px-2.5 py-1.5 rounded border text-[12px] flex items-center justify-between gap-2',
                  bindingMode === m.value
                    ? 'bg-accent-soft border-accent text-accent'
                    : m.disabled
                    ? 'border-neutral-100 text-neutral-300 cursor-not-allowed'
                    : 'border-neutral-200 hover:bg-neutral-50'
                )}
                title={m.hint}
              >
                <span>{m.label}</span>
                {bindingMode === m.value && <span className="text-[10px]">●</span>}
              </button>
            ))}
          </div>
          {!hasDefault && (
            <p className="text-[10px] text-neutral-400 mt-1.5">
              Tip: set a default collection in the page header to unlock record binding.
            </p>
          )}
        </div>

        {/* Collection picker (only for non-literal modes) */}
        {bindingMode !== 'literal' && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">Collection</div>
            <select
              value={collection ?? ''}
              onChange={(e) => setCollectionFor(e.target.value)}
              className="w-full border border-neutral-200 rounded-md px-2.5 py-1.5 text-[12px] bg-white"
            >
              <option value="">— pick —</option>
              {pickerOptions.map((c) => (
                <option key={c.name} value={c.name}>{c.label}</option>
              ))}
            </select>
            {(bindingMode === 'related' || bindingMode === 'related-list') && collection && (
              <div className="text-[10px] text-neutral-500 mt-1">
                Filtered by <code className="mono">{relByName[collection]?.fkField}</code> = current record id
              </div>
            )}
          </div>
        )}

        {/* List-mode selector */}
        {bindingMode === 'query-list' && (
          <ListSelectorEditor
            selector={selected.props.listSelector ?? {}}
            onChange={(next) => update(selected.key, (n) => (n as PresetBlockNode).setListSelector(next))}
          />
        )}

        {/* Slot map */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5 flex items-center justify-between">
            <span>Slots {isListMode && <span className="text-neutral-400 normal-case">· per row</span>}</span>
            {slotNames.length > 0 && (
              <span className="text-neutral-400 normal-case">{slotNames.length}</span>
            )}
          </div>
          {slotNames.length > 3 && (
            <input
              value={slotSearch}
              onChange={(e) => setSlotSearch(e.target.value)}
              placeholder="Search slots…"
              className="w-full border border-neutral-200 rounded-md px-2 py-1 text-[11px] mb-2"
            />
          )}
          {slotNames.length === 0 ? (
            <p className="text-[11px] text-neutral-400">No slots detected in template.</p>
          ) : (
            <div className="space-y-1.5">
              {filteredSlotNames.map((slot) => {
                const def = slotSchema[slot];
                // Prefer field binding when a collection is reachable — saves a click.
                const binding: SlotBinding = slotMap[slot] ?? (def?.type === 'link'
                  ? { kind: 'link', target: { type: 'external', url: '' } }
                  : effectiveCollection
                    ? { kind: 'field', template: '' }
                    : { kind: 'literal', value: '' });
                const isConfigured = !!slotMap[slot];
                return (
                  <SlotMapRow
                    key={slot}
                    slot={slot}
                    def={def}
                    binding={binding}
                    onChange={(b) => setSlotBinding(slot, b)}
                    bindingMode={bindingMode}
                    collection={effectiveCollection}
                    fieldsForBound={fieldsForBound}
                    pages={pages}
                    initialExpanded={!isConfigured}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FieldTemplateEditor({
  fields,
  template,
  onChange,
}: {
  fields: string[];
  template: string;
  onChange: (next: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number>(template.length);

  const filtered = search
    ? fields.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
    : fields;

  const insertField = (f: string) => {
    const token = `{${f}}`;
    const pos = caretRef.current;
    const next = template.slice(0, pos) + token + template.slice(pos);
    onChange(next);
    caretRef.current = pos + token.length;
    setSearch('');
    // Restore focus + caret after React updates the input value.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) { el.focus(); el.setSelectionRange(caretRef.current, caretRef.current); }
    });
  };

  // Split template into literal + token parts so we can render a preview
  // where linked fields are chipped (distinct from static text).
  const parts = template.split(/(\{[a-zA-Z_][a-zA-Z0-9_]*\})/g);

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        value={template}
        onChange={(e) => { onChange(e.target.value); caretRef.current = e.target.selectionStart ?? e.target.value.length; }}
        onKeyUp={(e) => { caretRef.current = (e.currentTarget.selectionStart ?? e.currentTarget.value.length); }}
        onClick={(e) => { caretRef.current = (e.currentTarget.selectionStart ?? e.currentTarget.value.length); }}
        placeholder="e.g. your full name is {name} {lastname}"
        className="w-full border border-neutral-200 rounded-md px-2 py-1 text-[12px] mono bg-white"
      />
      {template && (
        <div className="flex flex-wrap items-center gap-0.5 text-[11px] border border-dashed border-neutral-200 rounded-md px-2 py-1 bg-neutral-50">
          {parts.map((p, i) => {
            if (!p) return null;
            const isToken = /^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(p);
            return isToken ? (
              <span key={i} className="mono text-accent bg-accent/10 px-1 rounded">{p}</span>
            ) : (
              <span key={i} className="text-neutral-600 whitespace-pre-wrap">{p}</span>
            );
          })}
        </div>
      )}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Insert field…"
          className="w-full border border-neutral-200 rounded-md px-2 py-1 text-[11px] bg-white"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-neutral-200 rounded-md shadow-sm">
            {filtered.map((f) => (
              <button
                key={f}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertField(f); }}
                className="w-full text-left px-2 py-1 text-[12px] hover:bg-neutral-100 mono"
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SlotMapRow({
  slot,
  def,
  binding,
  onChange,
  bindingMode,
  collection,
  fieldsForBound,
  pages,
  initialExpanded = false,
}: {
  slot: string;
  def: SlotTypeDef | undefined;
  binding: SlotBinding;
  onChange: (b: SlotBinding) => void;
  bindingMode: PresetBindingMode;
  collection: string | null;
  fieldsForBound: string[];
  pages: Array<{ id: string; title: string; slug: string }>;
  initialExpanded?: boolean;
}) {
  const slotType = def?.type ?? 'string';
  const isLink = slotType === 'link';
  const typeLabel = `${slotType}${def?.format ? ` · ${def.format}` : ''}`;

  // For link slots: "Link target" mode controls which sub-editor shows.
  // Users can still flip to `field` if they want to pull a pre-formed URL from a record.
  const linkKind = binding.kind === 'link' ? binding.target.type : null;

  // Short summary shown in the collapsed header so authors can scan bindings without opening each row.
  // Renders `{field}` tokens as accent chips so linked values stand out from static text.
  const renderTemplate = (tmpl: string): React.ReactNode => {
    const parts = tmpl.split(/(\{[a-zA-Z_][a-zA-Z0-9_]*\})/g);
    return parts.map((p, i) => {
      if (!p) return null;
      const isToken = /^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(p);
      return isToken
        ? <span key={i} className="mono text-accent bg-accent/10 px-1 rounded">{p}</span>
        : <span key={i}>{p}</span>;
    });
  };
  const summary: React.ReactNode = (() => {
    if (binding.kind === 'literal') return binding.value ? `"${binding.value}"` : 'empty';
    if (binding.kind === 'field') {
      return binding.template
        ? <>field · {renderTemplate(binding.template)}</>
        : 'field · —';
    }
    if (binding.kind === 'link') {
      const t = binding.target;
      if (t.type === 'page')     return `page · ${pages.find((p) => p.id === t.pageId)?.slug ?? '—'}`;
      if (t.type === 'record')   return `record · ${t.collection || '—'}/${t.recordId || '—'}`;
      if (t.type === 'external') return `url · ${t.url || '—'}`;
      if (t.type === 'anchor')   return `#${t.id || '—'}`;
    }
    return '—';
  })();

  const [expanded, setExpanded] = useState(initialExpanded);

  return (
    <div className="border border-neutral-200 rounded-md bg-neutral-50/40">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <code className={cn(
            'mono text-[11px] px-1.5 py-0.5 rounded shrink-0',
            binding.kind === 'field' ? 'bg-purple-100 text-purple-700'
            : binding.kind === 'link' ? 'bg-amber-100 text-amber-700'
            : 'bg-accent/10 text-accent'
          )}>
            {'{' + slot + '}'}
          </code>
          <span className="text-[10px] text-neutral-500 truncate">
            {typeLabel}{' · '}{summary}
          </span>
        </div>
        <span className="text-neutral-400 text-[11px] shrink-0">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
      <div className="px-2 pb-2 border-t border-neutral-200 pt-2">

      {/* Per-slot source switcher: Value | Field (| Link types). Works independent of block-level binding mode. */}
      <div className="inline-flex items-center bg-white border border-neutral-200 rounded-md p-0.5 text-[11px] mb-2 flex-wrap">
        <button
          type="button"
          onClick={() => onChange({ kind: 'literal', value: binding.kind === 'literal' ? binding.value : '' })}
          className={cn(
            'px-2 py-0.5 rounded',
            binding.kind === 'literal' ? 'bg-accent text-white' : 'text-neutral-500 hover:text-neutral-800'
          )}
        >
          Value
        </button>
        <button
          type="button"
          onClick={() => onChange({ kind: 'field', template: binding.kind === 'field' ? binding.template : '' })}
          className={cn(
            'px-2 py-0.5 rounded',
            binding.kind === 'field' ? 'bg-accent text-white' : 'text-neutral-500 hover:text-neutral-800'
          )}
        >
          Field
        </button>
        {isLink && (
          <>
            <button
              type="button"
              onClick={() => onChange({ kind: 'link', target: { type: 'page', pageId: pages[0]?.id ?? '' } })}
              className={cn(
                'px-2 py-0.5 rounded',
                linkKind === 'page' ? 'bg-accent text-white' : 'text-neutral-500 hover:text-neutral-800'
              )}
            >Page</button>
            <button
              type="button"
              onClick={() => onChange({ kind: 'link', target: { type: 'record', collection: collection ?? '', recordId: '' } })}
              className={cn(
                'px-2 py-0.5 rounded',
                linkKind === 'record' ? 'bg-accent text-white' : 'text-neutral-500 hover:text-neutral-800'
              )}
            >Record</button>
            <button
              type="button"
              onClick={() => onChange({ kind: 'link', target: { type: 'external', url: '' } })}
              className={cn(
                'px-2 py-0.5 rounded',
                linkKind === 'external' ? 'bg-accent text-white' : 'text-neutral-500 hover:text-neutral-800'
              )}
            >URL</button>
            <button
              type="button"
              onClick={() => onChange({ kind: 'link', target: { type: 'anchor', id: '' } })}
              className={cn(
                'px-2 py-0.5 rounded',
                linkKind === 'anchor' ? 'bg-accent text-white' : 'text-neutral-500 hover:text-neutral-800'
              )}
            >Anchor</button>
          </>
        )}
      </div>

      {binding.kind === 'literal' && (
        <input
          type={slotType === 'number' ? 'number' : slotType === 'date' ? 'date' : 'text'}
          value={binding.value}
          onChange={(e) => onChange({ kind: 'literal', value: e.target.value })}
          placeholder={`[${slot}]`}
          className="w-full border border-neutral-200 rounded-md px-2 py-1 text-[12px]"
        />
      )}

      {binding.kind === 'field' && (
        fieldsForBound.length === 0 ? (
          <div className="text-[11px] text-neutral-500 border border-dashed border-neutral-200 rounded-md px-2 py-1.5">
            No collection on this page — set a default collection (page header) or change the block's binding mode.
          </div>
        ) : (
          <FieldTemplateEditor
            fields={fieldsForBound}
            template={binding.template}
            onChange={(next) => onChange({ kind: 'field', template: next })}
          />
        )
      )}

      {isLink && binding.kind === 'link' ? (
        <>
          {binding.kind === 'link' && binding.target.type === 'page' && (() => {
            const t = binding.target;
            return (
              <div className="space-y-1.5">
                <select
                  value={t.pageId}
                  onChange={(e) => onChange({ kind: 'link', target: { type: 'page', pageId: e.target.value, query: t.query, hash: t.hash, newTab: t.newTab } })}
                  className="w-full border border-neutral-200 rounded-md px-2 py-1 text-[12px] bg-white"
                >
                  <option value="">— pick a page —</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>{p.title} · /{p.slug}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <input
                    type="checkbox"
                    checked={!!t.newTab}
                    onChange={(e) => onChange({ kind: 'link', target: { type: 'page', pageId: t.pageId, query: t.query, hash: t.hash, newTab: e.target.checked } })}
                  />
                  Open in new tab
                </label>
              </div>
            );
          })()}

          {binding.kind === 'link' && binding.target.type === 'record' && (() => {
            const t = binding.target;
            return (
              <div className="space-y-1.5">
                <input
                  value={t.collection}
                  onChange={(e) => onChange({ kind: 'link', target: { type: 'record', collection: e.target.value, recordId: t.recordId, pagePattern: t.pagePattern, newTab: t.newTab } })}
                  placeholder="collection name"
                  className="w-full border border-neutral-200 rounded-md px-2 py-1 text-[12px] mono"
                />
                <input
                  value={t.recordId}
                  onChange={(e) => onChange({ kind: 'link', target: { type: 'record', collection: t.collection, recordId: e.target.value, pagePattern: t.pagePattern, newTab: t.newTab } })}
                  placeholder="record id"
                  className="w-full border border-neutral-200 rounded-md px-2 py-1 text-[12px] mono"
                />
                <input
                  value={t.pagePattern ?? ''}
                  onChange={(e) => onChange({ kind: 'link', target: { type: 'record', collection: t.collection, recordId: t.recordId, pagePattern: e.target.value || undefined, newTab: t.newTab } })}
                  placeholder="/{collection}/{id}"
                  className="w-full border border-neutral-200 rounded-md px-2 py-1 text-[12px] mono"
                />
              </div>
            );
          })()}

          {binding.kind === 'link' && binding.target.type === 'external' && (() => {
            const t = binding.target;
            return (
              <div className="space-y-1.5">
                <input
                  value={t.url}
                  onChange={(e) => onChange({ kind: 'link', target: { type: 'external', url: e.target.value, newTab: t.newTab } })}
                  placeholder="https://example.com"
                  className="w-full border border-neutral-200 rounded-md px-2 py-1 text-[12px]"
                />
                <label className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <input
                    type="checkbox"
                    checked={!!t.newTab}
                    onChange={(e) => onChange({ kind: 'link', target: { type: 'external', url: t.url, newTab: e.target.checked } })}
                  />
                  Open in new tab
                </label>
              </div>
            );
          })()}

          {binding.kind === 'link' && binding.target.type === 'anchor' && (() => {
            const t = binding.target;
            return (
              <input
                value={t.id}
                onChange={(e) => onChange({ kind: 'link', target: { type: 'anchor', id: e.target.value } })}
                placeholder="section-id"
                className="w-full border border-neutral-200 rounded-md px-2 py-1 text-[12px] mono"
              />
            );
          })()}

        </>
      ) : null}
      </div>
      )}
    </div>
  );
}

function ListSelectorEditor({
  selector,
  onChange,
}: {
  selector: { filter?: string; sort?: string; limit?: number };
  onChange: (next: { filter?: string; sort?: string; limit?: number }) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-neutral-400">List selector</div>
      <input
        value={selector.filter ?? ''}
        onChange={(e) => onChange({ ...selector, filter: e.target.value || undefined })}
        placeholder="filter (e.g. status=published)"
        className="w-full border border-neutral-200 rounded-md px-2.5 py-1.5 text-[12px]"
      />
      <input
        value={selector.sort ?? ''}
        onChange={(e) => onChange({ ...selector, sort: e.target.value || undefined })}
        placeholder="sort (e.g. createdAt:desc)"
        className="w-full border border-neutral-200 rounded-md px-2.5 py-1.5 text-[12px]"
      />
      <input
        type="number"
        value={selector.limit ?? ''}
        onChange={(e) => onChange({ ...selector, limit: e.target.value ? Number(e.target.value) : undefined })}
        placeholder="limit"
        className="w-full border border-neutral-200 rounded-md px-2.5 py-1.5 text-[12px]"
      />
    </div>
  );
}
