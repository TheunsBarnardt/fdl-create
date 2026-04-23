'use client';
import { useState } from 'react';
import { ChevronDown, Palette, Hash, Type, ToggleLeft, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Variable, VariableGroup, buildVariableTree } from '@/lib/variable-types';

interface VariableTreeProps {
  variables: Variable[];
  selectedVariable: Variable | null;
  onSelectVariable: (v: Variable) => void;
  onEditVariable: (v: Variable) => void;
  onDeleteVariable: (id: string) => void;
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'color':
      return <Palette className="w-3 h-3" />;
    case 'number':
      return <Hash className="w-3 h-3" />;
    case 'string':
      return <Type className="w-3 h-3" />;
    case 'boolean':
      return <ToggleLeft className="w-3 h-3" />;
    case 'dimension':
      return <Ruler className="w-3 h-3" />;
    default:
      return null;
  }
}

function formatValue(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.light) {
    return `${value.light} / ${value.dark}`;
  }
  return String(value);
}

function TreeNode({
  group,
  level,
  selectedVariable,
  onSelectVariable,
  onEditVariable,
  onDeleteVariable,
}: {
  group: VariableGroup;
  level: number;
  selectedVariable: Variable | null;
  onSelectVariable: (v: Variable) => void;
  onEditVariable: (v: Variable) => void;
  onDeleteVariable: (id: string) => void;
}) {
  const [open, setOpen] = useState(level < 2);

  const isRoot = level === 0;
  const padding = level * 12;

  return (
    <div>
      {!isRoot && (
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-neutral-50 text-left',
            'text-neutral-700'
          )}
          style={{ paddingLeft: `${padding + 8}px` }}
        >
          <ChevronDown
            className={cn('w-3 h-3 text-neutral-400 transition-transform', !open && '-rotate-90')}
          />
          <span className="text-[11px] uppercase tracking-wider text-neutral-500">
            {group.label} ({group.variables.length + group.children.reduce((sum, c) => sum + c.variables.length, 0)})
          </span>
        </button>
      )}

      {open && (
        <>
          {group.variables.map((variable) => (
            <button
              key={variable.id}
              onClick={() => onSelectVariable(variable)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left group/var',
                selectedVariable?.id === variable.id
                  ? 'bg-accent-soft text-accent'
                  : 'hover:bg-neutral-50 text-neutral-600'
              )}
              style={{ paddingLeft: `${padding + 24}px` }}
            >
              {getTypeIcon(variable.type)}
              <span className="flex-1 truncate">{variable.name.split('/').pop()}</span>
              <span className="text-[9px] text-neutral-400 group-hover/var:text-neutral-600 truncate max-w-[100px]">
                {formatValue(variable.value)}
              </span>
            </button>
          ))}
          {group.children.map((child) => (
            <TreeNode
              key={child.path.join('/')}
              group={child}
              level={level + 1}
              selectedVariable={selectedVariable}
              onSelectVariable={onSelectVariable}
              onEditVariable={onEditVariable}
              onDeleteVariable={onDeleteVariable}
            />
          ))}
        </>
      )}
    </div>
  );
}

export function VariableTree({
  variables,
  selectedVariable,
  onSelectVariable,
  onEditVariable,
  onDeleteVariable,
}: VariableTreeProps) {
  const tree = buildVariableTree(variables);

  if (variables.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-neutral-500">No variables yet</p>
        <p className="text-[11px] text-neutral-400 mt-1">Create one to get started</p>
      </div>
    );
  }

  return (
    <TreeNode
      group={tree}
      level={0}
      selectedVariable={selectedVariable}
      onSelectVariable={onSelectVariable}
      onEditVariable={onEditVariable}
      onDeleteVariable={onDeleteVariable}
    />
  );
}
