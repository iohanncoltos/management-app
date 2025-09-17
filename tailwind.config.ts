import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "#0f1115",
        foreground: "#eaf0f6",
        card: {
          DEFAULT: "#161a22",
          foreground: "#eaf0f6",
        },
        popover: {
          DEFAULT: "#161a22",
          foreground: "#eaf0f6",
        },
        primary: {
          DEFAULT: "#b03636",
          foreground: "#eaf0f6",
        },
        secondary: {
          DEFAULT: "#1f242e",
          foreground: "#eaf0f6",
        },
        muted: {
          DEFAULT: "#1f242e",
          foreground: "#9aa4b2",
        },
        accent: {
          DEFAULT: "#9b2c2c",
          foreground: "#eaf0f6",
        },
        destructive: {
          DEFAULT: "#ff4d4f",
          foreground: "#fff",
        },
        border: "#1f242e",
        input: "#1f242e",
        ring: "#b03636",
        chart: {
          red: "#ff5c5c",
          teal: "#3bb2ad",
          yellow: "#e0b341",
          blue: "#3a7bd5",
          purple: "#8a4dff",
        },
      },
      borderRadius: {
        xl: "1.5rem",
        "2xl": "1.75rem",
        "3xl": "2.5rem",
      },
      boxShadow: {
        glow: "0 20px 45px rgba(155, 44, 44, 0.35)",
        card: "0 16px 32px rgba(0, 0, 0, 0.45)",
      },
      backgroundImage: {
        "panel-gradient": "linear-gradient(135deg, rgba(22,26,34,0.95), rgba(15,17,21,0.85))",
        "accent-glow": "radial-gradient(circle at top, rgba(176,54,54,0.45), transparent 60%)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(6px)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease forwards",
        "slide-up": "slide-up 0.4s ease forwards",
      },
      fontFamily: {
        sans: ["var(--font-inter), 'Inter', 'Segoe UI', sans-serif"],
        display: ["var(--font-rajdhani), 'Rajdhani', 'Segoe UI', sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
