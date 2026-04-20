import { prisma } from '@/lib/db';
import { parseCollectionSchema } from '@/lib/schema-types';

export async function getCollectionFieldMap() {
  const cols = await prisma.collection.findMany();
  const out: Record<string, string[]> = {};
  for (const c of cols) {
    try {
      out[c.name] = parseCollectionSchema(c.schema).fields.map((f) => f.name);
    } catch {
      out[c.name] = [];
    }
  }
  return out;
}
