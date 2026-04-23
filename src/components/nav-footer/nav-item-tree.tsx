'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import { NavItem, Page } from '@prisma/client';
import { Button } from '@/components/ui/button';

interface NavItemTreeProps {
  items: any[];
  pages: Pick<Page, 'id' | 'slug' | 'title'>[];
  onEdit: (item: any) => void;
  onDelete: (itemId: string) => void;
  navigationId: string;
  level?: number;
}

export function NavItemTree({
  items,
  pages,
  onEdit,
  onDelete,
  navigationId,
  level = 0
}: NavItemTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (itemId: string) => {
    setExpanded(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const getPageTitle = (pageId?: string) => {
    if (!pageId) return null;
    return pages.find(p => p.id === pageId)?.title;
  };

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.id}>
          <div
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted group"
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            {item.children?.length > 0 && (
              <button
                onClick={() => toggleExpanded(item.id)}
                className="p-0.5 hover:bg-border rounded"
              >
                {expanded[item.id] ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            )}
            {!item.children?.length && (
              <div className="w-6" />
            )}

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{item.label}</div>
              <div className="text-xs text-muted-foreground flex gap-2">
                {item.pageId && (
                  <span>→ {getPageTitle(item.pageId)}</span>
                )}
                {item.customUrl && (
                  <span className="flex items-center gap-1">
                    <ExternalLink size={12} />
                    {item.customUrl}
                  </span>
                )}
                {item.navType && item.navType !== 'flat' && (
                  <span className="bg-accent text-white text-xs px-1.5 py-0.5 rounded">
                    {item.navType}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => onEdit(item)}
                className="p-1 hover:bg-border rounded"
              >
                <Edit2 size={14} className="text-muted-foreground" />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="p-1 hover:bg-border rounded"
              >
                <Trash2 size={14} className="text-destructive" />
              </button>
            </div>
          </div>

          {expanded[item.id] && item.children?.length > 0 && (
            <NavItemTree
              items={item.children}
              pages={pages}
              onEdit={onEdit}
              onDelete={onDelete}
              navigationId={navigationId}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}
