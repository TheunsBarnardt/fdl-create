'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { activateProject } from '@/app/(app)/projects/actions';

type ProjectLite = { id: string; slug: string; name: string };

export function ProjectSwitcher({
  active,
  projects
}: {
  active: { id: string; slug: string; name: string };
  projects: ProjectLite[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-2 px-2.5 py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] transition-colors text-left',
          open && 'border-sky-500/40'
        )}
      >
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
          {active.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-white/45 leading-none mb-0.5">Project</div>
          <div className="text-[13px] text-white/95 font-medium truncate">{active.name}</div>
        </div>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          className={cn('text-white/35 transition-transform shrink-0', open && 'rotate-180')}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 glass rounded-md border border-white/[0.08] shadow-xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto scrollbar">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  startTransition(() => {
                    activateProject(p.slug, '/dashboard').catch(() => {});
                  });
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.05] transition-colors',
                  p.id === active.id && 'bg-white/[0.03]'
                )}
              >
                <div className="w-5 h-5 rounded bg-white/[0.06] flex items-center justify-center text-[10px] text-white/70 shrink-0">
                  {p.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-white/90 truncate">{p.name}</div>
                  <div className="text-[10px] text-white/40 mono truncate">{p.slug}</div>
                </div>
                {p.id === active.id && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-sky-400 shrink-0">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-white/[0.06]">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="block w-full px-3 py-2 text-[12px] text-sky-400 hover:text-sky-300 hover:bg-white/[0.03] transition-colors"
            >
              ← All projects
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
