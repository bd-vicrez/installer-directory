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
        vicrez: {
          red: '#e31937',
          'red-dark': '#b8142d',
          dark: '#0a0a0a',
          card: '#1a1a1a',
          'card-hover': '#222222',
          border: '#2a2a2a',
          muted: '#888888',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
