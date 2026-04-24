import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { parseCollectionSchema } from '@/lib/schema-types';
import { SchemaToolbarActions } from '@/components/schema-toolbar-actions';

type EntCollection = {
  name: string;
  label: string;
  description: string | null;
  recordCount: number;
  fields: Array<{ name: string; type: string; required: boolean; unique: boolean }>;
};

const ENT_W = 240;
const ENT_GAP_X = 60;
const ENT_GAP_Y = 80;
const ENT_PAD_TOP = 48;
const ENT_PAD_LEFT = 48;
const COLS = 4;

function layoutEnts(ents: EntCollection[]) {
  return ents.map((ent, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const fieldRows = Math.min(ent.fields.length, 6);
    return {
      ent,
      left: ENT_PAD_LEFT + col * (ENT_W + ENT_GAP_X),
      top: ENT_PAD_TOP + row * (ENT_GAP_Y + 40 + fieldRows * 28),
      height: 40 + fieldRows * 28
    };
  });
}

export default async function SchemaDesignerPage({
  searchParams
}: {
  searchParams: { c?: string };
}) {
  const rows = await prisma.collection
    .findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { records: true } } }
    })
    .catch(() => []);

  const ents: EntCollection[] = rows.map((c) => {
    const schema = parseCollectionSchema(c.schema);
    return {
      name: c.name,
      label: c.label,
      description: c.description,
      recordCount: c._count.records,
      fields: schema.fields.map((f) => ({
        name: f.name,
        type: f.type,
        required: !!f.required,
        unique: !!f.unique
      }))
    };
  });

  const selectedName = searchParams.c ?? ents[0]?.name ?? null;
  const selected = ents.find((e) => e.name === selectedName) ?? null;
  const placed = layoutEnts(ents);
  const canvasHeight = Math.max(
    700,
    ...placed.map((p) => p.top + p.height + ENT_PAD_TOP)
  );
  const canvasWidth = ENT_PAD_LEFT + COLS * (ENT_W + ENT_GAP_X);

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Schema designer"
        chips={
          ents.length === 0 ? (
            <Chip tone="accent">No collections yet</Chip>
          ) : (
            <Chip tone="accent">{ents.length} collections</Chip>
          )
        }
        actions={
          <>
            <SchemaToolbarActions
              collections={ents.map((e) => ({ name: e.name, label: e.label }))}
            />
            {selected && (
              <Link
                href={`/schema/${selected.name}`}
                className="px-2.5 py-1 bg-ink-950 text-paper rounded-md"
              >
                Edit {selected.label} →
              </Link>
            )}
          </>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div
          className="flex-1 relative dot-grid overflow-auto scrollbar"
          style={{ backgroundColor: '#fafaf7' }}
        >
          {ents.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="display text-xl mb-2">No collections yet</div>
                <p className="text-sm text-neutral-500 mb-4">
                  Collections are the meta-schema. Changes take effect live — no migrations for tenant data.
                </p>
                <Link
                  href="/schema/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink-950 text-paper rounded-md text-sm"
                >
                  <PlusIcon /> Create first collection
                </Link>
              </div>
            </div>
          ) : (
            <div
              style={{ position: 'relative', width: canvasWidth, height: canvasHeight }}
            >
              {placed.map(({ ent, left, top }) => {
                const isSelected = ent.name === selectedName;
                return (
                  <Link
                    key={ent.name}
                    href={`/schema?c=${ent.name}`}
                    scroll={false}
                    className="ent block no-underline text-inherit"
                    style={{
                      top,
                      left,
                      width: ENT_W,
                      outline: isSelected ? '2px solid #0ea5e9' : undefined,
                      outlineOffset: isSelected ? 2 : undefined
                    }}
                  >
                    <div
                      className="ent-head"
                      style={isSelected ? { background: '#0ea5e9' } : undefined}
                    >
                      <span>{ent.label}</span>
                      <span className="text-[10px] text-white/70">{ent.recordCount}</span>
                    </div>
                    {ent.fields.slice(0, 6).map((f) => (
                      <div key={f.name} className="ent-field">
                        <span>
                          <b className="mono">{f.name}</b>
                        </span>
                        <span className="type">
                          {f.type}
                          {f.unique ? ' · unique' : ''}
                          {f.required ? '' : ' · opt'}
                        </span>
                      </div>
                    ))}
                    {ent.fields.length > 6 && (
                      <div className="ent-field">
                        <span className="text-neutral-400 text-[11px]">
                          +{ent.fields.length - 6} more
                        </span>
                        <span className="type"> </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: column editor */}
        <aside className="w-96 shrink-0 border-l border-neutral-200 bg-white flex flex-col overflow-hidden">
          {selected ? (
            <SelectedCollectionPanel selected={selected} />
          ) : (
            <div className="p-6 text-sm text-neutral-500">
              Select a collection on the canvas to edit its columns.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function SelectedCollectionPanel({ selected }: { selected: EntCollection }) {
  return (
    <>
      <div className="p-4 border-b border-neutral-200">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400">Editing collection</div>
        <div className="display text-lg leading-tight">{selected.label}</div>
        <div className="mono text-[11px] text-neutral-500 mt-0.5">{selected.name}</div>
        {selected.description && (
          <p className="mt-2 text-[12px] text-neutral-600">{selected.description}</p>
        )}
        <div className="flex gap-2 mt-3">
          <Link
            href={`/schema/${selected.name}`}
            className="px-2.5 py-1 border border-neutral-200 rounded-md text-[11px] hover:bg-neutral-50"
          >
            Open full editor →
          </Link>
          <Link
            href={`/records/${selected.name}`}
            className="px-2.5 py-1 border border-neutral-200 rounded-md text-[11px] hover:bg-neutral-50"
          >
            Records ({selected.recordCount})
          </Link>
        </div>
      </div>

      <div className="border-b border-neutral-200">
        <div className="px-4 py-2 flex items-center justify-between bg-neutral-50">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Columns</div>
          <span className="text-[11px] text-neutral-400">{selected.fields.length} fields</span>
        </div>
        <div
          className="text-[10px] uppercase tracking-wider text-neutral-400 grid px-4 py-1.5 gap-2"
          style={{ gridTemplateColumns: '1fr 90px 26px 26px' }}
        >
          <div>Name</div>
          <div>Type</div>
          <div className="text-center" title="Required / Not null">NN</div>
          <div className="text-center" title="Unique">UQ</div>
        </div>
      </div>
      <div className="flex-1 overflow-auto scrollbar">
        {selected.fields.map((f) => (
          <div
            key={f.name}
            className="field-row grid items-center px-4 py-2 gap-2 text-[12px] border-b border-neutral-100"
            style={{ gridTemplateColumns: '1fr 90px 26px 26px' }}
          >
            <div className="mono">{f.name}</div>
            <div className="text-neutral-500">{f.type}</div>
            <div className={`text-center ${f.required ? 'text-ok' : 'text-neutral-300'}`}>
              {f.required ? '✓' : '–'}
            </div>
            <div className={`text-center ${f.unique ? 'text-ok' : 'text-neutral-300'}`}>
              {f.unique ? '✓' : '–'}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
