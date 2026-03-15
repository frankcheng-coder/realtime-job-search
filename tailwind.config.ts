import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#122c34",
        mist: "#d5ece5",
        tide: "#4f6d7a",
        ember: "#d66853",
        sand: "#f4f1de",
        spruce: "#1f5c4a",
      },
      boxShadow: {
        panel: "0 20px 60px rgba(18, 44, 52, 0.12)",
      },
      fontFamily: {
        sans: ["'Instrument Sans'", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
