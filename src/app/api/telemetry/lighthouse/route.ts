import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

// Self-hosted Lighthouse runner. Launches headless Chrome via chrome-launcher,
// runs Lighthouse against the supplied URL, stores the run. No third-party API.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Lighthouse runs can take 30–90s

type Body = {
  url: string;
  strategy?: 'desktop' | 'mobile';
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'auth required' }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, error: 'url must be http(s)' }, { status: 400 });
  }
  const strategy: 'desktop' | 'mobile' = body.strategy === 'mobile' ? 'mobile' : 'desktop';

  let chrome: Awaited<ReturnType<typeof import('chrome-launcher').launch>> | undefined;
  try {
    const { launch } = await import('chrome-launcher');
    const lighthouse = (await import('lighthouse')).default;

    chrome = await launch({
      chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    const runnerResult = await lighthouse(
      url,
      {
        logLevel: 'error',
        output: 'json',
        port: chrome.port,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
      },
      // formFactor preset — mobile emulates a slow mobile device; desktop uses a cable-like throttle
      strategy === 'mobile'
        ? undefined
        : {
            extends: 'lighthouse:default',
            settings: {
              formFactor: 'desktop',
              screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
              throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 }
            }
          }
    );
    if (!runnerResult) throw new Error('lighthouse returned no result');
    const lhr = runnerResult.lhr;

    const pct = (n: number | null | undefined) =>
      n == null ? 0 : Math.round(n * 100);

    const perf = pct(lhr.categories.performance?.score);
    const a11y = pct(lhr.categories.accessibility?.score);
    const bp = pct(lhr.categories['best-practices']?.score);
    const seo = pct(lhr.categories.seo?.score);

    const lcpMs = numericValue(lhr.audits?.['largest-contentful-paint']?.numericValue);
    const cls = numericValue(lhr.audits?.['cumulative-layout-shift']?.numericValue);
    const tbt = numericValue(lhr.audits?.['total-blocking-time']?.numericValue);

    const saved = await prisma.lighthouseRun.create({
      data: {
        url,
        strategy,
        performance: perf,
        accessibility: a11y,
        bestPractices: bp,
        seo,
        lcpMs: lcpMs != null ? Math.round(lcpMs) : null,
        clsScore: cls,
        tbtMs: tbt != null ? Math.round(tbt) : null,
        source: 'lhci'
      }
    });

    return NextResponse.json({ ok: true, run: saved });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    if (chrome) await chrome.kill().catch(() => {});
  }
}

function numericValue(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}
