'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const SCOPE_GROUPS: Array<{ resource: string; readScope: string; writeScope: string }> = [
  { resource: 'Collections', readScope: 'read:collections', writeScope: 'write:collections' },
  { resource: 'Records',     readScope: 'read:records',     writeScope: 'write:records' },
  { resource: 'Pages',       readScope: 'read:pages',       writeScope: 'write:pages' },
  { resource: 'Blocks',      readScope: 'read:blocks',      writeScope: 'write:blocks' },
  { resource: 'Themes',      readScope: 'read:themes',      writeScope: 'write:themes' }
];

const EXPIRY_OPTIONS: Array<{ label: string; days: number | null }> = [
  { label: '24 hours', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'No expiry', days: null }
];

export function NewTokenModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read:collections', 'read:records']);
  const [expiryDays, setExpiryDays] = useState<number | null>(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggle(scope: string) {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (!name.trim()) throw new Error('Name is required');
      if (scopes.length === 0) throw new Error('At least one scope is required');
      const res = await fetch('/api/v1/tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), scopes, expiresInDays: expiryDays })
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(typeof e.error === 'string' ? e.error : JSON.stringify(e.error));
      }
      const { token } = await res.json();
      setCreatedToken(token);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setName('');
    setScopes(['read:collections', 'read:records']);
    setExpiryDays(30);
    setCreatedToken(null);
    setError(null);
    setCopied(false);
    onClose();
  }

  async function copyToken() {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <div className="display text-xl">{createdToken ? 'Token created' : 'New API token'}</div>
            <div className="text-[12px] text-neutral-500">
              {createdToken
                ? 'Copy now — this is the only time the full token is shown.'
                : 'Personal access token. Use in Authorization: Bearer header.'}
            </div>
          </div>
          <button onClick={handleClose} className="text-neutral-400 hover:text-neutral-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdToken ? (
          <div className="p-5 space-y-4">
            <div className="mono text-[12px] break-all bg-neutral-50 border border-neutral-200 rounded-md p-3">
              {createdToken}
            </div>
            <button
              onClick={copyToken}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-ink-950 text-paper rounded-md text-sm"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy token'}
            </button>
            <div className="text-[11px] text-warn bg-warn/10 border border-warn/30 rounded-md p-2">
              Store this securely. Once this dialog closes, only the prefix
              (<span className="mono">{createdToken.slice(0, 12)}</span>…) will remain visible.
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4 overflow-auto scrollbar">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-400">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CI pipeline, Local dev"
                className="mt-1 w-full text-sm px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-400">Scopes</label>
              <div className="mt-2 border border-neutral-200 rounded-md divide-y divide-neutral-100">
                {SCOPE_GROUPS.map((g) => (
                  <div key={g.resource} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2 text-[12px]">
                    <div className="font-medium">{g.resource}</div>
                    <label className={cn('flex items-center gap-1.5 cursor-pointer')}>
                      <input
                        type="checkbox"
                        checked={scopes.includes(g.readScope)}
                        onChange={() => toggle(g.readScope)}
                        className="accent-accent"
                      />
                      <span className="mono text-[11px]">read</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopes.includes(g.writeScope)}
                        onChange={() => toggle(g.writeScope)}
                        className="accent-accent"
                      />
                      <span className="mono text-[11px]">write</span>
                    </label>
                  </div>
                ))}
                <label className="flex items-center gap-2 px-3 py-2 text-[12px] bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={scopes.includes('admin')}
                    onChange={() => toggle('admin')}
                    className="accent-accent"
                  />
                  <span className="font-semibold">admin</span>
                  <span className="text-neutral-400 text-[11px]">(grants all scopes, including token management)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-neutral-400">Expires</label>
              <div className="mt-1 grid grid-cols-5 gap-2 text-[12px]">
                {EXPIRY_OPTIONS.map((o) => (
                  <label
                    key={o.label}
                    className={cn(
                      'border rounded-md px-2 py-1.5 text-center cursor-pointer transition-colors',
                      expiryDays === o.days ? 'border-accent bg-accent-soft text-accent' : 'border-neutral-200 hover:border-accent'
                    )}
                  >
                    <input
                      type="radio"
                      name="expiry"
                      checked={expiryDays === o.days}
                      onChange={() => setExpiryDays(o.days)}
                      className="hidden"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            {error && <div className="text-[11px] text-destructive mono break-all">{error}</div>}
          </div>
        )}

        {!createdToken && (
          <div className="p-4 border-t border-neutral-200 flex justify-end gap-2">
            <button onClick={handleClose} className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-900">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !name.trim() || scopes.length === 0}
              className="px-3 py-1.5 bg-ink-950 text-paper text-sm rounded-md disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create token'}
            </button>
          </div>
        )}

        {createdToken && (
          <div className="p-4 border-t border-neutral-200 flex justify-end">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 bg-ink-950 text-paper text-sm rounded-md"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
