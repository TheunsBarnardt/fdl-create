'use client';
import { useEffect, useRef, useState } from 'react';
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
  type LexicalEditor,
  type NodeKey
} from 'lexical';
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
  Send
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { signOutAction } from '@/actions/auth';
import { editorTheme } from '@/lib/editor/theme';
import { BLOCK_PRESETS, CATEGORY_META, CATEGORY_ORDER } from '@/lib/block-presets';
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
  CollectionListNode
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

export function PageEditor({
  initial,
  collections,
  collectionFieldsByName,
  pages,
  mode
}: {
  initial: { id?: string; slug: string; title: string; tree: any; published: boolean };
  collections: Array<{ name: string; label: string }>;
  collectionFieldsByName: Record<string, string[]>;
  pages: Array<{ id: string; title: string; slug: string }>;
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
  const [search, setSearch] = useState('');
  const editorRef = useRef<LexicalEditor | null>(null);

  const initialEditorState = JSON.stringify(treeToEditorState(initial.tree));

  const lexicalConfig = {
    namespace: 'fdl-page-editor',
    theme: editorTheme,
    onError: (e: Error) => console.error('[lexical]', e),
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, ...DECORATOR_NODES],
    editorState: initialEditorState
  };

  async function save() {
    const editor = editorRef.current;
    if (!editor) {
      setError('Editor not ready');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const treeJson = editor.getEditorState().toJSON();
      const payload = { title, slug, tree: treeJson, published };
      const res = await fetch(
        mode === 'create' ? '/api/pages' : `/api/pages/${initial.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) throw new Error(JSON.stringify((await res.json()).error));
      const data = await res.json();
      router.push(mode === 'create' ? `/pages/${data.id}` : '/pages');
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
          <button
            type="button"
            onClick={() => setPublished(!published)}
            className="px-2.5 py-1 border border-neutral-200 rounded-md hover:bg-neutral-50 flex items-center gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            {published ? 'Unpublish' : 'Preview'}
          </button>
          <button
            type="button"
            className="px-2.5 py-1 bg-gradient-to-br from-accent to-purple-500 text-white rounded-md flex items-center gap-1.5"
            title="Draft page content with Claude"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !title || !slug}
            className="px-2.5 py-1 bg-ink-950 text-paper rounded-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Publish'}
          </button>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={destroy}
              className="px-2 py-1 text-neutral-400 hover:text-danger"
              title="Delete"
            >
              ✕
            </button>
          )}
          <span className="w-px h-5 bg-neutral-200" />
          <form action={signOutAction}>
            <button type="submit" className="text-[11px] text-neutral-500 hover:text-neutral-900">
              Sign out
            </button>
          </form>
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
            <SlashMenuPlugin collections={collections} />
            <HistoryPlugin />
            <ListPlugin />
            <LinkPlugin />

            <div className="flex-1 flex overflow-hidden">
              {/* Left — Block palette + Pages */}
              <aside className="w-64 border-r border-neutral-200 bg-white/60 overflow-auto scrollbar p-3 text-sm shrink-0">
                <div className="text-[10px] uppercase tracking-wider text-neutral-400 px-1 mb-2">
                  Blocks
                </div>
                <div className="relative mb-3">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search blocks"
                    className="w-full pl-8 pr-2 py-1.5 text-[12px] border border-neutral-200 rounded-md bg-white focus:outline-none focus:border-accent"
                  />
                </div>

                <BlockPalette search={search} collections={collections} />

                <div className="text-[10px] uppercase tracking-wider text-neutral-400 px-1 mt-5 mb-2">
                  Pages
                </div>
                <ul className="space-y-0.5 text-[13px]">
                  {pages.map((p) => {
                    const active = p.id === initial.id;
                    return (
                      <li key={p.id}>
                        <Link
                          href={`/pages/${p.id}`}
                          className={cn(
                            'block px-2 py-1 rounded truncate',
                            active ? 'bg-accent-soft text-accent font-medium' : 'hover:bg-neutral-100'
                          )}
                        >
                          {p.title || <span className="text-neutral-400 italic">untitled</span>}
                        </Link>
                      </li>
                    );
                  })}
                  {mode === 'create' && (
                    <li className="px-2 py-1 rounded bg-accent-soft text-accent font-medium truncate">
                      {title || 'New page'}
                    </li>
                  )}
                  <li>
                    <Link
                      href="/pages/new"
                      className="block px-2 py-1 rounded text-neutral-500 hover:bg-neutral-100 border border-dashed border-transparent hover:border-neutral-200"
                    >
                      + new page
                    </Link>
                  </li>
                </ul>

                <div className="flex items-center justify-between px-1 mt-5 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400">Block library</span>
                  <Link href="/blocks" className="text-[10px] text-accent font-medium">
                    Studio →
                  </Link>
                </div>
                <PresetBrowser search={search} />
              </aside>

              {/* Canvas */}
              <CanvasArea viewport={viewport} />

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

function CanvasArea({ viewport }: { viewport: Viewport }) {
  const [anchorElem, setAnchorElem] = useState<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex-1 overflow-auto scrollbar bg-neutral-100 p-10">
      <div
        ref={(el) => setAnchorElem(el)}
        className={cn(
          'vp-frame bg-white rounded-xl shadow-sm border border-neutral-200 p-10 relative',
          viewport === 'desktop' && 'vp-desktop',
          viewport === 'tablet' && 'vp-tablet',
          viewport === 'mobile' && 'vp-mobile'
        )}
      >
        <div className="relative">
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

  return (
    <div className="space-y-4">
      {PALETTE.map((group) => {
        const items = q
          ? group.items.filter((i) => i.label.toLowerCase().includes(q))
          : group.items;
        if (items.length === 0) return null;
        return (
          <div key={group.heading}>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 px-1 mb-1.5">
              {group.heading}
            </div>
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
                      'border rounded-md p-3 text-[11px] flex flex-col items-center gap-1.5 cursor-pointer transition-colors',
                      isData
                        ? 'border-accent/40 bg-accent-soft/40 text-neutral-700 hover:border-accent'
                        : 'border-neutral-200 hover:border-accent hover:bg-neutral-50'
                    )}
                  >
                    <Icon className="h-4 w-4 text-neutral-500" />
                    <span className="text-center">{item.label}</span>
                    {item.sub && (
                      <span className="text-[9px] text-accent">{item.sub}</span>
                    )}
                  </button>
                );
              })}
            </div>
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

function PresetBrowser({ search }: { search: string }) {
  const q = search.trim().toLowerCase();
  return (
    <div className="space-y-3">
      {CATEGORY_ORDER.map((cat) => {
        const items = BLOCK_PRESETS.filter((p) => p.category === cat && (!q || p.title.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)));
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 px-1 mb-1">
              {CATEGORY_META[cat].label}
              <span className="ml-1 text-neutral-300 normal-case">({items.length})</span>
            </div>
            <ul className="space-y-0.5">
              {items.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/blocks/new?preset=${p.id}`}
                    className="block px-2 py-1.5 rounded border border-transparent hover:border-neutral-200 hover:bg-white text-[12px]"
                    title={p.description}
                  >
                    <div className="font-medium truncate">{p.title}</div>
                    <div className="text-[10px] text-neutral-500 truncate">{p.description}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
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
