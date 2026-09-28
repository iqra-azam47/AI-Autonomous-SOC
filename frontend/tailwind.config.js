/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        soc: {
          bg: '#090d16',
          card: '#0f172a',
          'card-hover': '#1e293b',
          border: '#1e293b',
          'border-highlight': '#334155',
          text: '#f8fafc',
          muted: '#94a3b8',
          accent: '#0284c7',
          'accent-glow': '#0369a1',
        },
        severity: {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#f59e0b',
          low: '#3b82f6',
          info: '#64748b',
          success: '#10b981',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
