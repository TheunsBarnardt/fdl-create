'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Trash2, ChevronRight, Upload, Copy, FolderPlus, Pencil, X, Check, FileText, File as FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmationDialog } from './ui/confirmation-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  children: Category[];
};

type Document = {
  id: string;
  categoryId: string | null;
  name: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  description: string | null;
  order: number;
  createdAt: string;
  category: Category | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeLabel(mime: string): string {
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('word') || mime.includes('msword')) return 'DOC';
  if (mime.includes('sheet') || mime.includes('excel')) return 'XLS';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'PPT';
  if (mime.includes('text')) return 'TXT';
  if (mime.includes('zip') || mime.includes('compressed')) return 'ZIP';
  if (mime.includes('json')) return 'JSON';
  if (mime.includes('csv')) return 'CSV';
  const sub = mime.split('/')[1] ?? '';
  return (sub.split(/[.+]/).pop() ?? 'FILE').toUpperCase().slice(0, 4);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>,
    document.body
  );
}

// ─── Category modal ───────────────────────────────────────────────────────────

function CategoryModal({
  cat,
  categories,
  onClose,
  onSave,
}: {
  cat: Category | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(cat?.name ?? '');
  const [slug, setSlug] = useState(cat?.slug ?? '');
  const [parentId, setParentId] = useState<string>(cat?.parentId ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const slugEdited = useRef(!!cat);
  useEffect(() => {
    if (!slugEdited.current) setSlug(slugify(name));
  }, [name]);

  async function submit() {
    if (!name.trim() || !slug.trim()) { setErr('Name and slug required'); return; }
    setSaving(true);
    try {
      if (cat) {
        await fetch(`/api/document-categories/${cat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), parentId: parentId || null }),
        });
      } else {
        await fetch('/api/document-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), slug: slug.trim(), parentId: parentId || null }),
        });
      }
      onSave();
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  const allFlat = flattenCats(categories);

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-lg p-6 w-96 shadow-lg space-y-4">
        <h2 className="text-lg font-semibold">{cat ? 'Edit category' : 'New category'}</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Category"
            className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-accent"
          />
        </div>

        {!cat && (
          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input
              value={slug}
              onChange={(e) => { slugEdited.current = true; setSlug(e.target.value); }}
              placeholder="my-category"
              className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-accent font-mono"
            />
            <p className="text-[10px] text-neutral-400 mt-1">Lowercase, hyphens only</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Parent category</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-accent"
          >
            <option value="">None (top level)</option>
            {allFlat
              .filter((c) => c.id !== cat?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="flex gap-2 justify-end pt-2 border-t border-neutral-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-md">Cancel</button>
          <button
            onClick={submit}
            disabled={saving || !name.trim() || !slug.trim()}
            className="px-4 py-2 text-sm bg-accent text-white rounded-md disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function flattenCats(cats: Category[], depth = 0): (Category & { depth: number })[] {
  return cats.flatMap((c) => [{ ...c, depth }, ...flattenCats(c.children, depth + 1)]);
}

// ─── Upload modal ─────────────────────────────────────────────────────────────

function UploadModal({
  categories,
  defaultCategoryId,
  onClose,
  onSave,
}: {
  categories: Category[];
  defaultCategoryId: string | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [categoryId, setCategoryId] = useState<string>(defaultCategoryId ?? '');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((f) => [...f, ...dropped]);
  }

  async function upload() {
    if (!files.length) return;
    setUploading(true);
    setProgress(0);
    try {
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append('file', files[i]);
        if (categoryId) fd.append('categoryId', categoryId);
        await fetch('/api/documents', { method: 'POST', body: fd });
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      onSave();
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setUploading(false);
    }
  }

  const allFlat = flattenCats(categories);

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-lg p-6 w-[480px] shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">Upload documents</h2>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            dragging ? 'border-accent bg-accent/5' : 'border-neutral-200 hover:border-neutral-400'
          )}
        >
          <Upload className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
          <p className="text-sm text-neutral-500">Drop files here or click to browse</p>
          <p className="text-[11px] text-neutral-400 mt-1">PDF, Word, Excel, text — any format</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])])}
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-1 max-h-40 overflow-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm px-2 py-1 rounded bg-neutral-50">
                <span className="truncate text-neutral-700">{f.name}</span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[11px] text-neutral-400">{fmtSize(f.size)}</span>
                  <button
                    onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                    className="text-neutral-400 hover:text-destructive"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-accent"
          >
            <option value="">Uncategorized</option>
            {allFlat.map((c) => (
              <option key={c.id} value={c.id}>
                {'  '.repeat(c.depth)}{c.name}
              </option>
            ))}
          </select>
        </div>

        {uploading && (
          <div className="w-full bg-neutral-100 rounded-full h-1.5">
            <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="flex gap-2 justify-end pt-2 border-t border-neutral-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-md">Cancel</button>
          <button
            onClick={upload}
            disabled={uploading || !files.length}
            className="px-4 py-2 text-sm bg-accent text-white rounded-md disabled:opacity-60 flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? `Uploading… ${progress}%` : `Upload ${files.length || ''} file${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Category tree node ───────────────────────────────────────────────────────

function CatNode({
  cat,
  active,
  onSelect,
  onEdit,
  onDelete,
}: {
  cat: Category;
  active: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = cat.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm',
          active === cat.id ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
        )}
        onClick={() => onSelect(cat.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
            className="shrink-0"
          >
            <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="flex-1 truncate">{cat.name}</span>
        <div className={cn('hidden gap-0.5', active === cat.id ? 'group-hover:flex' : 'group-hover:flex')}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(cat); }}
            className={cn('p-0.5 rounded', active === cat.id ? 'hover:bg-white/20' : 'hover:bg-neutral-200')}
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(cat); }}
            className={cn('p-0.5 rounded', active === cat.id ? 'hover:bg-white/20 text-red-300' : 'hover:bg-neutral-200 text-destructive')}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {hasChildren && open && (
        <div className="ml-3 pl-2 border-l border-neutral-100">
          {cat.children.map((child) => (
            <CatNode key={child.id} cat={child} active={active} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Document row ─────────────────────────────────────────────────────────────

function DocRow({ doc, selected, onClick }: { doc: Document; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-left transition-all',
        selected ? 'border-accent bg-accent/5' : 'border-neutral-200 hover:border-neutral-300 bg-white'
      )}
    >
      <div className="w-10 h-10 shrink-0 rounded bg-neutral-50 border border-neutral-100 flex items-center justify-center">
        <span className="text-[9px] font-semibold text-neutral-500 tracking-wider">{mimeLabel(doc.mimeType)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-800 truncate">{doc.name}</p>
        <p className="text-[11px] text-neutral-400 truncate">
          {fmtSize(doc.size)}
          {doc.description ? <span className="ml-2">· {doc.description}</span> : null}
        </p>
      </div>
    </button>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function DocumentsPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [selDoc, setSelDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [catModal, setCatModal] = useState<'new' | Category | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const [deleteDocConfirm, setDeleteDocConfirm] = useState<Document | null>(null);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCat, setEditCat] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadCategories = useCallback(async () => {
    const r = await fetch('/api/document-categories');
    if (!r.ok) { setErr('Failed to load categories'); return; }
    const data = await r.json();
    setCategories(Array.isArray(data) ? data : []);
  }, []);

  const loadDocuments = useCallback(async () => {
    const url = activeCat ? `/api/documents?categoryId=${activeCat}` : '/api/documents';
    const r = await fetch(url);
    if (!r.ok) { setErr('Failed to load documents'); return; }
    const data = await r.json();
    setDocuments(Array.isArray(data) ? data : []);
  }, [activeCat]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCategories(), loadDocuments()]).finally(() => setLoading(false));
  }, [loadCategories, loadDocuments]);

  useEffect(() => {
    if (selDoc) {
      setEditName(selDoc.name);
      setEditDesc(selDoc.description ?? '');
      setEditCat(selDoc.categoryId ?? '');
    }
  }, [selDoc]);

  async function handleDeleteCategory() {
    if (!deleteCategoryConfirm) return;
    setDeleting(true);
    try {
      await fetch(`/api/document-categories/${deleteCategoryConfirm.id}`, { method: 'DELETE' });
      setActiveCat(null);
      setDeleteCategoryConfirm(null);
      await loadCategories();
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteDoc() {
    if (!deleteDocConfirm) return;
    setDeleting(true);
    try {
      await fetch(`/api/documents/${deleteDocConfirm.id}`, { method: 'DELETE' });
      setSelDoc(null);
      setDeleteDocConfirm(null);
      await loadDocuments();
    } finally {
      setDeleting(false);
    }
  }

  async function saveDoc() {
    if (!selDoc) return;
    setSaving(true);
    await fetch(`/api/documents/${selDoc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName,
        description: editDesc,
        categoryId: editCat || null,
      }),
    });
    setSaving(false);
    await loadDocuments();
    setSelDoc((d) => d ? { ...d, name: editName, description: editDesc, categoryId: editCat || null } : null);
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(window.location.origin + url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const allFlat = flattenCats(categories);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-neutral-200 bg-white/60 backdrop-blur px-6 flex items-center gap-3">
        <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-900">Workspace</Link>
        <span className="text-xs text-neutral-300">›</span>
        <span className="display text-lg">Documents</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: categories ── */}
        <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white flex flex-col overflow-hidden">
          <div className="p-3 border-b border-neutral-200 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">Categories</span>
            <button
              onClick={() => setCatModal('new')}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900"
              title="New category"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2 space-y-0.5">
            <button
              onClick={() => { setActiveCat(null); setSelDoc(null); }}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2',
                activeCat === null ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
              )}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              All documents
            </button>

            {categories.map((cat) => (
              <CatNode
                key={cat.id}
                cat={cat}
                active={activeCat}
                onSelect={(id) => { setActiveCat(id); setSelDoc(null); }}
                onEdit={(c) => setCatModal(c)}
                onDelete={(c) => setDeleteCategoryConfirm(c)}
              />
            ))}
          </div>
        </aside>

        {/* ── Center: document list ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between shrink-0">
            <p className="text-sm text-neutral-500">
              {loading ? 'Loading…' : `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
              {activeCat && categories.length > 0 && (() => {
                const cat = allFlat.find((c) => c.id === activeCat);
                return cat ? <span className="ml-1 text-neutral-400">in <strong className="text-neutral-700">{cat.name}</strong></span> : null;
              })()}
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-800 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {err && <p className="text-sm text-destructive mb-4">{err}</p>}
            {!loading && documents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <FileIcon className="w-12 h-12 text-neutral-200 mb-3" />
                <p className="text-sm text-neutral-500">No documents yet</p>
                <p className="text-[11px] text-neutral-400 mb-4">Upload PDFs, Word docs, and more to get started</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-800"
                >
                  Upload files
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-w-3xl">
                {documents.map((d) => (
                  <DocRow
                    key={d.id}
                    doc={d}
                    selected={selDoc?.id === d.id}
                    onClick={() => setSelDoc((prev) => prev?.id === d.id ? null : d)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* ── Right: inspector ── */}
        {selDoc && (
          <aside className="w-72 shrink-0 border-l border-neutral-200 bg-white overflow-auto flex flex-col">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">Document details</p>
              <button onClick={() => setSelDoc(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mx-4 mt-4 rounded-lg border border-neutral-100 bg-neutral-50 aspect-video flex flex-col items-center justify-center gap-2">
              <FileIcon className="w-10 h-10 text-neutral-300" />
              <span className="text-[11px] font-semibold text-neutral-500 tracking-wider">{mimeLabel(selDoc.mimeType)}</span>
              <a
                href={selDoc.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-accent hover:underline"
              >
                Open file
              </a>
            </div>

            <div className="p-4 space-y-4 flex-1">
              {/* URL copy */}
              <div className="flex items-center gap-2 bg-neutral-50 rounded-md px-3 py-2">
                <code className="text-[11px] text-neutral-600 flex-1 truncate">{selDoc.url}</code>
                <button onClick={() => copyUrl(selDoc.url)} className="shrink-0 text-neutral-400 hover:text-neutral-900">
                  {copied ? <Check className="w-3.5 h-3.5 text-ok" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="text-[11px] text-neutral-400 space-y-0.5">
                <div className="flex justify-between"><span>Type</span><span className="text-neutral-600">{selDoc.mimeType}</span></div>
                <div className="flex justify-between"><span>Size</span><span className="text-neutral-600">{fmtSize(selDoc.size)}</span></div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Short summary of this document…"
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={editCat}
                  onChange={(e) => setEditCat(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-accent"
                >
                  <option value="">Uncategorized</option>
                  {allFlat.map((c) => (
                    <option key={c.id} value={c.id}>{'  '.repeat(c.depth)}{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-100 flex gap-2">
              <button
                onClick={() => setDeleteDocConfirm(selDoc)}
                className="flex-1 px-3 py-2 text-sm text-destructive border border-destructive/30 rounded-md hover:bg-destructive/5 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                onClick={saveDoc}
                disabled={saving}
                className="flex-1 px-3 py-2 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-800 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Modals */}
      {catModal && (
        <CategoryModal
          cat={catModal === 'new' ? null : catModal}
          categories={categories}
          onClose={() => setCatModal(null)}
          onSave={loadCategories}
        />
      )}
      {showUpload && (
        <UploadModal
          categories={categories}
          defaultCategoryId={activeCat}
          onClose={() => setShowUpload(false)}
          onSave={loadDocuments}
        />
      )}

      {/* Delete Confirmations */}
      <ConfirmationDialog
        isOpen={!!deleteDocConfirm}
        onClose={() => setDeleteDocConfirm(null)}
        onConfirm={handleDeleteDoc}
        title="Delete document"
        description={`Are you sure you want to delete "${deleteDocConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isDangerous
        isLoading={deleting}
      />
      <ConfirmationDialog
        isOpen={!!deleteCategoryConfirm}
        onClose={() => setDeleteCategoryConfirm(null)}
        onConfirm={handleDeleteCategory}
        title="Delete category"
        description={`Are you sure you want to delete "${deleteCategoryConfirm?.name}"? Documents in this category will become uncategorized. This action cannot be undone.`}
        confirmText="Delete"
        isDangerous
        isLoading={deleting}
      />
    </div>
  );
}
