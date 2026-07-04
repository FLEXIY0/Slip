import type { Config } from "tailwindcss";

/**
 * Slip design system — monochrome, calm, engineered.
 * Colours are driven by CSS variables (see src/index.css) so the exact same
 * Tailwind classes resolve correctly in both light and dark themes.
 */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        // Semantic tokens — all resolve to CSS vars.
        bg: "hsl(var(--bg) / <alpha-value>)",
        "bg-subtle": "hsl(var(--bg-subtle) / <alpha-value>)",
        "bg-elevated": "hsl(var(--bg-elevated) / <alpha-value>)",
        "bg-inset": "hsl(var(--bg-inset) / <alpha-value>)",
        fg: "hsl(var(--fg) / <alpha-value>)",
        "fg-muted": "hsl(var(--fg-muted) / <alpha-value>)",
        "fg-subtle": "hsl(var(--fg-subtle) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        "border-strong": "hsl(var(--border-strong) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-fg": "hsl(var(--accent-fg) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
        "success-fg": "hsl(var(--success-fg) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        "danger-fg": "hsl(var(--danger-fg) / <alpha-value>)",
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "10px",
        md: "12px",
        lg: "14px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 hsl(var(--shadow) / 0.04)",
        sm: "0 1px 3px 0 hsl(var(--shadow) / 0.06), 0 1px 2px -1px hsl(var(--shadow) / 0.06)",
        md: "0 4px 12px -2px hsl(var(--shadow) / 0.08), 0 2px 6px -2px hsl(var(--shadow) / 0.06)",
        lg: "0 12px 32px -8px hsl(var(--shadow) / 0.12), 0 4px 12px -4px hsl(var(--shadow) / 0.08)",
        pop: "0 8px 24px -6px hsl(var(--shadow) / 0.16)",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        display: ["clamp(2.25rem, 5vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.98)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
        shimmer: "shimmer 1.6s infinite",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
