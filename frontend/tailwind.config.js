/** @type {import('tailwindcss').Config} */
export default {
  content: {
    files: [
      './index.html',
      './src/**/*.{ts,tsx}',
    ],
  },
  theme: {
    extend: {
      colors: {
        primary: '#252951',
        secondary: '#414275',
        accent: '#635bff',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['SF Pro Display', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.3rem',
        sm: '0.15rem',
      },
      boxShadow: {
        soft: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        medium: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        heavy: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
