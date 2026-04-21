import { prisma } from '@/lib/db';
import { BLOCK_PRESETS } from '@/lib/block-presets';

let seeded = false;

export async function ensureBuiltInBlocks() {
  if (seeded) return;
  seeded = true;
  for (const p of BLOCK_PRESETS) {
    const existing = await prisma.$queryRaw<any[]>`SELECT id FROM "CustomBlock" WHERE name = ${p.name} LIMIT 1`.catch(() => []);
    if (existing.length === 0) {
      const now = new Date().toISOString();
      await prisma.$executeRawUnsafe(
        'INSERT INTO "CustomBlock" (id, name, title, description, source, category, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        p.id, p.name, p.title, p.description, p.source, p.category, now
      ).catch(() => {});
    }
  }
}
