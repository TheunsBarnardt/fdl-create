'use client';
import { useEffect, useRef, useState } from 'react';
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
import { SelectionSyncPlugin, SlashMenuPlugin, DecoratorDeletePlugin } from '@/lib/editor/plugins';
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

type LibraryBlock = { id: string; name: string; title: string; description: string; category: string; source: string };
type SideTab = 'blocks' | 'pages' | 'library';

export function PageEditor({
  initial,
  collections,
  collectionFieldsByName,
  pages,
  libraryBlocks = [],
  mode
}: {
  initial: { id?: string; slug: string; title: string; tree: any; published: boolean };
  collections: Array<{ name: string; label: string }>;
  collectionFieldsByName: Record<string, string[]>;
  pages: Array<{ id: string; title: string; slug: string }>;
  libraryBlocks?: LibraryBlock[];
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [published, setPublished] = useState(initial.published);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<NodeKey | null>(null);
  const [nativeKey, setNativeKey] = useState<NodeKey | null>(null);
  const [search, setSearch] = useState('');
  const [sideTab, setSideTab] = useState<SideTab>('library');
  const editorRef = useRef<LexicalEditor | null>(null);
  const draggedPresetRef = useRef<{ id: string; source: string } | null>(null);

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
      const payload = { title, slug, tree: treeJson, published: pub };
      const res = await fetch(
        mode === 'create' ? '/api/pages' : `/api/pages/${initial.id}`,
        { method: mode === 'create' ? 'POST' : 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }
      );
      if (!res.ok) throw new Error(JSON.stringify((await res.json()).error));
      const data = await res.json();
      router.push(mode === 'create' ? `/pages/edit/${data.id}` : '/pages');
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
                  {(['blocks', 'pages', 'library'] as SideTab[]).map((tab) => {
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
                    <BlockPalette search={search} collections={collections} />
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
              <CanvasArea viewport={viewport} draggedPresetRef={draggedPresetRef} />

              {/* Right — Data binding panel */}
              <aside className="w-80 border-l border-neutral-200 bg-white flex flex-col overflow-hidden shrink-0">
                <BlockPropsPanel
                  selectedKey={selectedKey}
                  collections={collections}
                  collectionFieldsByName={collectionFieldsByName}
                />
              </aside>
            </div>
          </SelectedKeyProvider>
        </CollectionsProvider>
      </LexicalComposer>
    </section>
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

function CanvasArea({ viewport, draggedPresetRef }: { viewport: Viewport; draggedPresetRef: React.MutableRefObject<{ id: string; source: string } | null> }) {
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
    if (!draggedPresetRef.current) return;
    e.preventDefault();
    setDropLine(calcDropLine(e.clientY));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropLine(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const preset = draggedPresetRef.current;
    const line = dropLine;
    setDropLine(null);
    draggedPresetRef.current = null;
    if (!preset) return;

    editor.update(() => {
      const node = new PresetBlockNode(preset.id, preset.source);
      const root = $getRoot();
      const children = root.getChildren();

      if (!line || line.afterIndex < 0) {
        // Insert before first child or append if empty
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

  return (
    <div
      className="flex-1 overflow-auto scrollbar bg-neutral-100 p-10"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        ref={(el) => { setAnchorElem(el); }}
        className={cn(
          'vp-frame bg-white rounded-xl shadow-sm border border-neutral-200 p-10 relative',
          viewport === 'desktop' && 'vp-desktop',
          viewport === 'tablet' && 'vp-tablet',
          viewport === 'mobile' && 'vp-mobile'
        )}
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
  );
}

function BlockPalette({
  search,
  collections
}: {
  search: string;
  collections: Array<{ name: string; label: string }>;
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
  collectionFieldsByName
}: {
  selectedKey: NodeKey | null;
  collections: Array<{ name: string; label: string }>;
  collectionFieldsByName: Record<string, string[]>;
}) {
  const [editor] = useLexicalComposerContext();
  const update = useUpdateSelectedNode();
  const remove = useRemoveNode();
  const [, tick] = useState(0);
  useEffect(() => {
    return editor.registerUpdateListener(() => tick((n) => n + 1));
  }, [editor]);

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

  // Preset block — slot inputs.
  if (selected.type === 'fdl-preset-block') {
    const source = (selected.props.source as string) ?? '';
    const slots = (selected.props.slots as Record<string, string>) ?? {};
    const slotNames = [...new Set([...source.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
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
        <div className="flex-1 overflow-auto scrollbar p-4 space-y-4 text-sm">
          {slotNames.length === 0 ? (
            <p className="text-[12px] text-neutral-400">Static block — no editable slots.</p>
          ) : (
            slotNames.map((name) => (
              <Field key={name} label={name}>
                <input
                  value={slots[name] ?? ''}
                  onChange={(e) =>
                    update(selected.key, (n) =>
                      (n as PresetBlockNode).setSlots({ ...slots, [name]: e.target.value })
                    )
                  }
                  placeholder={`[${name}]`}
                  className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm"
                />
              </Field>
            ))
          )}
        </div>
      </>
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
  if (t === 'fdl-collection-list') return 'bg-ok/10 text-ok';
  if (t === 'fdl-button') return 'bg-warn/10 text-warn';
  return 'bg-neutral-100 text-neutral-500';
}

// ── Page tree (outline of current page, draggable to reorder) ─────────────────
function PageTree({ selectedKey, onSelect, onNativeSelect }: { selectedKey: NodeKey | null; onSelect: (k: NodeKey) => void; onNativeSelect: (k: NodeKey | null) => void }) {
  const [editor] = useLexicalComposerContext();
  const [items, setItems] = useState<Array<{ key: string; nodeType: string; typeLabel: string; displayName: string; badgeClass: string }>>([]);
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
    const isDecorator = ['fdl-preset-block', 'fdl-image', 'fdl-button', 'fdl-collection-list'].includes(type);
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
          <div
            key={item.key}
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
        );
      })}
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
