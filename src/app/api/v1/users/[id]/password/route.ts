import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { hasRole } from '@/lib/api-auth';

const PasswordBody = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6)
});

export const POST = withApi<{ params: { id: string } }>('admin', async (req, { params }, who) => {
  const isSelf = who.userId === params.id;
  const isAdmin = hasRole(who, 'admin');
  if (!isSelf && !isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = PasswordBody.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Self-service requires currentPassword; admin resetting someone else does not.
  if (isSelf && !isAdmin) {
    if (!body.data.currentPassword || !target.passwordHash) {
      return NextResponse.json({ error: 'currentPassword required' }, { status: 400 });
    }
    const ok = await bcrypt.compare(body.data.currentPassword, target.passwordHash);
    if (!ok) return NextResponse.json({ error: 'currentPassword incorrect' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.data.newPassword, 10);
  await prisma.user.update({ where: { id: params.id }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
});
