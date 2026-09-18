import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Consistent brand palette: dark navy base + gold accent
        // (matches the design system used across the rest of the product line)
        navy: {
          950: "#050B14",
          900: "#0A1220",
          800: "#101B2D",
          700: "#1B2A42"
        },
        gold: {
          400: "#E8C468",
          500: "#D4AF37",
          600: "#B8912B"
        }
      },
      fontFamily: {
        arabic: ["Cairo", "Tajawal", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
