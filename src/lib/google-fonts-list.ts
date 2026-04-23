export type GoogleFont = { family: string; category: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting' };

export const POPULAR_FONTS: GoogleFont[] = [
  // Sans-serif
  { family: 'Inter',              category: 'sans-serif' },
  { family: 'Roboto',             category: 'sans-serif' },
  { family: 'Open Sans',          category: 'sans-serif' },
  { family: 'Lato',               category: 'sans-serif' },
  { family: 'Montserrat',         category: 'sans-serif' },
  { family: 'Poppins',            category: 'sans-serif' },
  { family: 'Source Sans 3',      category: 'sans-serif' },
  { family: 'Raleway',            category: 'sans-serif' },
  { family: 'Ubuntu',             category: 'sans-serif' },
  { family: 'Nunito',             category: 'sans-serif' },
  { family: 'Nunito Sans',        category: 'sans-serif' },
  { family: 'Rubik',              category: 'sans-serif' },
  { family: 'Work Sans',          category: 'sans-serif' },
  { family: 'DM Sans',            category: 'sans-serif' },
  { family: 'Outfit',             category: 'sans-serif' },
  { family: 'Plus Jakarta Sans',  category: 'sans-serif' },
  { family: 'Figtree',            category: 'sans-serif' },
  { family: 'Manrope',            category: 'sans-serif' },
  { family: 'Karla',              category: 'sans-serif' },
  { family: 'Jost',               category: 'sans-serif' },
  { family: 'Mulish',             category: 'sans-serif' },
  { family: 'Noto Sans',          category: 'sans-serif' },
  { family: 'Cabin',              category: 'sans-serif' },
  { family: 'Barlow',             category: 'sans-serif' },
  { family: 'IBM Plex Sans',      category: 'sans-serif' },
  { family: 'Geist',              category: 'sans-serif' },
  { family: 'Lexend',             category: 'sans-serif' },
  // Serif
  { family: 'Merriweather',       category: 'serif' },
  { family: 'Playfair Display',   category: 'serif' },
  { family: 'Lora',               category: 'serif' },
  { family: 'Source Serif 4',     category: 'serif' },
  { family: 'EB Garamond',        category: 'serif' },
  { family: 'Libre Baskerville',  category: 'serif' },
  { family: 'PT Serif',           category: 'serif' },
  { family: 'Cormorant Garamond', category: 'serif' },
  { family: 'Crimson Text',       category: 'serif' },
  { family: 'Bitter',             category: 'serif' },
  { family: 'Spectral',           category: 'serif' },
  { family: 'Rokkitt',            category: 'serif' },
  { family: 'Noto Serif',         category: 'serif' },
  // Monospace
  { family: 'Roboto Mono',        category: 'monospace' },
  { family: 'Source Code Pro',    category: 'monospace' },
  { family: 'Fira Code',          category: 'monospace' },
  { family: 'JetBrains Mono',     category: 'monospace' },
  { family: 'Space Mono',         category: 'monospace' },
  { family: 'IBM Plex Mono',      category: 'monospace' },
  { family: 'Inconsolata',        category: 'monospace' },
  { family: 'Geist Mono',         category: 'monospace' },
  // Display
  { family: 'Pacifico',           category: 'display' },
  { family: 'Lobster',            category: 'display' },
  { family: 'Abril Fatface',      category: 'display' },
  { family: 'Righteous',          category: 'display' },
  { family: 'Fredoka One',        category: 'display' },
  { family: 'Oswald',             category: 'display' },
  { family: 'Bebas Neue',         category: 'display' },
  { family: 'Anton',              category: 'display' },
  { family: 'Alfa Slab One',      category: 'display' },
  // Handwriting
  { family: 'Dancing Script',     category: 'handwriting' },
  { family: 'Satisfy',            category: 'handwriting' },
  { family: 'Parisienne',         category: 'handwriting' },
  { family: 'Great Vibes',        category: 'handwriting' },
  { family: 'Caveat',             category: 'handwriting' },
  { family: 'Kalam',              category: 'handwriting' },
];

const CATEGORY_LABELS: Record<string, string> = {
  'sans-serif':  'Sans-serif',
  'serif':       'Serif',
  'monospace':   'Monospace',
  'display':     'Display',
  'handwriting': 'Handwriting',
};

export function getCategoryLabel(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat;
}

const _loaded = new Set<string>();
export function loadGoogleFont(family: string) {
  if (typeof document === 'undefined' || _loaded.has(family)) return;
  _loaded.add(family);
  const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

export function getFontImport(family: string) {
  return `@import url('https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap');`;
}

export function searchFonts(query: string): GoogleFont[] {
  if (!query) return POPULAR_FONTS;
  const q = query.toLowerCase();
  return POPULAR_FONTS.filter(f => f.family.toLowerCase().includes(q));
}
