'use client';

import { createContext, useContext, useState } from 'react';
import type { NodeKey } from 'lexical';
import {
  type VisualNode,
  REGISTRY_MAP,
  addToSlot,
} from './visual-registry';
import { cn } from '@/lib/utils';

// Re-export TreeUpdateFn so nodes.tsx can import it
export type TreeUpdateFn = (updater: (tree: VisualNode) => VisualNode) => void;

// ── Contexts ─────────────────────────────────────────────────────────────────

export type VisualSel = { nodeKey: NodeKey; visualId: string } | null;
export type VisualSelCtxValue = { sel: VisualSel; setSel: (v: VisualSel) => void };
export const VisualSelCtx = createContext<VisualSelCtxValue>({ sel: null, setSel: () => {} });

export type DragCtxValue = { dragging: string | null; setDragging: (v: string | null) => void };
export const DragCtx = createContext<DragCtxValue>({ dragging: null, setDragging: () => {} });

// ── SlotContainer ─────────────────────────────────────────────────────────────

function SlotContainer({
  nodes,
  slotName,
  parentId,
  nodeKey,
  slotLabel,
  onUpdate,
}: {
  nodes: VisualNode[];
  slotName: string;
  parentId: string;
  nodeKey: NodeKey;
  slotLabel: string;
  onUpdate: TreeUpdateFn;
}) {
  const { dragging } = useContext(DragCtx);
  const [isTarget, setIsTarget] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTarget(true);
  };

  const handleDragLeave = () => setIsTarget(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTarget(false);
    if (!dragging) return;
    const def = REGISTRY_MAP[dragging];
    if (!def) return;
    const newNode = def.defaultNode();
    onUpdate((tree) => addToSlot(tree, parentId, slotName, newNode));
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'min-h-[32px] rounded-md transition-colors',
        dragging && 'ring-1 ring-dashed ring-sky-400/50',
        isTarget && 'bg-sky-50/50'
      )}
    >
      {nodes.length === 0 ? (
        <div className="text-[11px] text-neutral-300 italic p-3 text-center border border-dashed border-neutral-200 rounded-md">
          Drop {dragging || 'a component'} here
        </div>
      ) : (
        nodes.map((child) => (
          <VNode key={child.id} node={child} nodeKey={nodeKey} onUpdate={onUpdate} />
        ))
      )}
    </div>
  );
}

// ── ComponentLabel ────────────────────────────────────────────────────────────

function ComponentLabel({ name }: { name: string }) {
  return (
    <span className="absolute -top-3 left-2 z-10 bg-sky-500 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none select-none">
      {name}
    </span>
  );
}

// ── VNode ─────────────────────────────────────────────────────────────────────

function VNode({
  node,
  nodeKey,
  onUpdate,
}: {
  node: VisualNode;
  nodeKey: NodeKey;
  onUpdate: TreeUpdateFn;
}) {
  const { sel, setSel } = useContext(VisualSelCtx);
  const isSelected = sel?.visualId === node.id;

  return (
    <div
      className={cn(
        'relative group my-1',
        isSelected && 'ring-2 ring-sky-500 ring-offset-1 rounded-md'
      )}
      onClick={(e) => {
        e.stopPropagation();
        setSel({ nodeKey, visualId: node.id });
      }}
    >
      {isSelected && <ComponentLabel name={node.component} />}
      {renderComponent(node, nodeKey, onUpdate)}
    </div>
  );
}

// ── renderComponent ───────────────────────────────────────────────────────────

function renderComponent(node: VisualNode, nodeKey: NodeKey, onUpdate: TreeUpdateFn): React.ReactNode {
  const p = node.props;

  switch (node.component) {
    // ── Form ────────────────────────────────────────────────────────────────

    case 'Button': {
      const text = String(p.text ?? 'Click me');
      const variant = String(p.variant ?? 'default');
      const size = String(p.size ?? 'default');
      const variantClasses: Record<string, string> = {
        default: 'bg-neutral-900 text-white hover:bg-neutral-800',
        outline: 'border border-neutral-200 hover:bg-neutral-50',
        ghost: 'hover:bg-neutral-100',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      };
      const sizeClasses: Record<string, string> = {
        default: 'px-4 py-2 text-sm',
        sm: 'px-3 py-1 text-xs',
        lg: 'px-6 py-3 text-base',
      };
      return (
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-md font-medium transition-colors',
            variantClasses[variant] ?? variantClasses.default,
            sizeClasses[size] ?? sizeClasses.default
          )}
        >
          {text}
        </button>
      );
    }

    case 'Input': {
      const label = String(p.label ?? 'Label');
      const placeholder = String(p.placeholder ?? 'Enter text…');
      const type = String(p.type ?? 'text');
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">{label}</label>
          <input
            type={type}
            placeholder={placeholder}
            readOnly
            className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-white"
          />
        </div>
      );
    }

    case 'Textarea': {
      const label = String(p.label ?? 'Label');
      const placeholder = String(p.placeholder ?? 'Enter text…');
      const rows = Number(p.rows ?? 4);
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">{label}</label>
          <textarea
            rows={rows}
            placeholder={placeholder}
            readOnly
            className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm resize-none bg-white"
          />
        </div>
      );
    }

    case 'Select': {
      const label = String(p.label ?? 'Choose…');
      const placeholder = String(p.placeholder ?? 'Pick an option');
      const options = Array.isArray(p.options) ? (p.options as string[]) : ['Option 1'];
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">{label}</label>
          <select className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-white" defaultValue="">
            <option value="" disabled>{placeholder}</option>
            {options.map((o) => <option key={o}>{String(o)}</option>)}
          </select>
        </div>
      );
    }

    case 'Switch': {
      const label = String(p.label ?? 'Toggle');
      const checked = Boolean(p.checked);
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <div className={cn('w-10 h-6 rounded-full transition-colors relative', checked ? 'bg-neutral-900' : 'bg-neutral-200')}>
            <div className={cn('absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform', checked && 'translate-x-4')} />
          </div>
          <span className="text-sm text-neutral-700">{label}</span>
        </label>
      );
    }

    case 'Checkbox': {
      const label = String(p.label ?? 'Check me');
      const checked = Boolean(p.checked);
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', checked ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300')}>
            {checked && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <polyline points="2,6 5,9 10,3" />
              </svg>
            )}
          </div>
          <span className="text-sm text-neutral-700">{label}</span>
        </label>
      );
    }

    // ── Display ──────────────────────────────────────────────────────────────

    case 'Badge': {
      const text = String(p.text ?? 'Badge');
      const variant = String(p.variant ?? 'default');
      const badgeVariants: Record<string, string> = {
        default: 'bg-neutral-900 text-white',
        secondary: 'bg-neutral-100 text-neutral-700',
        outline: 'border border-neutral-200 text-neutral-700',
        destructive: 'bg-red-100 text-red-700',
      };
      return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', badgeVariants[variant] ?? badgeVariants.default)}>
          {text}
        </span>
      );
    }

    case 'Alert': {
      const variant = String(p.variant ?? 'default');
      const title = String(p.title ?? 'Heads up');
      const description = String(p.description ?? '');
      const alertVariants: Record<string, string> = {
        default: 'bg-neutral-50 border-neutral-200 text-neutral-800',
        destructive: 'bg-red-50 border-red-200 text-red-800',
        success: 'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      };
      return (
        <div className={cn('rounded-md border p-4', alertVariants[variant] ?? alertVariants.default)}>
          <div className="font-semibold text-sm mb-1">{title}</div>
          <div className="text-sm opacity-80">{description}</div>
        </div>
      );
    }

    case 'Separator': {
      const orientation = String(p.orientation ?? 'horizontal');
      return (
        <hr className={cn('border-neutral-200', orientation === 'vertical' ? 'border-l h-6 border-t-0' : 'border-t')} />
      );
    }

    case 'Avatar': {
      const src = String(p.src ?? '');
      const fallback = String(p.fallback ?? 'AB');
      const size = String(p.size ?? 'md');
      const sizeClasses: Record<string, string> = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-14 h-14 text-base',
      };
      return (
        <div className={cn('rounded-full bg-neutral-200 flex items-center justify-center font-medium text-neutral-700 overflow-hidden shrink-0', sizeClasses[size] ?? sizeClasses.md)}>
          {src ? <img src={src} alt={fallback} className="w-full h-full object-cover" /> : fallback}
        </div>
      );
    }

    case 'Stat': {
      const label = String(p.label ?? 'Revenue');
      const value = String(p.value ?? '0');
      const delta = String(p.delta ?? '');
      const positive = Boolean(p.positive ?? true);
      return (
        <div className="p-4 border border-neutral-200 rounded-lg">
          <div className="text-xs text-neutral-500 mb-1">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
          {delta && (
            <div className={cn('text-xs mt-1', positive ? 'text-green-600' : 'text-red-600')}>
              {delta}
            </div>
          )}
        </div>
      );
    }

    case 'Code': {
      const code = String(p.code ?? '');
      const language = String(p.language ?? 'ts');
      return (
        <div>
          <span className="text-[10px] text-neutral-400 mb-1 block">{language}</span>
          <pre className="bg-neutral-900 text-neutral-100 rounded-md p-4 text-xs font-mono overflow-auto">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    case 'Progress': {
      const label = String(p.label ?? 'Progress');
      const value = Number(p.value ?? 0);
      return (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>{label}</span>
            <span>{value}%</span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full">
            <div
              className="h-2 bg-neutral-900 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
          </div>
        </div>
      );
    }

    // ── Layout ────────────────────────────────────────────────────────────────

    case 'Card': {
      const title = String(p.title ?? 'Card title');
      const description = String(p.description ?? '');
      const content = node.slots.content ?? [];
      const footer = node.slots.footer ?? [];
      return (
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <div className="font-semibold text-sm">{title}</div>
            {description && <div className="text-xs text-neutral-500 mt-0.5">{description}</div>}
          </div>
          <div className="p-4">
            <SlotContainer nodes={content} slotName="content" parentId={node.id} nodeKey={nodeKey} slotLabel="Content" onUpdate={onUpdate} />
          </div>
          {footer.length > 0 && (
            <div className="p-4 border-t border-neutral-100 bg-neutral-50">
              <SlotContainer nodes={footer} slotName="footer" parentId={node.id} nodeKey={nodeKey} slotLabel="Footer" onUpdate={onUpdate} />
            </div>
          )}
        </div>
      );
    }

    case 'AccordionItem': {
      // Standalone — shown when not inside Accordion
      return (
        <div className="border border-dashed border-neutral-200 rounded-md p-3 text-xs text-neutral-400">
          AccordionItem — drop inside an Accordion
        </div>
      );
    }

    case 'TabPanel': {
      // Standalone — shown when not inside Tabs
      return (
        <div className="border border-dashed border-neutral-200 rounded-md p-3 text-xs text-neutral-400">
          TabPanel — drop inside a Tabs component
        </div>
      );
    }

    case 'Accordion':
      return <AccordionRenderer node={node} nodeKey={nodeKey} onUpdate={onUpdate} />;

    case 'Tabs':
      return <TabsRenderer node={node} nodeKey={nodeKey} onUpdate={onUpdate} />;

    case 'Grid':
      return <GridRenderer node={node} nodeKey={nodeKey} onUpdate={onUpdate} />;

    case 'Stack':
      return <StackRenderer node={node} nodeKey={nodeKey} onUpdate={onUpdate} />;

    // ── Data ────────────────────────────────────────────────────────────────

    case 'Table': {
      const headers = Array.isArray(p.headers) ? (p.headers as string[]) : [];
      const rowsCsv = String(p.rowsCsv ?? '').trim();
      const rows = rowsCsv ? rowsCsv.split('\n').map((r) => r.split(',')) : [];
      return (
        <div className="overflow-auto rounded-md border border-neutral-200">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-4 py-2 text-left text-xs font-semibold text-neutral-600">{String(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-neutral-50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2 text-neutral-700">{cell.trim()}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    default:
      return (
        <div className="border border-dashed border-neutral-200 rounded-md p-3 text-xs text-neutral-400">
          Unknown component: {node.component}
        </div>
      );
  }
}

// ── Stateful sub-renderers ────────────────────────────────────────────────────

function AccordionRenderer({
  node,
  nodeKey,
  onUpdate,
}: {
  node: VisualNode;
  nodeKey: NodeKey;
  onUpdate: TreeUpdateFn;
}) {
  const { sel, setSel } = useContext(VisualSelCtx);
  const { dragging } = useContext(DragCtx);
  const [openId, setOpenId] = useState<string | null>(null);
  const [accordionTarget, setAccordionTarget] = useState(false);

  const items = node.slots.items ?? [];

  return (
    <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const trigger = String(item.props.trigger ?? 'Section');
        const content = item.slots?.content ?? [];
        const isItemSelected = sel?.visualId === item.id;
        return (
          <div
            key={item.id}
            className={cn('relative', isItemSelected && 'ring-2 ring-sky-500 ring-inset rounded')}
            onClick={(e) => e.stopPropagation()}
          >
            {isItemSelected && <ComponentLabel name="AccordionItem" />}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSel({ nodeKey, visualId: item.id });
                setOpenId(isOpen ? null : item.id);
              }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-neutral-50"
            >
              {trigger}
              <svg
                className={cn('h-4 w-4 text-neutral-400 transition-transform shrink-0', isOpen && 'rotate-180')}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {isOpen && (
              <div className="px-4 pb-4">
                <SlotContainer
                  nodes={content}
                  slotName="content"
                  parentId={item.id}
                  nodeKey={nodeKey}
                  slotLabel="Content"
                  onUpdate={onUpdate}
                />
              </div>
            )}
          </div>
        );
      })}
      {/* Drop zone for new AccordionItems */}
      <div
        onDragOver={(e) => {
          if (dragging) { e.preventDefault(); e.stopPropagation(); setAccordionTarget(true); }
        }}
        onDragLeave={() => setAccordionTarget(false)}
        onDrop={(e) => {
          if (dragging === 'AccordionItem') {
            e.preventDefault();
            e.stopPropagation();
            const def = REGISTRY_MAP['AccordionItem'];
            if (def) onUpdate((tree) => addToSlot(tree, node.id, 'items', def.defaultNode()));
          }
          setAccordionTarget(false);
        }}
        className={cn(
          'px-4 py-2 text-center text-[11px] text-neutral-400 italic transition-colors',
          accordionTarget && 'bg-sky-50'
        )}
      >
        {dragging === 'AccordionItem' ? 'Drop AccordionItem here' : 'Drop here to add item'}
      </div>
    </div>
  );
}

function TabsRenderer({
  node,
  nodeKey,
  onUpdate,
}: {
  node: VisualNode;
  nodeKey: NodeKey;
  onUpdate: TreeUpdateFn;
}) {
  const { setSel } = useContext(VisualSelCtx);
  const [activeIdx, setActiveIdx] = useState(0);
  const panels = node.slots.panels ?? [];
  const activePanel = panels[activeIdx];

  return (
    <div>
      <div className="flex border-b border-neutral-200 mb-4">
        {panels.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIdx(i);
              setSel({ nodeKey, visualId: p.id });
            }}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              i === activeIdx
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            )}
          >
            {String(p.props.label ?? 'Tab')}
          </button>
        ))}
      </div>
      {activePanel && (
        <SlotContainer
          nodes={activePanel.slots?.content ?? []}
          slotName="content"
          parentId={activePanel.id}
          nodeKey={nodeKey}
          slotLabel="Tab content"
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}

function GridRenderer({
  node,
  nodeKey,
  onUpdate,
}: {
  node: VisualNode;
  nodeKey: NodeKey;
  onUpdate: TreeUpdateFn;
}) {
  const { dragging } = useContext(DragCtx);
  const [isTarget, setIsTarget] = useState(false);
  const items = node.slots.items ?? [];
  const cols = String(node.props.cols ?? '2');
  const gap = String(node.props.gap ?? '4');

  const colsClass: Record<string, string> = {
    '2': 'grid-cols-2',
    '3': 'grid-cols-3',
    '4': 'grid-cols-4',
  };
  const gapClass: Record<string, string> = {
    '2': 'gap-2',
    '4': 'gap-4',
    '6': 'gap-6',
    '8': 'gap-8',
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTarget(false);
    if (!dragging) return;
    const def = REGISTRY_MAP[dragging];
    if (!def) return;
    onUpdate((tree) => addToSlot(tree, node.id, 'items', def.defaultNode()));
  };

  return (
    <div
      className={cn('grid', colsClass[cols] ?? 'grid-cols-2', gapClass[gap] ?? 'gap-4')}
      onDragOver={(e) => { if (dragging) { e.preventDefault(); e.stopPropagation(); setIsTarget(true); } }}
      onDragLeave={() => setIsTarget(false)}
      onDrop={handleDrop}
    >
      {items.map((child) => (
        <VNode key={child.id} node={child} nodeKey={nodeKey} onUpdate={onUpdate} />
      ))}
      {dragging && (
        <div className={cn('border-2 border-dashed rounded-md p-4 text-center text-xs text-neutral-400 transition-colors', isTarget ? 'border-sky-400 bg-sky-50' : 'border-neutral-200')}>
          Drop here
        </div>
      )}
    </div>
  );
}

function StackRenderer({
  node,
  nodeKey,
  onUpdate,
}: {
  node: VisualNode;
  nodeKey: NodeKey;
  onUpdate: TreeUpdateFn;
}) {
  const { dragging } = useContext(DragCtx);
  const [isTarget, setIsTarget] = useState(false);
  const items = node.slots.items ?? [];
  const direction = String(node.props.direction ?? 'col');
  const gap = String(node.props.gap ?? '4');
  const align = String(node.props.align ?? 'start');

  const dirClass: Record<string, string> = { col: 'flex-col', row: 'flex-row' };
  const alignClass: Record<string, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };
  const gapClass: Record<string, string> = {
    '1': 'gap-1',
    '2': 'gap-2',
    '4': 'gap-4',
    '6': 'gap-6',
    '8': 'gap-8',
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTarget(false);
    if (!dragging) return;
    const def = REGISTRY_MAP[dragging];
    if (!def) return;
    onUpdate((tree) => addToSlot(tree, node.id, 'items', def.defaultNode()));
  };

  return (
    <div
      className={cn('flex', dirClass[direction] ?? 'flex-col', gapClass[gap] ?? 'gap-4', alignClass[align] ?? 'items-start')}
      onDragOver={(e) => { if (dragging) { e.preventDefault(); e.stopPropagation(); setIsTarget(true); } }}
      onDragLeave={() => setIsTarget(false)}
      onDrop={handleDrop}
    >
      {items.map((child) => (
        <VNode key={child.id} node={child} nodeKey={nodeKey} onUpdate={onUpdate} />
      ))}
      {dragging && (
        <div className={cn('border-2 border-dashed rounded-md p-3 text-center text-xs text-neutral-400 transition-colors', isTarget ? 'border-sky-400 bg-sky-50' : 'border-neutral-200')}>
          Drop here
        </div>
      )}
    </div>
  );
}

// ── ShadcnBlockRenderer ────────────────────────────────────────────────────────

export function ShadcnBlockRenderer({
  tree,
  nodeKey,
  onUpdate,
}: {
  tree: VisualNode;
  nodeKey: NodeKey;
  onUpdate: TreeUpdateFn;
}) {
  return (
    <div className="py-2">
      <VNode node={tree} nodeKey={nodeKey} onUpdate={onUpdate} />
    </div>
  );
}
