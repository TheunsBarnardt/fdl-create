import Link from 'next/link';
import { prisma } from '@/lib/db';
import { CATEGORY_META, CATEGORY_ORDER, type PresetCategory } from '@/lib/block-presets';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { ensureBuiltInBlocks } from '@/lib/seed-blocks';

const SLOT_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
function detectSlots(source: string) {
  return [...new Set([...source.matchAll(SLOT_RE)].map((m) => m[1]))];
}

type Search = { cat?: string };

export default async function BlocksListPage({ searchParams }: { searchParams: Promise<Search> }) {
  await ensureBuiltInBlocks();

  const sp = await searchParams;
  const allBlocks = await prisma.$queryRaw<any[]>`SELECT * FROM "CustomBlock" ORDER BY createdAt ASC`.catch(() => []);

  // Group by category; uncategorised → 'other'
  const byCategory: Record<string, any[]> = {};
  for (const b of allBlocks) {
    const key = (b.category && CATEGORY_ORDER.includes(b.category)) ? b.category : 'other';
    (byCategory[key] ??= []).push(b);
  }

  const hasOther = (byCategory['other']?.length ?? 0) > 0;
  const tabs = [
    ...CATEGORY_ORDER.map((c) => ({ key: c, label: CATEGORY_META[c].label, count: byCategory[c]?.length ?? 0 })),
    ...(hasOther ? [{ key: 'other', label: 'Other', count: byCategory['other'].length }] : [])
  ].filter((t) => t.count > 0);

  const defaultTab = tabs[0]?.key ?? 'hero';
  const cat = tabs.find((t) => t.key === sp.cat) ? sp.cat! : defaultTab;
  const blocksInTab = byCategory[cat] ?? [];

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Block studio"
        chips={<Chip tone="accent">{allBlocks.length} block{allBlocks.length === 1 ? '' : 's'}</Chip>}
        actions={
          <Link href="/blocks/new" className="px-2.5 py-1 text-xs rounded-md bg-ink-950 text-paper hover:bg-ink-900">
            + New block
          </Link>
        }
      />

      <div className="flex-1 overflow-auto scrollbar bg-paper">
        <div className="max-w-6xl mx-auto px-6 py-6">

          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="display text-lg">Block library</h2>
              <p className="text-[12px] text-neutral-500 mt-0.5">
                Drop blocks on a page as-is, or bind slots to a collection.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-neutral-200 mb-4">
            {tabs.map((t) => {
              const active = t.key === cat;
              return (
                <Link
                  key={t.key}
                  href={`/blocks?cat=${t.key}`}
                  className={[
                    'px-3 py-2 text-xs border-b-2 -mb-px transition-colors',
                    active ? 'border-sky-400 text-white font-medium' : 'border-transparent text-white/50 hover:text-white/90'
                  ].join(' ')}
                >
                  {t.label}
                  <span className="ml-1.5 text-[10px] text-neutral-400">{t.count}</span>
                </Link>
              );
            })}
          </div>

          {CATEGORY_META[cat as PresetCategory] && (
            <div className="text-[12px] text-neutral-500 mb-4">{CATEGORY_META[cat as PresetCategory].blurb}</div>
          )}

          <div className="grid grid-cols-2 gap-4" suppressHydrationWarning>
            {blocksInTab.map((b) => <BlockCard key={b.id} block={b} />)}
            {blocksInTab.length === 0 && (
              <div className="col-span-2 p-8 text-center text-sm text-neutral-500 border border-dashed border-neutral-200 rounded-md">
                No blocks in this category yet.{' '}
                <Link href="/blocks/new" className="text-accent hover:underline">Add one →</Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

function BlockCard({ block: b }: { block: any }) {
  const slotMap = b.slotMap ? JSON.parse(b.slotMap) : {};
  const isComponent = b.kind === 'component';
  const schema = b.slotSchema ? (() => { try { return JSON.parse(b.slotSchema); } catch { return {}; } })() : {};
  const detectedSlots = isComponent ? Object.keys(schema) : detectSlots(b.source);
  return (
    <div className="bg-white border border-neutral-200 rounded-md p-4 flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold text-sm flex items-center gap-1.5">
            {b.title || b.name}
            {isComponent && (
              <span className="text-[9px] uppercase tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                Component
              </span>
            )}
          </div>
          <span className="text-[10px] mono text-neutral-400">{b.name}</span>
        </div>
        <div className="text-[11px] text-neutral-500 mt-0.5">
          {b.description || (
            <>
              {detectedSlots.length} slot{detectedSlots.length === 1 ? '' : 's'}
              {b.collection && <> · bound to <span className="mono">{b.collection}</span></>}
              {!b.collection && detectedSlots.length === 0 && <> · static</>}
            </>
          )}
        </div>
      </div>
      <div className="h-32 overflow-hidden rounded border border-neutral-100 relative bg-white">
        {isComponent ? (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-neutral-400 mono bg-gradient-to-br from-emerald-50/40 to-transparent">
            &lt;{b.name} /&gt;
          </div>
        ) : (
          <>
            <div
              className="absolute inset-0 origin-top-left scale-[0.4] w-[250%] h-[250%] pointer-events-none"
              dangerouslySetInnerHTML={{ __html: b.source.replace(/className=/g, 'class=') }}
              suppressHydrationWarning
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80" />
          </>
        )}
      </div>
      {detectedSlots.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {detectedSlots.slice(0, 6).map((s: string) => (
            <span key={s} className="text-[10px] mono bg-accent-soft text-accent px-1.5 py-0.5 rounded">
              {s}{slotMap[s] ? ` → ${slotMap[s]}` : ''}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-auto">
        <Link href={`/blocks/new?clone=${b.id}`} className="px-2.5 py-1 text-[11px] rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50">
          Clone
        </Link>
        <Link href={`/blocks/${b.id}`} className="px-2.5 py-1 text-[11px] rounded-md bg-ink-950 text-paper hover:bg-ink-900">
          Edit →
        </Link>
      </div>
    </div>
  );
}
