// visual-registry.ts — pure TypeScript, no React imports

// ── Types ──────────────────────────────────────────────────────────────────────

export type JsonVal =
  | string
  | number
  | boolean
  | null
  | JsonVal[]
  | { [key: string]: JsonVal };

export type PropDef =
  | { kind: 'string'; label: string; default?: string }
  | { kind: 'text'; label: string; default?: string }
  | { kind: 'number'; label: string; default?: number; min?: number; max?: number }
  | { kind: 'boolean'; label: string; default?: boolean }
  | { kind: 'select'; label: string; options: string[]; default?: string }
  | { kind: 'array'; label: string; default?: string[] };

export type SlotDef = { name: string; label: string; multi: boolean };

export type ComponentDef = {
  name: string;
  label: string;
  category: 'layout' | 'form' | 'data' | 'display';
  description: string;
  props: Record<string, PropDef>;
  slots: SlotDef[];
  defaultNode: () => VisualNode;
};

export type VisualNode = {
  id: string;
  component: string;
  props: Record<string, JsonVal>;
  slots: Record<string, VisualNode[]>;
};

// ── uid helper ────────────────────────────────────────────────────────────────

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ── Tree helpers ──────────────────────────────────────────────────────────────

export function findNodeInTree(root: VisualNode, id: string): VisualNode | null {
  if (root.id === id) return root;
  for (const slotNodes of Object.values(root.slots)) {
    for (const child of slotNodes) {
      const found = findNodeInTree(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function updatePropsInTree(
  root: VisualNode,
  id: string,
  patch: Record<string, JsonVal>
): VisualNode {
  if (root.id === id) {
    return { ...root, props: { ...root.props, ...patch } };
  }
  const newSlots: Record<string, VisualNode[]> = {};
  for (const [slotName, slotNodes] of Object.entries(root.slots)) {
    newSlots[slotName] = slotNodes.map((child) => updatePropsInTree(child, id, patch));
  }
  return { ...root, slots: newSlots };
}

export function addToSlot(
  root: VisualNode,
  targetId: string,
  slotName: string,
  child: VisualNode
): VisualNode {
  if (root.id === targetId) {
    const existing = root.slots[slotName] ?? [];
    return { ...root, slots: { ...root.slots, [slotName]: [...existing, child] } };
  }
  const newSlots: Record<string, VisualNode[]> = {};
  for (const [sn, slotNodes] of Object.entries(root.slots)) {
    newSlots[sn] = slotNodes.map((c) => addToSlot(c, targetId, slotName, child));
  }
  return { ...root, slots: newSlots };
}

export function removeFromTree(root: VisualNode, id: string): VisualNode | null {
  if (root.id === id) return null;
  const newSlots: Record<string, VisualNode[]> = {};
  for (const [slotName, slotNodes] of Object.entries(root.slots)) {
    newSlots[slotName] = slotNodes
      .map((child) => removeFromTree(child, id))
      .filter((c): c is VisualNode => c !== null);
  }
  return { ...root, slots: newSlots };
}

// ── Component Registry ────────────────────────────────────────────────────────

export const COMPONENT_REGISTRY: ComponentDef[] = [
  // ── Form ──────────────────────────────────────────────────────────────────
  {
    name: 'Button',
    label: 'Button',
    category: 'form',
    description: 'Clickable call-to-action button',
    props: {
      text: { kind: 'string', label: 'Text', default: 'Click me' },
      variant: { kind: 'select', label: 'Variant', options: ['default', 'outline', 'ghost', 'destructive'], default: 'default' },
      size: { kind: 'select', label: 'Size', options: ['default', 'sm', 'lg'], default: 'default' },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Button',
      props: { text: 'Click me', variant: 'default', size: 'default' },
      slots: {},
    }),
  },
  {
    name: 'Input',
    label: 'Input',
    category: 'form',
    description: 'Text input field with label',
    props: {
      label: { kind: 'string', label: 'Label', default: 'Label' },
      placeholder: { kind: 'string', label: 'Placeholder', default: 'Enter text…' },
      type: { kind: 'select', label: 'Type', options: ['text', 'email', 'password', 'number', 'url'], default: 'text' },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Input',
      props: { label: 'Label', placeholder: 'Enter text…', type: 'text' },
      slots: {},
    }),
  },
  {
    name: 'Textarea',
    label: 'Textarea',
    category: 'form',
    description: 'Multi-line text area',
    props: {
      label: { kind: 'string', label: 'Label', default: 'Label' },
      placeholder: { kind: 'string', label: 'Placeholder', default: 'Enter text…' },
      rows: { kind: 'number', label: 'Rows', default: 4, min: 2, max: 20 },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Textarea',
      props: { label: 'Label', placeholder: 'Enter text…', rows: 4 },
      slots: {},
    }),
  },
  {
    name: 'Select',
    label: 'Select',
    category: 'form',
    description: 'Dropdown selector',
    props: {
      label: { kind: 'string', label: 'Label', default: 'Choose…' },
      placeholder: { kind: 'string', label: 'Placeholder', default: 'Pick an option' },
      options: { kind: 'array', label: 'Options', default: ['Option 1', 'Option 2', 'Option 3'] },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Select',
      props: { label: 'Choose…', placeholder: 'Pick an option', options: ['Option 1', 'Option 2', 'Option 3'] },
      slots: {},
    }),
  },
  {
    name: 'Switch',
    label: 'Switch',
    category: 'form',
    description: 'Toggle switch',
    props: {
      label: { kind: 'string', label: 'Label', default: 'Toggle' },
      checked: { kind: 'boolean', label: 'Checked', default: false },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Switch',
      props: { label: 'Toggle', checked: false },
      slots: {},
    }),
  },
  {
    name: 'Checkbox',
    label: 'Checkbox',
    category: 'form',
    description: 'Checkbox with label',
    props: {
      label: { kind: 'string', label: 'Label', default: 'Check me' },
      checked: { kind: 'boolean', label: 'Checked', default: false },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Checkbox',
      props: { label: 'Check me', checked: false },
      slots: {},
    }),
  },

  // ── Display ──────────────────────────────────────────────────────────────
  {
    name: 'Badge',
    label: 'Badge',
    category: 'display',
    description: 'Small status/label badge',
    props: {
      text: { kind: 'string', label: 'Text', default: 'Badge' },
      variant: { kind: 'select', label: 'Variant', options: ['default', 'secondary', 'outline', 'destructive'], default: 'default' },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Badge',
      props: { text: 'Badge', variant: 'default' },
      slots: {},
    }),
  },
  {
    name: 'Alert',
    label: 'Alert',
    category: 'display',
    description: 'Contextual alert message',
    props: {
      variant: { kind: 'select', label: 'Variant', options: ['default', 'destructive', 'success', 'warning'], default: 'default' },
      title: { kind: 'string', label: 'Title', default: 'Heads up' },
      description: { kind: 'text', label: 'Description', default: 'Something you should know.' },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Alert',
      props: { variant: 'default', title: 'Heads up', description: 'Something you should know.' },
      slots: {},
    }),
  },
  {
    name: 'Separator',
    label: 'Separator',
    category: 'display',
    description: 'Horizontal or vertical divider',
    props: {
      orientation: { kind: 'select', label: 'Orientation', options: ['horizontal', 'vertical'], default: 'horizontal' },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Separator',
      props: { orientation: 'horizontal' },
      slots: {},
    }),
  },
  {
    name: 'Avatar',
    label: 'Avatar',
    category: 'display',
    description: 'User avatar with fallback initials',
    props: {
      src: { kind: 'string', label: 'Image URL', default: '' },
      fallback: { kind: 'string', label: 'Fallback', default: 'AB' },
      size: { kind: 'select', label: 'Size', options: ['sm', 'md', 'lg'], default: 'md' },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Avatar',
      props: { src: '', fallback: 'AB', size: 'md' },
      slots: {},
    }),
  },
  {
    name: 'Stat',
    label: 'Stat',
    category: 'display',
    description: 'Key metric with delta indicator',
    props: {
      label: { kind: 'string', label: 'Label', default: 'Revenue' },
      value: { kind: 'string', label: 'Value', default: 'R 24,500' },
      delta: { kind: 'string', label: 'Delta', default: '+12%' },
      positive: { kind: 'boolean', label: 'Positive trend', default: true },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Stat',
      props: { label: 'Revenue', value: 'R 24,500', delta: '+12%', positive: true },
      slots: {},
    }),
  },
  {
    name: 'Code',
    label: 'Code',
    category: 'display',
    description: 'Syntax-highlighted code block',
    props: {
      code: { kind: 'text', label: 'Code', default: 'console.log("Hello")' },
      language: { kind: 'select', label: 'Language', options: ['ts', 'js', 'python', 'sql', 'bash', 'json'], default: 'ts' },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Code',
      props: { code: 'console.log("Hello")', language: 'ts' },
      slots: {},
    }),
  },

  // ── Layout ───────────────────────────────────────────────────────────────
  {
    name: 'Card',
    label: 'Card',
    category: 'layout',
    description: 'Content card with header, body and footer slots',
    props: {
      title: { kind: 'string', label: 'Title', default: 'Card title' },
      description: { kind: 'string', label: 'Description', default: 'Card description' },
    },
    slots: [
      { name: 'content', label: 'Content', multi: true },
      { name: 'footer', label: 'Footer', multi: true },
    ],
    defaultNode: () => ({
      id: uid(),
      component: 'Card',
      props: { title: 'Card title', description: 'Card description' },
      slots: { content: [], footer: [] },
    }),
  },
  {
    name: 'Accordion',
    label: 'Accordion',
    category: 'layout',
    description: 'Collapsible accordion with multiple items',
    props: {
      type: { kind: 'select', label: 'Type', options: ['single', 'multiple'], default: 'single' },
    },
    slots: [{ name: 'items', label: 'Items', multi: true }],
    defaultNode: () => ({
      id: uid(),
      component: 'Accordion',
      props: { type: 'single' },
      slots: {
        items: [
          { id: uid(), component: 'AccordionItem', props: { trigger: 'Section title' }, slots: { content: [] } },
          { id: uid(), component: 'AccordionItem', props: { trigger: 'Another section' }, slots: { content: [] } },
        ],
      },
    }),
  },
  {
    name: 'AccordionItem',
    label: 'Accordion Item',
    category: 'layout',
    description: 'Single collapsible section — drop inside an Accordion',
    props: {
      trigger: { kind: 'string', label: 'Section title', default: 'Section title' },
    },
    slots: [{ name: 'content', label: 'Content', multi: true }],
    defaultNode: () => ({
      id: uid(),
      component: 'AccordionItem',
      props: { trigger: 'Section title' },
      slots: { content: [] },
    }),
  },
  {
    name: 'Tabs',
    label: 'Tabs',
    category: 'layout',
    description: 'Tabbed panels container',
    props: {},
    slots: [{ name: 'panels', label: 'Panels', multi: true }],
    defaultNode: () => ({
      id: uid(),
      component: 'Tabs',
      props: {},
      slots: {
        panels: [
          { id: uid(), component: 'TabPanel', props: { label: 'Tab 1' }, slots: { content: [] } },
          { id: uid(), component: 'TabPanel', props: { label: 'Tab 2' }, slots: { content: [] } },
        ],
      },
    }),
  },
  {
    name: 'TabPanel',
    label: 'Tab Panel',
    category: 'layout',
    description: 'Single tab panel — drop inside Tabs',
    props: {
      label: { kind: 'string', label: 'Tab label', default: 'Tab' },
    },
    slots: [{ name: 'content', label: 'Content', multi: true }],
    defaultNode: () => ({
      id: uid(),
      component: 'TabPanel',
      props: { label: 'Tab' },
      slots: { content: [] },
    }),
  },
  {
    name: 'Grid',
    label: 'Grid',
    category: 'layout',
    description: 'Responsive CSS grid container',
    props: {
      cols: { kind: 'select', label: 'Columns', options: ['2', '3', '4'], default: '2' },
      gap: { kind: 'select', label: 'Gap', options: ['2', '4', '6', '8'], default: '4' },
    },
    slots: [{ name: 'items', label: 'Items', multi: true }],
    defaultNode: () => ({
      id: uid(),
      component: 'Grid',
      props: { cols: '2', gap: '4' },
      slots: { items: [] },
    }),
  },
  {
    name: 'Stack',
    label: 'Stack',
    category: 'layout',
    description: 'Flex stack — vertical or horizontal',
    props: {
      direction: { kind: 'select', label: 'Direction', options: ['col', 'row'], default: 'col' },
      gap: { kind: 'select', label: 'Gap', options: ['1', '2', '4', '6', '8'], default: '4' },
      align: { kind: 'select', label: 'Align', options: ['start', 'center', 'end', 'stretch'], default: 'start' },
    },
    slots: [{ name: 'items', label: 'Items', multi: true }],
    defaultNode: () => ({
      id: uid(),
      component: 'Stack',
      props: { direction: 'col', gap: '4', align: 'start' },
      slots: { items: [] },
    }),
  },

  // ── Data ──────────────────────────────────────────────────────────────────
  {
    name: 'Table',
    label: 'Table',
    category: 'data',
    description: 'Data table with configurable headers and rows',
    props: {
      headers: { kind: 'array', label: 'Headers', default: ['Name', 'Status', 'Date'] },
      rowsCsv: { kind: 'text', label: 'Rows (CSV)', default: 'Alice,Active,2024-01-01\nBob,Inactive,2024-01-02' },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Table',
      props: {
        headers: ['Name', 'Status', 'Date'],
        rowsCsv: 'Alice,Active,2024-01-01\nBob,Inactive,2024-01-02',
      },
      slots: {},
    }),
  },
  {
    name: 'Progress',
    label: 'Progress',
    category: 'data',
    description: 'Progress bar with percentage',
    props: {
      label: { kind: 'string', label: 'Label', default: 'Progress' },
      value: { kind: 'number', label: 'Value (%)', default: 60, min: 0, max: 100 },
    },
    slots: [],
    defaultNode: () => ({
      id: uid(),
      component: 'Progress',
      props: { label: 'Progress', value: 60 },
      slots: {},
    }),
  },
];

export const REGISTRY_MAP: Record<string, ComponentDef> = Object.fromEntries(
  COMPONENT_REGISTRY.map((c) => [c.name, c])
);

export const COMPONENT_CATEGORIES: Record<string, { label: string; order: number }> = {
  layout: { label: 'Layout', order: 0 },
  form: { label: 'Form', order: 1 },
  data: { label: 'Data', order: 2 },
  display: { label: 'Display', order: 3 },
};
