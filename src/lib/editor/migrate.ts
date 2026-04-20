import type { SerializedEditorState } from 'lexical';

type OldBlock =
  | { id: string; type: 'heading'; level: 1 | 2 | 3; text: string }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'image'; src: string; alt: string }
  | { id: string; type: 'button'; label: string; href: string }
  | { id: string; type: 'collection-list'; collection: string; limit: number };

const EMPTY_STATE: SerializedEditorState = {
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: null,
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: null,
        children: [],
        textFormat: 0,
        textStyle: ''
      } as any
    ]
  }
} as SerializedEditorState;

function text(content: string) {
  return {
    type: 'text',
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text: content,
    version: 1
  };
}

function paragraph(content: string) {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: null,
    children: content ? [text(content)] : [],
    textFormat: 0,
    textStyle: ''
  };
}

function heading(level: 1 | 2 | 3, content: string) {
  return {
    type: 'heading',
    tag: `h${level}`,
    format: '',
    indent: 0,
    version: 1,
    direction: null,
    children: [text(content)]
  };
}

function isSerializedEditorState(x: any): x is SerializedEditorState {
  return x && typeof x === 'object' && x.root && typeof x.root === 'object' && Array.isArray(x.root.children);
}

export function treeToEditorState(tree: any): SerializedEditorState {
  if (isSerializedEditorState(tree)) return tree;
  const blocks: OldBlock[] = Array.isArray(tree?.blocks) ? tree.blocks : [];
  if (blocks.length === 0) return EMPTY_STATE;

  const children: any[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        children.push(heading(b.level, b.text || ''));
        break;
      case 'text':
        children.push(paragraph(b.text || ''));
        break;
      case 'image':
        children.push({ type: 'fdl-image', version: 1, src: b.src, alt: b.alt });
        break;
      case 'button':
        children.push({ type: 'fdl-button', version: 1, label: b.label, href: b.href });
        break;
      case 'collection-list':
        children.push({ type: 'fdl-collection-list', version: 1, collection: b.collection, limit: b.limit });
        break;
    }
  }
  // Trailing paragraph so the user can keep typing after the last block.
  children.push(paragraph(''));

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: null,
      children
    }
  } as SerializedEditorState;
}

export { EMPTY_STATE };
