const prs = [
  {
    id: 4,
    title: 'Pricing page redesign — three-tier layout',
    branch: 'feature/pricing-redesign',
    base: 'main',
    author: 'Theuns B',
    opened: '2 hours ago',
    status: 'open',
    comments: 2,
    commits: 3,
  },
  {
    id: 3,
    title: 'Fix mobile nav breakpoints',
    branch: 'fix/mobile-nav',
    base: 'main',
    author: 'Theuns B',
    opened: 'Yesterday',
    status: 'open',
    comments: 0,
    commits: 1,
  },
  {
    id: 2,
    title: 'Blog index page scaffold',
    branch: 'feature/blog',
    base: 'main',
    author: 'Theuns B',
    opened: '3 days ago',
    status: 'merged',
    comments: 1,
    commits: 2,
  },
  {
    id: 1,
    title: 'Theme tokens setup',
    branch: 'feature/theme',
    base: 'main',
    author: 'Theuns B',
    opened: '5 days ago',
    status: 'merged',
    comments: 0,
    commits: 1,
  },
];

const statusConfig = {
  open: { label: 'Open', className: 'bg-green-100 text-green-700' },
  merged: { label: 'Merged', className: 'bg-purple-100 text-purple-700' },
  closed: { label: 'Closed', className: 'bg-zinc-100 text-zinc-500' },
};

export default function PullRequestsPage() {
  const open = prs.filter((p) => p.status === 'open');
  const closed = prs.filter((p) => p.status !== 'open');

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-zinc-200 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Pull Requests</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{open.length} open · {closed.length} closed</p>
        </div>
        <button className="text-sm bg-zinc-900 text-white px-3 py-1.5 rounded-md hover:bg-zinc-700 transition-colors font-medium">
          New PR
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {open.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Open</h2>
            <PRList prs={open} />
          </section>
        )}
        {closed.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Closed / Merged</h2>
            <PRList prs={closed} />
          </section>
        )}
      </div>
    </div>
  );
}

type PR = (typeof prs)[number];
function PRList({ prs }: { prs: PR[] }) {
  return (
    <div className="border border-zinc-200 rounded-md divide-y divide-zinc-100">
      {prs.map((pr) => {
        const s = statusConfig[pr.status as keyof typeof statusConfig];
        return (
          <div key={pr.id} className="flex items-start gap-4 px-4 py-3 hover:bg-zinc-50 cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="mt-0.5 text-zinc-400 shrink-0">
              <circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="10" r="2" />
              <path d="M6 8v8M18 12v5a1 1 0 0 1-1 1H9M14 7l4-3 4 3" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800">{pr.title}</p>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                {pr.branch} → {pr.base} · {pr.author} · {pr.opened}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pr.comments > 0 && (
                <span className="text-xs text-zinc-400 flex items-center gap-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {pr.comments}
                </span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.className}`}>{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
