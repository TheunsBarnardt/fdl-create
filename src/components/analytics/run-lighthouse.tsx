'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function RunLighthouse({ defaultUrl }: { defaultUrl: string }) {
  const [url, setUrl] = useState(defaultUrl);
  const [strategy, setStrategy] = useState<'desktop' | 'mobile'>('desktop');
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function run() {
    setError(null);
    setRunning(true);
    try {
      const res = await fetch('/api/telemetry/lighthouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, strategy })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? `failed · ${res.status}`);
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      setError(e?.message ?? 'request failed');
    } finally {
      setRunning(false);
    }
  }

  const busy = running || pending;

  return (
    <div className="bg-white border border-neutral-200 rounded-md p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-sm font-semibold">Run Lighthouse</div>
        <div className="text-[11px] text-neutral-400 mono">headless Chrome · self-hosted</div>
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={busy}
          className="flex-1 px-3 py-1.5 text-[13px] mono border border-neutral-200 rounded-md focus:outline-none focus:border-accent disabled:opacity-50"
        />
        <div className="flex rounded-md border border-neutral-200 overflow-hidden text-[12px]">
          <button
            type="button"
            onClick={() => setStrategy('desktop')}
            disabled={busy}
            className={`px-3 py-1.5 ${strategy === 'desktop' ? 'bg-accent-soft text-accent' : 'hover:bg-neutral-50'}`}
          >
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setStrategy('mobile')}
            disabled={busy}
            className={`px-3 py-1.5 border-l border-neutral-200 ${strategy === 'mobile' ? 'bg-accent-soft text-accent' : 'hover:bg-neutral-50'}`}
          >
            Mobile
          </button>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy || !url}
          className="px-4 py-1.5 text-[13px] rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Auditing…' : 'Run'}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-[11px] text-danger mono">{error}</div>
      )}
      {busy && (
        <div className="mt-2 text-[11px] text-neutral-400">Launching headless Chrome — typically 20–60 seconds.</div>
      )}
    </div>
  );
}
