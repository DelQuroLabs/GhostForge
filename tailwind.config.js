/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#0a0a12',
          panel: '#12121c',
          panel2: '#1a1a28',
          line: '#26263a',
          gold: '#f5b942',
          golddeep: '#c77f1a',
          ember: '#ff6b4a',
          ink: '#f2eee6',
          dim: '#a7a3b8',
        },
      },
      fontFamily: {
        serif: ['Georgia', "'Times New Roman'", 'serif'],
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
