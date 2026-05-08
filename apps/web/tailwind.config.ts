import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // ── Premium dark surfaces ──
        canvas: {
          DEFAULT: '#09090B',     // matte black
          raised: '#111113',      // elevated surface
          elevated: '#18181B',    // cards, modals
          sunken: '#050506',      // deep pits
        },
        // ── Typography ──
        ink: {
          DEFAULT: '#FAFAFA',     // pure white-ish
          secondary: '#A1A1AA',   // zinc-400
          muted: '#71717A',       // zinc-500
          ghost: '#3F3F46',       // zinc-700
          faint: '#27272A',       // zinc-800
        },
        // ── Borders & lines ──
        line: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.10)',
          faint: 'rgba(255,255,255,0.03)',
        },
        // ── Brand: single accent — electric lime ──
        volt: {
          DEFAULT: '#CAFF3C',
          bright: '#E0FF7A',
          deep: '#9BCC1F',
          dim: 'rgba(202,255,60,0.15)',
          subtle: 'rgba(202,255,60,0.06)',
        },
        // ── Semantic ──
        up: '#22C55E',            // green-500
        down: '#EF4444',          // red-500
        'up-dim': 'rgba(34,197,94,0.15)',
        'down-dim': 'rgba(239,68,68,0.15)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        crunch: '-0.06em',
      },
      fontSize: {
        micro: ['10px', { lineHeight: '1.2', letterSpacing: '0.1em' }],
        hero: ['clamp(3rem, 7vw, 6rem)', { lineHeight: '0.92', letterSpacing: '-0.04em' }],
        mega: ['clamp(2rem, 4.5vw, 3.5rem)', { lineHeight: '1.0', letterSpacing: '-0.03em' }],
        stat: ['clamp(2rem, 3vw, 2.75rem)', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      boxShadow: {
        'glow-volt': '0 0 60px -12px rgba(202,255,60,0.35)',
        'glow-sm': '0 0 20px -4px rgba(202,255,60,0.25)',
        'card': '0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 8px 32px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(202,255,60,0.12)',
        'elevated': '0 16px 64px -16px rgba(0,0,0,0.8)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      backgroundImage: {
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        'glass-strong': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        'surface-gradient': 'linear-gradient(180deg, #111113 0%, #09090B 100%)',
        'hero-radial': 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(202,255,60,0.08) 0%, transparent 60%)',
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in': 'fade-in 0.4s ease forwards',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'number-tick': 'number-tick 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'number-tick': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
