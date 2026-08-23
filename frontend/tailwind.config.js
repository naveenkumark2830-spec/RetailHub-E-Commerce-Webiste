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
          blue: '#0071DC',       // Walmart signature primary blue
          navy: '#0046BE',       // Deep enterprise navy
          dark: '#041E42',       // Dark retail header accent
          yellow: '#FFC220',     // Walmart spark yellow accent
          yellowHover: '#E5AC12',
          lightBg: '#F2F8FD',    // Clean soft retail slate-blue tint
          grayBg: '#F7F8F9',
          card: '#FFFFFF',
          border: '#E1E6EB',
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
