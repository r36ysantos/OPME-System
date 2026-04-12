/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Legacy primary alias (keeps existing code working)
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // ── Design Token System ──────────────────────────
        brand:    '#2563EB',
        electric: '#3B82F6',
        void:     '#0F172A',
        surface:  '#1E293B',
        alert:    '#EAB308',
        sage:     '#64748B',
        canvas:   '#F8FAFC',
        ink:      '#0F172A',
      },
      boxShadow: {
        // Neo-Brutalist hard shadows (zero blur)
        'hard-sm':  '2px 2px 0px 0px #0F172A',
        'hard':     '4px 4px 0px 0px #0F172A',
        'hard-lg':  '6px 6px 0px 0px #0F172A',
        'hard-xl':  '8px 8px 0px 0px #0F172A',
        'hard-brand-sm': '2px 2px 0px 0px #2563EB',
        'hard-brand':    '3px 3px 0px 0px #2563EB',
        'hard-brand-lg': '4px 4px 0px 0px #2563EB',
        'hard-alert':    '4px 4px 0px 0px #EAB308',
        'hard-card':     '4px 4px 0px 0px rgba(15,23,42,0.08)',
        'hard-card-hover': '6px 6px 0px 0px rgba(15,23,42,0.12)',
        'hard-input':    '3px 3px 0px 0px #2563EB',
        'none':          '0px 0px 0px 0px transparent',
      },
      animation: {
        'brutalist-in':  'brutalistIn 0.2s cubic-bezier(0.175,0.885,0.32,1.275) both',
        'pop-in':        'popIn 0.18s cubic-bezier(0.175,0.885,0.32,1.275) both',
        'slide-right':   'slideRight 0.15s ease-out both',
        'fade-in':       'fadeIn 0.15s ease-out both',
        'hard-pulse':    'hardShadowPulse 2s ease-in-out infinite',
        'spin-slow':     'spin 1s linear infinite',
        'shimmer':       'shimmer 1.4s ease-in-out infinite',
      },
      keyframes: {
        brutalistIn: {
          '0%':   { opacity: '0', transform: 'translate(-6px, 6px)' },
          '100%': { opacity: '1', transform: 'translate(0, 0)' },
        },
        popIn: {
          '0%':   { opacity: '0', transform: 'scale(0.9) translate(4px, 4px)' },
          '70%':  { transform: 'scale(1.02) translate(-1px, -1px)' },
          '100%': { opacity: '1', transform: 'scale(1) translate(0, 0)' },
        },
        slideRight: {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        hardShadowPulse: {
          '0%,100%': { boxShadow: '4px 4px 0px 0px #2563EB' },
          '50%':     { boxShadow: '6px 6px 0px 0px #2563EB' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
