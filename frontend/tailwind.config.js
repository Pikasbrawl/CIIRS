/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cc: {
          bg: '#F4F8FC',
          sidebar: '#EDF4FC',
          card: '#FFFFFF',
          border: '#E1EAF2',
          primary: '#2463A6',
          primaryHover: '#1B4E85',
          primaryLight: '#DCEBFA',
          secondary: '#4B83B8',
          heading: '#172F50',
          body: '#526477',
          muted: '#8291A2',
          connected: '#16A36A',
          warning: '#E5A12B',
          critical: '#E34D59',
          offline: '#8795A5',
          marker: '#2677D9'
        },
        ciirs: {
          bg: '#F4F8FC',
          card: '#FFFFFF',
          cardBorder: '#E1EAF2',
          accent: '#2463A6',
          accentHover: '#1B4E85',
          danger: '#E34D59',
          warning: '#E5A12B',
          success: '#16A36A',
          police: '#2463A6',
          medical: '#E34D59',
          fire: '#E5A12B'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    },
  },
  plugins: [],
}
