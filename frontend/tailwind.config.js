/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable dark mode based on class
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}", // Also scan lib directory
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./store/**/*.{js,ts,jsx,tsx}",
    "./styles/**/*.{css,scss}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Palette from DESIGN_SYSTEM.md
        'brand-primary': '#0D9488',    // Deep Vibrant Teal
        'brand-secondary': '#6B46C1',  // Rich Purple
        'brand-dark': '#0B0F1A',       // Deep Dark Navy
        'brand-darker': '#05070A',     // True Black
        'alert-critical': '#EA580C',   // Electric Orange
        'alert-positive': '#059669',   // Saturated Green
        
        // Marketing Palette (Used in high-impact sections)
        'm-primary': '#0D9488',
        'm-secondary': '#6B46C1',
        'm-accent': '#0891B2',         // Cyan Accent
        'm-dark': '#0B0F1A',
        'm-text-muted': '#CBD5E1', // Brightened for contrast (slate-300)

        gray: {
          800: '#1F2937',             // Dark Gray (Card/Panel Base)
        },

        // WBS Category Functional Palette
        'wbs-green': '#059669',
        'wbs-blue': '#2563EB',
        'wbs-yellow': '#FBBF24',
        'wbs-magenta': '#DB2777',
        'wbs-cyan': '#06B6D4',
        'wbs-red': '#DC2626',
        'wbs-violet': '#7C3AED',
        'wbs-orange': '#EA580C',
      },
      spacing: {
        '20': '5rem', // For sidebar collapsed width
        '64': '16rem', // For sidebar expanded width
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        sora: ['Sora', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}