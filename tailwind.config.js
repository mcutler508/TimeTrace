/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0a1a',
          deep: '#06061a',
          accent: '#1a0a2e',
        },
        ink: {
          cyan: '#00f0ff',
          gold: '#ffd56b',
          rose: '#ff5273',
          violet: '#a06bff',
        },
        surface: {
          card: 'rgba(20, 18, 38, 0.65)',
          edge: 'rgba(255, 255, 255, 0.08)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 24px rgba(0, 240, 255, 0.55)',
        'glow-gold': '0 0 28px rgba(255, 213, 107, 0.7)',
        'soft-3d':
          '0 1px 0 rgba(255,255,255,0.18) inset, 0 -2px 0 rgba(0,0,0,0.35) inset, 0 6px 18px rgba(0,0,0,0.45)',
      },
      keyframes: {
        scorePop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.12)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        screenPulse: {
          '0%,100%': { boxShadow: 'inset 0 0 0 0 rgba(0,240,255,0)' },
          '50%': { boxShadow: 'inset 0 0 80px 8px rgba(0,240,255,0.35)' },
        },
        miss: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(5px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(2px)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        scorePop: 'scorePop 360ms cubic-bezier(0.2, 1, 0.3, 1) both',
        screenPulse: 'screenPulse 600ms ease-out',
        miss: 'miss 380ms ease-in-out',
        fadeIn: 'fadeIn 220ms ease-out both',
      },
    },
  },
  plugins: [],
};
