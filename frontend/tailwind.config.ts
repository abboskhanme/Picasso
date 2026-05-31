import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral structure (clean SaaS)
        bg: "#f6f7f9",       // app background
        card: "#ffffff",     // surfaces
        sunken: "#f3f4f6",   // sunken / track fills
        border: "#e6e8eb",   // hairline borders
        line: "#eef0f2",     // inner dividers
        ink: "#0f1623",      // headings
        body: "#3a4150",     // body text
        muted: "#697586",    // secondary text
        faint: "#9aa2ad",    // tertiary text / placeholders

        // Brand — refined cocoa
        brand: {
          50: "#f7f2ed",
          100: "#ecdfd2",
          200: "#dcc3ad",
          500: "#8a5a34",
          600: "#774a2a",
          700: "#5f3a21",
          900: "#3c2616",
          DEFAULT: "#774a2a",
        },
        accent: "#c07d28",   // amber highlight, used sparingly

        // Semantic
        success: { DEFAULT: "#15915b", bg: "#e8f5ee", fg: "#0b6b41" },
        danger: { DEFAULT: "#d64545", bg: "#fbeaea", fg: "#a32626" },
        warn: { DEFAULT: "#c07c12", bg: "#fbf2dd", fg: "#855208" },
        info: { DEFAULT: "#2f6fd6", bg: "#e9f1fd", fg: "#1c4fa3" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      fontSize: {
        "2xs": ["11px", "15px"],
      },
      borderRadius: { card: "12px", btn: "9px", xl: "14px" },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16,24,40,0.05)",
        raise: "0 1px 3px 0 rgba(16,24,40,0.07), 0 1px 2px -1px rgba(16,24,40,0.06)",
        pop: "0 12px 34px -12px rgba(16,24,40,0.22), 0 4px 12px -4px rgba(16,24,40,0.10)",
        focus: "0 0 0 3px rgba(119,74,42,0.16)",
      },
    },
  },
  plugins: [],
} satisfies Config;
