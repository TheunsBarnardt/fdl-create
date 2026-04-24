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
    <header className="h-14 border-b border-neutral-200 bg-white/60 backdrop-blur px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="display text-lg">{title}</div>
        {chips}
      </div>
      <div className="flex items-center gap-3 text-xs">
        {actions}
        {actions && <span className="w-px h-5 bg-neutral-200" />}
        <UserChip />
      </div>
    </header>
  );
}

