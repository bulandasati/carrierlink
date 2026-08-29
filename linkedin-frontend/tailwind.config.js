/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        linkedin: {
          DEFAULT: '#0a66c2',
          hover: '#004182',
          light: '#e8f2ff',
          bg: '#f4f2ee',
          card: '#ffffff',
          darkBg: '#0f172a',
          darkCard: '#1e293b',
          border: '#e0e0e0',
          text: '#000000e6',
          textSecondary: '#00000099',
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
        'card': '0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)',
        'card-hover': '0 0 0 1px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.1)',
      }
    },
  },
  plugins: [],
}

