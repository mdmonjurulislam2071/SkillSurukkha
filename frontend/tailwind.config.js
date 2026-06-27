/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#071a17",
        forest: "#0c3b32",
        mint: "#a7f3d0",
        leaf: "#10b981",
        sun: "#fbbf24",
        cloud: "#f6f8f4",
      },
      boxShadow: {
        glow: "0 18px 55px rgba(16, 185, 129, .22)",
        card: "0 16px 50px rgba(7, 26, 23, .10)",
      },
      backgroundImage: {
        "hero-grid": "linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
