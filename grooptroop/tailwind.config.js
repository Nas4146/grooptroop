/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
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