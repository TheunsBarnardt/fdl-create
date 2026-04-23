'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Variable, VariableCollection, VariableType } from '@/lib/variable-types';

interface VariableEditorModalProps {
  open: boolean;
  collection: VariableCollection;
  variable: Variable | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

function hslToHex(hsl: string): string {
  try {
    const parts = hsl.trim().split(/\s+/);
    const h = parseFloat(parts[0] || '0');
    const s = parseFloat(parts[1] || '0');
    const l = parseFloat(parts[2] || '0');
    if (isNaN(h) || isNaN(s) || isNaN(l)) return '#000000';
    const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l / 100 - c / 2;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
    else if (h >= 60 && h < 120) [r, g, b] = [x, c, 0];
    else if (h >= 120 && h < 180) [r, g, b] = [0, c, x];
    else if (h >= 180 && h < 240) [r, g, b] = [0, x, c];
    else if (h >= 240 && h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const toHex = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return '#000000';
  }
}

function hexToHsl(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch {
    return '0 0% 0%';
  }
}

export function VariableEditorModal({
  open,
  collection,
  variable,
  onClose,
  onSave,
}: VariableEditorModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<VariableType>('color');
  const [lightValue, setLightValue] = useState('');
  const [darkValue, setDarkValue] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (variable) {
      setName(variable.name);
      setType(variable.type as VariableType);
      setDescription(variable.description || '');
      if (typeof variable.value === 'string') {
        setLightValue(variable.value);
        setDarkValue('');
      } else {
        setLightValue(variable.value.light || '');
        setDarkValue(variable.value.dark || '');
      }
    } else {
      setName('');
      setType('color');
      setLightValue('');
      setDarkValue('');
      setDescription('');
    }
    setError(null);
  }, [variable, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!lightValue.trim()) {
      setError('Value is required');
      return;
    }

    setSaving(true);
    try {
      const value =
        collection.mode === 'multi' && darkValue.trim()
          ? { light: lightValue.trim(), dark: darkValue.trim() }
          : lightValue.trim();

      onSave({
        name: name.trim().toLowerCase().replace(/\s+/g, '/'),
        type,
        value,
        description: description.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">
          {variable ? 'Edit variable' : 'New variable'}
        </h2>

        {!variable && (
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., colors/primary/base"
              className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm"
            />
            <p className="text-[10px] text-neutral-400 mt-1">Use slashes for grouping (colors/primary/base)</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as VariableType)}
            className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm"
          >
            <option value="color">Color</option>
            <option value="number">Number</option>
            <option value="string">String</option>
            <option value="boolean">Boolean</option>
            <option value="dimension">Dimension</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {collection.mode === 'multi' ? 'Light value' : 'Value'}
          </label>
          {type === 'color' ? (
            <div className="flex gap-2">
              <input
                type="color"
                value={hslToHex(lightValue)}
                onChange={(e) => setLightValue(hexToHsl(e.target.value))}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={lightValue}
                onChange={(e) => setLightValue(e.target.value)}
                placeholder="#FF0000 or H S% L%"
                className="flex-1 px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm"
              />
            </div>
          ) : type === 'boolean' ? (
            <select
              value={lightValue}
              onChange={(e) => setLightValue(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm"
            >
              <option value="">Select value</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          ) : (
            <input
              type={type === 'number' ? 'number' : 'text'}
              value={lightValue}
              onChange={(e) => setLightValue(e.target.value)}
              placeholder="Enter value"
              className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm"
            />
          )}
        </div>

        {collection.mode === 'multi' && (
          <div>
            <label className="block text-sm font-medium mb-1">Dark value</label>
            {type === 'color' ? (
              <div className="flex gap-2">
                <input
                  type="color"
                  value={hslToHex(darkValue)}
                  onChange={(e) => setDarkValue(hexToHsl(e.target.value))}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={darkValue}
                  onChange={(e) => setDarkValue(e.target.value)}
                  placeholder="#000000 or H S% L%"
                  className="flex-1 px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm"
                />
              </div>
            ) : type === 'boolean' ? (
              <select
                value={darkValue}
                onChange={(e) => setDarkValue(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm"
              >
                <option value="">Select value</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : (
              <input
                type={type === 'number' ? 'number' : 'text'}
                value={darkValue}
                onChange={(e) => setDarkValue(e.target.value)}
                placeholder="Enter value"
                className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm"
              />
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm"
            rows={2}
          />
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
            disabled={saving || !name.trim() || !lightValue.trim()}
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
