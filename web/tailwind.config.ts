import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#000000',
          surface: '#0a0a0a',
          elevated: '#111111',
          card: '#161616',
          input: '#0d0d0d',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a0a0a0',
          tertiary: '#666666',
          muted: '#444444',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.14)',
          bright: 'rgba(255,255,255,0.22)',
        },
        accent: {
          DEFAULT: '#ffffff',
          dim: '#888888',
        },
        success: '#4ade80',
        warning: '#fbbf24',
        danger: '#f87171',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        pill: '9999px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.4)',
        'card-hover': '0 0 0 1px rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.5)',
        glow: '0 0 48px -12px rgba(255,255,255,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'float-up': 'floatUp 2.5s ease-out forwards',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-200px) scale(1.1)', opacity: '0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
