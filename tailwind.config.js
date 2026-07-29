/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        accent: '#C9A84C',
        primary: '#1C2B3A',
      },
      borderRadius: {
        card: '12px',
        modal: '16px',
      },
    },
  },
  plugins: [],
}
