import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1434CB', dark: '#0e2a9e' },
      },
    },
  },
  plugins: [],
};

export default config;
