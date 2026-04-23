'use client';

import { Page } from '@prisma/client';
import { ChevronDown } from 'lucide-react';

interface NavPreviewProps {
  items: any[];
  pages: Pick<Page, 'id' | 'slug' | 'title'>[];
  currentPageSlug?: string;
  level?: number;
}

export function NavPreview({
  items,
  pages,
  currentPageSlug = '',
  level = 0
}: NavPreviewProps) {
  const getPageTitle = (pageId?: string) => {
    if (!pageId) return null;
    return pages.find(p => p.id === pageId)?.title;
  };

  const getPageSlug = (pageId?: string) => {
    if (!pageId) return null;
    return pages.find(p => p.id === pageId)?.slug;
  };

  const isItemActive = (item: any): boolean => {
    if (item.pageId) {
      const slug = getPageSlug(item.pageId);
      return slug === currentPageSlug;
    }
    if (item.customUrl) {
      return item.customUrl === currentPageSlug;
    }
    // Check if any child is active
    return item.children?.some((child: any) => isItemActive(child)) || false;
  };

  const isChildrenActive = (item: any): boolean => {
    return item.children?.some((child: any) => isItemActive(child)) || false;
  };

  if (level === 0) {
    return (
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground">
          Flat Layout:
        </div>
        <div className="flex flex-wrap gap-2 p-3 border border-border rounded-md bg-card">
          {items.map(item => (
            <div key={item.id}>
              <NavItemPreview
                item={item}
                pages={pages}
                currentPageSlug={currentPageSlug}
                isRoot={true}
              />
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground mt-6">
          Items with dropdowns:
        </div>
        <div className="space-y-2 p-3 border border-border rounded-md bg-card">
          {items.map(item => {
            if (item.children?.length === 0 || item.navType === 'flat') {
              return null;
            }
            return (
              <div key={item.id} className="text-sm">
                <div className="flex items-center gap-1 font-medium">
                  {item.label}
                  <ChevronDown size={14} />
                </div>
                <div className="ml-4 space-y-1">
                  {item.children?.map((child: any) => (
                    <div key={child.id} className="text-xs">
                      {child.label}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

function NavItemPreview({
  item,
  pages,
  currentPageSlug,
  isRoot
}: {
  item: any;
  pages: Pick<Page, 'id' | 'slug' | 'title'>[];
  currentPageSlug: string;
  isRoot: boolean;
}) {
  const isActive = item.pageId
    ? pages.find(p => p.id === item.pageId)?.slug === currentPageSlug
    : item.customUrl === currentPageSlug;

  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className={`text-xs px-2 py-1 rounded ${
      isActive
        ? 'bg-accent text-white font-medium'
        : 'hover:bg-muted'
    } ${hasChildren && item.navType !== 'flat' ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center gap-1">
        {item.label}
        {hasChildren && item.navType !== 'flat' && (
          <ChevronDown size={12} />
        )}
      </div>
    </div>
  );
}
