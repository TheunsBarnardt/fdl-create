'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export function GovernanceRow({
  name, label, fields, aiOptIn, redactions
}: {
  name: string;
  label: string;
  fields: string[];
  aiOptIn: boolean;
  redactions: string[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(aiOptIn);
  const [red, setRed] = useState<string[]>(redactions);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function push(patch: { aiOptIn?: boolean; redactions?: string[] }) {
    setPending(true);
    await fetch(`/api/collections/${name}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch)
    });
    setPending(false);
    router.refresh();
  }

  const toggle = (v: boolean) => { setEnabled(v); push({ aiOptIn: v }); };
  const toggleField = (f: string) => {
    const next = red.includes(f) ? red.filter((x) => x !== f) : [...red, f];
    setRed(next);
    push({ redactions: next });
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(!open)} className="text-left">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-[11px] mono text-neutral-500">{name}</div>
        </button>
        <div className="flex items-center gap-3">
          <span className={cn('text-[11px]', enabled ? 'text-accent' : 'text-neutral-500')}>
            {enabled ? 'AI on' : 'AI off'}
          </span>
          <Switch checked={enabled} onCheckedChange={toggle} disabled={pending} />
        </div>
      </div>
      {open && enabled && (
        <div className="mt-3 pl-1 pt-3 border-t border-neutral-100 space-y-2">
          <div className="text-[11px] text-neutral-500">
            Redact the following fields from any AI read. Unredacted fields are sent to Claude.
          </div>
          <div className="flex flex-wrap gap-1.5">
            {fields.map((f) => {
              const isRedacted = red.includes(f);
              return (
                <button
                  key={f}
                  onClick={() => toggleField(f)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] mono rounded border transition-colors',
                    isRedacted
                      ? 'bg-danger/10 border-danger/30 text-danger'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-accent'
                  )}
                >
                  {isRedacted ? '🔒 ' : ''}{f}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
