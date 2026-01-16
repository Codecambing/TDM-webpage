export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#ede4d7",
        navbar: "#d8cfc2",
        textmain: "#2e2a25",
        accent: "#6b4eff",
      },
      fontFamily: {
        navbar: ["Cinzel", "serif"],
        body: ["Inter", "sans-serif"],
        'space-mono': ["Space Mono", "monospace"]
      },
    },
  },
  plugins: [],
};
