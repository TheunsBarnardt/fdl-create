import 'fumadocs-ui/style.css';
import './fumadocs-theme.css';
import '../showcase/showcase.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import type { ReactNode } from 'react';

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="docs-root dark relative flex-1 min-h-0 overflow-y-auto bg-[#070709]">
      {/* Showcase ambient layers — fixed so they stay in place while the article scrolls */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="mesh-orb mesh-orb-amber"
          style={{ width: '700px', height: '700px', top: '-15%', left: '-15%', opacity: 0.55 }}
        />
        <div
          className="mesh-orb mesh-orb-violet"
          style={{ width: '600px', height: '600px', bottom: '-20%', right: '-10%', opacity: 0.5 }}
        />
        <div className="absolute inset-0 grid-overlay opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#070709]/20 to-[#070709]/60" />
      </div>

      <div className="relative z-10 min-h-full">
        <RootProvider
          theme={{
            defaultTheme: 'dark',
            enableSystem: false,
            forcedTheme: 'dark',
          }}
        >
          <DocsLayout
            tree={source.pageTree}
            nav={{ enabled: false }}
            sidebar={{
              collapsible: false,
              banner: (
                <div className="text-[10px] uppercase tracking-wider text-white/45 px-1 py-1 font-medium">
                  Lattice docs
                </div>
              ),
              footer: null,
            }}
            containerProps={{ className: 'docs-shell' }}
          >
            {children}
          </DocsLayout>
        </RootProvider>
      </div>
    </div>
  );
}
