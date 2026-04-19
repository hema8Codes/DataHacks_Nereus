import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        deep:   "#0B3D5C",   // deep ocean
        teal:   "#117A8B",   // mid water
        accent: "#E07A5F",   // heat anomaly
        gold:   "#C9A227",
        sand:   "#F4F1EC",
        ink:    "#0a0e15",   // page background
        panel:  "#0f1620",   // panel background
        border: "#1f2a36",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
