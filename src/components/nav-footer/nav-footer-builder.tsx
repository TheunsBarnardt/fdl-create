'use client';

import { useState } from 'react';
import { Navigation, NavItem, Footer, FooterColumn, Page } from '@prisma/client';
import { NavBuilder } from './nav-builder';
import { FooterBuilder } from './footer-builder';

interface NavFooterBuilderProps {
  navigation: Navigation & { items: any[] };
  footer: Footer & { columns: FooterColumn[] };
  pages: Pick<Page, 'id' | 'slug' | 'title'>[];
}

export function NavFooterBuilder({
  navigation: initialNav,
  footer: initialFooter,
  pages
}: NavFooterBuilderProps) {
  const [activeTab, setActiveTab] = useState<'nav' | 'footer'>('nav');
  const [navigation, setNavigation] = useState(initialNav);
  const [footer, setFooter] = useState(initialFooter);

  return (
    <div className="flex h-full">
      {/* Sidebar with tabs */}
      <nav className="w-48 border-r border-border bg-card">
        <div className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab('nav')}
            className={`w-full text-left px-3 py-2 rounded-md transition ${
              activeTab === 'nav'
                ? 'bg-accent text-white'
                : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm font-medium">Navigation</span>
          </button>
          <button
            onClick={() => setActiveTab('footer')}
            className={`w-full text-left px-3 py-2 rounded-md transition ${
              activeTab === 'footer'
                ? 'bg-accent text-white'
                : 'hover:bg-muted'
            }`}
          >
            <span className="text-sm font-medium">Footer</span>
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'nav' && (
          <NavBuilder
            navigation={navigation}
            setNavigation={setNavigation}
            pages={pages}
          />
        )}
        {activeTab === 'footer' && (
          <FooterBuilder
            footer={footer}
            setFooter={setFooter}
          />
        )}
      </div>
    </div>
  );
}
