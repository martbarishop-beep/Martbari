import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#17263E',
        accent: {
          DEFAULT: '#F47125',
          hover: '#D95F18',
        },
        surface: '#F5F7FA',
        ink: '#0F1A2C',
        muted: '#5B6577',
        success: '#16A34A',
        danger: '#DC2626',
      },
      fontFamily: {
        bangla: ['"Hind Siliguri"', 'sans-serif'],
        english: ['"Poppins"', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(23, 38, 62, 0.06), 0 1px 3px 0 rgba(23, 38, 62, 0.04)',
        card: '0 10px 30px -6px rgba(23, 38, 62, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
