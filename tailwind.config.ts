import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FBFCFC',
          dark: '#F0F4F3',
        },
        ink: {
          DEFAULT: '#0D1615',
          soft: '#33433F',
        },
        sage: {
          50: '#EAF6F3',
          100: '#CFEBE4',
          200: '#9FD6C8',
          300: '#69BCAA',
          400: '#329E86',
          500: '#0E7C66',
          600: '#0B6857',
          700: '#0B5D4F',
          800: '#0A4A40',
        },
        clay: {
          300: '#E8B79A',
          400: '#D3925F',
          500: '#C1663D',
          600: '#A6532F',
        },
        stone: {
          DEFAULT: '#E7ECEA',
          dark: '#D7DEDB',
        },
      },
      fontFamily: {
        display: ['Manrope', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['"Noto Kufi Arabic"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 20px 60px -25px rgba(13, 22, 21, 0.22)',
        card: '0 10px 30px -15px rgba(13, 22, 21, 0.15)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        marquee: 'marquee 24s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
