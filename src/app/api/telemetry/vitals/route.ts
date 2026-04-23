import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseUA } from '@/lib/ua-parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['LCP', 'FID', 'CLS', 'INP', 'TTFB', 'FCP']);
const RATINGS = new Set(['good', 'needs-improvement', 'poor']);

type Body = {
  metric: string;
  value: number;
  rating: string;
  path: string;
  navId?: string | null;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  if (!ALLOWED.has(body.metric)) {
    return NextResponse.json({ ok: false, error: 'unsupported metric' }, { status: 400 });
  }
  if (typeof body.value !== 'number' || !Number.isFinite(body.value)) {
    return NextResponse.json({ ok: false, error: 'value invalid' }, { status: 400 });
  }
  if (!RATINGS.has(body.rating)) {
    return NextResponse.json({ ok: false, error: 'rating invalid' }, { status: 400 });
  }
  if (typeof body.path !== 'string' || body.path.length === 0 || body.path.length > 500) {
    return NextResponse.json({ ok: false, error: 'path required' }, { status: 400 });
  }

  const { device, browser } = parseUA(req.headers.get('user-agent'));

  await prisma.vitalsEvent
    .create({
      data: {
        metric: body.metric,
        value: body.value,
        rating: body.rating,
        path: body.path.slice(0, 500),
        navId: body.navId?.slice(0, 64) ?? null,
        device,
        browser
      }
    })
    .catch(() => {});

  return NextResponse.json({ ok: true }, { status: 202 });
}
