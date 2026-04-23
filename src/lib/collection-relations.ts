// Relation convention (see src/components/new-relation-modal.tsx):
// A relation from collection A → B is stored as a field on A whose
// `label` looks like "→ <B> (one-many|one-one|many-many)".

export type RelationRef = {
  name: string;          // target collection name
  fkField: string;       // the FK field name on the source collection
  cardinality: 'one-one' | 'one-many' | 'many-many';
};

const LABEL_RE = /^→\s+(\w+)\s*\((one-one|one-many|many-many)\)/;

export function getRelatedCollections(
  collection: { schema: string } | null | undefined,
  allCollectionNames: string[]
): RelationRef[] {
  if (!collection) return [];
  let schema: any;
  try { schema = JSON.parse(collection.schema); } catch { return []; }
  const fields: any[] = Array.isArray(schema?.fields) ? schema.fields : [];
  const nameSet = new Set(allCollectionNames);
  const out: RelationRef[] = [];
  for (const f of fields) {
    const label: string = typeof f?.label === 'string' ? f.label : '';
    const m = label.match(LABEL_RE);
    if (!m) continue;
    const [, target, cardinality] = m;
    if (!nameSet.has(target)) continue;
    out.push({ name: target, fkField: String(f.name), cardinality: cardinality as RelationRef['cardinality'] });
  }
  return out;
}
