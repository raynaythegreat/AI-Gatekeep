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
        // Map CSS variables to Tailwind utility names
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)', // Assuming --primary is also used for primary color utility
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        border: 'var(--border)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',

        // Bold blue color scale for flat design
        blue: {
          50: '#E8F4FF',      // Very light blue
          100: '#D1E9FF',     // Light blue
          200: '#A6D8FF',     // Soft blue
          300: '#79B8FF',     // Medium-light blue
          400: '#58A6FF',     // VS Code blue (primary dark mode)
          500: '#0366D6',     // GitHub blue (primary light mode)
          600: '#0252B8',     // Darker blue
          700: '#013A7F',     // Deep blue
          800: '#012654',     // Very deep blue
          900: '#011A3A',     // Almost black blue
          950: '#000D1F',     // Deepest blue
        },
        surface: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#181818',
          950: '#09090B',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Playfair Display', 'Merriweather', 'serif'], // More professional display font
      },
      boxShadow: {
        'flat': '0 2px 0 0 rgba(0, 0, 0, 0.2)',
        'flat-lg': '0 4px 0 0 rgba(0, 0, 0, 0.2)',
        'flat-xl': '0 6px 0 0 rgba(0, 0, 0, 0.25)',
        'flat-blue': '0 3px 0 0 rgba(3, 102, 214, 0.5)',
        'flat-blue-lg': '0 4px 0 0 rgba(3, 102, 214, 0.6)',
        'none': 'none',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '0.875rem',
        '3xl': '1rem',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '5': '5px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
