import { UserChip } from './user-chip';
export { Chip } from './chip';

export function ScreenHeader({
  title,
  chips,
  actions
}: {
  title: React.ReactNode;
  chips?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="h-16 glass-header px-6 flex items-center justify-between shrink-0 relative border-b-2 border-amber-500/20">
      <div className="flex items-center gap-4">
        <div className="display text-2xl font-black uppercase tracking-tight text-white drop-shadow-lg">{title}</div>
        {chips}
      </div>
      <div className="flex items-center gap-3 text-xs text-white/60">
        {actions}
        {actions && <span className="w-px h-5 bg-amber-500/30" />}
        <UserChip />
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0" />
    </header>
  );
}

