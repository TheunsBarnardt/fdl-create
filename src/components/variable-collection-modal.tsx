'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { VariableCollection } from '@/lib/variable-types';

interface VariableCollectionModalProps {
  open: boolean;
  collection: VariableCollection | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

export function VariableCollectionModal({
  open,
  collection,
  onClose,
  onSave,
}: VariableCollectionModalProps) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setLabel(collection.label);
      setMode(collection.mode as 'single' | 'multi');
    } else {
      setName('');
      setLabel('');
      setMode('single');
    }
    setError(null);
  }, [collection, open]);

  const handleSubmit = async () => {
    if (!label.trim()) {
      setError('Label is required');
      return;
    }

    setSaving(true);
    try {
      if (collection) {
        onSave({ label, mode });
      } else {
        if (!name.trim()) {
          setError('Name is required');
          return;
        }
        onSave({ name, label, mode });
      }
    } finally {
      setSaving(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-lg space-y-4">
        <h2 className="text-lg font-semibold">
          {collection ? 'Edit collection' : 'New collection'}
        </h2>

        {!collection && (
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              placeholder="colors, typography, spacing"
              className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent"
              disabled={!!collection}
            />
            <p className="text-[10px] text-neutral-400 mt-1">Lowercase, underscores only</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Colors, Typography, Spacing"
            className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('single')}
              className={cn(
                'flex-1 px-3 py-2 rounded-md border transition-colors text-sm',
                mode === 'single'
                  ? 'bg-accent text-white border-accent'
                  : 'border-neutral-200 hover:border-accent'
              )}
            >
              Single
            </button>
            <button
              onClick={() => setMode('multi')}
              className={cn(
                'flex-1 px-3 py-2 rounded-md border transition-colors text-sm',
                mode === 'multi'
                  ? 'bg-accent text-white border-accent'
                  : 'border-neutral-200 hover:border-accent'
              )}
            >
              Light/Dark
            </button>
          </div>
          <p className="text-[10px] text-neutral-400 mt-2">
            {mode === 'single'
              ? 'Single value per variable'
              : 'Different values for light and dark mode'}
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 justify-end pt-4 border-t border-neutral-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !label.trim() || (!collection && !name.trim())}
            className="px-4 py-2 text-sm bg-accent text-white rounded-md disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
