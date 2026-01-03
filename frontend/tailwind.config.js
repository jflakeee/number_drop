/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F96D00',
          dark: '#D65A00',
          light: '#FF8533',
        },
        dark: {
          DEFAULT: '#222831',
          light: '#393E46',
        },
        light: {
          DEFAULT: '#F2F2F2',
          dark: '#E0E0E0',
        },
      },
      fontFamily: {
        game: ['Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
