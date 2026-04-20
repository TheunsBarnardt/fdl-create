import Link from 'next/link';
import { SchemaEditor } from '@/components/schema-editor';

export default function NewCollectionPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/schema" className="text-xs text-muted-foreground hover:text-foreground">← Schema designer</Link>
        <h1 className="display text-2xl mt-1">New collection</h1>
      </div>
      <SchemaEditor
        mode="create"
        initial={{
          name: '',
          label: '',
          description: '',
          fields: [
            { name: 'title', type: 'text', label: 'Title', required: true }
          ]
        }}
      />
    </div>
  );
}
