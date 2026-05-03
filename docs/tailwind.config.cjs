/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#f4f8ff',
        mist: '#3f5680',
        accent: '#0b7bff',
      },
      boxShadow: {
        glow: '0 14px 44px -18px rgba(11, 123, 255, 0.55)',
      },
      animation: {
        drift: 'drift 18s linear infinite',
        pulseSoft: 'pulseSoft 2.6s ease-in-out infinite',
      },
      keyframes: {
        drift: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-140px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.9' },
        },
      },
    },
  },
  plugins: [],
};
