'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const buildNav = [
  { href: '/', label: 'Workspace', icon: HomeIcon },
  { href: '/variables', label: 'Variables', icon: VariablesIcon },
  { href: '/assets', label: 'Assets', icon: AssetsIcon },
  { href: '/documents', label: 'Documents', icon: DocumentsIcon },
  { href: '/theme', label: 'Theme', icon: ThemeIcon },
  { href: '/blocks', label: 'Block studio', icon: BlocksIcon },
  { href: '/pages', label: 'Page editor', icon: PageIcon },
  { href: '/pages/nav-footer', label: 'Nav & Footer', icon: NavFooterIcon },
];

const dataNav = [
  { href: '/data', label: 'Overview', icon: DataIcon },
  { href: '/records', label: 'Tables', icon: RecordIcon },
  { href: '/schema', label: 'Schema', icon: SchemaIcon },
  { href: '/data/procedures', label: 'Procedures', icon: ProceduresIcon },
  { href: '/data/visualizer', label: 'Visualizer', icon: VisualizerIcon },
  { href: '/data/backups', label: 'Backups', icon: BackupsIcon }
];

const runNav = [
  { href: '/logs', label: 'Logs', icon: LogsIcon },
  { href: '/analytics', label: 'Analytics', icon: AnalyticsIcon },
  { href: '/run/profiler', label: 'SQL Profiler', icon: ProfilerIcon },
  { href: '/tokens', label: 'API tokens', icon: TokensIcon },
  { href: '/api-reference', label: 'API reference', icon: BookIcon },
  { href: '/governance', label: 'Governance', icon: GovernanceIcon }
];

const adminNav = [
  { href: '/users', label: 'Users', icon: UsersIcon }
];

const accountNav = [
  { href: '/account', label: 'Account', icon: AccountIcon }
];

type Role = 'admin' | 'editor' | 'viewer';
type NavItem = { href: string; label: string; icon: (p: { className?: string }) => React.ReactNode };

function NavGroup({
  label,
  items,
  isActive,
  defaultOpen,
}: {
  label: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-4 first:mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-2 mb-1 group"
      >
        <span className="text-[10px] uppercase tracking-wider text-white/40 group-hover:text-white/60 transition-colors">
          {label}
        </span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          className={cn('text-white/25 group-hover:text-white/50 transition-transform', open ? 'rotate-0' : '-rotate-90')}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && items.map((n) => (
        <NavLink key={n.href} href={n.href} label={n.label} Icon={n.icon} active={isActive(n.href)} />
      ))}
    </div>
  );
}

export function Sidebar({ role = 'viewer' }: { role?: Role }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

  const hasActive = (items: NavItem[]) => items.some((n) => isActive(n.href));

  return (
    <aside className="w-56 shrink-0 bg-ink-950 text-paper flex flex-col border-r border-ink-900">
      <div className="p-4 border-b border-ink-800 flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M3 7l9-4 9 4-9 4z" />
            <path d="M3 12l9 4 9-4" />
            <path d="M3 17l9 4 9-4" />
          </svg>
        </div>
        <div>
          <div className="display text-[15px] font-semibold leading-none">FDL-Create</div>
          <div className="text-[10px] text-white/50 mt-0.5">Acme Studio · SaaS</div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar text-sm">
        <NavGroup label="Build" items={buildNav} isActive={isActive} defaultOpen={hasActive(buildNav)} />
        <NavGroup label="Data"  items={dataNav}  isActive={isActive} defaultOpen={hasActive(dataNav)} />
        <NavGroup label="Run"   items={runNav}   isActive={isActive} defaultOpen={hasActive(runNav)} />
        {role === 'admin' && (
          <NavGroup label="Admin" items={adminNav} isActive={isActive} defaultOpen={hasActive(adminNav)} />
        )}
        <NavGroup label="You" items={accountNav} isActive={isActive} defaultOpen={hasActive(accountNav)} />
      </nav>

      <div className="p-3 border-t border-ink-800 text-[11px] text-white/40 leading-relaxed">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-ok" />
          Data plane: eu-west-2
        </div>
        <div>Control plane: healthy</div>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  Icon,
  active
}: {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-ink-900',
        active && 'bg-ink-900 text-paper'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function SchemaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
      <path d="M6.5 8v8M17.5 8v4M10 18.5h4" />
    </svg>
  );
}
function PageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}
function BlocksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function VariablesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h10M4 17h6" />
      <circle cx="19" cy="17" r="3" />
    </svg>
  );
}
function ThemeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6" />
    </svg>
  );
}
function RecordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 4v16" />
    </svg>
  );
}
function LogsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h3l3-8 4 16 3-8h5" />
    </svg>
  );
}
function AnalyticsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
    </svg>
  );
}
function TokensIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="7" cy="15" r="4" />
      <path d="M10.5 12L21 2M18 5l3 3M15 8l2 2" />
    </svg>
  );
}
function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h10a4 4 0 014 4v12H8a4 4 0 01-4-4V4z" />
      <path d="M4 4v12a4 4 0 014-4h10" />
    </svg>
  );
}
function DataIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
    </svg>
  );
}
function VisualizerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="4" width="7" height="5" rx="1" />
      <rect x="8" y="15" width="7" height="5" rx="1" />
      <path d="M10 8v3h7v2M6.5 8v7h5" />
    </svg>
  );
}
function BackupsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3.5-6 7-6s7 2 7 6" />
      <circle cx="17" cy="6" r="3" />
      <path d="M17 13c3 0 5 1.5 5 4" />
    </svg>
  );
}
function AccountIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
function GovernanceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
    </svg>
  );
}
function AssetsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <path d="M17 13v8M13 17h8" />
    </svg>
  );
}
function DocumentsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}
function NavFooterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 5h18M3 19h18M6 8v8M10 8v8M14 8v8M18 8v8" />
    </svg>
  );
}
function ProceduresIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 8l3 3-3 3M13 14h4" />
    </svg>
  );
}
function ProfilerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12h2M20 12h2M12 2v2M12 20v2" />
      <circle cx="12" cy="12" r="4" />
      <path d="M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
    </svg>
  );
}
