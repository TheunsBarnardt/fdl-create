import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseUA, hashIp } from '@/lib/ua-parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SALT = process.env.TELEMETRY_SALT ?? 'lattice-dev-salt';

type Body = {
  path: string;
  referer?: string | null;
  bytes?: number | null;
  durationMs?: number | null;
  sessionId?: string | null;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  if (typeof body.path !== 'string' || body.path.length === 0 || body.path.length > 500) {
    return NextResponse.json({ ok: false, error: 'path required' }, { status: 400 });
  }

  const ua = req.headers.get('user-agent');
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null;
  const country =
    req.headers.get('cf-ipcountry') ??
    req.headers.get('x-vercel-ip-country') ??
    req.headers.get('x-country-code') ??
    null;
  const { device, browser, os } = parseUA(ua);

  await prisma.pageView
    .create({
      data: {
        path: body.path.slice(0, 500),
        referer: body.referer?.slice(0, 500) ?? null,
        country,
        device,
        browser,
        os,
        bytes: typeof body.bytes === 'number' ? Math.round(body.bytes) : null,
        durationMs: typeof body.durationMs === 'number' ? Math.round(body.durationMs) : null,
        ipHash: hashIp(ip, SALT),
        userAgent: ua?.slice(0, 500) ?? null,
        sessionId: body.sessionId?.slice(0, 64) ?? null
      }
    })
    .catch(() => {});

  return NextResponse.json({ ok: true }, { status: 202 });
}
