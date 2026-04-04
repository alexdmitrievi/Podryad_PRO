/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#dce4ff',
          200: '#bac8ff',
          300: '#8fa5ff',
          400: '#6180ff',
          500: '#2F5BFF',
          600: '#2548d9',
          700: '#1d38b3',
          800: '#152a8c',
          900: '#1E2A5A',
        },
        accent: {
          DEFAULT: '#FF6B35',
          light: '#FF8F65',
          dark: '#E55A2B',
        },
        success: {
          50: '#ecfdf5',
          500: '#10b981',
          600: '#059669',
        },
        violet: {
          DEFAULT: '#6C5CE7',
          light: '#a29bfe',
        },
        surface: '#F7F9FC',
        max: {
          DEFAULT: '#2787F5',
          dark: '#1a6fd4',
          light: '#e8f1fd',
        },
        dark: {
          bg:     '#0a0c14',
          card:   '#12151f',
          border: '#1e2233',
          text:   '#e4e4e7',
          muted:  '#71717a',
        },
        podryad: {
          primary:     '#2d35a8',
          dark:        '#1a1f5c',
          light:       '#4a52c9',
          gold:        '#f5a623',
          goldLight:   '#ffd666',
          surface:     '#f8f9fc',
          surfaceDark: '#0f1129',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['var(--font-manrope)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'card-hover': '0 20px 40px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.04)',
        'elevated': '0 24px 48px rgba(0,0,0,0.12), 0 12px 24px rgba(0,0,0,0.06)',
        'glow': '0 0 30px rgba(47,91,255,0.2)',
        'glow-hover': '0 8px 30px rgba(47,91,255,0.35)',
        'glow-lg': '0 0 60px rgba(47,91,255,0.25)',
        'glow-accent': '0 0 30px rgba(255,107,53,0.2)',
        'inner-soft': 'inset 0 2px 4px rgba(0,0,0,0.04)',
        'glass': '0 8px 32px rgba(0,0,0,0.08)',
        'hero': '0 32px 64px rgba(0,0,0,0.2)',
      },
      borderRadius: {
        'card': '1.25rem',
        'button': '1rem',
        'input': '1rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      animation: {
        'fade-in': 'fade-in 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-up': 'slide-up 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in': 'scale-in 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'float': 'float 4s ease-in-out infinite',
        'slide-in-bottom': 'slide-in-bottom 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'pulse-dot': 'pulse-dot 2.5s ease-in-out infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'marquee': 'marquee 30s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'slide-in-bottom': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.8)' },
        },
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'shimmer': {
          '0%': { 'background-position': '-200% 0' },
          '100%': { 'background-position': '200% 0' },
        },
        'marquee': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'radial-gradient(at 40% 20%, #2F5BFF33 0px, transparent 50%), radial-gradient(at 80% 0%, #6C5CE722 0px, transparent 50%), radial-gradient(at 0% 50%, #2F5BFF11 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}
