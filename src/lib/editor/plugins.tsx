'use client';
import { useEffect, useRef, useState } from 'react';
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
  SELECTION_CHANGE_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  type NodeKey
} from 'lexical';
import { $createHeadingNode } from '@lexical/rich-text';
import { ImageNode, ButtonNode, CollectionListNode, SELECT_DECORATOR_COMMAND } from './nodes';

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
        onSelect(key);
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
