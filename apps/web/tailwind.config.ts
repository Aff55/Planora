import type { Config } from "tailwindcss";

/**
 * Planora design tokens. DESIGN.md holds the rationale and the measured
 * contrast ratios; this file is the machine-readable half of the same
 * decisions.
 *
 * Colours resolve to CSS variables so a single `.dark` class on <html> swaps
 * the whole system without any component knowing which theme is active.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        surface: "var(--surface)",
        sunken: "var(--sunken)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        hairline: "var(--hairline)",

        /** Identity and large graphics only — 3.56:1, never text or a fill. */
        accent: "var(--accent)",
        /** Primary button fill. White on it is 5.00:1. */
        "accent-strong": "var(--accent-strong)",
        "accent-hover": "var(--accent-hover)",
        /** Accent text on light: 5.64:1 on white, 5.14:1 on ground. */
        "accent-text": "var(--accent-text)",
        "accent-wash": "var(--accent-wash)",

        positive: "var(--positive)",
        "positive-wash": "var(--positive-wash)",
        critical: "var(--critical)",
        "critical-wash": "var(--critical-wash)",
        caution: "var(--caution)",
        "caution-wash": "var(--caution-wash)",

        "evidence-bg": "var(--evidence-bg)",
        "evidence-key": "var(--evidence-key)"
      },
      fontFamily: {
        /* Both families are OS-provided. No CDN, no self-hosted binary, no
           network request — which the privacy constraint forbids anyway. */
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI Variable Text",
          "Segoe UI",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        /* The evidence register: raw evidence objects, Pearson r, paired-day
           counts. Claims are set in sans; the arithmetic is set in mono. */
        evidence: [
          "ui-monospace",
          "SF Mono",
          "SFMono-Regular",
          "Cascadia Mono",
          "Segoe UI Mono",
          "Consolas",
          "Liberation Mono",
          "monospace"
        ]
      },
      fontSize: {
        display: ["2.75rem", { lineHeight: "1.08", letterSpacing: "-0.022em", fontWeight: "800" }],
        "title-1": ["2rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "800" }],
        "title-2": ["1.4375rem", { lineHeight: "1.25", letterSpacing: "-0.018em", fontWeight: "700" }],
        "title-3": ["1.1875rem", { lineHeight: "1.35", letterSpacing: "-0.012em", fontWeight: "650" }],
        body: ["1rem", { lineHeight: "1.55", letterSpacing: "-0.006em" }],
        callout: ["0.9375rem", { lineHeight: "1.45", letterSpacing: "-0.004em" }],
        footnote: ["0.8125rem", { lineHeight: "1.4" }],
        micro: ["0.75rem", { lineHeight: "1.3", letterSpacing: "0.06em" }]
      },
      borderRadius: {
        sm: "0.5rem",
        md: "0.75rem",
        lg: "1.125rem",
        xl: "1.5rem"
      },
      boxShadow: {
        /* Level 3 only. Resting content gets a hairline border and nothing else. */
        floating: "var(--shadow-floating)"
      },
      transitionTimingFunction: {
        enter: "cubic-bezier(0.32, 0.72, 0, 1)",
        press: "cubic-bezier(0.34, 1.4, 0.64, 1)"
      },
      transitionDuration: {
        press: "120ms",
        state: "180ms",
        route: "260ms"
      },
      maxWidth: {
        prose: "68ch",
        app: "80rem"
      },
      spacing: {
        /* Minimum comfortable touch target. */
        touch: "2.75rem"
      }
    }
  },
  plugins: []
};

export default config;
