export default function ChangesPage() {
  const staged = [
    { status: 'M', path: 'pages/home', label: 'Home' },
    { status: 'M', path: 'pages/about', label: 'About' },
  ];
  const unstaged = [
    { status: 'M', path: 'pages/pricing', label: 'Pricing' },
    { status: 'A', path: 'pages/blog/intro', label: 'Blog · Intro' },
    { status: 'D', path: 'pages/old-landing', label: 'Old Landing' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-zinc-200">
        <h1 className="text-lg font-semibold text-zinc-900">Changes</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Staged and unstaged content changes</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Staged ({staged.length})
            </h2>
            <button className="text-xs text-zinc-400 hover:text-zinc-600">Unstage all</button>
          </div>
          <div className="border border-zinc-200 rounded-md divide-y divide-zinc-100">
            {staged.map((f) => (
              <div key={f.path} className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 group">
                <StatusBadge status={f.status} />
                <span className="flex-1 text-sm text-zinc-700">{f.label}</span>
                <span className="text-[11px] text-zinc-400 font-mono">{f.path}</span>
                <button className="opacity-0 group-hover:opacity-100 text-xs text-zinc-400 hover:text-zinc-600 transition-opacity">
                  −
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Changes ({unstaged.length})
            </h2>
            <button className="text-xs text-zinc-400 hover:text-zinc-600">Stage all</button>
          </div>
          <div className="border border-zinc-200 rounded-md divide-y divide-zinc-100">
            {unstaged.map((f) => (
              <div key={f.path} className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 group">
                <StatusBadge status={f.status} />
                <span className="flex-1 text-sm text-zinc-700">{f.label}</span>
                <span className="text-[11px] text-zinc-400 font-mono">{f.path}</span>
                <button className="opacity-0 group-hover:opacity-100 text-xs text-zinc-400 hover:text-zinc-600 transition-opacity">
                  +
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-2 border-t border-zinc-200">
          <textarea
            placeholder="Commit message…"
            rows={3}
            className="w-full text-sm border border-zinc-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 text-zinc-700 placeholder:text-zinc-400"
          />
          <button className="mt-2 w-full bg-zinc-900 text-white text-sm font-medium py-2 rounded-md hover:bg-zinc-700 transition-colors">
            Commit to main
          </button>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    M: { label: 'M', className: 'bg-sky-100 text-sky-700' },
    A: { label: 'A', className: 'bg-green-100 text-green-700' },
    D: { label: 'D', className: 'bg-red-100 text-red-600' },
  };
  const s = map[status] ?? { label: status, className: 'bg-zinc-100 text-zinc-500' };
  return (
    <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold ${s.className}`}>
      {s.label}
    </span>
  );
}
