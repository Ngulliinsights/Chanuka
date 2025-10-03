import type { Config } from "tailwindcss";

export default {
  // Dark mode configuration - using class strategy for manual control
  darkMode: ["class"],

  // Content paths for Tailwind to scan for classes
  content: [
    "./client/index.html", 
    "./client/src/**/*.{js,jsx,ts,tsx}"
  ],

  theme: {
    extend: {
      // Border radius system using CSS custom properties for consistency
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // Comprehensive color system using HSL and CSS custom properties
      // This approach provides better maintainability and theme switching capabilities
      colors: {
        // Core layout colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Card component colors
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Popover component colors
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        // Primary brand colors with enhanced variants
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(var(--primary-dark))",
        },

        // Secondary colors for supporting elements
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },

        // Muted colors for subtle elements
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },

        // Accent colors with hover states
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          hover: "hsl(var(--accent-hover))",
        },

        // Destructive actions (delete, remove, etc.)
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        // Form and interaction colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Enhanced semantic colors for better UX feedback
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        info: "hsl(var(--info))",

        // Text utility colors for consistent typography
        "text-light": "hsl(var(--text-light))",
        "gray-200": "hsl(var(--gray-200))",
        "gray-600": "hsl(var(--gray-600))",
        "gray-900": "hsl(var(--gray-900))",

        // Chart colors for data visualization
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        // Sidebar component colors for navigation
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },

      // Font family configuration prioritizing system fonts for performance
      fontFamily: {
        sans: [
          '"Segoe UI"', 
          'system-ui', 
          '-apple-system', 
          'BlinkMacSystemFont', 
          'sans-serif'
        ],
      },

      // Enhanced box shadow system for depth and elevation
      boxShadow: {
        'enhanced': '0 1px 4px rgba(0, 0, 0, 0.1)',
        'enhanced-lg': '0 6px 16px rgba(0, 0, 0, 0.12)',
        'enhanced-xl': '0 10px 25px rgba(0, 0, 0, 0.15)',
      },

      // Custom spacing values for specific design requirements
      spacing: {
        '18': '4.5rem',  // 72px - useful for component spacing
        '88': '22rem',   // 352px - useful for sidebar widths
      },

      // Animation keyframes for smooth UI transitions
      keyframes: {
        // Accordion animations for collapsible content
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },

        // Fade in animation for smooth element appearance
        "fade-in": {
          from: { 
            opacity: "0", 
            transform: "translateY(-10px)" 
          },
          to: { 
            opacity: "1", 
            transform: "translateY(0)" 
          },
        },

        // Slide up animation for notifications and modals
        "slide-up": {
          from: { 
            transform: "translateY(10px)", 
            opacity: "0" 
          },
          to: { 
            transform: "translateY(0)", 
            opacity: "1" 
          },
        },
      },

      // Animation definitions with optimized timing
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-in-out",
        "slide-up": "slide-up 0.2s ease-out",
      },

      // Typography configuration for consistent text styling
      typography: {
        DEFAULT: {
          css: {
            // Base text color using CSS custom properties
            color: 'hsl(var(--foreground))',

            // Heading styles with consistent weights
            'h1, h2, h3, h4': {
              color: 'hsl(var(--foreground))',
              fontWeight: '600',
            },

            // Link styles with hover states and better performance
            a: {
              color: 'hsl(var(--primary))',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              transition: 'color 0.2s ease-in-out',
              '&:hover': {
                color: 'hsl(var(--primary-dark))',
              },
            },

            // Code styling for better readability
            code: {
              backgroundColor: 'hsl(var(--muted))',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
            },

            // Blockquote styling for better visual hierarchy
            blockquote: {
              borderLeftColor: 'hsl(var(--border))',
              color: 'hsl(var(--muted-foreground))',
            },
          },
        },
      },
    },
  },

  // Plugin configuration for enhanced functionality
  plugins: [
    // Animation utilities for smooth transitions
    require("tailwindcss-animate"), 

    // Typography plugin for rich text content
    require("@tailwindcss/typography"),

    // Custom utility classes for common patterns
    function({ addUtilities, theme }: { addUtilities: any; theme: any }) {
      const newUtilities = {
        // Enhanced card component with hover effects
        '.card-enhanced': {
          backgroundColor: theme('colors.card.DEFAULT'),
          borderColor: theme('colors.border'),
          borderWidth: '1px',
          borderRadius: theme('borderRadius.lg'),
          boxShadow: theme('boxShadow.enhanced'),
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: theme('boxShadow.enhanced-lg'),
          },
        },

        // Card hover animation for interactive elements
        '.card-hover': {
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme('boxShadow.enhanced-lg'),
          },
        },

        // Enhanced button styling with focus states
        '.btn-enhanced': {
          paddingLeft: theme('spacing.4'),
          paddingRight: theme('spacing.4'),
          paddingTop: theme('spacing.2'),
          paddingBottom: theme('spacing.2'),
          borderRadius: theme('borderRadius.md'),
          fontWeight: '500',
          transition: 'all 0.2s ease-in-out',
          '&:focus': {
            outline: 'none',
            ringWidth: '2px',
            ringColor: theme('colors.ring'),
            ringOffsetWidth: '2px',
          },
        },

        // Status indicator component for user feedback
        '.status-indicator': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: theme('spacing.1'),
          paddingLeft: theme('spacing.2'),
          paddingRight: theme('spacing.2'),
          paddingTop: theme('spacing.1'),
          paddingBottom: theme('spacing.1'),
          borderRadius: theme('borderRadius.DEFAULT'),
          fontSize: theme('fontSize.xs'),
          fontWeight: '500',
        },

        // Verification meter for progress displays
        '.verification-meter': {
          flex: '1',
          height: theme('spacing.2'),
          backgroundColor: theme('colors.border'),
          borderRadius: theme('borderRadius.full'),
          overflow: 'hidden',
        },

        // Risk level indicators with semantic colors (optimized for performance)
        '.risk-low': {
          backgroundColor: 'rgb(220 252 231)', // green-100
          color: 'rgb(22 101 52)', // green-800
          '@media (prefers-color-scheme: dark)': {
            backgroundColor: 'rgb(20 83 45)', // green-900
            color: 'rgb(187 247 208)', // green-200
          },
        },
        
        '.risk-medium': {
          backgroundColor: 'rgb(254 249 195)', // yellow-100
          color: 'rgb(133 77 14)', // yellow-800
          '@media (prefers-color-scheme: dark)': {
            backgroundColor: 'rgb(113 63 18)', // yellow-900
            color: 'rgb(254 240 138)', // yellow-200
          },
        },
        
        '.risk-high': {
          backgroundColor: 'rgb(254 226 226)', // red-100
          color: 'rgb(153 27 27)', // red-800
          '@media (prefers-color-scheme: dark)': {
            backgroundColor: 'rgb(127 29 29)', // red-900
            color: 'rgb(254 202 202)', // red-200
          },
        },
      };
      addUtilities(newUtilities);
    }
  ],
} satisfies Config;