/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vael: {
          bg:         "#0a0a0f",
          card:       "#111118",
          hover:      "#16161f",
          border:     "#1e1e2e",
          purple:     "#7c6fff",
          "purple-dim":"#4a427f",
          teal:       "#2dd4bf",
          "text-1":   "#f0f0ff",
          "text-2":   "#9090b0",
          "text-3":   "#5a5a78",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "slide-up":   "slide-up 0.3s ease forwards",
        "fade-in":    "fade-in 0.2s ease forwards",
      },
    },
  },
  plugins: [],
};
