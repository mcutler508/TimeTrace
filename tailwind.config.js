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
          ink: '#0a0708',
        },
        ink: {
          cyan: '#3df0ff',
          gold: '#ffe83d',
          rose: '#ff3da4',
          violet: '#a44dff',
          lime: '#a4ff3d',
          orange: '#ff7a3d',
          paper: '#fff5e0',
        },
        splat: {
          lime: '#a4ff3d',
          pink: '#ff3da4',
          yellow: '#ffe83d',
          cyan: '#3df0ff',
          violet: '#a44dff',
          orange: '#ff7a3d',
          black: '#0a0708',
          paper: '#fff5e0',
        },
        surface: {
          card: 'rgba(20, 18, 38, 0.65)',
          edge: 'rgba(255, 255, 255, 0.08)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        poster: ['Bungee', 'Impact', 'system-ui', 'sans-serif'],
        shade: ['"Bungee Shade"', 'Impact', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 24px rgba(61, 240, 255, 0.55)',
        'glow-gold': '0 0 28px rgba(255, 232, 61, 0.7)',
        'glow-pink': '0 0 28px rgba(255, 61, 164, 0.7)',
        'glow-lime': '0 0 28px rgba(164, 255, 61, 0.7)',
        'soft-3d':
          '0 1px 0 rgba(255,255,255,0.18) inset, 0 -2px 0 rgba(0,0,0,0.35) inset, 0 6px 18px rgba(0,0,0,0.45)',
        sticker: '6px 6px 0 0 #0a0708',
        'sticker-lg': '8px 8px 0 0 #0a0708',
        'sticker-pink': '5px 5px 0 0 #ff3da4',
        'sticker-cyan': '5px 5px 0 0 #3df0ff',
      },
      keyframes: {
        scorePop: {
          '0%': { transform: 'scale(0.6) rotate(-8deg)', opacity: '0' },
          '60%': { transform: 'scale(1.18) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
        screenPulse: {
          '0%,100%': { boxShadow: 'inset 0 0 0 0 rgba(0,240,255,0)' },
          '50%': { boxShadow: 'inset 0 0 80px 8px rgba(61,240,255,0.35)' },
        },
        miss: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px) rotate(-1deg)' },
          '40%': { transform: 'translateX(5px) rotate(1deg)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(2px)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-1.4deg)' },
          '50%': { transform: 'rotate(1.6deg)' },
        },
        rainbowShift: {
          '0%,100%': { filter: 'hue-rotate(0deg)' },
          '50%': { filter: 'hue-rotate(60deg)' },
        },
      },
      animation: {
        scorePop: 'scorePop 380ms cubic-bezier(0.2, 1, 0.3, 1) both',
        screenPulse: 'screenPulse 600ms ease-out',
        miss: 'miss 380ms ease-in-out',
        fadeIn: 'fadeIn 240ms ease-out both',
        wiggle: 'wiggle 4s ease-in-out infinite',
        rainbowShift: 'rainbowShift 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
