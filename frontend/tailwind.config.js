/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0f766e",
        secondary: "#2563eb",
        accent: "#06b6d4",
        surface: "#f8fafc",
      },
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        soft: "0 12px 30px -12px rgba(15, 23, 42, 0.25)",
      },
    },
  },
  plugins: [],
};
