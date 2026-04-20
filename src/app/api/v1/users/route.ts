import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { withApi } from '@/lib/with-api';
import { ROLES, requireRole, type Role } from '@/lib/api-auth';

const CreateUser = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  password: z.string().min(6),
  role: z.enum(ROLES as unknown as [Role, ...Role[]])
});

export const GET = withApi('admin', async (_req, _ctx, who) => {
  const denied = requireRole(who, 'admin');
  if (denied) return denied;
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      disabledAt: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { tokens: true } }
    }
  });
  return NextResponse.json(users);
});

export const POST = withApi('admin', async (req, _ctx, who) => {
  const denied = requireRole(who, 'admin');
  if (denied) return denied;
  const body = CreateUser.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const exists = await prisma.user.findUnique({ where: { email: body.data.email } });
  if (exists) return NextResponse.json({ error: 'email already registered' }, { status: 409 });
  const passwordHash = await bcrypt.hash(body.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: body.data.email,
      name: body.data.name,
      role: body.data.role,
      passwordHash
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true }
  });
  return NextResponse.json(user, { status: 201 });
});
