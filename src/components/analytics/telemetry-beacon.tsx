'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

function getOrCreateSessionId(): string {
  try {
    const KEY = 'lattice.sid';
    let sid = sessionStorage.getItem(KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return 'no-storage';
  }
}

function postJson(url: string, data: unknown): void {
  const body = JSON.stringify(data);
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {}
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

export function TelemetryBeacon() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);
  const vitalsBound = useRef(false);

  useEffect(() => {
    if (!pathname) return;
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    const sessionId = getOrCreateSessionId();
    const referer = document.referrer || null;

    let bytes: number | null = null;
    let durationMs: number | null = null;
    try {
      const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const nav = entries[entries.length - 1];
      if (nav) {
        if (typeof nav.transferSize === 'number') bytes = nav.transferSize;
        if (typeof nav.responseEnd === 'number' && typeof nav.startTime === 'number') {
          durationMs = Math.round(nav.responseEnd - nav.startTime);
        }
      }
    } catch {}

    postJson('/api/telemetry/pageview', {
      path: pathname,
      referer,
      bytes,
      durationMs,
      sessionId
    });
  }, [pathname]);

  useEffect(() => {
    if (vitalsBound.current) return;
    vitalsBound.current = true;

    const send = (metric: Metric) => {
      postJson('/api/telemetry/vitals', {
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        path: window.location.pathname,
        navId: metric.navigationType
      });
    };

    onCLS(send);
    onFCP(send);
    onINP(send);
    onLCP(send);
    onTTFB(send);
  }, []);

  return null;
}
