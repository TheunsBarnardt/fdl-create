'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $getNodeByKey,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  COMMAND_PRIORITY_CRITICAL,
  SELECTION_CHANGE_COMMAND,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  type NodeKey
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode } from '@lexical/rich-text';
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from '@lexical/list';
import { TOGGLE_LINK_COMMAND, $isLinkNode } from '@lexical/link';
import { ImageNode, ButtonNode, CollectionListNode, SELECT_DECORATOR_COMMAND } from './nodes';
import { cn } from '@/lib/utils';

// -------- SelectionSyncPlugin --------
// Tracks which decorator is currently selected and syncs it to the parent.

export function SelectionSyncPlugin({
  onSelect,
  selectedKey
}: {
  onSelect: (key: NodeKey | null) => void;
  selectedKey: NodeKey | null;
}) {
  const [editor] = useLexicalComposerContext();
  const selectedRef = useRef(selectedKey);
  selectedRef.current = selectedKey;

  useEffect(() => {
    const removeSelectCmd = editor.registerCommand(
      SELECT_DECORATOR_COMMAND,
      (key) => {
        Promise.resolve().then(() => onSelect(key));
        return true;
      },
      COMMAND_PRIORITY_LOW
    );
    const removeSelectionChange = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) {
          // Range selection = user is in text, clear any decorator selection.
          if (selectedRef.current) onSelect(null);
        }
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
    return () => {
      removeSelectCmd();
      removeSelectionChange();
    };
  }, [editor, onSelect]);

  return null;
}

// -------- DecoratorDeletePlugin --------
// Deletes the selected decorator on Backspace/Delete so keyboard works
// naturally on image/button/card-list blocks.

export function DecoratorDeletePlugin({
  selectedKey,
  onCleared
}: {
  selectedKey: NodeKey | null;
  onCleared: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const ref = useRef(selectedKey);
  ref.current = selectedKey;

  useEffect(() => {
    const handler = (e: KeyboardEvent | null) => {
      const key = ref.current;
      if (!key) return false;
      editor.update(() => {
        const n = $getNodeByKey(key);
        if (n) {
          const next = n.getNextSibling() ?? n.getPreviousSibling();
          n.remove();
          if (next && 'select' in next && typeof (next as any).select === 'function') {
            (next as any).select();
          }
        }
      });
      onCleared();
      e?.preventDefault();
      return true;
    };
    const rmBk = editor.registerCommand(KEY_BACKSPACE_COMMAND, handler, COMMAND_PRIORITY_LOW);
    const rmDel = editor.registerCommand(KEY_DELETE_COMMAND, handler, COMMAND_PRIORITY_LOW);
    return () => {
      rmBk();
      rmDel();
    };
  }, [editor, onCleared]);

  return null;
}

// -------- SlashMenuPlugin --------

type MenuItem = {
  label: string;
  hint: string;
  run: () => void;
};

export function SlashMenuPlugin({ collections }: { collections: Array<{ name: string; label: string }> }) {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [triggerKey, setTriggerKey] = useState<NodeKey | null>(null);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const items: MenuItem[] = [
    {
      label: 'Heading 1',
      hint: 'Page title',
      run: () =>
        replaceTriggerWithNode(() => {
          const h = $createHeadingNode('h1');
          h.append(($createTextNode('Heading')));
          return h;
        })
    },
    {
      label: 'Heading 2',
      hint: 'Section',
      run: () =>
        replaceTriggerWithNode(() => {
          const h = $createHeadingNode('h2');
          h.append(($createTextNode('Heading')));
          return h;
        })
    },
    {
      label: 'Heading 3',
      hint: 'Subsection',
      run: () =>
        replaceTriggerWithNode(() => {
          const h = $createHeadingNode('h3');
          h.append(($createTextNode('Heading')));
          return h;
        })
    },
    {
      label: 'Image',
      hint: 'Embed an image',
      run: () => replaceTriggerWithNode(() => new ImageNode())
    },
    {
      label: 'Button',
      hint: 'Call to action',
      run: () => replaceTriggerWithNode(() => new ButtonNode())
    },
    {
      label: 'Data list',
      hint: 'Bound collection',
      run: () =>
        replaceTriggerWithNode(
          () => new CollectionListNode(collections[0]?.name ?? '', 12)
        )
    }
  ];

  const filtered = query
    ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  function replaceTriggerWithNode(factory: () => any) {
    editor.update(() => {
      const root = $getRoot();
      const sel = $getSelection();
      if (!$isRangeSelection(sel)) return;
      const anchorNode = sel.anchor.getNode();
      const topLevel = anchorNode.getTopLevelElementOrThrow();
      // Delete the slash trigger paragraph's text content, then insert node after it.
      const node = factory();
      topLevel.replace(node);
      // Add a trailing paragraph + move cursor
      const trailing = $createParagraphNode();
      node.insertAfter(trailing);
      trailing.select();
      setOpen(false);
      setQuery('');
      editor.dispatchCommand(SELECT_DECORATOR_COMMAND, node.getKey());
    });
  }

  useEffect(() => {
    const remove = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel) || !sel.isCollapsed()) {
          if (open) setOpen(false);
          return;
        }
        const anchorNode = sel.anchor.getNode();
        if (anchorNode.getType() !== 'text' && anchorNode.getType() !== 'paragraph') {
          if (open) setOpen(false);
          return;
        }
        const top = anchorNode.getTopLevelElementOrThrow();
        if (top.getType() !== 'paragraph') {
          if (open) setOpen(false);
          return;
        }
        const textContent = top.getTextContent();
        if (textContent.startsWith('/')) {
          // Measure caret position in the DOM.
          const domSel = window.getSelection();
          if (!domSel || domSel.rangeCount === 0) {
            if (open) setOpen(false);
            return;
          }
          const range = domSel.getRangeAt(0).cloneRange();
          range.collapse(true);
          let rect = range.getBoundingClientRect();
          if (rect.top === 0 && rect.left === 0) {
            // Fall back to the paragraph DOM element.
            const el = editor.getElementByKey(top.getKey());
            if (el) rect = el.getBoundingClientRect();
          }
          setTriggerKey(top.getKey());
          setQuery(textContent.slice(1));
          setPos({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX });
          setCursor(0);
          if (!open) setOpen(true);
        } else if (open) {
          setOpen(false);
        }
      });
    });
    return remove;
  }, [editor, open]);

  useEffect(() => {
    if (!open) return;
    const removeArrowDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (e) => {
        setCursor((c) => Math.min(filtered.length - 1, c + 1));
        e?.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_NORMAL
    );
    const removeArrowUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (e) => {
        setCursor((c) => Math.max(0, c - 1));
        e?.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_NORMAL
    );
    const removeEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (e) => {
        const item = filtered[cursor];
        if (item) {
          e?.preventDefault();
          item.run();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL
    );
    const removeEsc = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        setOpen(false);
        return true;
      },
      COMMAND_PRIORITY_NORMAL
    );
    return () => {
      removeArrowDown();
      removeArrowUp();
      removeEnter();
      removeEsc();
    };
  }, [editor, open, cursor, filtered]);

  if (!open || !pos) return null;
  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-64 bg-white border border-neutral-200 rounded-md shadow-lg py-1 text-sm"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-neutral-400">
        Insert block
      </div>
      {filtered.length === 0 && (
        <div className="px-3 py-2 text-xs text-neutral-400">No matches</div>
      )}
      {filtered.map((it, i) => (
        <button
          key={it.label}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            it.run();
          }}
          onMouseEnter={() => setCursor(i)}
          className={
            'w-full text-left px-3 py-1.5 flex items-center justify-between ' +
            (i === cursor ? 'bg-accent-soft text-accent' : 'hover:bg-neutral-50')
          }
        >
          <span>{it.label}</span>
          <span className="text-[10px] text-neutral-400">{it.hint}</span>
        </button>
      ))}
    </div>
  );
}

// -------- ToolbarPlugin --------
// Inline formatting toolbar — bold, italic, underline, strikethrough, code, link, alignment.
// H1–H6 headings are inserted from the block palette and stay as-is; this toolbar does not
// change block types.

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [active, setActive] = useState(false); // true when a range selection exists

  const updateToolbar = useCallback(() => {
    const sel = $getSelection();
    if ($isRangeSelection(sel)) {
      setActive(true);
      setIsBold(sel.hasFormat('bold'));
      setIsItalic(sel.hasFormat('italic'));
      setIsUnderline(sel.hasFormat('underline'));
      setIsStrike(sel.hasFormat('strikethrough'));
      setIsCode(sel.hasFormat('code'));
      const node = sel.anchor.getNode();
      const parent = node.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));
    } else {
      setActive(false);
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => updateToolbar());
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => { updateToolbar(); return false; },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [editor, updateToolbar]);

  const fmt = (f: string) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, f as any);
  const align = (a: string) => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, a as any);
  const toggleLink = () => {
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      const sel = $getSelection();
      const url = sel && !sel.isCollapsed() ? 'https://' : null;
      if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
  };

  return (
    <div className="shrink-0 bg-white border-b border-neutral-200 px-3 py-1 flex items-center gap-0.5">
      {/* Inline format */}
      <TBtn on={isBold} dim={!active} onClick={() => fmt('bold')} title="Bold (⌘B)">
        <BoldIcon />
      </TBtn>
      <TBtn on={isItalic} dim={!active} onClick={() => fmt('italic')} title="Italic (⌘I)">
        <ItalicIcon />
      </TBtn>
      <TBtn on={isUnderline} dim={!active} onClick={() => fmt('underline')} title="Underline (⌘U)">
        <UnderlineIcon />
      </TBtn>
      <TBtn on={isStrike} dim={!active} onClick={() => fmt('strikethrough')} title="Strikethrough">
        <StrikeIcon />
      </TBtn>
      <Sep />
      <TBtn on={isCode} dim={!active} onClick={() => fmt('code')} title="Inline code">
        <CodeIcon />
      </TBtn>
      <TBtn on={isLink} dim={!active} onClick={toggleLink} title="Link">
        <LinkIcon />
      </TBtn>
      <Sep />
      {/* Alignment — stateless action buttons */}
      <TBtn on={false} dim={!active} onClick={() => align('left')} title="Align left">
        <AlignLIcon />
      </TBtn>
      <TBtn on={false} dim={!active} onClick={() => align('center')} title="Align center">
        <AlignCIcon />
      </TBtn>
      <TBtn on={false} dim={!active} onClick={() => align('right')} title="Align right">
        <AlignRIcon />
      </TBtn>
    </div>
  );
}

function TBtn({ on, dim, onClick, title, children }: {
  on: boolean; dim: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded text-[12px] transition-colors',
        on ? 'bg-accent-soft text-accent' : dim ? 'text-neutral-300' : 'text-neutral-600 hover:bg-neutral-100'
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="w-px h-5 bg-neutral-200 mx-1 shrink-0" />;
}

function BoldIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 12h8a4 4 0 0 0 0-8H6v8z"/><path d="M6 12h9a4 4 0 0 1 0 8H6v-8z"/></svg>;
}
function ItalicIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>;
}
function UnderlineIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>;
}
function StrikeIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="4" y1="12" x2="20" y2="12"/><path d="M17.5 6.5C17.5 4.5 15.5 3 12 3s-5.5 1.5-5.5 4c0 4 11 3 11 7s-2.5 4-5.5 4-6-1.5-6-4"/></svg>;
}
function CodeIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
}
function LinkIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
}
function AlignLIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>;
}
function AlignCIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>;
}
function AlignRIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>;
}
