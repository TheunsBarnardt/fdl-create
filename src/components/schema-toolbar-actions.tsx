'use client';
import { useState } from 'react';
import { Plus, Link2 } from 'lucide-react';
import { NewCollectionModal } from './new-collection-modal';
import { NewRelationModal } from './new-relation-modal';

export function SchemaToolbarActions({
  collections
}: {
  collections: Array<{ name: string; label: string }>;
}) {
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [relationOpen, setRelationOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setCollectionOpen(true)}
        className="px-2.5 py-1 border border-neutral-200 rounded-md hover:bg-neutral-50 flex items-center gap-1 text-xs"
      >
        <Plus className="w-3 h-3" />
        New collection
      </button>
      <button
        onClick={() => setRelationOpen(true)}
        className="px-2.5 py-1 border border-neutral-200 rounded-md hover:bg-neutral-50 flex items-center gap-1 text-xs"
      >
        <Link2 className="w-3 h-3" />
        New relation
      </button>
      <NewCollectionModal open={collectionOpen} onClose={() => setCollectionOpen(false)} />
      <NewRelationModal
        open={relationOpen}
        onClose={() => setRelationOpen(false)}
        collections={collections}
      />
    </>
  );
}
