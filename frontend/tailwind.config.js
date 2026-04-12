/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
      },
      colors: {
        primary: {
          light: '#60A5FA', // soft blue highlight
          DEFAULT: '#2563EB', // main blue
          dark: '#1E40AF', // dark blue
        },
        secondary: {
          light: '#DBEAFE',
          DEFAULT: '#3B82F6', // lighter blue
          dark: '#2563EB',
        },
        neutral: {
          50: '#F8FAFC',
          200: '#E5E7EB',
          700: '#374151',
        },
        status: {
          green: '#22C55E',
          yellow: '#F59E0B',
          red: '#EF4444',
          blue: '#3B82F6',
        }
      },
    },
  },
  plugins: [],
}
