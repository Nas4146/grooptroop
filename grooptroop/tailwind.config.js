const preset = require('nativewind/preset');
module.exports = {
  // 👇 1. Tell Tailwind where to scan for class names
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],

  presets: [preset],
  theme: { extend: {} },
  plugins: [],
};