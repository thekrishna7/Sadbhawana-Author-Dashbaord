/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0e9fe',
          200: '#bae6fd',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          900: '#0f172a',
          accent: '#4f46e5',
          gold: '#d97706',
          emerald: '#059669',
          rose: '#e11d48',
        },
        surface: {
          light: '#ffffff',
          dark: '#0b0f19',
          cardLight: '#f8fafc',
          cardDark: '#111827',
          borderLight: '#e2e8f0',
          borderDark: '#1f293d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(37, 99, 235, 0.25)',
        'glow-accent': '0 0 25px -5px rgba(79, 70, 229, 0.3)',
        'apple': '0 10px 30px -10px rgba(0, 0, 0, 0.08)',
        'apple-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
