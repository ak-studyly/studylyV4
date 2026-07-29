import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        serif: ["Fraunces", "serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#1D6B4A",
          light: "#E1F5EE",
          mid: "#5DCAA5",
          dark: "#085041",
        },
        accent: {
          DEFAULT: "#D85A30",
          light: "#FAECE7",
        },
      },
    },
  },
  plugins: [],
};

export default config;
