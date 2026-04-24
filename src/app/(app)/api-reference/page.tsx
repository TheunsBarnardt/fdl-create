import Link from 'next/link';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { API_ENDPOINTS, API_GROUPS, findEndpoint, type Endpoint, type Param } from '@/lib/api-endpoints';
import { CodeViewer } from '@/components/code-viewer';

export default function ApiReferencePage({
  searchParams
}: {
  searchParams: { endpoint?: string };
}) {
  const current = findEndpoint(searchParams.endpoint);
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'https://your-host';

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="API reference"
        chips={
          <>
            <Chip tone="accent">{API_ENDPOINTS.length} endpoints</Chip>
            <Chip tone="accent">Bearer auth</Chip>
          </>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-neutral-200 bg-white overflow-auto scrollbar">
          <nav className="py-3">
            {API_GROUPS.map((group) => {
              const rows = API_ENDPOINTS.filter((e) => e.group === group);
              if (rows.length === 0) return null;
              return (
                <div key={group} className="mb-4">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 px-4 mb-1">
                    {group}
                  </div>
                  <div>
                    {rows.map((e) => {
                      const active = e.id === current.id;
                      return (
                        <Link
                          key={e.id}
                          href={`/api-reference?endpoint=${e.id}`}
                          className={`flex items-center gap-2 px-4 py-1 text-[12px] hover:bg-neutral-50 ${active ? 'bg-accent-soft border-l-2 border-accent pl-[14px] text-accent' : 'border-l-2 border-transparent text-neutral-700'}`}
                        >
                          <MethodPill method={e.method} compact />
                          <span className="truncate">{e.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 overflow-auto scrollbar bg-paper">
          <EndpointDetail endpoint={current} origin={origin} />
        </div>
      </div>
    </section>
  );
}

function EndpointDetail({ endpoint: e, origin }: { endpoint: Endpoint; origin: string }) {
  const curlBody = e.bodyExample ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${e.bodyExample.replace(/\n\s*/g, ' ').replace(/\s{2,}/g, ' ')}'` : '';
  const methodFlag = e.method !== 'GET' ? ` -X ${e.method}` : '';
  const curl = `curl ${origin}${e.path}${methodFlag} \\\n  -H "Authorization: Bearer lat_..."${curlBody}`;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="text-[11px] mono text-neutral-400 mb-1">{e.group} · {e.id}</div>
        <h1 className="display text-2xl mb-2">{e.title}</h1>
        <p className="text-sm text-neutral-600 leading-relaxed">{e.description}</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-md overflow-hidden mb-6">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200">
          <MethodPill method={e.method} />
          <span className="mono text-[13px] text-neutral-700">{e.path}</span>
          <span className="ml-auto mono text-[10px] px-2 py-0.5 bg-neutral-100 rounded text-neutral-600">
            scope: {e.scope}
          </span>
        </div>
        <div className="px-4 py-2 bg-neutral-50 text-[11px] text-neutral-500">
          Send <span className="mono">Authorization: Bearer &lt;token&gt;</span>. Generate tokens at{' '}
          <Link href="/tokens" className="text-accent hover:underline">
            API tokens
          </Link>
          .
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-6">
          {e.pathParams && e.pathParams.length > 0 && (
            <Section title="Path parameters">
              <ParamTable params={e.pathParams} />
            </Section>
          )}

          {e.bodyParams && e.bodyParams.length > 0 && (
            <Section
              title="Body"
              subtitle={
                <span className="mono text-[10px] px-2 py-0.5 border border-neutral-200 rounded bg-white text-neutral-600">
                  application/json
                </span>
              }
            >
              <ParamTable params={e.bodyParams} />
            </Section>
          )}

          {!e.bodyParams && e.method !== 'GET' && e.method !== 'DELETE' && (
            <Section title="Body">
              <div className="text-[11px] text-neutral-500">No body parameters.</div>
            </Section>
          )}
        </div>

        <div className="col-span-2 space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2">Response ({e.responseStatus})</div>
            <CodeViewer value={e.responseExample} language="json" maxLines={24} />
          </div>

          {e.bodyExample && (
            <div>
              <div className="text-sm font-semibold mb-2">Request body example</div>
              <CodeViewer value={e.bodyExample} language="json" maxLines={18} />
            </div>
          )}

          <div>
            <div className="text-sm font-semibold mb-2">curl</div>
            <CodeViewer value={curl} language="shell" maxLines={12} />
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-neutral-200 flex items-center justify-between text-[11px]">
        <PrevNext current={e} />
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle}
      </div>
      {children}
    </div>
  );
}

function ParamTable({ params }: { params: Param[] }) {
  return (
    <div className="border border-neutral-200 rounded-md overflow-hidden bg-white">
      {params.map((p, i) => (
        <div
          key={p.name + i}
          className={`px-4 py-3 ${i !== 0 ? 'border-t border-neutral-100' : ''}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="mono text-[12px] font-semibold">{p.name}</span>
            {p.required && (
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-warn/10 text-warn rounded font-semibold">
                required
              </span>
            )}
            <span className="mono text-[10px] text-neutral-500">{p.type}</span>
          </div>
          <div className="text-[11px] text-neutral-600 leading-relaxed">{p.description}</div>
        </div>
      ))}
    </div>
  );
}

function MethodPill({ method, compact }: { method: string; compact?: boolean }) {
  const map: Record<string, string> = {
    GET: 'bg-neutral-100 text-neutral-700',
    POST: 'bg-ok/10 text-ok',
    PATCH: 'bg-warn/10 text-warn',
    DELETE: 'bg-danger/10 text-danger'
  };
  return (
    <span
      className={`mono font-semibold rounded inline-flex items-center justify-center ${compact ? 'text-[9px] px-1 w-10' : 'text-[11px] px-2 py-0.5 w-16'} ${map[method] ?? 'bg-neutral-100 text-neutral-700'}`}
    >
      {method}
    </span>
  );
}

function PrevNext({ current }: { current: Endpoint }) {
  const idx = API_ENDPOINTS.findIndex((e) => e.id === current.id);
  const prev = idx > 0 ? API_ENDPOINTS[idx - 1] : null;
  const next = idx < API_ENDPOINTS.length - 1 ? API_ENDPOINTS[idx + 1] : null;
  return (
    <>
      <div>
        {prev && (
          <Link href={`/api-reference?endpoint=${prev.id}`} className="text-neutral-500 hover:text-accent">
            ← {prev.title}
          </Link>
        )}
      </div>
      <div>
        {next && (
          <Link href={`/api-reference?endpoint=${next.id}`} className="text-neutral-500 hover:text-accent">
            {next.title} →
          </Link>
        )}
      </div>
    </>
  );
}
