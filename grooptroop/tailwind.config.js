const preset = require('nativewind/preset');
module.exports = {
  // 👇 1. Tell Tailwind where to scan for class names
  content: [
    './src/styles/commonStyles.css',        // CSS entry
    './src/**/*.{js,jsx,ts,tsx}',           // app code
    './components/**/*.{js,jsx,ts,tsx}',
  ],

  presets: [require('nativewind/preset')],
  theme: { extend: {} },
};