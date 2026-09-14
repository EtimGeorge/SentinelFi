/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./store/**/*.{js,ts,jsx,tsx}",
    "./styles/**/*.{css,scss}",
  ], theme: {
    extend: {
      colors: {
        /* ── Core brand palette ───────────────────────────────────────── */
        "brand-primary": "#0D9488",   // Deep Vibrant Teal
        "brand-secondary": "#6B46C1", // Rich Purple - AI elements ONLY
        "brand-dark": "#0B0F1A",     // Deep Dark Navy (page bg)
        "brand-darker": "#05070A",   // True Black (overlays, sheets)

        /* ── Semantic status palette ──────────────────────────────────── */
        "alert-critical": "#EA580C", // Electric Orange, errors, over-budget
        "alert-positive": "#059669", // Saturated Green, on-track, positive trend
        "alert-warning": "#FBBF24", // Amber, warnings, near-limit

        /* ── Full gray scale (navy-cool, anchored to current #1F2937) ── */
        gray: {
          50:  "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0", 300: "#CBD5E1", 400: "#94A3B8", 500: "#64748B", 600: "#475569", 700: "#334155", 750: "#293548", // Mid-point between 700 and 800
          800: "#1F2937", // Anchor, card backgrounds, surfaces
          850: "#172033", // Between 800 and 900
          900: "#0F172A", // Page-level backgrounds, main content area
          950: "#020617", // Deepest backgrounds
        },

        /* ── WBS category palette (functional, per WBS node color) ──── */
        "wbs-green":   "#059669",
        "wbs-blue":    "#2563EB",
        "wbs-yellow":  "#FBBF24",
        "wbs-magenta": "#DB2777",
        "wbs-cyan":    "#06B6D4",
        "wbs-red":     "#DC2626",
        "wbs-violet":  "#7C3AED",
        "wbs-orange":  "#EA580C",

        /* ── Chart palette (extracted from hard-coded hex) ────────────── */
        "chart-grid":    "rgba(255,255,255,0.06)",
        "chart-axis":    "rgba(255,255,255,0.12)",
        "chart-tooltip": "#1F2937",
        "chart-budget":  "#0D9488",
        "chart-spent":   "#94A3B8",
        "chart-positive": "#059669",
        "chart-negative": "#EA580C",
        "chart-fill":    "rgba(13,148,136,0.08)",

        /* ── Semantic aliases (enforce purple=AI rule) ────────────────── */
        "ai-purple":  "#6B46C1",
        "opex-cyan":  "#0891B2",

        /* ── Marketing palette (landing/about/contact pages) ──────────── */
        "m-primary": "#0D9488",
        "m-secondary": "#6B46C1",
        "m-accent": "#059669",
        "m-dark": "#0B0F1A",
        "m-text-muted": "#CBD5E1",
      },

      /* ── Spacing scale ──────────────────────────────────────────────── */
      spacing: {
        20:  "5rem", 64:  "16rem", 128: "32rem", 144: "36rem",
      },

      /* ── Border radius scale (sm → xl for component hierarchy) ────── */
      borderRadius: {
        sm:  "6px",   // Controls, inputs, small chips
        md:  "8px",   // Buttons, badges, inline elements
        lg:  "10px",  // Cards (default)
        xl:  "14px",  // Modals, panels, elevated surfaces
        "2xl": "1rem", // Kept for legacy compat
        "3xl": "1.5rem", // Kept for legacy compat
        "4xl": "2rem",  // AI chat mobile sheet
      },

      /* ── Font families ──────────────────────────────────────────────── */
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },

      /* ── Typography scale (semantic, no wrapping) ──────────────────── */
      fontSize: {
        // Labels: small, semibold, mixed-case (replaces text-[10px] uppercase)
        "label": ["0.75rem", { lineHeight: "1rem", fontWeight: "600", letterSpacing: "0.01em" }],
        "label-sm": ["0.6875rem", { lineHeight: "0.875rem", fontWeight: "600", letterSpacing: "0.01em" }],

        // Values: financial figures with tabular nums, capped to prevent wrapping
        "value-lg": ["1.5rem", { lineHeight: "2rem", fontWeight: "600", fontFeatureSettings: '"tnum" on, "lnum" on', fontVariantNumeric: "tabular-nums" }],
        "value-md": ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600", fontFeatureSettings: '"tnum" on, "lnum" on', fontVariantNumeric: "tabular-nums" }],
        "value-sm": ["1rem", { lineHeight: "1.5rem", fontWeight: "600", fontFeatureSettings: '"tnum" on, "lnum" on', fontVariantNumeric: "tabular-nums" }],

        // Captions: regular weight, muted
        "caption": ["0.75rem", { lineHeight: "1rem", fontWeight: "400", color: "#94A3B8" }],

        // Legacy financial tokens (kept for backward compat during migration)
        "financial": ["0.875rem", { fontFeatureSettings: '"tnum" on, "lnum" on', fontVariantNumeric: "tabular-nums" }],
        "financial-lg": ["1.125rem", { fontFeatureSettings: '"tnum" on, "lnum" on', fontVariantNumeric: "tabular-nums" }],
        "financial-xl": ["1.5rem", { fontFeatureSettings: '"tnum" on, "lnum" on', fontVariantNumeric: "tabular-nums" }],
      },

      /* ── Box shadow elevation scale ─────────────────────────────────── */
      boxShadow: {
        "elev-none": "none",                                // Flat sections, dividers
        "elev-sm": "0 1px 2px 0 rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)", // Cards at rest
        "elev-md": "0 4px 12px -2px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)", // Interactive hover
        "elev-lg": "0 12px 32px -4px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",  // Modals, popovers
        "elev-xl": "0 24px 48px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.12)", // Floating panels
      },

      /* ── Transition timing ──────────────────────────────────────────── */
      transitionDuration: {
        0:    "0ms", 80:   "80ms", 120:  "120ms", 180:  "180ms", 200:  "200ms", 300:  "300ms", 400:  "400ms", 500:  "500ms", 600:  "600ms", 700:  "700ms", 800:  "800ms", 900:  "900ms",
      }, transitionTimingFunction: {
        "ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)", spring: "cubic-bezier(0.16, 1, 0.3, 1)", // Alias kept for legacy; both are the same curve
      },

      /* ── Animations ─────────────────────────────────────────────────── */
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite", float: "float 6s ease-in-out infinite",
        "fade-in": "fadeIn 180ms ease-out",
        "fade-out": "fadeOut 150ms ease-in",
        "slide-up": "slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slideInRight 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-out-right": "slideOutRight 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-left": "slideInLeft 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-out-left": "slideOutLeft 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        "zoom-in": "zoomIn 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "zoom-out": "zoomOut 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-out": "scaleOut 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        "spin-fast": "spin 600ms linear infinite",
        "spin-slow": "spin 2s linear infinite",
        "pulse-ai": "pulseAI 2s ease-in-out infinite", shimmer: "shimmer 1.5s ease-in-out infinite",
        "count-up": "countUp 600ms ease-out forwards",
        "stagger-60": "staggerIn 400ms ease-out forwards",
        "progress-fill": "progressFill 800ms ease-out forwards",
        "border-glow": "borderGlow 120ms ease-out",
        "button-press": "buttonPress 80ms cubic-bezier(0.16, 1, 0.3, 1)",
        "card-hover": "cardHover 120ms ease-out",
        "tooltip-show": "tooltipShow 400ms ease-out", skeleton: "skeleton 1.5s ease-in-out infinite",
      }, keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        }, fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        }, fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        }, slideUp: {
          "0%": { opacity: "0", transform: "translateY(24px) scale(0.95)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        }, slideDown: {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(16px)" },
        }, slideInRight: {
          "0%": { opacity: "0", transform: "translateX(32px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        }, slideOutRight: {
          "0%": { opacity: "1", transform: "translateX(0)" },
          "100%": { opacity: "0", transform: "translateX(32px)" },
        }, slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-32px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        }, slideOutLeft: {
          "0%": { opacity: "1", transform: "translateX(0)" },
          "100%": { opacity: "0", transform: "translateX(-32px)" },
        }, zoomIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        }, zoomOut: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.95)" },
        }, scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        }, scaleOut: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.9)" },
        }, pulseAI: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(99,102,241,0.5)" },
          "50%": { boxShadow: "0 0 0 16px rgba(99,102,241,0)" },
        }, shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        }, countUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        }, staggerIn: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        }, progressFill: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width)" },
        }, borderGlow: {
          "0%": { boxShadow: "0 0 0 0 rgba(13,148,136,0)" },
          "100%": { boxShadow: "0 0 0 4px rgba(13,148,136,0.3)" },
        }, buttonPress: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.96)" },
          "100%": { transform: "scale(1)" },
        }, cardHover: {
          "0%": { borderColor: "rgba(255,255,255,0.08)" },
          "100%": { borderColor: "rgba(13,148,136,0.5)" },
        }, tooltipShow: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        }, skeleton: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  }, plugins: [],
};
