import { prisma } from '@/lib/db';
import { rangeToSince, type TimeRange } from '@/lib/logs';
import { RunLighthouse } from './run-lighthouse';

function scoreTone(n: number): { ring: string; text: string; label: string } {
  if (n >= 90) return { ring: 'text-ok', text: 'text-ok', label: 'Good' };
  if (n >= 50) return { ring: 'text-warn', text: 'text-warn', label: 'Needs work' };
  return { ring: 'text-danger', text: 'text-danger', label: 'Poor' };
}

export async function QualityTab({ range }: { range: TimeRange }) {
  const since = rangeToSince(range);

  const [runs, latestPerUrl] = await Promise.all([
    prisma.lighthouseRun
      .findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 50 })
      .catch(() => []),
    prisma.lighthouseRun
      .findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
      .catch(() => [])
  ]);

  const latestRun = runs[0] ?? latestPerUrl[0] ?? null;

  const latestByUrl = new Map<string, typeof latestPerUrl[number]>();
  for (const r of latestPerUrl) {
    if (!latestByUrl.has(r.url)) latestByUrl.set(r.url, r);
  }

  const history = [...runs].reverse();
  const perfHistory = history.map((r) => r.performance);
  const a11yHistory = history.map((r) => r.accessibility);
  const bpHistory = history.map((r) => r.bestPractices);
  const seoHistory = history.map((r) => r.seo);

  const cards = latestRun
    ? [
        { key: 'performance', label: 'Performance', score: latestRun.performance, history: perfHistory },
        { key: 'accessibility', label: 'Accessibility', score: latestRun.accessibility, history: a11yHistory },
        { key: 'best-practices', label: 'Best Practices', score: latestRun.bestPractices, history: bpHistory },
        { key: 'seo', label: 'SEO', score: latestRun.seo, history: seoHistory }
      ]
    : [];

  return (
    <div className="space-y-6">
      <RunLighthouse defaultUrl={latestRun?.url ?? 'https://example.com'} />

      {latestRun ? (
        <>
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                Latest · <span className="mono normal-case">{latestRun.url}</span> · {formatTs(latestRun.createdAt)} · {latestRun.strategy}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cards.map((c) => (
                <ScoreCard key={c.key} label={c.label} score={c.score} history={c.history} />
              ))}
            </div>
          </section>

          <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-200 flex items-baseline justify-between">
              <div className="text-sm font-semibold">Recent runs</div>
              <div className="text-[11px] text-neutral-400 mono">{runs.length} in range · latest 20 overall</div>
            </div>
            <table className="w-full text-[12px]">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">URL</th>
                  <th className="text-left px-4 py-2 font-medium">Ran</th>
                  <th className="text-left px-4 py-2 font-medium">Strategy</th>
                  <Th>Perf</Th>
                  <Th>A11y</Th>
                  <Th>Best</Th>
                  <Th>SEO</Th>
                </tr>
              </thead>
              <tbody>
                {latestPerUrl.map((r) => (
                  <Row key={r.id} run={r} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-md p-8 text-center">
          <div className="text-sm font-semibold mb-1">No Lighthouse runs yet</div>
          <div className="text-[12px] text-neutral-500 mb-1">
            Enter a URL above and click <span className="font-medium">Run</span>. The server will launch headless Chrome and audit the page.
          </div>
          <div className="text-[11px] text-neutral-400">
            Works against localhost, internal URLs, or any public site — no third-party API.
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-right px-4 py-2 font-medium">{children}</th>;
}

function formatTs(d: Date): string {
  return new Date(d).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

function Row({
  run
}: {
  run: {
    id: string;
    url: string;
    createdAt: Date;
    strategy: string;
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
}) {
  return (
    <tr className="border-t border-neutral-100 hover:bg-neutral-50">
      <td className="px-4 py-2 mono truncate max-w-[240px]">{run.url}</td>
      <td className="px-4 py-2 text-neutral-500 mono">{formatTs(run.createdAt)}</td>
      <td className="px-4 py-2 text-neutral-500">{run.strategy}</td>
      <ScoreCell value={run.performance} />
      <ScoreCell value={run.accessibility} />
      <ScoreCell value={run.bestPractices} />
      <ScoreCell value={run.seo} />
    </tr>
  );
}

function ScoreCell({ value }: { value: number }) {
  const tone = scoreTone(value);
  return <td className={`px-4 py-2 text-right mono tabular-nums ${tone.text}`}>{value}</td>;
}

function ScoreCard({ label, score, history }: { label: string; score: number; history: number[] }) {
  const tone = scoreTone(score);
  return (
    <div className="bg-white border border-neutral-200 rounded-md p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
        <span className={`text-[10px] ${tone.text}`}>{tone.label}</span>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <Dial value={score} tone={tone.ring} />
        <div>
          <div className={`display text-2xl leading-none ${tone.text}`}>{score}</div>
          <div className="text-[10px] text-neutral-400 mt-0.5">/ 100</div>
        </div>
      </div>
      <div className="mt-3">
        <History data={history} />
        <div className="flex justify-between text-[9px] mono text-neutral-400 mt-1">
          <span>{history.length} runs</span>
          <span>now</span>
        </div>
      </div>
    </div>
  );
}

function Dial({ value, tone }: { value: number; tone: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className={tone}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" className="text-neutral-100" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}

function History({ data }: { data: number[] }) {
  const w = 200;
  const h = 32;
  const n = data.length;
  if (n === 0) return <div className="h-8 flex items-center justify-center text-[10px] text-neutral-300">—</div>;
  const max = 100;
  const stepX = w / (n - 1 || 1);
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = h - (v / max) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" className="text-accent" strokeWidth="1.5" />
    </svg>
  );
}
