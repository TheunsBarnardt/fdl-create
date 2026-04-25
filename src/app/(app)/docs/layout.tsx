import 'fumadocs-ui/style.css';
import './fumadocs-theme.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import type { ReactNode } from 'react';

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ enabled: false }}>
      <DocsLayout
        tree={source.pageTree}
        nav={{ enabled: false }}
        sidebar={{
          collapsible: false,
          banner: (
            <div className="text-[11px] uppercase tracking-wider text-white/45 px-1 py-1">
              Lattice docs
            </div>
          ),
        }}
        containerProps={{ className: 'docs-shell flex-1 min-h-0' }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
