/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        retail: {
          navyDark: '#0B2A55',   // Deep/Navy Blue
          blue: '#0875E1',       // Retail Blue
          navy: '#065BB5',       // Medium Navy Blue
          yellow: '#FFC20A',     // Accent Yellow
          yellowHover: '#E5AD00',// Darker Yellow Hover
          bg: '#F5F7FA',         // Page Background
          card: '#FFFFFF',
          text: '#172033',       // Primary Text
          muted: '#667085',      // Muted Text
          border: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'retail': '0 2px 10px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        'retail-hover': '0 12px 30px rgba(0, 113, 220, 0.12), 0 4px 10px rgba(0, 0, 0, 0.06)',
        'haptic': '0 8px 24px rgba(4, 30, 66, 0.12)',
      },
      transitionTimingFunction: {
        'retail-ease': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        'haptic-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      }
    },
  },
  plugins: [],
}
