import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF3E0',
          100: '#FFE0B3',
          200: '#FFCC80',
          300: '#FFB347',
          400: '#FF994D',
          500: '#FF6B35',
          600: '#E85D2A',
          700: '#D1491F',
          800: '#B33B19',
          900: '#8A2D12',
          950: '#571F0C',
        },
        orange: {
          50: '#FFF3E0',
          100: '#FFE0B3',
          200: '#FFCC80',
          300: '#FFB347',
          400: '#FF994D',
          500: '#FF6B35',
          600: '#E85D2A',
          700: '#D1491F',
          800: '#B33B19',
          900: '#8A2D12',
          950: '#571F0C',
        },
        amber: {
          50: '#FFFBEB',
          100: '#FFF7D1',
          200: '#FFEEA3',
          300: '#FFE674',
          400: '#FFDE46',
          500: '#FFD517',
          600: '#FFCB08',
          700: '#FFB200',
          800: '#FF9800',
          900: '#FF7E00',
          950: '#FF6300',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
