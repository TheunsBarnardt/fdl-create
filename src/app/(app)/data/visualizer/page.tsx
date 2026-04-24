import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { parseCollectionSchema, type Field } from '@/lib/schema-types';

type NodeBox = {
  id: string;
  name: string;
  label: string;
  fields: Field[];
  rows: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Edge = {
  from: string;
  to: string;
  label: string;
  cardinality: string;
};

const RELATION_RE = /^→\s*(\w+)\s*\((.+)\)\s*$/;

function parseRelation(label: string | undefined): { target: string; cardinality: string } | null {
  if (!label) return null;
  const m = label.match(RELATION_RE);
  if (!m) return null;
  return { target: m[1], cardinality: m[2] };
}

export default async function VisualizerPage() {
  const collections = await prisma.collection
    .findMany({ orderBy: { name: 'asc' } })
    .catch(() => []);

  const counts = await Promise.all(
    collections.map((c) => prisma.record.count({ where: { collectionId: c.id } }).catch(() => 0))
  );

  const parsed = collections.map((c, i) => {
    let fields: Field[] = [];
    try {
      fields = parseCollectionSchema(c.schema).fields;
    } catch {}
    return { id: c.id, name: c.name, label: c.label, fields, rows: counts[i] };
  });

  const boxW = 220;
  const headerH = 40;
  const rowH = 20;
  const colGap = 60;
  const rowGap = 40;
  const perRow = Math.max(1, Math.ceil(Math.sqrt(parsed.length)));

  const boxes: NodeBox[] = parsed.map((c, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const h = headerH + rowH * Math.min(10, c.fields.length) + 8;
    return {
      id: c.id,
      name: c.name,
      label: c.label,
      fields: c.fields,
      rows: c.rows,
      x: col * (boxW + colGap) + 30,
      y: row * (260 + rowGap) + 30,
      w: boxW,
      h
    };
  });

  const byName = new Map(boxes.map((b) => [b.name, b]));

  const edges: Edge[] = [];
  for (const box of boxes) {
    for (const f of box.fields) {
      const rel = parseRelation(f.label);
      if (!rel) continue;
      if (!byName.has(rel.target)) continue;
      edges.push({
        from: box.name,
        to: rel.target,
        label: f.name,
        cardinality: rel.cardinality
      });
    }
  }

  const svgW = Math.max(800, perRow * (boxW + colGap) + 60);
  const svgH = Math.max(500, Math.ceil(parsed.length / perRow) * (260 + rowGap) + 60);

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title={
          <div className="flex items-center gap-2">
            <Link href="/data" className="text-white/45 hover:text-white/80 transition-colors">Data</Link>
            <span className="text-white/25">/</span>
            <span>Visualizer</span>
          </div>
        }
        chips={
          <>
            <Chip tone="accent">{boxes.length} tables</Chip>
            <Chip tone="accent">{edges.length} relations</Chip>
          </>
        }
        actions={
          <Link href="/schema" className="px-2.5 py-1 text-xs rounded-md border border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white/90 transition-colors">
            Edit schema
          </Link>
        }
      />

      <div className="flex-1 overflow-auto scrollbar p-8">
        {boxes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-white/55">
            No tables yet. <Link href="/schema" className="text-sky-400 hover:text-sky-300 hover:underline ml-1">Create your first collection</Link>.
          </div>
        ) : (
          <div className="glass-card overflow-auto">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              width={svgW}
              height={svgH}
              className="block"
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.35)" />
                </marker>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width={svgW} height={svgH} fill="url(#grid)" />

              {edges.map((e, i) => {
                const from = byName.get(e.from)!;
                const to = byName.get(e.to)!;
                const x1 = from.x + from.w / 2;
                const y1 = from.y + from.h / 2;
                const x2 = to.x + to.w / 2;
                const y2 = to.y + to.h / 2;
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                return (
                  <g key={i}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth={1.5}
                      markerEnd="url(#arrow)"
                    />
                    <rect x={mx - 36} y={my - 9} width={72} height={18} rx={9} fill="rgba(11,15,26,0.95)" stroke="rgba(255,255,255,0.12)" />
                    <text x={mx} y={my + 3} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.75)" fontFamily="ui-monospace, monospace">
                      {e.cardinality}
                    </text>
                  </g>
                );
              })}

              {boxes.map((b) => (
                <g key={b.id}>
                  <a href={`/records/${b.name}`}>
                    <rect
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      rx={8}
                      fill="rgba(255,255,255,0.04)"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth={1}
                    />
                    <rect
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={headerH}
                      rx={8}
                      fill="rgba(14,165,233,0.18)"
                    />
                    <rect
                      x={b.x}
                      y={b.y + headerH - 6}
                      width={b.w}
                      height={6}
                      fill="rgba(14,165,233,0.18)"
                    />
                    <text x={b.x + 12} y={b.y + 18} fontSize="12" fontWeight="600" fill="rgba(255,255,255,0.95)" fontFamily="ui-monospace, monospace">
                      {b.name}
                    </text>
                    <text x={b.x + 12} y={b.y + 32} fontSize="10" fill="rgba(255,255,255,0.5)">
                      {b.rows.toLocaleString()} rows · {b.fields.length} fields
                    </text>
                  </a>
                  {b.fields.slice(0, 10).map((f, i) => {
                    const rel = parseRelation(f.label);
                    return (
                      <g key={f.name}>
                        <text
                          x={b.x + 12}
                          y={b.y + headerH + 4 + rowH * (i + 1) - 6}
                          fontSize="11"
                          fill={rel ? 'rgb(56,189,248)' : 'rgba(255,255,255,0.8)'}
                          fontFamily="ui-monospace, monospace"
                        >
                          {f.name}
                        </text>
                        <text
                          x={b.x + b.w - 12}
                          y={b.y + headerH + 4 + rowH * (i + 1) - 6}
                          fontSize="10"
                          fill="rgba(255,255,255,0.4)"
                          textAnchor="end"
                          fontFamily="ui-monospace, monospace"
                        >
                          {rel ? `→ ${rel.target}` : f.type}
                        </text>
                      </g>
                    );
                  })}
                  {b.fields.length > 10 && (
                    <text x={b.x + 12} y={b.y + b.h - 8} fontSize="10" fill="rgba(255,255,255,0.4)">
                      +{b.fields.length - 10} more
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 text-[12px]">
          <div className="glass-card p-4">
            <div className="text-sm font-semibold mb-2 text-white/95">Tables ({boxes.length})</div>
            <div className="space-y-1">
              {boxes.map((b) => (
                <Link key={b.id} href={`/records/${b.name}`} className="flex justify-between py-0.5 text-white/80 hover:text-sky-400 transition-colors">
                  <span className="mono">{b.name}</span>
                  <span className="text-white/40 mono">{b.rows.toLocaleString()} rows · {b.fields.length} fields</span>
                </Link>
              ))}
              {boxes.length === 0 && <div className="text-white/40">—</div>}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-sm font-semibold mb-2 text-white/95">Relations ({edges.length})</div>
            <div className="space-y-1">
              {edges.map((e, i) => (
                <div key={i} className="flex justify-between py-0.5">
                  <span className="mono text-white/85">{e.from}.{e.label} → {e.to}</span>
                  <span className="text-white/40 mono">{e.cardinality}</span>
                </div>
              ))}
              {edges.length === 0 && (
                <div className="text-white/45">
                  No relations yet. In the schema designer, add a field with label like <span className="mono text-white/70">→ customers (many-to-one)</span>.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
