'use client';
import {
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
  type EditorConfig,
  type LexicalEditor
} from 'lexical';
import {
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode
} from 'lexical';

// ---------- ImageNode ----------

export type SerializedImageNode = Spread<
  { type: 'fdl-image'; version: 1; src: string; alt: string },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<React.JSX.Element> {
  __src: string;
  __alt: string;

  static getType() {
    return 'fdl-image';
  }
  static clone(n: ImageNode) {
    return new ImageNode(n.__src, n.__alt, n.__key);
  }
  constructor(src = '', alt = '', key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }
  createDOM() {
    const el = document.createElement('div');
    el.className = 'my-4';
    return el;
  }
  updateDOM() {
    return false;
  }
  setSrc(src: string) {
    this.getWritable().__src = src;
  }
  setAlt(alt: string) {
    this.getWritable().__alt = alt;
  }
  getSrc() {
    return this.__src;
  }
  getAlt() {
    return this.__alt;
  }
  static importJSON(j: SerializedImageNode) {
    return new ImageNode(j.src, j.alt);
  }
  exportJSON(): SerializedImageNode {
    return { type: 'fdl-image', version: 1, src: this.__src, alt: this.__alt };
  }
  decorate(editor: LexicalEditor, _config: EditorConfig) {
    return <ImageBlock nodeKey={this.__key} src={this.__src} alt={this.__alt} editor={editor} />;
  }
}

function ImageBlock({ src, alt, nodeKey, editor }: { src: string; alt: string; nodeKey: NodeKey; editor: LexicalEditor }) {
  const isSelected = useNodeSelected(nodeKey);
  const select = () => editor.dispatchCommand(SELECT_DECORATOR_COMMAND, nodeKey);
  return (
    <div
      onClick={select}
      className={
        'relative my-4 cursor-pointer rounded-md border border-dashed ' +
        (isSelected ? 'border-accent bg-accent-soft/30 p-2' : 'border-transparent p-2')
      }
    >
      {isSelected && (
        <>
          <DecoratorLabel>Image</DecoratorLabel>
          <DecoratorDeleteButton nodeKey={nodeKey} />
        </>
      )}
      {src ? (
        <img src={src} alt={alt} className="rounded-md max-w-full" />
      ) : (
        <div className="aspect-[16/9] bg-neutral-100 rounded-md flex items-center justify-center text-neutral-400 text-xs">
          Image — set a source URL in the right panel
        </div>
      )}
    </div>
  );
}

// ---------- ButtonNode ----------

export type SerializedButtonNode = Spread<
  { type: 'fdl-button'; version: 1; label: string; href: string },
  SerializedLexicalNode
>;

export class ButtonNode extends DecoratorNode<React.JSX.Element> {
  __label: string;
  __href: string;

  static getType() {
    return 'fdl-button';
  }
  static clone(n: ButtonNode) {
    return new ButtonNode(n.__label, n.__href, n.__key);
  }
  constructor(label = 'Click me', href = '#', key?: NodeKey) {
    super(key);
    this.__label = label;
    this.__href = href;
  }
  createDOM() {
    const el = document.createElement('div');
    el.className = 'my-4';
    return el;
  }
  updateDOM() {
    return false;
  }
  setLabel(v: string) {
    this.getWritable().__label = v;
  }
  setHref(v: string) {
    this.getWritable().__href = v;
  }
  getLabel() {
    return this.__label;
  }
  getHref() {
    return this.__href;
  }
  static importJSON(j: SerializedButtonNode) {
    return new ButtonNode(j.label, j.href);
  }
  exportJSON(): SerializedButtonNode {
    return { type: 'fdl-button', version: 1, label: this.__label, href: this.__href };
  }
  decorate(editor: LexicalEditor) {
    return <ButtonBlock nodeKey={this.__key} label={this.__label} editor={editor} />;
  }
}

function ButtonBlock({ label, nodeKey, editor }: { label: string; nodeKey: NodeKey; editor: LexicalEditor }) {
  const isSelected = useNodeSelected(nodeKey);
  const select = () => editor.dispatchCommand(SELECT_DECORATOR_COMMAND, nodeKey);
  return (
    <div
      onClick={select}
      className={
        'relative my-4 cursor-pointer rounded-md border border-dashed p-2 ' +
        (isSelected ? 'border-accent bg-accent-soft/30' : 'border-transparent')
      }
    >
      {isSelected && (
        <>
          <DecoratorLabel>Button</DecoratorLabel>
          <DecoratorDeleteButton nodeKey={nodeKey} />
        </>
      )}
      <button type="button" className="px-4 py-2 bg-ink-950 text-paper rounded-md text-sm" onClick={(e) => e.preventDefault()}>
        {label || 'Click me'}
      </button>
    </div>
  );
}

// ---------- CollectionListNode ----------

export type SerializedCollectionListNode = Spread<
  {
    type: 'fdl-collection-list';
    version: 1;
    collection: string;
    limit: number;
    fields: string[];
    filter: string;
    sort: string;
  },
  SerializedLexicalNode
>;

export class CollectionListNode extends DecoratorNode<React.JSX.Element> {
  __collection: string;
  __limit: number;
  __fields: string[];
  __filter: string;
  __sort: string;

  static getType() {
    return 'fdl-collection-list';
  }
  static clone(n: CollectionListNode) {
    return new CollectionListNode(
      n.__collection,
      n.__limit,
      n.__fields,
      n.__filter,
      n.__sort,
      n.__key
    );
  }
  constructor(
    collection = '',
    limit = 6,
    fields: string[] = [],
    filter = '',
    sort = '',
    key?: NodeKey
  ) {
    super(key);
    this.__collection = collection;
    this.__limit = limit;
    this.__fields = fields;
    this.__filter = filter;
    this.__sort = sort;
  }
  createDOM() {
    const el = document.createElement('div');
    el.className = 'my-4';
    return el;
  }
  updateDOM() {
    return false;
  }
  setCollection(v: string) {
    this.getWritable().__collection = v;
  }
  setLimit(v: number) {
    this.getWritable().__limit = v;
  }
  setFields(v: string[]) {
    this.getWritable().__fields = v;
  }
  setFilter(v: string) {
    this.getWritable().__filter = v;
  }
  setSort(v: string) {
    this.getWritable().__sort = v;
  }
  getCollection() {
    return this.__collection;
  }
  getLimit() {
    return this.__limit;
  }
  getFields() {
    return this.__fields;
  }
  getFilter() {
    return this.__filter;
  }
  getSort() {
    return this.__sort;
  }
  static importJSON(j: SerializedCollectionListNode) {
    return new CollectionListNode(
      j.collection,
      j.limit,
      j.fields ?? [],
      j.filter ?? '',
      j.sort ?? ''
    );
  }
  exportJSON(): SerializedCollectionListNode {
    return {
      type: 'fdl-collection-list',
      version: 1,
      collection: this.__collection,
      limit: this.__limit,
      fields: this.__fields,
      filter: this.__filter,
      sort: this.__sort
    };
  }
  decorate(editor: LexicalEditor) {
    return (
      <CollectionListBlock
        nodeKey={this.__key}
        collection={this.__collection}
        limit={this.__limit}
        editor={editor}
      />
    );
  }
}

function CollectionListBlock({
  collection,
  limit,
  nodeKey,
  editor
}: {
  collection: string;
  limit: number;
  nodeKey: NodeKey;
  editor: LexicalEditor;
}) {
  const isSelected = useNodeSelected(nodeKey);
  const collections = useCollections();
  const c = collections.find((x) => x.name === collection);
  const select = () => editor.dispatchCommand(SELECT_DECORATOR_COMMAND, nodeKey);
  return (
    <div
      onClick={select}
      className={
        'relative my-4 cursor-pointer rounded-md p-4 ' +
        (isSelected
          ? 'border border-accent bg-accent-soft/40'
          : 'border border-transparent bg-accent-soft/20')
      }
    >
      {isSelected && (
        <>
          <DecoratorLabel>
            Card list · {c ? `${c.label} · ${limit}` : 'unbound'}
          </DecoratorLabel>
          <DecoratorDeleteButton nodeKey={nodeKey} />
        </>
      )}
      <div className="text-[11px] text-neutral-500 mb-3 flex items-center gap-2">
        <span className="chip bg-accent-soft text-accent">
          {c ? `📦 ${c.label} · ${limit}` : 'unbound'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: Math.min(Math.max(limit, 1), 3) }).map((_, i) => (
          <div key={i} className="border border-neutral-200 rounded-lg p-3">
            <div className="aspect-square bg-neutral-100 rounded mb-2" />
            <div className="text-sm font-medium">Record {i + 1}</div>
            <div className="text-xs text-neutral-500">preview</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- shared helpers ----------

import { createContext, useContext, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { createCommand, type LexicalCommand } from 'lexical';

export const SELECT_DECORATOR_COMMAND: LexicalCommand<NodeKey> = createCommand('SELECT_DECORATOR');

const CollectionsCtx = createContext<Array<{ name: string; label: string }>>([]);
export const CollectionsProvider = CollectionsCtx.Provider;
export const useCollections = () => useContext(CollectionsCtx);

const SelectedKeyCtx = createContext<NodeKey | null>(null);
export const SelectedKeyProvider = SelectedKeyCtx.Provider;
export const useSelectedKey = () => useContext(SelectedKeyCtx);

function useNodeSelected(nodeKey: NodeKey) {
  const selected = useSelectedKey();
  return selected === nodeKey;
}

function DecoratorLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -top-2.5 left-2 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded">
      {children}
    </span>
  );
}

function DecoratorDeleteButton({ nodeKey }: { nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        editor.update(() => {
          const n = $getNodeByKey(nodeKey);
          if (n) n.remove();
        });
      }}
      className="absolute -top-2.5 right-2 bg-white border border-neutral-200 text-danger text-[10px] w-5 h-5 rounded flex items-center justify-center hover:bg-danger hover:text-white"
      title="Delete block"
    >
      ✕
    </button>
  );
}

// ---------- PresetBlockNode ----------

function jsxToHtml(src: string): string {
  return src
    .replace(/className=/g, 'class=')
    .replace(
      /<(div|section|article|span|p|ul|li|ol|form|footer|nav|header|main|blockquote)(\s[^>]*)?\s*\/>/g,
      (_, tag, attrs) => `<${tag}${attrs ?? ''}></${tag}>`
    );
}

export type SlotLinkTarget =
  | { type: 'page'; pageId: string; query?: string; hash?: string; newTab?: boolean }
  | { type: 'record'; collection: string; recordId: string; pagePattern?: string; newTab?: boolean }
  | { type: 'external'; url: string; newTab?: boolean }
  | { type: 'anchor'; id: string };

export type SlotBinding =
  | { kind: 'literal'; value: string }
  // `template` is a string mixing literal text and `{fieldName}` tokens.
  // Example: "your full name is {name} {lastname}". Single-field is "{name}".
  | { kind: 'field'; template: string }
  | { kind: 'link'; target: SlotLinkTarget };

export type PresetBindingMode = 'literal' | 'route' | 'related' | 'related-list' | 'query-list';

export type PresetListSelector = { filter?: string; sort?: string; limit?: number };

export type SerializedPresetBlockNode = Spread<
  {
    type: 'fdl-preset-block';
    version: 2;
    presetId: string;
    source: string;
    label?: string;
    // New placement-time binding (all optional — unset means literal/unbound).
    collection?: string | null;
    bindingMode?: PresetBindingMode;
    relatedFk?: string | null;
    listSelector?: PresetListSelector;
    slotMap?: Record<string, SlotBinding>;
    // v1 back-compat — literal slot values. Kept as a read-path alias for
    // older serialized trees; new writes use slotMap above.
    slots?: Record<string, string>;
  },
  SerializedLexicalNode
>;

export class PresetBlockNode extends DecoratorNode<React.JSX.Element> {
  __presetId: string;
  __source: string;
  __label: string;
  __collection: string | null;
  __bindingMode: PresetBindingMode;
  __relatedFk: string | null;
  __listSelector: PresetListSelector;
  __slotMap: Record<string, SlotBinding>;

  static getType() { return 'fdl-preset-block'; }
  static clone(n: PresetBlockNode) {
    return new PresetBlockNode(
      n.__presetId, n.__source, n.__label,
      { collection: n.__collection, bindingMode: n.__bindingMode, relatedFk: n.__relatedFk, listSelector: n.__listSelector, slotMap: n.__slotMap },
      n.__key
    );
  }

  constructor(
    presetId: string,
    source: string,
    label = '',
    bind: {
      collection?: string | null;
      bindingMode?: PresetBindingMode;
      relatedFk?: string | null;
      listSelector?: PresetListSelector;
      slotMap?: Record<string, SlotBinding>;
    } = {},
    key?: NodeKey
  ) {
    super(key);
    this.__presetId = presetId;
    this.__source = source;
    this.__label = label;
    this.__collection = bind.collection ?? null;
    this.__bindingMode = bind.bindingMode ?? 'literal';
    this.__relatedFk = bind.relatedFk ?? null;
    this.__listSelector = bind.listSelector ?? {};
    this.__slotMap = bind.slotMap ?? {};
  }
  createDOM() { return document.createElement('div'); }
  updateDOM() { return false; }

  getPresetId() { return this.__presetId; }
  getSource() { return this.__source; }
  getLabel() { return this.__label; }
  getCollection() { return this.__collection; }
  getBindingMode() { return this.__bindingMode; }
  getRelatedFk() { return this.__relatedFk; }
  getListSelector() { return this.__listSelector; }
  getSlotMap() { return this.__slotMap; }

  setLabel(v: string) { this.getWritable().__label = v; }
  setCollection(v: string | null) { this.getWritable().__collection = v; }
  setBindingMode(v: PresetBindingMode) { this.getWritable().__bindingMode = v; }
  setRelatedFk(v: string | null) { this.getWritable().__relatedFk = v; }
  setListSelector(v: PresetListSelector) { this.getWritable().__listSelector = v; }
  setSlotMap(v: Record<string, SlotBinding>) { this.getWritable().__slotMap = v; }

  // Back-compat: older inspector code called setSlots with literal values.
  setSlots(v: Record<string, string>) {
    const next: Record<string, SlotBinding> = { ...this.__slotMap };
    for (const [k, val] of Object.entries(v)) next[k] = { kind: 'literal', value: val };
    this.getWritable().__slotMap = next;
    if (this.__bindingMode === 'literal') {
      // nothing else to do
    }
  }

  // Back-compat read accessor — returns literal values only (for legacy inspector code).
  getSlots(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, b] of Object.entries(this.__slotMap)) {
      if (b.kind === 'literal') out[k] = b.value;
    }
    return out;
  }

  static importJSON(j: any) {
    const presetId = j.presetId;
    const source = j.source ?? '';
    const label = j.label ?? '';
    if (j.version === 2) {
      // Migrate old `field: string` and the interim `fields: string[]` shapes → `template: string`.
      const rawMap = j.slotMap ?? {};
      const slotMap: Record<string, SlotBinding> = {};
      for (const [k, b] of Object.entries<any>(rawMap)) {
        if (b && b.kind === 'field' && typeof b.template !== 'string') {
          if (Array.isArray(b.fields)) {
            const sep = typeof b.separator === 'string' ? b.separator : ' ';
            slotMap[k] = { kind: 'field', template: b.fields.map((f: string) => `{${f}}`).join(sep) };
          } else {
            slotMap[k] = { kind: 'field', template: b.field ? `{${b.field}}` : '' };
          }
        } else {
          slotMap[k] = b as SlotBinding;
        }
      }
      return new PresetBlockNode(presetId, source, label, {
        collection: j.collection ?? null,
        bindingMode: j.bindingMode ?? 'literal',
        relatedFk: j.relatedFk ?? null,
        listSelector: j.listSelector ?? {},
        slotMap,
      });
    }
    // v1 → v2: coerce { slots: Record<string,string> } into slotMap literals.
    const slotMap: Record<string, SlotBinding> = {};
    const legacy: Record<string, string> = j.slots ?? {};
    for (const [k, v] of Object.entries(legacy)) slotMap[k] = { kind: 'literal', value: v };
    return new PresetBlockNode(presetId, source, label, {
      collection: null, bindingMode: 'literal', relatedFk: null, listSelector: {}, slotMap,
    });
  }
  exportJSON(): SerializedPresetBlockNode {
    return {
      type: 'fdl-preset-block',
      version: 2,
      presetId: this.__presetId,
      source: this.__source,
      label: this.__label,
      collection: this.__collection,
      bindingMode: this.__bindingMode,
      relatedFk: this.__relatedFk,
      listSelector: this.__listSelector,
      slotMap: this.__slotMap,
    };
  }
  decorate(editor: LexicalEditor) {
    return <PresetBlock nodeKey={this.__key} presetId={this.__presetId} source={this.__source} slots={previewSlotValues(this.__slotMap)} editor={editor} />;
  }
}

// Resolves slot bindings for the in-editor preview (no record data wired yet).
// Field bindings show the raw template text so authors can see what they've
// configured without leaving the editor. `{field}` tokens are wrapped in a
// colored chip so linked values are visually distinct from static text.
function previewSlotValues(slotMap: Record<string, SlotBinding>): Record<string, string> {
  const out: Record<string, string> = {};
  const wrapTokens = (s: string) =>
    s.replace(
      /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,
      '<span style="color:#0369a1;background:rgba(14,165,233,0.12);padding:0 4px;border-radius:3px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.92em;">{$1}</span>'
    );
  for (const [slot, b] of Object.entries(slotMap)) {
    if (!b) continue;
    if (b.kind === 'literal') out[slot] = b.value;
    else if (b.kind === 'field') out[slot] = wrapTokens(b.template || `{${slot}}`);
    else if (b.kind === 'link') {
      const t = b.target;
      out[slot] =
        t.type === 'external' ? t.url :
        t.type === 'anchor'   ? `#${t.id}` :
        t.type === 'page'     ? `/${t.pageId}` :
        `/${t.collection}/${t.recordId}`;
    }
  }
  return out;
}

function fillSlots(html: string, slots: Record<string, string>) {
  return html.replace(/\{\{(\w+)\}\}/g, (_, name) => slots[name] ?? `[${name}]`);
}

function PresetBlock({
  presetId, source, slots, nodeKey, editor
}: { presetId: string; source: string; slots: Record<string, string>; nodeKey: NodeKey; editor: LexicalEditor }) {
  const isSelected = useNodeSelected(nodeKey);
  const select = () => editor.dispatchCommand(SELECT_DECORATOR_COMMAND, nodeKey);
  return (
    <div
      onClick={select}
      className={
        'relative cursor-pointer rounded-lg transition-colors ' +
        (isSelected ? 'ring-2 ring-accent ring-offset-2' : 'ring-2 ring-transparent hover:ring-accent/30')
      }
    >
      {isSelected && (
        <>
          <DecoratorLabel>{presetId}</DecoratorLabel>
          <DecoratorDeleteButton nodeKey={nodeKey} />
        </>
      )}
      <div dangerouslySetInnerHTML={{ __html: fillSlots(jsxToHtml(source), slots) }} />
    </div>
  );
}

// ---------- ShadcnBlockNode ----------

import { ShadcnBlockRenderer, type TreeUpdateFn } from './visual-renderer';
import type { VisualNode } from './visual-registry';

export class ShadcnBlockNode extends DecoratorNode<React.JSX.Element> {
  __tree: VisualNode;

  static getType() { return 'fdl-shadcn-block'; }
  static clone(n: ShadcnBlockNode) { return new ShadcnBlockNode(n.__tree, n.__key); }

  constructor(tree: VisualNode, key?: NodeKey) {
    super(key);
    this.__tree = tree;
  }

  createDOM() {
    const el = document.createElement('div');
    el.className = 'my-2';
    return el;
  }
  updateDOM() { return false; }
  getTree() { return this.__tree; }
  setTree(tree: VisualNode) { this.getWritable().__tree = tree; }

  static importJSON(j: any) { return new ShadcnBlockNode(j.tree); }
  exportJSON() { return { type: 'fdl-shadcn-block' as const, version: 1, tree: this.__tree }; }

  decorate(editor: LexicalEditor) {
    const nodeKey = this.__key;
    const tree = this.__tree;
    const onUpdate: TreeUpdateFn = (updater) => {
      editor.update(() => {
        const n = $getNodeByKey(nodeKey) as ShadcnBlockNode | null;
        if (n) n.setTree(updater(n.getTree()));
      });
    };
    return <ShadcnBlockRenderer tree={tree} nodeKey={nodeKey} onUpdate={onUpdate} />;
  }
}

export function getShadcnNodeInfo(editor: LexicalEditor, key: NodeKey | null): { tree: VisualNode } | null {
  if (!key) return null;
  return editor.getEditorState().read(() => {
    const n = $getNodeByKey(key);
    if (!n || !(n instanceof ShadcnBlockNode)) return null;
    return { tree: n.getTree() };
  });
}

export const DECORATOR_NODES = [ImageNode, ButtonNode, CollectionListNode, PresetBlockNode, ShadcnBlockNode];

export function getDecoratorLabel(type: string) {
  switch (type) {
    case 'fdl-image':
      return 'Image';
    case 'fdl-button':
      return 'Button';
    case 'fdl-collection-list':
      return 'Data list';
    default:
      return type;
  }
}

// Consumed by the selection sync plugin — inserts a new node and selects it.
export function useInsertNode() {
  const [editor] = useLexicalComposerContext();
  return (factory: () => LexicalNode) => {
    editor.update(() => {
      const sel = $getSelection();
      const node = factory();
      if ($isRangeSelection(sel)) {
        const anchorNode = sel.anchor.getNode();
        const top = anchorNode.getTopLevelElementOrThrow();
        top.insertAfter(node);
      } else {
        $getRoot().append(node);
      }
      // Ensure there's a trailing paragraph so the user can keep typing.
      const next = node.getNextSibling();
      if (!next) {
        const p = $createParagraphNode();
        node.insertAfter(p);
        p.select();
      }
      editor.dispatchCommand(SELECT_DECORATOR_COMMAND, node.getKey());
    });
  };
}

export function useUpdateSelectedNode() {
  const [editor] = useLexicalComposerContext();
  return (key: NodeKey, mutate: (n: LexicalNode) => void) => {
    editor.update(() => {
      const n = $getNodeByKey(key);
      if (n) mutate(n);
    });
  };
}

export function useRemoveNode() {
  const [editor] = useLexicalComposerContext();
  return (key: NodeKey) => {
    editor.update(() => {
      const n = $getNodeByKey(key);
      if (n) n.remove();
    });
  };
}

export function getSelectedDecorator(
  editor: LexicalEditor,
  key: NodeKey | null
): { key: NodeKey; type: string; props: Record<string, any> } | null {
  if (!key) return null;
  const state = editor.getEditorState();
  return state.read(() => {
    const n = $getNodeByKey(key);
    if (!n) return null;
    const t = n.getType();
    if (t === 'fdl-image') {
      const im = n as ImageNode;
      return { key, type: t, props: { src: im.getSrc(), alt: im.getAlt() } };
    }
    if (t === 'fdl-button') {
      const bn = n as ButtonNode;
      return { key, type: t, props: { label: bn.getLabel(), href: bn.getHref() } };
    }
    if (t === 'fdl-collection-list') {
      const cn = n as CollectionListNode;
      return {
        key,
        type: t,
        props: {
          collection: cn.getCollection(),
          limit: cn.getLimit(),
          fields: cn.getFields(),
          filter: cn.getFilter(),
          sort: cn.getSort()
        }
      };
    }
    if (t === 'fdl-preset-block') {
      const pn = n as PresetBlockNode;
      return {
        key,
        type: t,
        props: {
          presetId: pn.getPresetId(),
          source: pn.getSource(),
          slots: pn.getSlots(),
          slotMap: pn.getSlotMap(),
          collection: pn.getCollection(),
          bindingMode: pn.getBindingMode(),
          relatedFk: pn.getRelatedFk(),
          listSelector: pn.getListSelector(),
        },
      };
    }
    return null;
  });
}
