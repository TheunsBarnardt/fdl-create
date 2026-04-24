export function Chip({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';
  children: React.ReactNode;
}) {
  const map = {
    neutral: 'chip-glass-neutral',
    accent: 'chip-glass-accent',
    ok: 'chip-glass-ok',
    warn: 'chip-glass-warn',
    danger: 'chip-glass-danger',
  } as const;
  return <span className={`chip ${map[tone]}`}>{children}</span>;
}
