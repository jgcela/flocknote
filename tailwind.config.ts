import type { Config } from "tailwindcss";

/**
 * Warm, high-contrast palette. Every text/background pairing used in the UI
 * meets WCAG AA (4.5:1) at normal sizes; body copy is 18px.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: { 50: "#FFFDF8", 100: "#FBF6EC", 200: "#F4EAD8", 300: "#E9D9BC" },
        bark: { 500: "#7A5A43", 700: "#4E3626", 900: "#2E2018" },
        clay: { 50: "#FBEDE5", 100: "#F6D9C8", 500: "#C2652F", 600: "#A64F1F", 700: "#873F18" },
        meadow: { 50: "#EEF4EA", 100: "#D9E6D1", 600: "#4D6E45", 700: "#3C5736" },
        sky: { 50: "#EAF2F7", 700: "#2F5873" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      fontSize: {
        base: ["1.125rem", { lineHeight: "1.7rem" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(46, 32, 24, 0.06), 0 4px 16px rgba(46, 32, 24, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
