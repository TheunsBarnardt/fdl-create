import { auth } from '@/auth';
import { signOutAction } from '@/app/actions/auth';

export async function UserChip() {
  const session = await auth();
  const email = session?.user?.email ?? '';
  const initials = email
    .split('@')[0]
    .split(/[._-]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <form
      action={signOutAction}
      className="flex items-center gap-2"
    >
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-500 text-white font-medium flex items-center justify-center text-[11px]">
        {initials || '??'}
      </div>
      <button type="submit" className="text-[11px] text-neutral-500 hover:text-neutral-900">
        Sign out
      </button>
    </form>
  );
}
