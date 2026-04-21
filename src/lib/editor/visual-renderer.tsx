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
        isSelected && 'rounded-md outline outline-[1.5px] outline-dashed outline-sky-400/60 outline-offset-2'
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

    case 'RadioGroup': {
      const label = String(p.label ?? 'Choose one');
      const options = Array.isArray(p.options) ? (p.options as string[]) : ['Option 1', 'Option 2'];
      const value = String(p.value ?? '');
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700">{label}</label>
          <div className="space-y-1.5">
            {options.map((o) => (
              <label key={String(o)} className="flex items-center gap-2 cursor-pointer">
                <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0', value === String(o) ? 'border-neutral-900' : 'border-neutral-300')}>
                  {value === String(o) && <div className="w-2 h-2 rounded-full bg-neutral-900" />}
                </div>
                <span className="text-sm text-neutral-700">{String(o)}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    case 'Slider': {
      const label = String(p.label ?? 'Value');
      const min = Number(p.min ?? 0);
      const max = Number(p.max ?? 100);
      const value = Number(p.value ?? 50);
      const step = Number(p.step ?? 1);
      return (
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-neutral-700">{label}</label>
            <span className="text-sm text-neutral-500">{value}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            defaultValue={value}
            readOnly
            className="w-full accent-neutral-900"
          />
        </div>
      );
    }

    case 'DatePicker': {
      const label = String(p.label ?? 'Date');
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">{label}</label>
          <input
            type="date"
            readOnly
            className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-white"
          />
        </div>
      );
    }

    case 'FileUpload': {
      const label = String(p.label ?? 'Upload file');
      const multiple = Boolean(p.multiple);
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">{label}</label>
          <div className="border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center bg-neutral-50">
            <svg className="mx-auto h-8 w-8 text-neutral-300 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm text-neutral-500">Drop {multiple ? 'files' : 'a file'} here or <span className="text-neutral-900 underline">browse</span></p>
          </div>
        </div>
      );
    }

    case 'Toggle': {
      const text = String(p.text ?? 'Toggle');
      const pressed = Boolean(p.pressed);
      return (
        <button
          type="button"
          className={cn(
            'px-4 py-2 text-sm rounded-md border font-medium transition-colors',
            pressed
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
          )}
        >
          {text}
        </button>
      );
    }

    case 'Combobox':
      return <ComboboxRenderer node={node} />;

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

    case 'Image': {
      const src = String(p.src ?? '');
      const alt = String(p.alt ?? '');
      const objectFit = String(p.objectFit ?? 'cover');
      const rounded = Boolean(p.rounded);
      if (!src) {
        return (
          <div className={cn('w-full h-40 bg-neutral-100 border border-dashed border-neutral-300 flex items-center justify-center', rounded && 'rounded-lg')}>
            <svg className="h-8 w-8 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        );
      }
      return (
        <div className={cn('w-full h-40 overflow-hidden', rounded && 'rounded-lg')}>
          <img src={src} alt={alt} className="w-full h-full" style={{ objectFit: objectFit as any }} />
        </div>
      );
    }

    case 'Skeleton': {
      const lines = Math.min(10, Math.max(1, Number(p.lines ?? 3)));
      const showAvatar = Boolean(p.showAvatar);
      return (
        <div className="space-y-3">
          {showAvatar && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-200 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-neutral-200 animate-pulse rounded w-1/2" />
                <div className="h-2 bg-neutral-200 animate-pulse rounded w-1/3" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
              <div
                key={i}
                className="h-3 bg-neutral-200 animate-pulse rounded"
                style={{ width: i === lines - 1 ? '60%' : '100%' }}
              />
            ))}
          </div>
        </div>
      );
    }

    case 'Callout': {
      const variant = String(p.variant ?? 'info');
      const title = String(p.title ?? 'Note');
      const body = String(p.body ?? '');
      const variantStyles: Record<string, { border: string; bg: string; title: string; body: string; icon: string }> = {
        info:    { border: 'border-blue-400',  bg: 'bg-blue-50',   title: 'text-blue-800',  body: 'text-blue-700',  icon: 'ℹ' },
        success: { border: 'border-green-400', bg: 'bg-green-50',  title: 'text-green-800', body: 'text-green-700', icon: '✓' },
        warning: { border: 'border-yellow-400',bg: 'bg-yellow-50', title: 'text-yellow-800',body: 'text-yellow-700',icon: '⚠' },
        danger:  { border: 'border-red-400',   bg: 'bg-red-50',    title: 'text-red-800',   body: 'text-red-700',   icon: '✕' },
      };
      const s = variantStyles[variant] ?? variantStyles.info;
      return (
        <div className={cn('border-l-4 rounded-r-md p-4', s.border, s.bg)}>
          <div className={cn('font-semibold text-sm mb-1 flex items-center gap-1.5', s.title)}>
            <span>{s.icon}</span> {title}
          </div>
          <div className={cn('text-sm', s.body)}>{body}</div>
        </div>
      );
    }

    case 'Timeline': {
      const items = Array.isArray(p.items) ? (p.items as string[]) : [];
      return (
        <div className="space-y-0">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-neutral-900 shrink-0 mt-1" />
                {i < items.length - 1 && <div className="w-0.5 flex-1 bg-neutral-200 my-1" />}
              </div>
              <div className="pb-4">
                <p className="text-sm text-neutral-700">{String(item)}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    case 'Breadcrumb': {
      const items = Array.isArray(p.items) ? (p.items as string[]) : [];
      return (
        <nav className="flex items-center gap-1 text-sm">
          {items.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-neutral-300">/</span>}
              <span className={cn(i === items.length - 1 ? 'text-neutral-700 font-medium' : 'text-neutral-400 hover:text-neutral-600 cursor-pointer')}>
                {String(item)}
              </span>
            </span>
          ))}
        </nav>
      );
    }

    case 'Pagination': {
      const total = Number(p.total ?? 100);
      const perPage = Number(p.perPage ?? 10);
      const currentPage = Number(p.currentPage ?? 1);
      const totalPages = Math.ceil(total / perPage);
      const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        const start = Math.max(1, currentPage - 2);
        return start + i;
      }).filter((n) => n <= totalPages);
      return (
        <div className="flex items-center gap-1">
          <button type="button" className="px-2 py-1 text-xs border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-40" disabled={currentPage <= 1}>
            ← Prev
          </button>
          {pages.map((pg) => (
            <button
              key={pg}
              type="button"
              className={cn('w-8 h-8 text-xs rounded border transition-colors', pg === currentPage ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 hover:bg-neutral-50')}
            >
              {pg}
            </button>
          ))}
          <button type="button" className="px-2 py-1 text-xs border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-40" disabled={currentPage >= totalPages}>
            Next →
          </button>
        </div>
      );
    }

    case 'List': {
      const variant = String(p.variant ?? 'bullet');
      const items = Array.isArray(p.items) ? (p.items as string[]) : [];
      return (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
              {variant === 'bullet' && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />}
              {variant === 'numbered' && <span className="shrink-0 font-medium text-neutral-400 w-5 text-right">{i + 1}.</span>}
              {variant === 'check' && (
                <svg className="mt-0.5 h-4 w-4 text-green-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span>{String(item)}</span>
            </li>
          ))}
        </ul>
      );
    }

    case 'Tag': {
      const text = String(p.text ?? 'Tag');
      const color = String(p.color ?? 'gray');
      const removable = Boolean(p.removable);
      const colorClasses: Record<string, string> = {
        gray:   'bg-neutral-100 text-neutral-700',
        blue:   'bg-blue-100 text-blue-700',
        green:  'bg-green-100 text-green-700',
        red:    'bg-red-100 text-red-700',
        yellow: 'bg-yellow-100 text-yellow-700',
        purple: 'bg-purple-100 text-purple-700',
      };
      return (
        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', colorClasses[color] ?? colorClasses.gray)}>
          {text}
          {removable && (
            <button type="button" className="ml-0.5 opacity-60 hover:opacity-100">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </span>
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

    case 'Form': {
      const submitLabel = String(p.submitLabel ?? 'Submit');
      const fields = node.slots.fields ?? [];
      const actions = node.slots.actions ?? [];
      return (
        <form onSubmit={(e) => e.preventDefault()} className="border border-neutral-200 rounded-lg p-4 space-y-4">
          <SlotContainer nodes={fields} slotName="fields" parentId={node.id} nodeKey={nodeKey} slotLabel="Fields" onUpdate={onUpdate} />
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <button type="button" className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-md">
              {submitLabel}
            </button>
            <SlotContainer nodes={actions} slotName="actions" parentId={node.id} nodeKey={nodeKey} slotLabel="Actions" onUpdate={onUpdate} />
          </div>
        </form>
      );
    }

    case 'Dialog': {
      const title = String(p.title ?? 'Dialog title');
      const description = String(p.description ?? '');
      const content = node.slots.content ?? [];
      const footer = node.slots.footer ?? [];
      return (
        <div className="border border-neutral-200 rounded-lg shadow-md overflow-hidden bg-white">
          <div className="px-6 py-4 border-b border-neutral-200">
            <div className="font-semibold text-base">{title}</div>
            {description && <div className="text-sm text-neutral-500 mt-0.5">{description}</div>}
          </div>
          <div className="px-6 py-4">
            <SlotContainer nodes={content} slotName="content" parentId={node.id} nodeKey={nodeKey} slotLabel="Content" onUpdate={onUpdate} />
          </div>
          {footer.length > 0 && (
            <div className="px-6 py-3 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-2">
              <SlotContainer nodes={footer} slotName="footer" parentId={node.id} nodeKey={nodeKey} slotLabel="Footer" onUpdate={onUpdate} />
            </div>
          )}
        </div>
      );
    }

    case 'Sheet': {
      const title = String(p.title ?? 'Sheet title');
      const side = String(p.side ?? 'right');
      const content = node.slots.content ?? [];
      const sideLabel: Record<string, string> = { left: '← Left panel', right: 'Right panel →', top: '↑ Top panel', bottom: '↓ Bottom panel' };
      return (
        <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
          <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
            <span className="text-xs text-neutral-400">{sideLabel[side] ?? 'Panel'}</span>
            <span className="text-xs font-medium text-neutral-700">{title}</span>
            <div className="w-5 h-5 rounded border border-neutral-200 flex items-center justify-center text-neutral-400 text-xs">✕</div>
          </div>
          <div className="p-4">
            <SlotContainer nodes={content} slotName="content" parentId={node.id} nodeKey={nodeKey} slotLabel="Content" onUpdate={onUpdate} />
          </div>
        </div>
      );
    }

    case 'Collapsible':
      return <CollapsibleRenderer node={node} nodeKey={nodeKey} onUpdate={onUpdate} />;

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

    case 'Chart':
      return <ChartRenderer node={node} />;

    case 'KanbanBoard': {
      const columns = Array.isArray(p.columns) ? (p.columns as string[]) : ['Todo', 'In Progress', 'Done'];
      return (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((col, i) => (
            <div key={i} className="shrink-0 w-48 bg-neutral-50 border border-neutral-200 rounded-lg">
              <div className="px-3 py-2 border-b border-neutral-200">
                <span className="text-xs font-semibold text-neutral-700">{String(col)}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[80px]">
                <div className="h-10 bg-white border border-neutral-200 rounded-md px-2 flex items-center text-xs text-neutral-400 italic">
                  Drop cards here
                </div>
              </div>
            </div>
          ))}
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

function CollapsibleRenderer({
  node,
  nodeKey,
  onUpdate,
}: {
  node: VisualNode;
  nodeKey: NodeKey;
  onUpdate: TreeUpdateFn;
}) {
  const trigger = String(node.props.trigger ?? 'Show more');
  const [open, setOpen] = useState(Boolean(node.props.open ?? false));
  const content = node.slots.content ?? [];
  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-neutral-50"
      >
        {trigger}
        <svg className={cn('h-4 w-4 text-neutral-400 transition-transform shrink-0', open && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <SlotContainer nodes={content} slotName="content" parentId={node.id} nodeKey={nodeKey} slotLabel="Content" onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

function ComboboxRenderer({ node }: { node: VisualNode }) {
  const label = String(node.props.label ?? 'Pick one');
  const placeholder = String(node.props.placeholder ?? 'Search…');
  const options = Array.isArray(node.props.options) ? (node.props.options as string[]) : [];
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = search ? options.filter((o) => String(o).toLowerCase().includes(search.toLowerCase())) : options;
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <div className="relative">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm bg-white"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-md max-h-40 overflow-auto">
            {filtered.map((o, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={() => { setSearch(String(o)); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                {String(o)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartRenderer({ node }: { node: VisualNode }) {
  const title = String(node.props.title ?? 'Chart');
  const type = String(node.props.type ?? 'bar');
  const labels = Array.isArray(node.props.labels) ? (node.props.labels as string[]) : [];
  const values = Array.isArray(node.props.values) ? node.props.values.map((v) => Number(v)) : [];
  const maxVal = Math.max(...values, 1);
  const chartH = 80;

  if (type === 'pie') {
    return (
      <div className="p-4 border border-neutral-200 rounded-lg">
        <div className="text-sm font-medium text-neutral-700 mb-3">{title}</div>
        <div className="flex items-center gap-4">
          <svg width="80" height="80" viewBox="0 0 80 80">
            {values.reduce((acc, val, i) => {
              const total = values.reduce((a, b) => a + b, 0) || 1;
              const pct = val / total;
              const prev = acc.prevAngle;
              const startX = 40 + 36 * Math.cos(prev);
              const startY = 40 + 36 * Math.sin(prev);
              const endAngle = prev + pct * 2 * Math.PI;
              const endX = 40 + 36 * Math.cos(endAngle);
              const endY = 40 + 36 * Math.sin(endAngle);
              const large = pct > 0.5 ? 1 : 0;
              const colors = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
              acc.paths.push(
                <path
                  key={i}
                  d={`M40 40 L${startX} ${startY} A36 36 0 ${large} 1 ${endX} ${endY} Z`}
                  fill={colors[i % colors.length]}
                />
              );
              acc.prevAngle = endAngle;
              return acc;
            }, { paths: [] as React.ReactNode[], prevAngle: -Math.PI / 2 }).paths}
          </svg>
          <div className="space-y-1">
            {labels.map((l, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-neutral-600">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: ['#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ef4444'][i % 5] }} />
                {String(l)}: {values[i] ?? 0}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border border-neutral-200 rounded-lg">
      <div className="text-sm font-medium text-neutral-700 mb-3">{title}</div>
      <svg width="100%" height={chartH + 20} viewBox={`0 0 ${Math.max(labels.length * 40, 120)} ${chartH + 20}`} preserveAspectRatio="xMidYMid meet">
        {type === 'line' ? (
          <polyline
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={labels.map((_, i) => {
              const x = i * 40 + 20;
              const y = chartH - (values[i] ?? 0) / maxVal * (chartH - 10);
              return `${x},${y}`;
            }).join(' ')}
          />
        ) : (
          labels.map((_, i) => {
            const barH = ((values[i] ?? 0) / maxVal) * (chartH - 10);
            const x = i * 40 + 10;
            return (
              <rect key={i} x={x} y={chartH - barH} width="24" height={barH} rx="2" fill="#0ea5e9" />
            );
          })
        )}
        {labels.map((l, i) => (
          <text key={i} x={i * 40 + 22} y={chartH + 14} textAnchor="middle" fontSize="9" fill="#9ca3af">
            {String(l)}
          </text>
        ))}
      </svg>
    </div>
  );
}

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
            className={cn('relative', isItemSelected && 'rounded outline outline-[1.5px] outline-dashed outline-sky-400/60 outline-offset-1')}
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
  // Ensure old nodes without bindings field are normalised (handles data saved before bindings was added)
  const normalised: VisualNode = tree.bindings ? tree : { ...tree, bindings: {} };
  return (
    <div className="py-2">
      <VNode node={normalised} nodeKey={nodeKey} onUpdate={onUpdate} />
    </div>
  );
}
