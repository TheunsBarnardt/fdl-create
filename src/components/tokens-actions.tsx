'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { NewTokenModal } from './new-token-modal';

export function NewTokenButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 bg-ink-950 text-paper rounded-md flex items-center gap-1 text-xs"
      >
        <Plus className="w-3 h-3" />
        New token
      </button>
      <NewTokenModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function RevokeButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function revoke() {
    if (!confirm(`Revoke token "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/v1/tokens/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      onClick={revoke}
      disabled={busy}
      className="text-[11px] text-danger hover:underline disabled:opacity-60"
    >
      {busy ? 'Revoking…' : 'Revoke'}
    </button>
  );
}
