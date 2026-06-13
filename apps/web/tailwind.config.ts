import type { Config } from "tailwindcss";

/**
 * SpartArena theme — dark arena with bronze/gold + crimson accents on near-black.
 * Color values mirror BRAND_COLORS in @spartarena/shared so theming stays in sync.
 */
const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0B0E",
        surface: "#16161B",
        "surface-2": "#1E1E26",
        foreground: "#F5F1E6",
        muted: "#8A8578",
        gold: {
          DEFAULT: "#C8A24B",
          soft: "#E0C277",
          dark: "#9A7A33",
        },
        crimson: {
          DEFAULT: "#B23A48",
          soft: "#D45A68",
          dark: "#7E2832",
        },
        success: "#4B9C6E",
        border: "rgba(200, 162, 75, 0.18)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(200, 162, 75, 0.18)",
        "glow-crimson": "0 0 40px rgba(178, 58, 72, 0.22)",
        card: "0 8px 30px rgba(0, 0, 0, 0.45)",
      },
      backgroundImage: {
        "arena-radial":
          "radial-gradient(1200px 600px at 50% -10%, rgba(200,162,75,0.12), transparent 60%)",
        "gold-gradient": "linear-gradient(135deg, #E0C277 0%, #C8A24B 50%, #9A7A33 100%)",
        "crimson-gradient": "linear-gradient(135deg, #D45A68 0%, #B23A48 60%, #7E2832 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "highlight-fade": {
          "0%": { backgroundColor: "rgba(200, 162, 75, 0.22)" },
          "100%": { backgroundColor: "rgba(200, 162, 75, 0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "highlight-fade": "highlight-fade 2.8s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
