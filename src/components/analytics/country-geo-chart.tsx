'use client';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: any;
    __googleChartsLoading?: Promise<void>;
  }
}

function loadGoogleCharts(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.visualization?.GeoChart) return Promise.resolve();
  if (window.__googleChartsLoading) return window.__googleChartsLoading;

  window.__googleChartsLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-charts]');
    const onReady = () => {
      if (!window.google?.charts) return reject(new Error('google.charts missing'));
      window.google.charts.load('current', { packages: ['geochart'], mapsApiKey: '' });
      window.google.charts.setOnLoadCallback(() => resolve());
    };
    if (existing) {
      if (window.google?.charts) onReady();
      else existing.addEventListener('load', onReady, { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://www.gstatic.com/charts/loader.js';
    s.async = true;
    s.dataset.googleCharts = '1';
    s.onload = onReady;
    s.onerror = () => reject(new Error('loader failed'));
    document.head.appendChild(s);
  });
  return window.__googleChartsLoading;
}

export function CountryGeoChart({ rows }: { rows: [string, number][] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let chart: any;
    let ro: ResizeObserver | null = null;

    const draw = () => {
      if (!ref.current || !window.google?.visualization) return;
      const dataRows = rows.filter(([c]) => c && c.toLowerCase() !== 'unknown' && c !== '—');
      // GeoChart needs at least one real data row to draw a populated map.
      // If we have none, pass a synthetic zero row so the color scale initialises
      // and every country renders as dataless (dim) rather than bright white.
      const effective = dataRows.length > 0 ? dataRows : [['US', 0]];
      const data = window.google.visualization.arrayToDataTable([
        ['Country', 'Requests'],
        ...effective,
      ]);
      const options = {
        backgroundColor: { fill: 'transparent', stroke: 'none' },
        datalessRegionColor: '#1a1f2e',
        defaultColor: '#1a1f2e',
        colorAxis: { colors: ['#0b2a40', '#38bdf8'], minValue: 0 },
        legend: 'none',
        tooltip: { textStyle: { color: '#0b0f1a' } },
        keepAspectRatio: true,
      };
      if (!chart) chart = new window.google.visualization.GeoChart(ref.current);
      chart.draw(data, options);
    };

    loadGoogleCharts()
      .then(() => {
        if (disposed) return;
        draw();
        if (ref.current && 'ResizeObserver' in window) {
          ro = new ResizeObserver(() => draw());
          ro.observe(ref.current);
        }
      })
      .catch((e) => !disposed && setErr(e.message));

    return () => {
      disposed = true;
      ro?.disconnect();
      try { chart?.clearChart?.(); } catch {}
    };
  }, [rows]);

  if (err) {
    return <div className="text-[11px] text-red-300/80 py-2">Map failed to load ({err}).</div>;
  }
  return <div ref={ref} className="w-full h-[260px]" />;
}
