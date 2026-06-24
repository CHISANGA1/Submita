import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { ink: '#172126', paper: '#f4f1e9', accent: '#dc6039' } } },
  plugins: [],
} satisfies Config
