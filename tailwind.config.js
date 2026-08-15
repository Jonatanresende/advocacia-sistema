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
        accent:   'var(--accent)',
        primary:  'var(--primary)',
        brand:    'var(--brand)',
        success:  'var(--success)',
        warning:  'var(--warning)',
        danger:   'var(--danger)',
      },
      borderRadius: {
        card:  '12px',
        modal: '16px',
      },
      boxShadow: {
        card:     'var(--shadow-card)',
        modal:    'var(--shadow-modal)',
        elevated: 'var(--shadow-elevated)',
      },
    },
  },
  plugins: [],
}
