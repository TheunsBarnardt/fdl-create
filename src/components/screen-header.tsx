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
    <header className="h-14 glass-header px-6 flex items-center justify-between shrink-0 relative">
      <div className="flex items-center gap-3">
        <div className="display text-lg heading-gradient">{title}</div>
        {chips}
      </div>
      <div className="flex items-center gap-3 text-xs text-white/60">
        {actions}
        {actions && <span className="w-px h-5 bg-white/10" />}
        <UserChip />
      </div>
      <div className="hairline-soft absolute left-0 right-0 bottom-0" />
    </header>
  );
}

