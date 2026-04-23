// Tiny User-Agent parser — zero deps. Good enough for device/browser/os classification
// on the analytics surface. Not comprehensive — unknown UAs fall back to "Other".

export type ParsedUA = {
  device: 'desktop' | 'mobile' | 'tablet';
  browser: 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Opera' | 'Other';
  os: 'Windows' | 'macOS' | 'iOS' | 'Android' | 'Linux' | 'Other';
};

export function parseUA(ua: string | null | undefined): ParsedUA {
  if (!ua) return { device: 'desktop', browser: 'Other', os: 'Other' };
  const s = ua;

  let os: ParsedUA['os'] = 'Other';
  if (/Windows/i.test(s)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(s) && !/Mobile/i.test(s)) os = 'macOS';
  else if (/iPhone|iPad|iPod/i.test(s)) os = 'iOS';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/Linux/i.test(s)) os = 'Linux';

  let device: ParsedUA['device'] = 'desktop';
  if (/iPad|Tablet|(Android(?!.*Mobile))/i.test(s)) device = 'tablet';
  else if (/Mobile|iPhone|Android.*Mobile/i.test(s)) device = 'mobile';

  let browser: ParsedUA['browser'] = 'Other';
  if (/Edg\//.test(s)) browser = 'Edge';
  else if (/OPR\//.test(s) || /Opera/.test(s)) browser = 'Opera';
  else if (/Firefox\//.test(s)) browser = 'Firefox';
  else if (/Chrome\//.test(s) && !/Edg\//.test(s)) browser = 'Chrome';
  else if (/Safari\//.test(s) && !/Chrome/.test(s)) browser = 'Safari';

  return { device, browser, os };
}

export function hashIp(ip: string | null | undefined, salt: string): string | null {
  if (!ip) return null;
  // Non-cryptographic but stable hash — FNV-1a 32-bit with salt. Good enough
  // for per-workspace session rotation; not for cross-workspace correlation.
  let h = 0x811c9dc5;
  const s = salt + '|' + ip;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
