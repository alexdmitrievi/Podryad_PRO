import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0088cc',
          'blue-dark': '#0077b3',
          red: '#FC3F1D',
          'red-dark': '#e63519',
        },
      },
    },
  },
  plugins: [],
};

export default config;
