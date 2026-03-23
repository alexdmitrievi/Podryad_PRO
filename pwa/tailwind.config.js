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
          bg:     '#0f1117',
          card:   '#1a1d27',
          border: '#2a2d3a',
          text:   '#e4e4e7',
          muted:  '#71717a',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['var(--font-manrope)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)',
        'elevated': '0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.06)',
        'glow': '0 0 20px rgba(47,91,255,0.25)',
        'glow-lg': '0 0 40px rgba(47,91,255,0.3)',
        'inner-soft': 'inset 0 2px 4px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        'card': '1rem',
        'button': '1rem',
        'input': '1rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-up': 'slide-up 0.6s ease-out forwards',
        'scale-in': 'scale-in 0.4s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'slide-in-bottom': 'slide-in-bottom 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'slide-in-bottom': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.8)' },
        },
      },
    },
  },
  plugins: [],
}
