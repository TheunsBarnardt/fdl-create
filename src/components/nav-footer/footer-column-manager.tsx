'use client';

import { useState } from 'react';
import { FooterColumn } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Edit2 } from 'lucide-react';

interface FooterColumnManagerProps {
  columns: FooterColumn[];
  onColumnsChange: (columns: FooterColumn[]) => void;
  footerId: string;
}

interface FooterColumnItem {
  label: string;
  url: string;
}

export function FooterColumnManager({
  columns,
  onColumnsChange,
  footerId
}: FooterColumnManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<{
    title: string;
    items: FooterColumnItem[];
  } | null>(null);

  const handleAddColumn = () => {
    setEditingId('new');
    setEditingColumn({ title: '', items: [{ label: '', url: '' }] });
  };

  const handleEditColumn = (column: FooterColumn) => {
    setEditingId(column.id);
    setEditingColumn({
      title: column.title,
      items: JSON.parse(column.items)
    });
  };

  const handleSaveColumn = async () => {
    if (!editingColumn || !editingColumn.title) {
      alert('Title is required');
      return;
    }

    try {
      const method = editingId === 'new' ? 'POST' : 'PATCH';
      const url = editingId === 'new'
        ? '/api/footer/columns'
        : `/api/footer/columns/${editingId}`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingColumn)
      });

      if (response.ok) {
        // Refetch footer
        const data = await fetch('/api/footer').then(r => r.json());
        onColumnsChange(data.columns);
        setEditingId(null);
        setEditingColumn(null);
      }
    } catch (err) {
      alert('Failed to save column');
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm('Delete this column?')) return;

    try {
      await fetch(`/api/footer/columns/${columnId}`, { method: 'DELETE' });
      const data = await fetch('/api/footer').then(r => r.json());
      onColumnsChange(data.columns);
    } catch (err) {
      alert('Failed to delete column');
    }
  };

  if (editingId) {
    return (
      <div className="space-y-4 p-4 bg-card border border-border rounded-md">
        <h3 className="font-semibold text-sm">
          {editingId === 'new' ? 'Add Column' : 'Edit Column'}
        </h3>

        <div>
          <label className="text-sm font-medium block mb-1">Title</label>
          <Input
            value={editingColumn?.title || ''}
            onChange={(e) => setEditingColumn({
              ...editingColumn!,
              title: e.target.value
            })}
            placeholder="e.g., Company"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Items</label>
          <div className="space-y-2">
            {editingColumn?.items.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  placeholder="Label"
                  value={item.label}
                  onChange={(e) => {
                    const newItems = [...editingColumn.items];
                    newItems[idx].label = e.target.value;
                    setEditingColumn({
                      ...editingColumn,
                      items: newItems
                    });
                  }}
                  className="flex-1"
                />
                <Input
                  placeholder="URL"
                  value={item.url}
                  onChange={(e) => {
                    const newItems = [...editingColumn.items];
                    newItems[idx].url = e.target.value;
                    setEditingColumn({
                      ...editingColumn,
                      items: newItems
                    });
                  }}
                  className="flex-1"
                />
                <button
                  onClick={() => {
                    const newItems = editingColumn.items.filter((_, i) => i !== idx);
                    setEditingColumn({
                      ...editingColumn,
                      items: newItems.length > 0 ? newItems : [{ label: '', url: '' }]
                    });
                  }}
                  className="p-1 hover:bg-border rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingColumn({
              ...editingColumn!,
              items: [...editingColumn!.items, { label: '', url: '' }]
            })}
            className="mt-2"
          >
            <Plus size={14} /> Add Item
          </Button>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setEditingId(null);
              setEditingColumn(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveColumn}>
            Save Column
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Columns</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddColumn}
        >
          <Plus size={14} /> Add Column
        </Button>
      </div>

      {columns.length === 0 ? (
        <div className="p-4 bg-muted rounded-md text-sm text-muted-foreground text-center">
          No columns yet. Click "Add Column" to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {columns.map((column) => {
            const items = JSON.parse(column.items);
            return (
              <div
                key={column.id}
                className="flex items-start justify-between p-3 border border-border rounded-md"
              >
                <div>
                  <div className="font-medium text-sm">{column.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditColumn(column)}
                    className="p-1 hover:bg-border rounded"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteColumn(column.id)}
                    className="p-1 hover:bg-border rounded"
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
