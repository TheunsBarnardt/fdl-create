'use client';

import { useState } from 'react';
import { Page } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface NavItemFormProps {
  navigationId: string;
  editingItem?: any | null;
  pages: Pick<Page, 'id' | 'slug' | 'title'>[];
  onClose: () => void;
  onSaved: () => void;
}

export function NavItemForm({
  navigationId,
  editingItem,
  pages,
  onClose,
  onSaved
}: NavItemFormProps) {
  const [label, setLabel] = useState(editingItem?.label || '');
  const [linkType, setLinkType] = useState<'page' | 'url'>(
    editingItem?.pageId ? 'page' : 'url'
  );
  const [pageId, setPageId] = useState(editingItem?.pageId || '');
  const [customUrl, setCustomUrl] = useState(editingItem?.customUrl || '');
  const [openInNewTab, setOpenInNewTab] = useState(editingItem?.openInNewTab || false);
  const [navType, setNavType] = useState(editingItem?.navType || 'flat');
  const [columns, setColumns] = useState(editingItem?.columns || 2);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isRootItem = !editingItem?.parentId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        label,
        navType: isRootItem ? navType : 'flat',
        pageId: linkType === 'page' ? pageId : null,
        customUrl: linkType === 'url' ? customUrl : null,
        openInNewTab,
        ...(navType === 'mega' && { columns: parseInt(columns as any) || 2 }),
        navigationId,
        ...(editingItem && { parentId: editingItem.parentId }),
      };

      const method = editingItem ? 'PATCH' : 'POST';
      const url = editingItem
        ? `/api/nav/items/${editingItem.id}`
        : '/api/nav/items';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error?.message || 'Failed to save');
        return;
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">
            {editingItem ? 'Edit Nav Item' : 'Add Nav Item'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
              {error}
            </div>
          )}

          {/* Label */}
          <div>
            <label className="text-sm font-medium block mb-1">Label</label>
            <Input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Home, Products"
              required
            />
          </div>

          {/* Link Type */}
          <div>
            <label className="text-sm font-medium block mb-2">Link Type</label>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={linkType === 'page'}
                  onChange={() => setLinkType('page')}
                />
                Internal Page
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={linkType === 'url'}
                  onChange={() => setLinkType('url')}
                />
                Custom URL
              </label>
            </div>
          </div>

          {/* Page Selector or URL Input */}
          {linkType === 'page' ? (
            <div>
              <label className="text-sm font-medium block mb-1">Page</label>
              <select
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
                required
              >
                <option value="">Select a page...</option>
                {pages.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.slug})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium block mb-1">URL</label>
              <Input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com"
                required
              />
            </div>
          )}

          {/* Open in New Tab */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
            />
            Open in new tab
          </label>

          {/* Nav Type (root items only) */}
          {isRootItem && (
            <div>
              <label className="text-sm font-medium block mb-1">Nav Type</label>
              <select
                value={navType}
                onChange={(e) => setNavType(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
              >
                <option value="flat">Flat</option>
                <option value="dropdown">Dropdown</option>
                <option value="mega">Mega Nav</option>
              </select>
            </div>
          )}

          {/* Mega Nav Columns */}
          {navType === 'mega' && isRootItem && (
            <div>
              <label className="text-sm font-medium block mb-1">Columns</label>
              <input
                type="number"
                min="2"
                max="4"
                value={columns}
                onChange={(e) => setColumns(parseInt(e.target.value) || 2)}
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
