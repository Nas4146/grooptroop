import { create } from 'twrnc';

// Create the customized version with your theme directly in the config
const tw = create({
  ...require('../../tailwind.config.js'),
  // Make sure theme.extend.colors exists in your tailwind config
  // This is just a fallback in case it doesn't
  theme: {
    extend: {
      colors: {
        primary: '#78c0e1', // Sky blue 
        secondary: '#F43F5E', // Hot pink  
        accent: '#10B981', // Bright teal
        neutral: '#1F2937', // Dark slate
        light: '#F9FAFB', // Light gray
      }
    }
  }
});

export default tw;