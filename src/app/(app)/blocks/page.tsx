import Link from 'next/link';
import { prisma } from '@/lib/db';
import { BLOCK_PRESETS, CATEGORY_META, CATEGORY_ORDER, presetsByCategory, type PresetCategory } from '@/lib/block-presets';
import { ScreenHeader, Chip } from '@/components/screen-header';

type Search = { cat?: string };

export default async function BlocksListPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const cat = (CATEGORY_ORDER.includes(sp.cat as PresetCategory) ? sp.cat : 'hero') as PresetCategory;

  const grouped = presetsByCategory();
  const blocks = await prisma.customBlock.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []);

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Block studio"
        chips={
          <>
            <Chip tone="accent">{BLOCK_PRESETS.length} presets</Chip>
            <Chip tone="neutral">{blocks.length} custom</Chip>
          </>
        }
        actions={
          <Link href="/blocks/new" className="px-2.5 py-1 text-xs rounded-md bg-ink-950 text-paper hover:bg-ink-900">
            + New block
          </Link>
        }
      />

      <div className="flex-1 overflow-auto scrollbar bg-paper">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="display text-lg">Block library</h2>
                <p className="text-[12px] text-neutral-500 mt-0.5">
                  Starter presets. Drop them on a page as-is, or bind slots to a collection.
                </p>
              </div>
              <div className="text-[11px] text-neutral-400">
                Inspired by <a href="https://www.shadcnui-blocks.com/blocks" target="_blank" rel="noreferrer" className="hover:text-accent">shadcnui-blocks</a>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 border-b border-neutral-200 mb-4">
              {CATEGORY_ORDER.map((c) => {
                const active = c === cat;
                return (
                  <Link
                    key={c}
                    href={`/blocks?cat=${c}`}
                    className={[
                      'px-3 py-2 text-xs border-b-2 -mb-px',
                      active ? 'border-ink-950 text-ink-950 font-medium' : 'border-transparent text-neutral-500 hover:text-ink-950'
                    ].join(' ')}
                  >
                    {CATEGORY_META[c].label}
                    <span className="ml-1.5 text-[10px] text-neutral-400">{grouped[c].length}</span>
                  </Link>
                );
              })}
            </div>

            <div className="text-[12px] text-neutral-500 mb-4">{CATEGORY_META[cat].blurb}</div>

            <div className="grid grid-cols-2 gap-4" suppressHydrationWarning>
              {grouped[cat].map((p) => (
                <PresetCard key={p.id} preset={p} />
              ))}
              {grouped[cat].length === 0 && (
                <div className="col-span-2 p-8 text-center text-sm text-neutral-500 border border-dashed border-neutral-200 rounded-md">
                  No presets in this category yet.
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="display text-lg">Your custom blocks</h2>
              <Link href="/blocks/new" className="text-xs text-accent hover:underline">+ New block</Link>
            </div>

            {blocks.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500 border border-dashed border-neutral-200 rounded-md bg-white">
                No custom blocks yet. Start from a preset above, or{' '}
                <Link href="/blocks/new" className="text-accent hover:underline">paste your own JSX →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {blocks.map((b) => {
                  const slotMap = b.slotMap ? JSON.parse(b.slotMap) : {};
                  const slots = Object.keys(slotMap);
                  return (
                    <div key={b.id} className="bg-white border border-neutral-200 rounded-md p-4 flex flex-col gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm">{(b as any).title || b.name}</div>
                          <span className="text-[10px] mono text-neutral-400">{b.name}</span>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          {(b as any).description || (
                            <>
                              {slots.length} slot{slots.length === 1 ? '' : 's'}
                              {b.collection && <> · bound to <span className="mono">{b.collection}</span></>}
                              {!b.collection && slots.length === 0 && <> · static</>}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="h-32 overflow-hidden rounded border border-neutral-100 relative bg-white">
                        <div
                          className="absolute inset-0 origin-top-left scale-[0.4] w-[250%] h-[250%] pointer-events-none"
                          dangerouslySetInnerHTML={{ __html: b.source.replace(/className=/g, 'class=') }}
                          suppressHydrationWarning
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80" />
                      </div>
                      {slots.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {slots.slice(0, 6).map((s) => (
                            <span key={s} className="text-[10px] mono bg-accent-soft text-accent px-1.5 py-0.5 rounded">
                              {s} → {slotMap[s] || 'unmapped'}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-end mt-auto">
                        <Link href={`/blocks/${b.id}`} className="px-2.5 py-1 text-[11px] rounded-md bg-ink-950 text-paper hover:bg-ink-900">
                          Edit →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

function PresetCard({ preset }: { preset: { id: string; name: string; title: string; description: string; source: string } }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-md p-4 flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm">{preset.title}</div>
          <span className="text-[10px] mono text-neutral-400">{preset.name}</span>
        </div>
        <div className="text-[11px] text-neutral-500 mt-1">{preset.description}</div>
      </div>

      <div className="h-32 overflow-hidden rounded border border-neutral-100 relative bg-white">
        <div
          className="absolute inset-0 origin-top-left scale-[0.4] w-[250%] h-[250%] pointer-events-none"
          dangerouslySetInnerHTML={{ __html: preset.source.replace(/className=/g, 'class=') }}
        suppressHydrationWarning
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80" />
      </div>

      <div className="flex items-center justify-end gap-2 mt-auto">
        <Link
          href={`/blocks/new?preset=${preset.id}`}
          className="px-2.5 py-1 text-[11px] rounded-md bg-ink-950 text-paper hover:bg-ink-900"
        >
          Use preset →
        </Link>
      </div>
    </div>
  );
}
