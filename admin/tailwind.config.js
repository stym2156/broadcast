/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Sarabun', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          900: '#0b1020',
          800: '#111733',
          700: '#1a2147',
          600: '#252d5e',
        },
        accent: {
          500: '#10b981',
          600: '#059669',
        },
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 6px -1px rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [],
};
