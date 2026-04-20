import { prisma } from '@/lib/db';
import { parseCollectionSchema } from '@/lib/schema-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GovernanceRow } from '@/components/governance-row';
import { ShieldCheck } from 'lucide-react';

export default async function GovernancePage() {
  const collections = await prisma.collection.findMany({ orderBy: { name: 'asc' } }).catch(() => []);
  const audits = await prisma.aiAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }).catch(() => []);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        <h1 className="display text-2xl">Governance</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        POPIA-gated AI: per-collection opt-in, per-field redaction, full audit log. AI is off by default.
      </p>

      <Card>
        <CardHeader><CardTitle>Per-collection AI opt-in</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          {collections.length === 0 && <p className="text-sm text-muted-foreground py-4">No collections.</p>}
          {collections.map((c) => {
            let fields: string[] = [];
            try { fields = parseCollectionSchema(c.schema).fields.map((f) => f.name); } catch {}
            return (
              <GovernanceRow
                key={c.id}
                name={c.name}
                label={c.label}
                fields={fields}
                aiOptIn={c.aiOptIn}
                redactions={c.redactions ? JSON.parse(c.redactions) : []}
              />
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>AI audit log</CardTitle></CardHeader>
        <CardContent>
          {audits.length === 0 && <p className="text-sm text-muted-foreground">No AI activity yet.</p>}
          <div className="space-y-1">
            {audits.map((a) => (
              <div key={a.id} className="text-xs font-mono grid grid-cols-[180px_120px_1fr] gap-3">
                <span className="text-muted-foreground">{a.createdAt.toISOString().slice(0, 19).replace('T', ' ')}</span>
                <span>{a.action}</span>
                <span className="truncate">{a.collection ?? '—'}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
