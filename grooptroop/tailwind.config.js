/** @type {import('tailwindcss').Config} */
module.exports = {
  // 👇 1. Tell Tailwind where to scan for class names
  content: [
    "./src.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./styles/commonStyles.css"
  ],

  // 👇 2. Load NativeWind’s React-Native preset
  presets: [require("nativewind/preset")],

  // 👇 3. Your custom tokens (optional)
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: "#00d0ff" },
        secondary: { DEFAULT: "#ff6b6b" }
      }
    }
  },

  // (Optional) add Tailwind plugins here
  plugins: [],
};