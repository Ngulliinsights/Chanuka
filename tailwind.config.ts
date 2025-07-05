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
          'Segoe UI', 
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
            h1: {
              color: 'hsl(var(--foreground))',
              fontWeight: '600',
            },
            h2: {
              color: 'hsl(var(--foreground))',
              fontWeight: '600',
            },
            h3: {
              color: 'hsl(var(--foreground))',
              fontWeight: '600',
            },
            h4: {
              color: 'hsl(var(--foreground))',
              fontWeight: '600',
            },

            // Link styles with hover states
            a: {
              color: 'hsl(var(--primary))',
              '&:hover': {
                color: 'hsl(var(--primary-dark))',
              },
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
    function({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        // Enhanced card component with hover effects
        '.card-enhanced': {
          '@apply bg-card border rounded-lg shadow-enhanced hover:shadow-enhanced-lg transition-all duration-200': {},
        },

        // Card hover animation for interactive elements
        '.card-hover': {
          '@apply hover:transform hover:-translate-y-1 hover:shadow-enhanced-lg transition-all duration-200': {},
        },

        // Enhanced button styling with focus states
        '.btn-enhanced': {
          '@apply px-4 py-2 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2': {},
        },

        // Status indicator component for user feedback
        '.status-indicator': {
          '@apply inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium': {},
        },

        // Verification meter for progress displays
        '.verification-meter': {
          '@apply flex-1 h-2 bg-border rounded-full overflow-hidden': {},
        },

        // Risk level indicators with semantic colors
        '.risk-low': {
          '@apply bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': {},
        },
        '.risk-medium': {
          '@apply bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200': {},
        },
        '.risk-high': {
          '@apply bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200': {},
        },
      };
      addUtilities(newUtilities);
    }
  ],
} satisfies Config;