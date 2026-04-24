export function Chip({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';
  children: React.ReactNode;
}) {
  const map = {
    neutral: 'bg-neutral-100 text-neutral-700',
    accent: 'bg-accent-soft text-accent',
    ok: 'bg-ok/10 text-ok',
    warn: 'bg-warn/10 text-warn',
    danger: 'bg-danger/10 text-danger',
  } as const;
  return <span className={`chip ${map[tone]}`}>{children}</span>;
}
