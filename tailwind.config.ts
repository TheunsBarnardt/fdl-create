import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        // shadcn CSS-var tokens (used by theme studio + record forms)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        // CoD-inspired palette: dark grays + amber
        ink: {
          950: '#0f0f11',
          900: '#1a1a1d',
          800: '#2a2a2e',
          700: '#3f3f46'
        },
        charcoal: {
          950: '#0a0a0c',
          900: '#111114',
          800: '#1a1a1d',
          700: '#2a2a2e',
          600: '#3f3f46'
        },
        paper: '#ffffff',
        brand: {
          DEFAULT: '#f59e0b',
          soft: '#fef3c7',
          foreground: '#92400e'
        },
        // shadcn `accent` mapped to amber — so `bg-accent` works with new palette
        accent: {
          DEFAULT: '#f59e0b',
          soft: '#fef3c7',
          foreground: '#ffffff'
        },
        ok: '#10b981',
        warn: '#f59e0b',
        danger: '#ef4444'
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        heading: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'ui-monospace', 'monospace']
      },
      letterSpacing: { display: '-0.028em' },
      boxShadow: {
        'glass-sm': '0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        'glass-md': '0 8px 24px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-glow': '0 0 0 1px rgba(14,165,233,0.2), 0 12px 40px -8px rgba(14,165,233,0.18)',
        'accent-glow': '0 0 24px rgba(14,165,233,0.35)'
      },
      backdropBlur: {
        xs: '4px'
      }
    }
  },
  plugins: []
};
export default config;
