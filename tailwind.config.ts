import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Saffron (--s, --s2, --s3, --s4)
        saffron: {
          DEFAULT: '#FF9933',
          dark:    '#e07010',
          light:   '#fff3e0',
          pale:    '#fde68a',
        },
        // Navy (--n, --n2, --n3)
        navy: {
          DEFAULT: '#0d2455',
          mid:     '#132870',
          light:   '#dbeafe',
        },
        // Green (--g, --g2, --g3)
        kampgreen: {
          DEFAULT: '#138808',
          dark:    '#0d6606',
          light:   '#dcfce7',
        },
        // Red (--r, --r2)
        kampr: {
          DEFAULT: '#dc2626',
          light:   '#fee2e2',
        },
        // Purple (--p, --p2)
        kampp: {
          DEFAULT: '#7c3aed',
          light:   '#ede9fe',
        },
        // Background / surface
        bg:       '#f0f4f8',
        surface:  '#ffffff',
        textMain: '#1a1a2e',
        muted:    '#64748b',
        border:   '#e2e8f0',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        tamil: ['"Noto Sans Tamil"', 'sans-serif'],
      },
      fontSize: {
        '2xs':  ['9px',   { lineHeight: '1.4' }],
        '2xs+': ['9.5px', { lineHeight: '1.4' }],
        '3xs':  ['8px',   { lineHeight: '1.4' }],
        '3xs+': ['8.5px', { lineHeight: '1.4' }],
      },
      letterSpacing: {
        wide1: '0.5px',
        wide2: '0.8px',
        wide3: '1px',
        wide4: '1.5px',
      },
      borderRadius: {
        card: '12px',
        sm:   '7px',
        md:   '8px',
        lg:   '10px',
      },
      boxShadow: {
        card:  '0 2px 12px rgba(13,36,85,0.09)',
        card2: '0 6px 24px rgba(13,36,85,0.14)',
        topbar:'0 2px 20px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        tricolor: 'linear-gradient(90deg,#FF9933 33.33%,#ffffff 33.33% 66.66%,#138808 66.66%)',
        navgrad:  'linear-gradient(90deg,#0b1d45,#0d2455)',
        herograd: 'linear-gradient(135deg,#0d2455 0%,#132870 60%,#0d2455 100%)',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translateX(120%)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        toastOut: {
          from: { opacity: '1', transform: 'translateX(0)' },
          to:   { opacity: '0', transform: 'translateX(120%)' },
        },
        ticker: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        livePulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.2' },
        },
      },
      animation: {
        fadeInUp:  'fadeInUp 0.25s ease both',
        toastIn:   'toastIn 0.3s ease both',
        toastOut:  'toastOut 0.25s ease both',
        ticker:    'ticker 28s linear infinite',
        livePulse: 'livePulse 1.4s ease-in-out infinite',
      },
      zIndex: {
        topbar: '500',
        toast:  '9999',
        modal:  '800',
      },
    },
  },
  plugins: [],
}

export default config
