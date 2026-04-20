import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export const SCOPES = [
  'read:collections', 'write:collections',
  'read:records', 'write:records',
  'read:pages', 'write:pages',
  'read:blocks', 'write:blocks',
  'read:themes', 'write:themes',
  'admin'
] as const;
export type Scope = typeof SCOPES[number];

export type Role = 'admin' | 'editor' | 'viewer';
export const ROLES: Role[] = ['admin', 'editor', 'viewer'];
export const ROLE_RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };

export type Who = { userId: string; tokenId?: string; role?: Role };

export function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function generateToken(): { full: string; prefix: string; hash: string } {
  const raw = crypto.randomBytes(24).toString('base64url');
  const full = `lat_${raw}`;
  return { full, prefix: full.slice(0, 12), hash: sha256Hex(full) };
}

function unauthorized(message = 'unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbidden(message = 'forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

function scopeSatisfies(granted: string[], required: Scope): boolean {
  return granted.includes('admin') || granted.includes(required);
}

export async function authorize(
  req: Request,
  required?: Scope
): Promise<Who | NextResponse> {
  const header = req.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (bearer && bearer.startsWith('lat_')) {
    const hash = sha256Hex(bearer);
    const token = await prisma.apiToken.findFirst({ where: { tokenHash: hash } });
    if (!token) return unauthorized('invalid token');
    if (token.revokedAt) return unauthorized('token revoked');
    if (token.expiresAt && token.expiresAt < new Date()) return unauthorized('token expired');
    if (required) {
      let scopes: string[] = [];
      try { scopes = JSON.parse(token.scopes); } catch {}
      if (!scopeSatisfies(scopes, required)) return forbidden(`missing scope: ${required}`);
    }
    prisma.apiToken
      .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
    const owner = await prisma.user.findUnique({ where: { id: token.userId }, select: { role: true, disabledAt: true } });
    if (owner?.disabledAt) return unauthorized('account disabled');
    return { userId: token.userId, tokenId: token.id, role: owner?.role as Role | undefined };
  }

  const session = await auth();
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) return unauthorized();
  const actor = await prisma.user.findUnique({
    where: { id: uid },
    select: { role: true, disabledAt: true }
  });
  if (!actor) return unauthorized();
  if (actor.disabledAt) return unauthorized('account disabled');
  return { userId: uid, role: actor.role as Role };
}

export function hasRole(who: Who, minimum: Role): boolean {
  if (!who.role) return false;
  return ROLE_RANK[who.role] >= ROLE_RANK[minimum];
}

export function requireRole(who: Who, minimum: Role): NextResponse | null {
  if (!hasRole(who, minimum)) return forbidden(`requires role: ${minimum}`);
  return null;
}
