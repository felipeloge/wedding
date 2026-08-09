/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#404a32',
          dark: '#2a331d',
          light: '#bfcbab',
          container: '#404a32',
        },
        secondary: {
          DEFAULT: '#496644',
          container: '#caecc2',
        },
        gold: '#D4AF37',
        sage: {
          light: '#A3B18A',
        },
        background: '#fbf9f4',
        'surface-lowest': '#ffffff',
        'surface-low': '#f5f3ee',
        surface: '#f0eee9',
        border: '#E5E2DA',
        text: '#1b1c19',
        'text-muted': '#45483f',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 24px rgba(64, 74, 50, 0.08)',
        'card-hover': '0 4px 32px rgba(64, 74, 50, 0.12)',
      },
    },
  },
  plugins: [],
}
