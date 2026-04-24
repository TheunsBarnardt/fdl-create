'use client';
import { signOutAction } from '@/app/actions/auth';
import { useSessionChip } from './session-context';

export function UserChip() {
  const { initials } = useSessionChip();

  return (
    <form action={signOutAction} className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-amber-400 to-violet-500 text-white font-medium flex items-center justify-center text-[11px] shadow-[0_0_14px_rgba(245,158,11,0.4)]">
        {initials || '??'}
      </div>
      <button type="submit" className="text-[11px] text-white/50 hover:text-white/90 transition-colors">
        Sign out
      </button>
    </form>
  );
}
