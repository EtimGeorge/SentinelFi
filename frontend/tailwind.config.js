/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable dark mode based on class
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}", // Also scan lib directory
  ],
  theme: {
    extend: {
      colors: {
        // Core Palette from DESIGN_SYSTEM.md
        'brand-primary': '#0D9488',    // Deep Vibrant Teal
        'brand-secondary': '#6B46C1',  // Rich Purple
        'brand-dark': '#1E293B',       // Dark Navy (Base Background)
        'alert-critical': '#EA580C',   // Electric Orange (Corrected)
        'alert-positive': '#059669',   // Saturated Green
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
      },
    },
  },
  plugins: [],
}