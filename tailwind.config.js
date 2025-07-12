/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#009688',
        accent: '#FFA726',
        text: '#37474F',
        background: '#F5F7FA',
        success: '#10b981',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
};
