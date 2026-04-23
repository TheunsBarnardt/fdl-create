// Shared slot typing + formatting helpers.
// A block author defines, per detected {{slot}}, a `type` and optional `format` + `fallback`.
// Callers (page editor + renderer) honour the declared type when binding or rendering.

export type SlotType =
  | 'string'
  | 'number'
  | 'date'
  | 'boolean'
  | 'link'
  | 'image'
  | 'richtext';

export type SlotTypeDef = {
  type: SlotType;
  format?: string;   // e.g. 'yyyy-MM-dd', '0,000.00', 'currency:ZAR'
  fallback?: string; // rendered when the resolved value is null/empty
};

export type SlotSchema = Record<string, SlotTypeDef>;

export const SLOT_TYPE_LABELS: Record<SlotType, string> = {
  string: 'String',
  number: 'Number',
  date: 'Date',
  boolean: 'Boolean',
  link: 'Link',
  image: 'Image URL',
  richtext: 'Rich text',
};

// Curated format presets per type — drives the format dropdown in the editor.
export const SLOT_FORMAT_PRESETS: Record<SlotType, Array<{ value: string; label: string; sample: string }>> = {
  string: [],
  number: [
    { value: '0', label: '1234', sample: '1234' },
    { value: '0,000', label: '1,234', sample: '1,234' },
    { value: '0,000.00', label: '1,234.56', sample: '1,234.56' },
    { value: '0.00', label: '1234.56', sample: '1234.56' },
    { value: 'currency:ZAR', label: 'R 1,234.56', sample: 'R 1,234.56' },
    { value: 'currency:USD', label: '$1,234.56', sample: '$1,234.56' },
    { value: 'currency:EUR', label: '€1,234.56', sample: '€1,234.56' },
    { value: 'percent', label: '12.3%', sample: '12.3%' },
  ],
  date: [
    { value: 'yyyy-MM-dd', label: '2026-04-23', sample: '2026-04-23' },
    { value: 'dd MMM yyyy', label: '23 Apr 2026', sample: '23 Apr 2026' },
    { value: 'd MMMM yyyy', label: '23 April 2026', sample: '23 April 2026' },
    { value: 'MMM d, yyyy', label: 'Apr 23, 2026', sample: 'Apr 23, 2026' },
    { value: 'yyyy-MM-dd HH:mm', label: '2026-04-23 14:30', sample: '2026-04-23 14:30' },
    { value: 'relative', label: '3 days ago', sample: '3 days ago' },
  ],
  boolean: [
    { value: 'yes-no', label: 'Yes / No', sample: 'Yes' },
    { value: 'true-false', label: 'True / False', sample: 'True' },
    { value: 'on-off', label: 'On / Off', sample: 'On' },
    { value: 'check', label: '✓ / —', sample: '✓' },
  ],
  link: [],
  image: [],
  richtext: [],
};

// ---- Formatting --------------------------------------------------------------

function formatNumber(n: number, fmt: string | undefined): string {
  if (!fmt) return String(n);
  if (fmt.startsWith('currency:')) {
    const code = fmt.split(':')[1] || 'USD';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(n);
    } catch {
      return n.toFixed(2);
    }
  }
  if (fmt === 'percent') {
    return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 2 }).format(n);
  }
  // Pattern like 0 | 0,000 | 0.00 | 0,000.00
  const grouped = fmt.includes(',');
  const dot = fmt.indexOf('.');
  const decimals = dot >= 0 ? fmt.length - dot - 1 : 0;
  return new Intl.NumberFormat(undefined, {
    useGrouping: grouped,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function formatDate(raw: string | number | Date, fmt: string | undefined): string {
  const d = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(d.getTime())) return String(raw ?? '');
  if (!fmt || fmt === 'relative') {
    const diffMs = Date.now() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays === -1) return 'tomorrow';
    if (Math.abs(diffDays) < 30) return `${Math.abs(diffDays)} days ${diffDays > 0 ? 'ago' : 'from now'}`;
    return d.toISOString().slice(0, 10);
  }
  // Minimal token-based formatter — covers yyyy / MM / MMMM / MMM / dd / d / HH / mm.
  const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return fmt
    .replace(/yyyy/g, String(d.getFullYear()))
    .replace(/MMMM/g, MONTHS_LONG[d.getMonth()])
    .replace(/MMM/g, MONTHS_SHORT[d.getMonth()])
    .replace(/MM/g, pad(d.getMonth() + 1))
    .replace(/dd/g, pad(d.getDate()))
    .replace(/d/g, String(d.getDate()))
    .replace(/HH/g, pad(d.getHours()))
    .replace(/mm/g, pad(d.getMinutes()));
}

function formatBoolean(v: any, fmt: string | undefined): string {
  const truthy = v === true || v === 1 || v === '1' || v === 'true' || v === 'yes';
  switch (fmt) {
    case 'true-false': return truthy ? 'True' : 'False';
    case 'on-off':     return truthy ? 'On' : 'Off';
    case 'check':      return truthy ? '✓' : '—';
    case 'yes-no':
    default:           return truthy ? 'Yes' : 'No';
  }
}

export function formatSlot(value: any, def: SlotTypeDef | undefined): string {
  const isEmpty = value === null || value === undefined || value === '';
  if (isEmpty) return def?.fallback ?? '';
  const type = def?.type ?? 'string';
  try {
    switch (type) {
      case 'number': {
        const n = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(n)) return def?.fallback ?? '';
        return formatNumber(n, def?.format);
      }
      case 'date':
        return formatDate(value, def?.format);
      case 'boolean':
        return formatBoolean(value, def?.format);
      case 'image':
      case 'link':
      case 'richtext':
      case 'string':
      default:
        return String(value);
    }
  } catch {
    return String(value);
  }
}

// Link target — stored on slotMap entries of kind 'link'.
export type LinkTarget =
  | { type: 'page'; pageId: string; query?: string; hash?: string; newTab?: boolean }
  | { type: 'record'; collection: string; recordId: string; pagePattern?: string; newTab?: boolean }
  | { type: 'external'; url: string; newTab?: boolean }
  | { type: 'anchor'; id: string };

export function resolveLinkTarget(
  target: LinkTarget,
  pages: Array<{ id: string; slug: string; title?: string }>
): { href: string; newTab: boolean } {
  switch (target.type) {
    case 'page': {
      const p = pages.find((x) => x.id === target.pageId);
      if (!p) return { href: '#', newTab: false };
      let href = `/${p.slug}`.replace(/\/\//g, '/');
      if (target.query) href += target.query.startsWith('?') ? target.query : `?${target.query}`;
      if (target.hash)  href += target.hash.startsWith('#') ? target.hash : `#${target.hash}`;
      return { href, newTab: !!target.newTab };
    }
    case 'record': {
      const pat = target.pagePattern || '/{collection}/{id}';
      const href = pat
        .replace('{collection}', target.collection)
        .replace('{id}', target.recordId);
      return { href, newTab: !!target.newTab };
    }
    case 'external':
      return { href: target.url, newTab: !!target.newTab };
    case 'anchor':
      return { href: `#${target.id}`, newTab: false };
  }
}
