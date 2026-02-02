import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#0f172a",
        accent: "#22c55e",
        danger: "#ef4444",
        muted: "#64748b",
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
