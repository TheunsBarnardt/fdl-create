'use client';

import { useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { Chip } from '@/components/chip';
import Link from 'next/link';

// ---- Types ----
export type ProcParam = {
  name: string;
  sqlType: string;
  direction: 'IN' | 'OUT';
  defaultValue: string;
  testValue: string;
};

export type StoredProc = {
  id: string;
  groupId: string;
  name: string;
  signature: string;
  body: string;
  params: ProcParam[];
  status: 'draft' | 'saved' | 'deployed';
  boundTo: string | null;
  order: number;
};

export type ProcGroup = {
  id: string;
  name: string;
  order: number;
  procedures: StoredProc[];
};

export type CollectionMeta = {
  id: string;
  name: string;
  label: string;
  schema: { fields: { name: string; type: string }[] };
};

// ---- SQL types for the param editor ----
const SQL_TYPES = [
  'NVARCHAR(36)', 'NVARCHAR(255)', 'NVARCHAR(MAX)',
  'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
  'BIT', 'DECIMAL(18,2)', 'FLOAT',
  'DATETIME2', 'DATE', 'TIME',
  'UNIQUEIDENTIFIER',
] as const;

const WHERE_OPS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IS NULL', 'IS NOT NULL'] as const;

// ---- Helpers ----
function buildDefaultBody(signature: string) {
  return `CREATE OR ALTER PROCEDURE ${signature}
  @id NVARCHAR(36) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  SELECT *
  FROM dbo.TableName
  WHERE (@id IS NULL OR id = @id);
END`;
}

function statusChip(status: StoredProc['status']) {
  if (status === 'deployed') return <Chip tone="ok">deployed</Chip>;
  if (status === 'saved') return <Chip tone="accent">saved</Chip>;
  return <Chip tone="neutral">draft</Chip>;
}

// ---- Sub-components ----

function GroupRow({
  group,
  selectedId,
  open,
  onToggle,
  onSelect,
  onNewProc,
  onDeleteGroup,
}: {
  group: ProcGroup;
  selectedId: string | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onNewProc: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-3 py-1.5 hover:bg-neutral-50 group/group">
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 flex-1 text-left"
        >
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5"
            className={`text-neutral-400 transition-transform ${open ? 'rotate-90' : ''}`}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-500">
            <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
            <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          {group.name}
          <span className="text-[10px] font-normal text-neutral-400">{group.procedures.length}</span>
        </button>
        <div className="hidden group-hover/group:flex items-center gap-0.5">
          <button
            onClick={() => onNewProc(group.id)}
            className="text-[10px] px-1.5 py-0.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-accent"
            title="New procedure"
          >+</button>
          <button
            onClick={() => onDeleteGroup(group.id)}
            className="text-[10px] px-1.5 py-0.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-danger"
            title="Delete group"
          >✕</button>
        </div>
      </div>
      {open && (
        <div>
          {group.procedures.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`w-full text-left px-3 py-1.5 pl-8 flex items-center gap-2 hover:bg-neutral-50 group/proc ${selectedId === p.id ? 'bg-sky-50 border-l-2 border-accent' : ''}`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400 shrink-0">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 8l3 3-3 3M13 14h4" />
              </svg>
              <span className="text-xs text-neutral-700 truncate">{p.name}</span>
              {p.status === 'deployed' && (
                <span className="text-[9px] px-1 rounded bg-ok/10 text-ok font-medium shrink-0">live</span>
              )}
            </button>
          ))}
          {group.procedures.length === 0 && (
            <div className="pl-8 py-2 text-[11px] text-neutral-400 italic">no procedures</div>
          )}
        </div>
      )}
    </div>
  );
}

function ParamsTable({
  params,
  onChange,
}: {
  params: ProcParam[];
  onChange: (params: ProcParam[]) => void;
}) {
  function update(i: number, patch: Partial<ProcParam>) {
    onChange(params.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function remove(i: number) {
    onChange(params.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...params, { name: '@param', sqlType: 'NVARCHAR(255)', direction: 'IN', defaultValue: 'NULL', testValue: '' }]);
  }

  return (
    <div className="text-[11px]">
      <div
        className="grid px-3 py-1 bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-400 border-b border-neutral-100"
        style={{ gridTemplateColumns: '1fr 1.2fr 60px 90px 90px 24px' }}
      >
        <div>Name</div><div>SQL Type</div><div>Direction</div>
        <div>Default</div><div>Test Value</div><div />
      </div>
      {params.map((p, i) => (
        <div
          key={i}
          className="grid items-center px-3 py-1 gap-2 border-b border-neutral-50 hover:bg-neutral-50/50"
          style={{ gridTemplateColumns: '1fr 1.2fr 60px 90px 90px 24px' }}
        >
          <input
            value={p.name}
            onChange={(e) => update(i, { name: e.target.value })}
            className="mono px-1.5 py-0.5 border border-neutral-200 rounded text-[11px] focus:outline-none focus:border-accent"
          />
          <select
            value={p.sqlType}
            onChange={(e) => update(i, { sqlType: e.target.value })}
            className="px-1.5 py-0.5 border border-neutral-200 rounded text-[11px] bg-white focus:outline-none focus:border-accent"
          >
            {SQL_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select
            value={p.direction}
            onChange={(e) => update(i, { direction: e.target.value as 'IN' | 'OUT' })}
            className="px-1.5 py-0.5 border border-neutral-200 rounded text-[11px] bg-white focus:outline-none focus:border-accent"
          >
            <option>IN</option><option>OUT</option>
          </select>
          <input
            value={p.defaultValue}
            onChange={(e) => update(i, { defaultValue: e.target.value })}
            placeholder="NULL"
            className="mono px-1.5 py-0.5 border border-neutral-200 rounded text-[11px] focus:outline-none focus:border-accent"
          />
          <input
            value={p.testValue}
            onChange={(e) => update(i, { testValue: e.target.value })}
            placeholder="test value"
            className="px-1.5 py-0.5 border border-neutral-200 rounded text-[11px] focus:outline-none focus:border-accent"
          />
          <button onClick={() => remove(i)} className="text-neutral-300 hover:text-danger text-xs">✕</button>
        </div>
      ))}
      {params.length === 0 && (
        <div className="px-3 py-2 text-neutral-400 italic text-[11px]">No parameters</div>
      )}
      <div className="px-3 py-1.5 border-t border-neutral-100">
        <button onClick={add} className="text-[11px] text-accent hover:underline">+ Add parameter</button>
      </div>
    </div>
  );
}

type BuilderCondition = { col: string; op: string; paramName: string };

function VisualBuilder({
  collections,
  currentSignature,
  onGenerate,
}: {
  collections: CollectionMeta[];
  currentSignature: string;
  onGenerate: (sql: string, params: ProcParam[]) => void;
}) {
  const [table, setTable] = useState('');
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [conditions, setConditions] = useState<BuilderCondition[]>([]);
  const [orderCol, setOrderCol] = useState('');
  const [orderDir, setOrderDir] = useState<'ASC' | 'DESC'>('ASC');

  const collection = collections.find((c) => c.name === table);
  const fields = collection?.schema.fields ?? [];

  function toggleCol(name: string) {
    setSelectedCols((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }

  function addCondition() {
    const col = fields[0]?.name ?? 'id';
    setConditions((prev) => [...prev, { col, op: '=', paramName: `@${col}` }]);
  }

  function updateCond(i: number, patch: Partial<BuilderCondition>) {
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function generate() {
    const cols = selectedCols.length > 0 ? selectedCols.join(', ') : '*';
    const tableName = `dbo.${collection?.name ?? 'TableName'}`;
    const sig = currentSignature || `dbo.Proc_Name`;

    const paramLines: string[] = [];
    const params: ProcParam[] = [];

    conditions.forEach((cond) => {
      if (cond.op === 'IS NULL' || cond.op === 'IS NOT NULL') return;
      const sqlType = fields.find((f) => f.name === cond.col)?.type === 'number'
        ? 'INT' : 'NVARCHAR(255)';
      paramLines.push(`  ${cond.paramName} ${sqlType} = NULL`);
      params.push({ name: cond.paramName, sqlType, direction: 'IN', defaultValue: 'NULL', testValue: '' });
    });

    const whereClause = conditions.length > 0
      ? '\n  WHERE ' + conditions.map((cond) => {
          if (cond.op === 'IS NULL') return `${cond.col} IS NULL`;
          if (cond.op === 'IS NOT NULL') return `${cond.col} IS NOT NULL`;
          const isNull = `(${cond.paramName} IS NULL OR ${cond.col} ${cond.op} ${cond.paramName})`;
          return isNull;
        }).join('\n    AND ')
      : '';

    const orderClause = orderCol ? `\n  ORDER BY ${orderCol} ${orderDir}` : '';
    const paramBlock = paramLines.length > 0 ? '\n' + paramLines.join(',\n') : '';

    const sql = `CREATE OR ALTER PROCEDURE ${sig}${paramBlock}
AS
BEGIN
  SET NOCOUNT ON;

  SELECT ${cols}
  FROM ${tableName}${whereClause}${orderClause};
END`;

    onGenerate(sql, params);
  }

  return (
    <div className="p-4 space-y-4 overflow-auto scrollbar h-full">
      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Visual Query Builder</div>

      {/* Source table */}
      <div>
        <label className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-1">Source collection / table</label>
        <select
          value={table}
          onChange={(e) => { setTable(e.target.value); setSelectedCols([]); setConditions([]); setOrderCol(''); }}
          className="w-full text-sm px-2 py-1.5 border border-neutral-200 rounded-md bg-white focus:outline-none focus:border-accent"
        >
          <option value="">Select…</option>
          {collections.map((c) => (
            <option key={c.name} value={c.name}>{c.label} ({c.name})</option>
          ))}
        </select>
      </div>

      {/* Columns */}
      {fields.length > 0 && (
        <div>
          <label className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-1">
            Columns
            <button onClick={() => setSelectedCols(fields.map((f) => f.name))} className="ml-2 text-accent text-[10px] normal-case hover:underline">all</button>
            <button onClick={() => setSelectedCols([])} className="ml-1 text-neutral-400 text-[10px] normal-case hover:underline">none</button>
          </label>
          <div className="flex flex-wrap gap-2">
            {fields.map((f) => (
              <label key={f.name} className="flex items-center gap-1 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCols.includes(f.name)}
                  onChange={() => toggleCol(f.name)}
                  className="accent-accent"
                />
                <span className="mono">{f.name}</span>
                <span className="text-neutral-400 text-[10px]">{f.type}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* WHERE conditions */}
      {fields.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] uppercase tracking-wider text-neutral-400">WHERE conditions</label>
            <button onClick={addCondition} className="text-[11px] text-accent hover:underline">+ Add</button>
          </div>
          <div className="space-y-1.5">
            {conditions.map((cond, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={cond.col}
                  onChange={(e) => updateCond(i, { col: e.target.value, paramName: `@${e.target.value}` })}
                  className="text-xs px-2 py-1 border border-neutral-200 rounded bg-white focus:outline-none focus:border-accent"
                >
                  {fields.map((f) => <option key={f.name}>{f.name}</option>)}
                </select>
                <select
                  value={cond.op}
                  onChange={(e) => updateCond(i, { op: e.target.value })}
                  className="text-xs px-2 py-1 border border-neutral-200 rounded bg-white focus:outline-none focus:border-accent"
                >
                  {WHERE_OPS.map((op) => <option key={op}>{op}</option>)}
                </select>
                {cond.op !== 'IS NULL' && cond.op !== 'IS NOT NULL' && (
                  <input
                    value={cond.paramName}
                    onChange={(e) => updateCond(i, { paramName: e.target.value })}
                    className="mono text-xs px-2 py-1 border border-neutral-200 rounded focus:outline-none focus:border-accent w-28"
                    placeholder="@param"
                  />
                )}
                <button onClick={() => setConditions((prev) => prev.filter((_, idx) => idx !== i))} className="text-neutral-300 hover:text-danger text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ORDER BY */}
      {fields.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wider text-neutral-400 shrink-0">Order by</label>
          <select
            value={orderCol}
            onChange={(e) => setOrderCol(e.target.value)}
            className="text-xs px-2 py-1 border border-neutral-200 rounded bg-white focus:outline-none focus:border-accent"
          >
            <option value="">None</option>
            {fields.map((f) => <option key={f.name}>{f.name}</option>)}
          </select>
          {orderCol && (
            <select
              value={orderDir}
              onChange={(e) => setOrderDir(e.target.value as 'ASC' | 'DESC')}
              className="text-xs px-2 py-1 border border-neutral-200 rounded bg-white focus:outline-none focus:border-accent"
            >
              <option>ASC</option><option>DESC</option>
            </select>
          )}
        </div>
      )}

      {!collection && (
        <div className="text-[11px] text-neutral-400 italic">Select a collection to configure the query.</div>
      )}

      {collection && (
        <button
          onClick={generate}
          className="mt-2 px-4 py-2 bg-ink-950 text-paper text-xs rounded-md hover:bg-neutral-800 flex items-center gap-2"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          Generate SQL →
        </button>
      )}
    </div>
  );
}

function ResultGrid({ columns, rows, error }: { columns: string[]; rows: Record<string, unknown>[]; error?: string }) {
  if (error) {
    return (
      <div className="p-3 text-xs text-danger mono bg-danger/5 h-full overflow-auto scrollbar whitespace-pre-wrap">
        {error}
      </div>
    );
  }
  if (rows.length === 0) {
    return <div className="p-3 text-xs text-neutral-400 italic">Query returned 0 rows.</div>;
  }
  return (
    <div className="overflow-auto scrollbar h-full text-[11px]">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-neutral-50">
          <tr>
            {columns.map((c) => (
              <th key={c} className="text-left px-2 py-1 border-b border-neutral-200 font-semibold text-neutral-600 mono whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-neutral-50/80">
              {columns.map((c) => (
                <td key={c} className="px-2 py-1 text-neutral-700 mono whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                  {row[c] === null || row[c] === undefined ? <span className="text-neutral-300">null</span> : String(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Inline dialogs ----
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-2xl w-96 flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
          <span className="font-semibold text-sm">{title}</span>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ---- Main component ----
export function ProceduresClient({
  initialGroups,
  collections,
  userInitials,
}: {
  initialGroups: ProcGroup[];
  collections: CollectionMeta[];
  userInitials: string;
}) {
  const [groups, setGroups] = useState<ProcGroup[]>(initialGroups);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialGroups[0]?.procedures[0]?.id ?? null
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(initialGroups.map((g) => g.id))
  );
  const [mode, setMode] = useState<'sql' | 'builder'>('sql');
  const [editorBody, setEditorBody] = useState(() => {
    const p = initialGroups.flatMap((g) => g.procedures).find((p) => p.id === initialGroups[0]?.procedures[0]?.id);
    return p?.body || buildDefaultBody('dbo.Proc_Name');
  });
  const [localParams, setLocalParams] = useState<ProcParam[]>(() => {
    const p = initialGroups.flatMap((g) => g.procedures).find((p) => p.id === initialGroups[0]?.procedures[0]?.id);
    return p?.params ?? [];
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ columns: string[]; rows: Record<string, unknown>[]; error?: string } | null>(null);
  const [paramsOpen, setParamsOpen] = useState(true);
  const [resultsOpen, setResultsOpen] = useState(false);

  // Dialogs
  const [newGroupDialog, setNewGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newProcDialog, setNewProcDialog] = useState<string | null>(null);
  const [newProcName, setNewProcName] = useState('');
  const [creating, setCreating] = useState(false);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const allProcs = groups.flatMap((g) => g.procedures);
  const selectedProc = allProcs.find((p) => p.id === selectedId) ?? null;

  // When selection changes, load body/params
  function selectProc(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    const proc = allProcs.find((p) => p.id === id);
    if (proc) {
      setEditorBody(proc.body || buildDefaultBody(proc.signature));
      setLocalParams(proc.params);
      setDirty(false);
      setRunResult(null);
    }
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  function onEditorChange(value: string | undefined) {
    setEditorBody(value ?? '');
    setDirty(true);
  }

  // Save
  async function save() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/procedures/${selectedId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: editorBody, params: localParams, status: 'saved' }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: StoredProc = await res.json();
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          procedures: g.procedures.map((p) => (p.id === selectedId ? { ...updated } : p)),
        }))
      );
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  // Run (deploy + exec)
  async function run() {
    if (!selectedId) return;
    // Auto-save first
    if (dirty) await save();
    setRunning(true);
    setResultsOpen(true);
    try {
      const testValues: Record<string, string> = {};
      localParams.forEach((p) => { testValues[p.name] = p.testValue; });
      const res = await fetch(`/api/procedures/${selectedId}/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'exec', testValues }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setRunResult({ columns: [], rows: [], error: data.error ?? 'Unknown error' });
      } else {
        setRunResult({ columns: data.columns, rows: data.rows });
        // Refresh status in groups
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            procedures: g.procedures.map((p) =>
              p.id === selectedId ? { ...p, status: 'deployed' } : p
            ),
          }))
        );
      }
    } finally {
      setRunning(false);
    }
  }

  // Update right panel fields
  async function updateField(field: 'signature' | 'boundTo', value: string | null) {
    if (!selectedId) return;
    await fetch(`/api/procedures/${selectedId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        procedures: g.procedures.map((p) =>
          p.id === selectedId ? { ...p, [field]: value } : p
        ),
      }))
    );
  }

  // Create group
  async function createGroup() {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/procedure-groups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      if (!res.ok) return;
      const created: ProcGroup = await res.json();
      setGroups((prev) => [...prev, created]);
      setOpenGroups((prev) => new Set([...prev, created.id]));
      setNewGroupDialog(false);
      setNewGroupName('');
    } finally {
      setCreating(false);
    }
  }

  // Delete group
  async function deleteGroup(groupId: string) {
    if (!confirm('Delete this group and all its procedures?')) return;
    await fetch(`/api/procedure-groups/${groupId}`, { method: 'DELETE' });
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (selectedProc?.groupId === groupId) setSelectedId(null);
  }

  // Create procedure
  async function createProc() {
    if (!newProcDialog || !newProcName.trim()) return;
    setCreating(true);
    try {
      const group = groups.find((g) => g.id === newProcDialog)!;
      const res = await fetch(`/api/procedure-groups/${newProcDialog}/procedures`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newProcName.trim() }),
      });
      if (!res.ok) return;
      const created: StoredProc = await res.json();
      setGroups((prev) =>
        prev.map((g) => g.id === newProcDialog ? { ...g, procedures: [...g.procedures, created] } : g)
      );
      selectProc(created.id);
      setNewProcDialog(null);
      setNewProcName('');
    } finally {
      setCreating(false);
    }
  }

  // Delete procedure
  async function deleteProc(id: string) {
    if (!confirm('Delete this procedure?')) return;
    await fetch(`/api/procedures/${id}`, { method: 'DELETE' });
    setGroups((prev) =>
      prev.map((g) => ({ ...g, procedures: g.procedures.filter((p) => p.id !== id) }))
    );
    if (selectedId === id) setSelectedId(null);
  }

  // Generate from builder
  function handleGenerate(sql: string, params: ProcParam[]) {
    setEditorBody(sql);
    setLocalParams(params);
    setDirty(true);
    setMode('sql');
  }

  const totalProcs = groups.reduce((n, g) => n + g.procedures.length, 0);

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <header className="h-14 border-b border-neutral-200 bg-white/60 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="display text-lg">
            <div className="flex items-center gap-2">
              <Link href="/data" className="text-neutral-400 hover:text-neutral-700">Data</Link>
              <span className="text-neutral-300">/</span>
              <span>Procedures</span>
            </div>
          </div>
          <Chip tone="neutral">{groups.length} groups</Chip>
          <Chip tone="neutral">{totalProcs} procedures</Chip>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {selectedId && (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={save}
                  disabled={saving || !dirty}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${dirty ? 'bg-accent text-white hover:bg-sky-600' : 'bg-neutral-100 text-neutral-400 cursor-default'}`}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={run}
                  disabled={running}
                  className="text-xs px-3 py-1.5 rounded-md font-medium bg-ok text-white hover:bg-green-600 flex items-center gap-1.5 disabled:opacity-60"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z" /></svg>
                  {running ? 'Running…' : 'Run'}
                </button>
              </div>
              <span className="w-px h-5 bg-neutral-200" />
            </>
          )}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-500 text-white font-medium flex items-center justify-center text-[11px]">
            {userInitials || '??'}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* ---- Left panel: group tree ---- */}
        <aside className="w-56 border-r border-neutral-200 flex flex-col overflow-hidden bg-white">
          <div className="px-3 py-2 border-b border-neutral-100 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Procedures</span>
            <button
              onClick={() => setNewGroupDialog(true)}
              className="text-[10px] text-accent hover:underline"
            >+ Group</button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar divide-y divide-neutral-100">
            {groups.length === 0 && (
              <div className="p-4 text-center text-[11px] text-neutral-400 italic">
                No groups yet. Create one to get started.
              </div>
            )}
            {groups.map((g) => (
              <GroupRow
                key={g.id}
                group={g}
                selectedId={selectedId}
                open={openGroups.has(g.id)}
                onToggle={() => toggleGroup(g.id)}
                onSelect={selectProc}
                onNewProc={(gid) => { setNewProcDialog(gid); setNewProcName(''); }}
                onDeleteGroup={deleteGroup}
              />
            ))}
          </div>
        </aside>

        {/* ---- Center: editor ---- */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="h-10 border-b border-neutral-200 px-3 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              {selectedProc ? (
                <>
                  <span className="text-xs font-semibold text-neutral-700">{selectedProc.signature}</span>
                  {statusChip(selectedProc.status)}
                  {dirty && <span className="text-[10px] text-warn">● unsaved</span>}
                </>
              ) : (
                <span className="text-xs text-neutral-400 italic">Select a procedure</span>
              )}
            </div>
            {selectedProc && (
              <div className="flex items-center rounded-md border border-neutral-200 overflow-hidden text-[11px]">
                <button
                  onClick={() => setMode('sql')}
                  className={`px-3 py-1 ${mode === 'sql' ? 'bg-neutral-100 text-neutral-800 font-medium' : 'text-neutral-500 hover:bg-neutral-50'}`}
                >SQL</button>
                <button
                  onClick={() => setMode('builder')}
                  className={`px-3 py-1 border-l border-neutral-200 ${mode === 'builder' ? 'bg-neutral-100 text-neutral-800 font-medium' : 'text-neutral-500 hover:bg-neutral-50'}`}
                >Builder</button>
              </div>
            )}
          </div>

          {/* Editor or builder */}
          {selectedProc ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className={`${mode === 'builder' ? 'hidden' : 'flex'} flex-1 overflow-hidden`}>
                <Editor
                  language="sql"
                  value={editorBody}
                  onChange={onEditorChange}
                  onMount={handleEditorMount}
                  theme="vs"
                  options={{
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2,
                    automaticLayout: true,
                    padding: { top: 12 },
                  }}
                />
              </div>
              {mode === 'builder' && (
                <div className="flex-1 overflow-hidden">
                  <VisualBuilder
                    collections={collections}
                    currentSignature={selectedProc.signature}
                    onGenerate={handleGenerate}
                  />
                </div>
              )}

              {/* Parameters panel */}
              <div className="border-t border-neutral-200 bg-white shrink-0">
                <button
                  onClick={() => setParamsOpen((v) => !v)}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-[11px] font-semibold text-neutral-500 hover:bg-neutral-50"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-neutral-400 transition-transform ${paramsOpen ? 'rotate-90' : ''}`}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  Parameters
                  <span className="text-neutral-400 font-normal">({localParams.length})</span>
                </button>
                {paramsOpen && (
                  <div className="border-t border-neutral-100 max-h-48 overflow-y-auto scrollbar">
                    <ParamsTable params={localParams} onChange={(p) => { setLocalParams(p); setDirty(true); }} />
                  </div>
                )}
              </div>

              {/* Results panel */}
              {runResult !== null && (
                <div className="border-t border-neutral-200 bg-white shrink-0">
                  <button
                    onClick={() => setResultsOpen((v) => !v)}
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-[11px] font-semibold text-neutral-500 hover:bg-neutral-50"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-neutral-400 transition-transform ${resultsOpen ? 'rotate-90' : ''}`}>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                    Results
                    {!runResult.error && <span className="text-neutral-400 font-normal">({runResult.rows.length} rows)</span>}
                    {runResult.error && <span className="text-danger font-normal">error</span>}
                  </button>
                  {resultsOpen && (
                    <div className="border-t border-neutral-100 h-48">
                      <ResultGrid columns={runResult.columns} rows={runResult.rows} error={runResult.error} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
              <div className="text-center space-y-2">
                <div className="text-3xl">⚙</div>
                <div>Select a procedure to edit, or create a new one.</div>
              </div>
            </div>
          )}
        </div>

        {/* ---- Right panel: metadata + binding ---- */}
        {selectedProc && (
          <aside className="w-64 border-l border-neutral-200 flex flex-col overflow-hidden bg-white text-xs">
            {/* Signature */}
            <div className="p-3 border-b border-neutral-100 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Signature</div>
              <input
                value={selectedProc.signature}
                onChange={(e) => {
                  setGroups((prev) =>
                    prev.map((g) => ({
                      ...g,
                      procedures: g.procedures.map((p) =>
                        p.id === selectedProc.id ? { ...p, signature: e.target.value } : p
                      ),
                    }))
                  );
                }}
                onBlur={(e) => updateField('signature', e.target.value)}
                className="w-full mono text-xs px-2 py-1.5 border border-neutral-200 rounded focus:outline-none focus:border-accent"
              />
              <div className="text-[10px] text-neutral-400">e.g. <span className="mono">dbo.Accounts_Get</span></div>
            </div>

            {/* Collection binding */}
            <div className="p-3 border-b border-neutral-100 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Collection binding</div>
              <div className="text-[11px] text-neutral-500 leading-relaxed">
                Bind this procedure as the data source for a collection, replacing the direct table query.
              </div>
              <select
                value={selectedProc.boundTo ?? ''}
                onChange={(e) => updateField('boundTo', e.target.value || null)}
                className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded bg-white focus:outline-none focus:border-accent"
              >
                <option value="">— Not bound —</option>
                {collections.map((c) => (
                  <option key={c.name} value={c.name}>{c.label}</option>
                ))}
              </select>
              {selectedProc.boundTo && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-ok">●</span>
                  <span className="text-neutral-600">Bound to <span className="mono font-medium">{selectedProc.boundTo}</span></span>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="p-3 border-b border-neutral-100 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Status</div>
              <div className="flex items-center gap-2">
                {statusChip(selectedProc.status)}
                {selectedProc.status === 'deployed' && (
                  <span className="text-[10px] text-neutral-400">Live in MSSQL</span>
                )}
              </div>
            </div>

            {/* Delete */}
            <div className="p-3 mt-auto border-t border-neutral-100">
              <button
                onClick={() => deleteProc(selectedProc.id)}
                className="w-full text-[11px] text-danger hover:bg-danger/5 px-2 py-1.5 rounded border border-danger/30 hover:border-danger/50 transition-colors"
              >
                Delete procedure
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* New group dialog */}
      {newGroupDialog && (
        <Dialog title="New procedure group" onClose={() => setNewGroupDialog(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-1">Group name</label>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Accounts"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && createGroup()}
                className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent"
              />
              <div className="text-[10px] text-neutral-400 mt-1">Procedures will be named <span className="mono">dbo.{newGroupName || 'Group'}_Get</span>, etc.</div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setNewGroupDialog(false)} className="text-sm px-3 py-1.5 text-neutral-500 hover:text-neutral-900">Cancel</button>
              <button
                onClick={createGroup}
                disabled={creating || !newGroupName.trim()}
                className="text-sm px-4 py-1.5 bg-ink-950 text-paper rounded-md disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create group'}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* New procedure dialog */}
      {newProcDialog && (
        <Dialog
          title={`New procedure in ${groups.find((g) => g.id === newProcDialog)?.name ?? ''}`}
          onClose={() => setNewProcDialog(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-1">Procedure name</label>
              <input
                value={newProcName}
                onChange={(e) => setNewProcName(e.target.value)}
                placeholder="e.g. Get, Save, Delete"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && createProc()}
                className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent"
              />
              {newProcName && (
                <div className="text-[10px] text-neutral-400 mt-1">
                  Signature: <span className="mono">dbo.{groups.find((g) => g.id === newProcDialog)?.name}_{newProcName}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setNewProcDialog(null)} className="text-sm px-3 py-1.5 text-neutral-500 hover:text-neutral-900">Cancel</button>
              <button
                onClick={createProc}
                disabled={creating || !newProcName.trim()}
                className="text-sm px-4 py-1.5 bg-ink-950 text-paper rounded-md disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create procedure'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}
