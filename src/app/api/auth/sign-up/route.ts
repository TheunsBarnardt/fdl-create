import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

const SignUp = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  password: z.string().min(6)
});

export async function POST(req: Request) {
  const body = SignUp.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: body.data.email } });
  if (existing) return NextResponse.json({ error: 'email already registered' }, { status: 409 });

  const userCount = await prisma.user.count();
  // First user bootstraps as admin; everyone else defaults to editor.
  const role = userCount === 0 ? 'admin' : 'editor';

  const passwordHash = await bcrypt.hash(body.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: body.data.email,
      name: body.data.name,
      passwordHash,
      role
    },
    select: { id: true, email: true, role: true }
  });
  return NextResponse.json(user, { status: 201 });
}
