'use client';

import { useState } from 'react';
import { Navigation, NavItem, Page } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { NavItemTree } from './nav-item-tree';
import { NavItemForm } from './nav-item-form';
import { NavPreview } from './nav-preview';

interface NavBuilderProps {
  navigation: Navigation & { items: any[] };
  setNavigation: (nav: any) => void;
  pages: Pick<Page, 'id' | 'slug' | 'title'>[];
}

export function NavBuilder({
  navigation,
  setNavigation,
  pages
}: NavBuilderProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const handleAddItem = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleItemSaved = () => {
    // Refetch navigation data
    fetch(`/api/nav`)
      .then(r => r.json())
      .then(data => {
        setNavigation(data);
        handleFormClose();
      });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this nav item?')) return;

    await fetch(`/api/nav/items/${itemId}`, { method: 'DELETE' });
    const data = await fetch(`/api/nav`).then(r => r.json());
    setNavigation(data);
  };

  return (
    <div className="flex h-full gap-4">
      {/* Left: Tree Editor */}
      <div className="flex-1 overflow-auto p-6 border-r border-border">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Navigation Items</h2>
            <Button onClick={handleAddItem} variant="default" size="sm">
              + Add Item
            </Button>
          </div>

          {navigation.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No navigation items yet. Click "Add Item" to get started.
            </div>
          ) : (
            <div className="space-y-2">
              <NavItemTree
                items={navigation.items}
                pages={pages}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                navigationId={navigation.id}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right: Preview */}
      <div className="w-80 overflow-auto p-6 border-l border-border">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Preview</h3>
          <NavPreview items={navigation.items} pages={pages} />
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <NavItemForm
          navigationId={navigation.id}
          editingItem={editingItem}
          pages={pages}
          onClose={handleFormClose}
          onSaved={handleItemSaved}
        />
      )}
    </div>
  );
}
