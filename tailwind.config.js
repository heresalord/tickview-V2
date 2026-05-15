/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Circular Std"', 'system-ui', 'sans-serif'],
        body: ['"Circular Std"', 'system-ui', 'sans-serif'],
        mono: ['"Source Code Pro"', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0f7ff',
          100: '#e0effe',
          200: '#baddfd',
          300: '#7dc3fb',
          400: '#38a4f6',
          500: '#0e87e3',
          600: '#0268c1',
          700: '#03539d',
          800: '#074782',
          900: '#0c3c6c',
          950: '#082549',
        },
        surface: {
          0:   '#ffffff',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
        focus: '0 0 0 3px rgb(14 135 227 / 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease both',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 },                  to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
}
