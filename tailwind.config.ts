import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // METAFORGE brand palette (from the FIFO board reference)
        metaforge: {
          navy: "#0F172A",       // sidebar
          navy2: "#1E293B",      // sidebar hover / borders
          amber: "#F59E0B",      // active item + key highlights
          amberdark: "#B45309",
          gold: "#FACC15",       // admin badge
          surface: "#F1F5F9",    // main content background
        },
        // FIFO aging states
        fifo: {
          fresh: "#16A34A",      // < 30d  (green)
          aging: "#F59E0B",      // 30-60d (amber)
          critical: "#DC2626",   // > 60d  (red)
          pending: "#94A3B8",    // no location (gray)
        },
        // shadcn tokens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
export default config;
