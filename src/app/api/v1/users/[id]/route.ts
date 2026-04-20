import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { ROLES, requireRole, hasRole, type Role } from '@/lib/api-auth';

const PatchUser = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(ROLES as unknown as [Role, ...Role[]]).optional(),
  disabled: z.boolean().optional()
});

export const GET = withApi<{ params: { id: string } }>('admin', async (_req, { params }, who) => {
  const isSelf = who.userId === params.id;
  if (!isSelf && !hasRole(who, 'admin')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, email: true, name: true, role: true,
      disabledAt: true, lastLoginAt: true, createdAt: true,
      _count: { select: { tokens: true } }
    }
  });
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(user);
});

export const PATCH = withApi<{ params: { id: string } }>('admin', async (req, { params }, who) => {
  const isSelf = who.userId === params.id;
  const body = PatchUser.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  // Only admins can change role / disable / edit other users; non-admins may only update own name/email.
  if (!isSelf && !hasRole(who, 'admin')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if ((body.data.role !== undefined || body.data.disabled !== undefined) && !hasRole(who, 'admin')) {
    return NextResponse.json({ error: 'role and disabled require admin' }, { status: 403 });
  }
  if (isSelf && body.data.role !== undefined) {
    return NextResponse.json({ error: "can't change your own role" }, { status: 400 });
  }
  if (isSelf && body.data.disabled === true) {
    return NextResponse.json({ error: "can't disable yourself" }, { status: 400 });
  }

  if (body.data.email) {
    const dup = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (dup && dup.id !== params.id) return NextResponse.json({ error: 'email already registered' }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      name: body.data.name,
      email: body.data.email,
      role: body.data.role,
      disabledAt:
        body.data.disabled === undefined
          ? undefined
          : body.data.disabled
          ? new Date()
          : null
    },
    select: { id: true, email: true, name: true, role: true, disabledAt: true }
  });
  return NextResponse.json(updated);
});

export const DELETE = withApi<{ params: { id: string } }>('admin', async (_req, { params }, who) => {
  const denied = requireRole(who, 'admin');
  if (denied) return denied;
  if (who.userId === params.id) {
    return NextResponse.json({ error: "can't delete yourself" }, { status: 400 });
  }
  await prisma.user.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
});
