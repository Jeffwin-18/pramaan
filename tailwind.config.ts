import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F6F3', surface: '#FFFFFF', ink: '#16191D', muted: '#5D636B', line: '#E3E1DC',
        accent: { DEFAULT: '#1F3A5F', hover: '#18304F' }, saffron: '#B4692E',
        ok: '#1E7A4C', warn: '#B7791F', bad: '#B42318',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: { DEFAULT: '4px', sm: '3px', md: '5px', lg: '6px' },
      fontSize: { base: ['13px', '20px'], sm: ['12px', '16px'], xs: ['11px', '14px'] },
    },
  },
  plugins: [],
} satisfies Config;
