import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { NewTokenButton, RevokeButton } from '@/components/tokens-actions';
import { relativeTime } from '@/lib/logs';

export default async function TokensPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const tokens = userId
    ? await prisma.apiToken
        .findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
        .catch(() => [])
    : [];

  const active = tokens.filter((t) => !t.revokedAt);

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="API tokens"
        chips={<Chip tone="accent">{active.length} active</Chip>}
        actions={<NewTokenButton />}
      />

      <div className="flex-1 overflow-auto scrollbar bg-paper p-6 space-y-6">
        <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between bg-neutral-50 border-b border-neutral-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Tokens</div>
            <span className="text-[11px] text-neutral-400">{tokens.length} total</span>
          </div>
          {tokens.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">
              No tokens yet. Create one to access the Management API programmatically.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                  <th className="text-left font-semibold px-4 py-2">Name</th>
                  <th className="text-left font-semibold px-2 py-2">Prefix</th>
                  <th className="text-left font-semibold px-2 py-2">Scopes</th>
                  <th className="text-left font-semibold px-2 py-2">Last used</th>
                  <th className="text-left font-semibold px-2 py-2">Expires</th>
                  <th className="text-left font-semibold px-2 py-2">Status</th>
                  <th className="text-right font-semibold px-4 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => {
                  const scopes = (() => {
                    try { return JSON.parse(t.scopes) as string[]; } catch { return []; }
                  })();
                  const expired = t.expiresAt && t.expiresAt < new Date();
                  const statusLabel = t.revokedAt ? 'Revoked' : expired ? 'Expired' : 'Active';
                  const statusTone = t.revokedAt ? 'danger' : expired ? 'warn' : 'ok';
                  return (
                    <tr key={t.id} className="tilt-row border-b border-white/5">
                      <td className="px-4 py-2 font-medium">{t.name}</td>
                      <td className="px-2 py-2 mono text-[11px] text-neutral-600">{t.prefix}…</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {scopes.map((s) => (
                            <span key={s} className="mono text-[10px] px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-700">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-neutral-600">
                        {t.lastUsedAt ? relativeTime(t.lastUsedAt) : <span className="text-neutral-400">never</span>}
                      </td>
                      <td className="px-2 py-2 text-neutral-600">
                        {t.expiresAt ? relativeTime(t.expiresAt) : <span className="text-neutral-400">—</span>}
                      </td>
                      <td className="px-2 py-2">
                        <Chip tone={statusTone as any}>{statusLabel}</Chip>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {!t.revokedAt && <RevokeButton id={t.id} name={t.name} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-md p-4">
          <div className="text-sm font-semibold mb-1">Management API</div>
          <div className="text-[11px] text-neutral-500 mb-3">
            Every collection auto-exposes CRUD. Use <span className="mono">Authorization: Bearer &lt;token&gt;</span>.
          </div>
          <div className="space-y-3">
            <Snippet
              title="curl"
              code={`curl https://your-host/api/collections \\\n  -H "Authorization: Bearer lat_..."`}
            />
            <Snippet
              title="fetch"
              code={`const res = await fetch('/api/collections', {\n  headers: { Authorization: 'Bearer lat_...' }\n});\nconst data = await res.json();`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Snippet({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">{title}</div>
      <pre className="mono text-[11px] bg-neutral-50 border border-neutral-200 rounded-md p-3 overflow-auto">{code}</pre>
    </div>
  );
}
