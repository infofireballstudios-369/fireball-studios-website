module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: { charcoal: "#0F1115", cobalt: "#2563EB", amber: "#D97706", studioWhite: "#FFFFFF" },
      fontFamily: { heading: ["var(--font-space)", "sans-serif"], sans: ["var(--font-jakarta)", "sans-serif"] },
    },
  },
};
