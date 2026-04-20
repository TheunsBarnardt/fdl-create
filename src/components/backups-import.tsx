'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BackupsImport() {
  const router = useRouter();
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError('');
    setReport(null);
    try {
      const text = await file.text();
      let body: any;
      try { body = JSON.parse(text); } catch {
        setError('File is not valid JSON');
        setBusy(false);
        return;
      }
      const res = await fetch(`/api/v1/backups?mode=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Import failed');
      } else {
        setReport(data);
        router.refresh();
      }
    } catch (e: any) {
      setError(e?.message ?? 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-[11px]">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={mode === 'merge'}
            onChange={() => setMode('merge')}
          />
          Merge (keep existing rows)
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={mode === 'replace'}
            onChange={() => setMode('replace')}
          />
          Replace (delete rows first)
        </label>
      </div>

      <input
        type="file"
        accept="application/json,.json"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-[11px] file:mr-3 file:px-2 file:py-1 file:rounded file:border file:border-neutral-300 file:bg-white file:text-xs"
      />

      <button
        onClick={submit}
        disabled={!file || busy}
        className="px-3 py-1.5 text-xs rounded-md border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? 'Importing…' : '↑ Upload & import'}
      </button>

      {error && <div className="text-[11px] text-danger">{error}</div>}
      {report && (
        <div className="text-[11px] rounded bg-ok/10 text-ok px-2 py-1.5">
          Imported {report.collections} tables · {report.records} rows
          {report.skipped > 0 && <span className="text-warn"> · {report.skipped} rows skipped</span>}
          {report.errors?.length > 0 && (
            <ul className="mt-1 text-danger">
              {report.errors.map((e: string, i: number) => <li key={i}>· {e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
