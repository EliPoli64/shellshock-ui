/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-black': '#0a0a0a',
        'table-green': '#1a2f1a',
        'neon-yellow': '#c8ff00',
        'danger-red': '#8b0000',
        'text-cream': '#e8e0d4',
      },
      fontFamily: {
        'special-elite': ['"Special Elite"', 'monospace'],
        'inter': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
