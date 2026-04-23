'use client';

import { useState } from 'react';
import { Footer, FooterColumn } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { FooterColumnManager } from './footer-column-manager';

interface FooterBuilderProps {
  footer: Footer & { columns: FooterColumn[] };
  setFooter: (footer: any) => void;
}

export function FooterBuilder({
  footer,
  setFooter
}: FooterBuilderProps) {
  const [footerType, setFooterType] = useState(footer.type);
  const [columns, setColumns] = useState(footer.columns);
  const [saving, setSaving] = useState(false);

  const handleTypeChange = async (newType: 'simple' | 'columns') => {
    setSaving(true);
    try {
      const response = await fetch('/api/footer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType })
      });

      if (response.ok) {
        setFooterType(newType);
        const data = await response.json();
        setFooter(data);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleColumnChange = (newColumns: FooterColumn[]) => {
    setColumns(newColumns);
    setFooter({
      ...footer,
      columns: newColumns
    });
  };

  return (
    <div className="max-w-2xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Footer Configuration</h2>

        <div className="space-y-4">
          {/* Footer Type Selection */}
          <div>
            <label className="text-sm font-medium block mb-2">Footer Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="footerType"
                  value="simple"
                  checked={footerType === 'simple'}
                  onChange={(e) => handleTypeChange('simple')}
                  disabled={saving}
                />
                <span className="text-sm">Simple (single list)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="footerType"
                  value="columns"
                  checked={footerType === 'columns'}
                  onChange={(e) => handleTypeChange('columns')}
                  disabled={saving}
                />
                <span className="text-sm">Columns</span>
              </label>
            </div>
          </div>

          {/* Columns Manager */}
          {footerType === 'columns' && (
            <FooterColumnManager
              columns={columns}
              onColumnsChange={handleColumnChange}
              footerId={footer.id}
            />
          )}

          {/* Simple Footer Items */}
          {footerType === 'simple' && (
            <div className="p-4 bg-muted rounded-md text-sm text-muted-foreground">
              Simple footer configuration will be added in the next phase.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
