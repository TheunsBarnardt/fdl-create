const branches = [
  { name: 'main', current: true, ahead: 0, behind: 0, updated: 'Just now', protected: true },
  { name: 'feature/pricing-redesign', current: false, ahead: 3, behind: 1, updated: '2 hours ago', protected: false },
  { name: 'fix/mobile-nav', current: false, ahead: 1, behind: 0, updated: 'Yesterday', protected: false },
  { name: 'staging', current: false, ahead: 0, behind: 5, updated: '2 days ago', protected: true },
];

export default function BranchesPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-zinc-200 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Branches</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{branches.length} branches</p>
        </div>
        <button className="text-sm bg-zinc-900 text-white px-3 py-1.5 rounded-md hover:bg-zinc-700 transition-colors font-medium">
          New branch
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {branches.map((b) => (
          <div
            key={b.name}
            className={`flex items-center gap-4 px-4 py-3 rounded-lg border transition-colors ${
              b.current ? 'border-sky-200 bg-sky-50' : 'border-zinc-200 bg-white hover:bg-zinc-50'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={b.current ? 'text-sky-500' : 'text-zinc-400'}>
              <circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" />
              <path d="M6 8v8M8 6h4a4 4 0 0 1 4 4v2" />
            </svg>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium font-mono ${b.current ? 'text-sky-700' : 'text-zinc-700'}`}>
                  {b.name}
                </span>
                {b.current && (
                  <span className="text-[10px] bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded font-medium">current</span>
                )}
                {b.protected && (
                  <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">protected</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Updated {b.updated}</p>
            </div>

            {(b.ahead > 0 || b.behind > 0) && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                {b.ahead > 0 && <span className="text-green-600">↑{b.ahead}</span>}
                {b.behind > 0 && <span className="text-amber-500">↓{b.behind}</span>}
              </div>
            )}

            {!b.current && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1 rounded hover:bg-zinc-100">
                  Switch
                </button>
                <button className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1 rounded hover:bg-zinc-100">
                  Merge
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
