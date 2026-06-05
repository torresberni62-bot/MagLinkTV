/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Onest', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg0: '#070810',
        bg: '#050507',
        surface: {
          DEFAULT: '#111111',
          hover: '#1a1a1a',
          active: '#222222',
        },
        // Accent color based on OKLCH(0.7 0.16 250) - violet/blue
        accent: {
          DEFAULT: 'oklch(0.7 0.16 250)',
          soft: 'oklch(0.7 0.16 250 / 0.18)',
          muted: 'oklch(0.62 0.18 290)',
          deep: 'oklch(0.5 0.14 250)',
        },
        txt: {
          1: 'oklch(0.98 0.005 260)',
          2: 'oklch(0.74 0.02 260)',
          3: 'oklch(0.6 0.02 260)',
        },
        glass: 'rgba(255,255,255,0.055)',
        'glass-bd': 'rgba(255,255,255,0.1)',
      },
      boxShadow: {
        '4xl': '32px',
        'glow': '0 0 34px oklch(0.7 0.16 250 / 0.6), 0 18px 50px rgba(0,0,0,0.55)',
        'glow-sm': '0 0 26px oklch(0.7 0.16 250 / 0.5)',
      },
      backdropBlur: {
        xs: '12px',
        sm: '14px',
        md: '16px',
        lg: '20px',
        xl: '28px',
        '2xl': '30px',
        '3xl': '40px',
      },
      borderRadius: {
        '4xl': '34px',
        '5xl': '44px',
      },
      keyframes: {
        fadeUp:    { '0%': { opacity: 0, transform: 'translateY(24px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:    { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        scaleIn:   { '0%': { opacity: 0, transform: 'scale(0.92) translateY(12px)' }, '100%': { opacity: 1, transform: 'scale(1) translateY(0)' } },
        shimmer:   { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(200%)' } },
        pulseRing: { '0%, 100%': { opacity: 0.2, transform: 'scale(1)' }, '50%': { opacity: 0.5, transform: 'scale(1.05)' } },
        spin:      { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        heroIn:    { '0%': { opacity: 0, transform: 'scale(1.05)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        breathe:   { '0%,100%': { opacity: 0.5, transform: 'scale(0.95)' }, '50%': { opacity: 0.9, transform: 'scale(1.05)' } },
        pulse:     { '0%': { boxShadow: '0 0 0 0 oklch(0.65 0.23 18 / 0.6)' }, '70%': { boxShadow: '0 0 0 7px oklch(0.65 0.23 18 / 0)' }, '100%': { boxShadow: '0 0 0 0 oklch(0.65 0.23 18 / 0)' } },
        blink:     { '50%': { opacity: 0 } },
        wave:      { '0%,100%': { height: '8px' }, '50%': { height: '22px' } },
        slideIn:   { '0%': { transform: 'translateX(40px)', opacity: 0 }, '100%': { transform: 'none', opacity: 1 } },
      },
      animation: {
        'fade-up':    'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in':    'fadeIn 0.4s ease-out',
        'scale-in':   'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shimmer':    'shimmer 2s infinite linear',
        'pulse-ring': 'pulseRing 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'hero-in':    'heroIn 1.1s ease',
        'breathe':    'breathe 4s ease-in-out infinite',
        'pulse-dot':  'pulse 1.8s infinite',
        'blink':      'blink 1.1s steps(1) infinite',
        'wave':       'wave 1s infinite ease-in-out',
        'slide-in':   'slideIn 0.3s ease-out',
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
    },
  },
  plugins: [],
}
