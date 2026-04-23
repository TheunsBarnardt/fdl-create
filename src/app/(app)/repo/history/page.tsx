const commits = [
  { hash: 'a3f9c1b', message: 'Update home hero copy and CTA button', author: 'Theuns B', date: '2 hours ago', branch: 'main' },
  { hash: 'f72d88e', message: 'Add pricing page — three-tier layout', author: 'Theuns B', date: '5 hours ago', branch: 'main' },
  { hash: 'c01b55a', message: 'Nav & Footer: mobile breakpoint fixes', author: 'Theuns B', date: 'Yesterday', branch: 'main' },
  { hash: '8e4a21f', message: 'Blog index page scaffold', author: 'Theuns B', date: '2 days ago', branch: 'main' },
  { hash: '3d17b90', message: 'Theme tokens — sky accent, zinc neutrals', author: 'Theuns B', date: '3 days ago', branch: 'main' },
  { hash: '7c88f4d', message: 'Initial workspace setup', author: 'Theuns B', date: '4 days ago', branch: 'main' },
];

export default function HistoryPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-zinc-200 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">History</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Commit log for the current branch</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full font-medium">
          <BranchDot />
          main
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-zinc-100">
          {commits.map((c, i) => (
            <div key={c.hash} className="flex items-start gap-4 px-6 py-4 hover:bg-zinc-50 group">
              <div className="flex flex-col items-center pt-1">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-sky-500 bg-white" />
                {i < commits.length - 1 && <div className="w-px flex-1 min-h-[32px] bg-zinc-200 mt-1" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate">{c.message}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{c.author} · {c.date}</p>
              </div>
              <span className="font-mono text-[11px] text-zinc-400 group-hover:text-zinc-600 pt-0.5">{c.hash}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BranchDot() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" />
      <path d="M6 8v8M8 6h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}
