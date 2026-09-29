/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],

  theme: {
    extend: {
      /*
       * ============================================================
       * BRAND COLORS
       * ============================================================
       * Primary CRM accent.
       * Existing brand-* classes are preserved.
       */
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },

        /*
         * Semantic colors for CRM states.
         * These don't replace the existing Tailwind colors.
         */
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },

        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },

        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },

        info: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
      },

      /*
       * ============================================================
       * TYPOGRAPHY
       * ============================================================
       */
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },

      fontSize: {
        '2xs': [
          '0.6875rem',
          {
            lineHeight: '1rem',
          },
        ],
      },

      /*
       * ============================================================
       * BORDER RADIUS
       * ============================================================
       * Gives the application a consistent modern SaaS/CRM look.
       */
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl': '1.5rem',
      },

      /*
       * ============================================================
       * SHADOWS
       * ============================================================
       * Existing names are preserved.
       */
      boxShadow: {
        card:
          '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.03)',

        'card-hover':
          '0 4px 12px -4px rgb(15 23 42 / 0.10), 0 2px 6px -2px rgb(15 23 42 / 0.05)',

        pop:
          '0 8px 24px -6px rgb(16 24 40 / 0.12), 0 2px 6px -2px rgb(16 24 40 / 0.06)',

        soft:
          '0 2px 8px -2px rgb(15 23 42 / 0.06), 0 1px 3px -1px rgb(15 23 42 / 0.04)',

        dropdown:
          '0 12px 30px -8px rgb(15 23 42 / 0.16), 0 4px 10px -4px rgb(15 23 42 / 0.08)',

        modal:
          '0 24px 60px -16px rgb(15 23 42 / 0.22), 0 8px 24px -8px rgb(15 23 42 / 0.10)',

        'inner-soft':
          'inset 0 1px 2px rgb(15 23 42 / 0.04)',
      },

      /*
       * ============================================================
       * TRANSITIONS
       * ============================================================
       */
      transitionDuration: {
        0: '0ms',
        150: '150ms',
        200: '200ms',
        250: '250ms',
        300: '300ms',
      },

      /*
       * ============================================================
       * ANIMATIONS
       * ============================================================
       * Existing animations are preserved.
       */
      keyframes: {
        'fade-in': {
          from: {
            opacity: '0',
          },
          to: {
            opacity: '1',
          },
        },

        'slide-up': {
          from: {
            opacity: '0',
            transform: 'translateY(8px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },

        'slide-in-right': {
          from: {
            transform: 'translateX(100%)',
          },
          to: {
            transform: 'translateX(0)',
          },
        },

        'slide-in-left': {
          from: {
            transform: 'translateX(-100%)',
          },
          to: {
            transform: 'translateX(0)',
          },
        },

        'grow-bar': {
          from: {
            transform: 'scaleY(0)',
          },
          to: {
            transform: 'scaleY(1)',
          },
        },

        /*
         * Small UI animations for cards and interactive elements.
         */
        'scale-in': {
          from: {
            opacity: '0',
            transform: 'scale(0.97)',
          },
          to: {
            opacity: '1',
            transform: 'scale(1)',
          },
        },

        'dropdown-in': {
          from: {
            opacity: '0',
            transform: 'translateY(-4px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },

        'pulse-soft': {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.65',
          },
        },
      },

      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 180ms ease-out',
        'slide-in-right': 'slide-in-right 220ms ease-out',
        'slide-in-left': 'slide-in-left 220ms ease-out',
        'grow-bar': 'grow-bar 400ms ease-out',

        'scale-in': 'scale-in 160ms ease-out',
        'dropdown-in': 'dropdown-in 150ms ease-out',
        'pulse-soft': 'pulse-soft 1.8s ease-in-out infinite',
      },

      /*
       * ============================================================
       * Z-INDEX
       * ============================================================
       * Helps keep drawers, dropdowns and modals predictable.
       */
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
        90: '90',
        100: '100',
      },

      /*
       * ============================================================
       * MAX WIDTH
       * ============================================================
       * Keeps desktop content readable while allowing large screens.
       */
      maxWidth: {
        '8xl': '1440px',
      },
    },
  },

  plugins: [],
}