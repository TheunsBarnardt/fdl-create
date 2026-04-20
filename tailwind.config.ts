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
        // Prototype palette (Lattice chrome)
        ink: {
          950: '#09090b',
          900: '#18181b',
          800: '#27272a',
          700: '#3f3f46'
        },
        paper: '#ffffff',
        brand: {
          DEFAULT: '#0ea5e9',
          soft: '#f0f9ff',
          foreground: '#0369a1'
        },
        // shadcn `accent` mapped to the sky accent — so `bg-accent` in the prototype works
        accent: {
          DEFAULT: '#0ea5e9',
          soft: '#f0f9ff',
          foreground: '#ffffff'
        },
        ok: '#10b981',
        warn: '#f59e0b',
        danger: '#ef4444'
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      },
      letterSpacing: { display: '-0.028em' }
    }
  },
  plugins: []
};
export default config;
