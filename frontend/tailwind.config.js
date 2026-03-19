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
        primary: '#1E40AF',
        secondary: '#3B82F6',
        accent: '#60A5FA',
        background: '#F1F5F9',
        text: '#0F172A',
        'corp-navy': '#0F2A5C',
        'corp-blue': '#1E40AF',
        'corp-mid': '#3B82F6',
        'corp-light': '#DBEAFE',
        'corp-slate': '#64748B',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
        'gradient-accent': 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
        'gradient-hero': 'linear-gradient(135deg, #0F2A5C 0%, #1E40AF 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(30, 64, 175, 0.04) 0%, rgba(59, 130, 246, 0.04) 100%)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
