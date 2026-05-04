/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Premium Dark Neutral Scale (Black & White only) */
        surface: {
          0:  '#000000',
          50: '#0c0c0c',
          100: '#141414',
          200: '#1a1a1a',
          300: '#242424',
          400: '#333333',
        },
        muted: {
          DEFAULT: '#d4d4d8',
          foreground: '#a1a1aa',
        },
        primary: {
          DEFAULT: '#ffffff',
          foreground: '#000000',
        },
      },
      fontFamily: {
        sans: ['Cabinet-Grotesk', 'Inter', 'Arial', 'Helvetica Neue', 'Helvetica', 'sans-serif'],
      },
      animation: {
        'fade-in':  'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'gradient-x': 'gradientX 15s ease infinite',
        'blob': 'blob 10s infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        blob: {
          '0%':   { transform: 'translate(0px, 0px) scale(1)' },
          '33%':  { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%':  { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
