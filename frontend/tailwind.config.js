/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#6C4DFF',
        secondary: '#2ED1D1',
        accent: '#FF6FB5',
        background: '#F5F7FB',
        text: '#1F1F1F',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6C4DFF 0%, #8B6FFF 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #2ED1D1 0%, #4FE0E0 100%)',
        'gradient-accent': 'linear-gradient(135deg, #FF6FB5 0%, #FF8FC7 100%)',
        'gradient-hero': 'linear-gradient(135deg, #6C4DFF 0%, #2ED1D1 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(108, 77, 255, 0.05) 0%, rgba(46, 209, 209, 0.05) 100%)',
      },
    },
  },
  plugins: [],
}
