import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        foreground: '#f4f4f5',
        surface: {
          DEFAULT: '#0f0f18',
          hover: '#12121a'
        },
        card: {
          DEFAULT: '#0f0f18',
          foreground: '#f4f4f5'
        },
        muted: {
          DEFAULT: '#27272a',
          foreground: '#a1a1aa'
        },
        border: 'rgba(255, 255, 255, 0.08)',
        ring: '#3b82f6',
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171'
      }
    }
  },
  plugins: []
} satisfies Config;
