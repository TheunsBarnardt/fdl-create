'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Plus, Trash2, ChevronRight, Upload, Copy, FolderPlus, Pencil, X, Check, Image as ImageIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmationDialog } from './ui/confirmation-dialog';
import { FocalPointPicker } from './ui/focal-point-picker';
import { ScreenHeader, Chip } from './screen-header';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  children: Category[];
};

type Asset = {
  id: string;
  categoryId: string | null;
  name: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  focalX: number;
  focalY: number;
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

function isImage(mimeType: string) {
  return mimeType.startsWith('image/');
}

function isSvg(mimeType: string) {
  return mimeType === 'image/svg+xml';
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
        await fetch(`/api/asset-categories/${cat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), parentId: parentId || null }),
        });
      } else {
        await fetch('/api/asset-categories', {
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
        await fetch('/api/assets', { method: 'POST', body: fd });
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
        <h2 className="text-lg font-semibold">Upload assets</h2>

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
          <p className="text-[11px] text-neutral-400 mt-1">Images, SVGs, icons — any format</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,image/svg+xml"
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

// ─── Asset thumbnail ──────────────────────────────────────────────────────────

function AssetThumb({ asset, selected, onClick }: { asset: Asset; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative rounded-lg border-2 overflow-hidden text-left transition-all',
        selected ? 'border-accent' : 'border-transparent hover:border-neutral-300'
      )}
    >
      <div className="aspect-square bg-neutral-50 flex items-center justify-center overflow-hidden">
        {isImage(asset.mimeType) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt={asset.alt ?? asset.name} className="w-full h-full object-contain" />
        ) : (
          <FileText className="w-8 h-8 text-neutral-300" />
        )}
      </div>
      <div className="p-1.5 bg-white border-t border-neutral-100">
        <p className="text-[11px] text-neutral-700 truncate">{asset.name}</p>
        <p className="text-[10px] text-neutral-400">{fmtSize(asset.size)}</p>
      </div>
    </button>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AssetsPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [selAsset, setSelAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [catModal, setCatModal] = useState<'new' | Category | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // delete confirmations
  const [deleteAssetConfirm, setDeleteAssetConfirm] = useState<Asset | null>(null);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  // inspector edits
  const [editName, setEditName] = useState('');
  const [editAlt, setEditAlt] = useState('');
  const [editCat, setEditCat] = useState('');
  const [editFocalX, setEditFocalX] = useState(50);
  const [editFocalY, setEditFocalY] = useState(50);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadCategories = useCallback(async () => {
    const r = await fetch('/api/asset-categories');
    if (!r.ok) { setErr('Failed to load categories'); return; }
    const data = await r.json();
    setCategories(Array.isArray(data) ? data : []);
  }, []);

  const loadAssets = useCallback(async () => {
    const url = activeCat ? `/api/assets?categoryId=${activeCat}` : '/api/assets';
    const r = await fetch(url);
    if (!r.ok) { setErr('Failed to load assets'); return; }
    const data = await r.json();
    setAssets(Array.isArray(data) ? data : []);
  }, [activeCat]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCategories(), loadAssets()]).finally(() => setLoading(false));
  }, [loadCategories, loadAssets]);

  useEffect(() => {
    if (selAsset) {
      setEditName(selAsset.name);
      setEditAlt(selAsset.alt ?? '');
      setEditCat(selAsset.categoryId ?? '');
      setEditFocalX(selAsset.focalX ?? 50);
      setEditFocalY(selAsset.focalY ?? 50);
    }
  }, [selAsset]);

  async function handleDeleteCategory() {
    if (!deleteCategoryConfirm) return;
    setDeleting(true);
    try {
      await fetch(`/api/asset-categories/${deleteCategoryConfirm.id}`, { method: 'DELETE' });
      setActiveCat(null);
      setDeleteCategoryConfirm(null);
      await loadCategories();
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAsset() {
    if (!deleteAssetConfirm) return;
    setDeleting(true);
    try {
      await fetch(`/api/assets/${deleteAssetConfirm.id}`, { method: 'DELETE' });
      setSelAsset(null);
      setDeleteAssetConfirm(null);
      await loadAssets();
    } finally {
      setDeleting(false);
    }
  }

  async function saveAsset() {
    if (!selAsset) return;
    setSaving(true);
    await fetch(`/api/assets/${selAsset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName,
        alt: editAlt,
        categoryId: editCat || null,
        focalX: editFocalX,
        focalY: editFocalY,
      }),
    });
    setSaving(false);
    await loadAssets();
    setSelAsset((a) => a ? { ...a, name: editName, alt: editAlt, categoryId: editCat || null, focalX: editFocalX, focalY: editFocalY } : null);
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(window.location.origin + url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const allFlat = flattenCats(categories);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <ScreenHeader
        title="Assets"
        chips={<Chip tone="accent">{assets.length} asset{assets.length === 1 ? '' : 's'}</Chip>}
      />


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
              onClick={() => { setActiveCat(null); setSelAsset(null); }}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2',
                activeCat === null ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
              )}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              All assets
            </button>

            {categories.map((cat) => (
              <CatNode
                key={cat.id}
                cat={cat}
                active={activeCat}
                onSelect={(id) => { setActiveCat(id); setSelAsset(null); }}
                onEdit={(c) => setCatModal(c)}
                onDelete={(c) => setDeleteCategoryConfirm(c)}
              />
            ))}
          </div>
        </aside>

        {/* ── Center: asset grid ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between shrink-0">
            <p className="text-sm text-neutral-500">
              {loading ? 'Loading…' : `${assets.length} asset${assets.length !== 1 ? 's' : ''}`}
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
            {!loading && assets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <ImageIcon className="w-12 h-12 text-neutral-200 mb-3" />
                <p className="text-sm text-neutral-500">No assets yet</p>
                <p className="text-[11px] text-neutral-400 mb-4">Upload images and icons to get started</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-800"
                >
                  Upload files
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
                {assets.map((a) => (
                  <AssetThumb
                    key={a.id}
                    asset={a}
                    selected={selAsset?.id === a.id}
                    onClick={() => setSelAsset((prev) => prev?.id === a.id ? null : a)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* ── Right: inspector ── */}
        {selAsset && (
          <aside className="w-72 shrink-0 border-l border-neutral-200 bg-white overflow-auto flex flex-col">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-neutral-400">Asset details</p>
              <button onClick={() => setSelAsset(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview with focal point picker for raster images */}
            {isImage(selAsset.mimeType) && !isSvg(selAsset.mimeType) ? (
              <div className="mx-4 mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">Focal point</p>
                  <button
                    onClick={() => { setEditFocalX(50); setEditFocalY(50); }}
                    className="text-[10px] text-neutral-400 hover:text-neutral-900"
                  >
                    Reset
                  </button>
                </div>
                <FocalPointPicker
                  src={selAsset.url}
                  alt={selAsset.alt ?? selAsset.name}
                  focalX={editFocalX}
                  focalY={editFocalY}
                  onChange={(x, y) => { setEditFocalX(x); setEditFocalY(y); }}
                  className="aspect-video"
                />
                <p className="text-[10px] text-neutral-400">
                  Click or drag to set focus — {editFocalX.toFixed(1)}%, {editFocalY.toFixed(1)}%
                </p>

                {/* Focal point preview in cropped contexts */}
                <div className="pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5">Crop preview</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="aspect-square rounded border border-neutral-200 bg-neutral-50 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selAsset.url}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${editFocalX}% ${editFocalY}%` }}
                      />
                    </div>
                    <div className="aspect-[3/4] rounded border border-neutral-200 bg-neutral-50 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selAsset.url}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${editFocalX}% ${editFocalY}%` }}
                      />
                    </div>
                    <div className="aspect-[4/3] rounded border border-neutral-200 bg-neutral-50 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selAsset.url}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${editFocalX}% ${editFocalY}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-4 mt-4 rounded-lg border border-neutral-100 bg-neutral-50 aspect-video flex items-center justify-center overflow-hidden">
                {isImage(selAsset.mimeType) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selAsset.url} alt={selAsset.alt ?? selAsset.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <FileText className="w-12 h-12 text-neutral-300" />
                )}
              </div>
            )}

            <div className="p-4 space-y-4 flex-1">
              {/* URL copy */}
              <div className="flex items-center gap-2 bg-neutral-50 rounded-md px-3 py-2">
                <code className="text-[11px] text-neutral-600 flex-1 truncate">{selAsset.url}</code>
                <button onClick={() => copyUrl(selAsset.url)} className="shrink-0 text-neutral-400 hover:text-neutral-900">
                  {copied ? <Check className="w-3.5 h-3.5 text-ok" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="text-[11px] text-neutral-400 space-y-0.5">
                <div className="flex justify-between"><span>Type</span><span className="text-neutral-600">{selAsset.mimeType}</span></div>
                <div className="flex justify-between"><span>Size</span><span className="text-neutral-600">{fmtSize(selAsset.size)}</span></div>
                {selAsset.width && <div className="flex justify-between"><span>Dimensions</span><span className="text-neutral-600">{selAsset.width}×{selAsset.height}px</span></div>}
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
                <label className="block text-sm font-medium mb-1">Alt text</label>
                <input
                  value={editAlt}
                  onChange={(e) => setEditAlt(e.target.value)}
                  placeholder="Describe the image…"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-accent"
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
                onClick={() => setDeleteAssetConfirm(selAsset)}
                className="flex-1 px-3 py-2 text-sm text-destructive border border-destructive/30 rounded-md hover:bg-destructive/5 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                onClick={saveAsset}
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
          onSave={loadAssets}
        />
      )}

      {/* Delete Confirmations */}
      <ConfirmationDialog
        isOpen={!!deleteAssetConfirm}
        onClose={() => setDeleteAssetConfirm(null)}
        onConfirm={handleDeleteAsset}
        title="Delete asset"
        description={`Are you sure you want to delete "${deleteAssetConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isDangerous
        isLoading={deleting}
      />
      <ConfirmationDialog
        isOpen={!!deleteCategoryConfirm}
        onClose={() => setDeleteCategoryConfirm(null)}
        onConfirm={handleDeleteCategory}
        title="Delete category"
        description={`Are you sure you want to delete "${deleteCategoryConfirm?.name}"? Assets in this category will become uncategorized. This action cannot be undone.`}
        confirmText="Delete"
        isDangerous
        isLoading={deleting}
      />
    </div>
  );
}
