import type { EditorThemeClasses } from 'lexical';

export const editorTheme: EditorThemeClasses = {
  paragraph: 'text-neutral-700 leading-relaxed mb-3',
  heading: {
    h1: 'display text-[44px] font-semibold leading-[1.05] mb-4 mt-2',
    h2: 'display text-2xl font-semibold mb-3 mt-6',
    h3: 'display text-lg font-semibold mb-2 mt-4'
  },
  text: {
    bold: 'font-semibold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'mono bg-neutral-100 px-1 py-0.5 rounded text-[0.9em]'
  },
  list: {
    ul: 'list-disc pl-6 mb-3',
    ol: 'list-decimal pl-6 mb-3',
    listitem: 'mb-1',
    nested: { listitem: 'list-none' }
  },
  link: 'text-accent underline underline-offset-2 cursor-pointer',
  quote: 'border-l-2 border-neutral-300 pl-4 italic text-neutral-500 my-4'
};
