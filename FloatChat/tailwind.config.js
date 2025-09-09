/** @type {import('tailwindcss').Config} */
export default {
  // This content array is the key part.
  // It tells Tailwind to scan all .jsx, .js, and .html files in the src directory and the root index.html.
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}