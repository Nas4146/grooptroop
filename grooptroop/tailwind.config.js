/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',         // Add this to scan App.tsx
    './src/**/*.{js,jsx,ts,tsx}',     // app code
    './components/**/*.{js,ts,tsx}'
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',     /* Vibrant purple */
        secondary: '#F43F5E',   /* Hot pink */
        accent: '#10B981',      /* Bright teal */
        neutral: '#1F2937',     /* Dark slate */
        light: '#F9FAFB',       /* Light gray */
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
};