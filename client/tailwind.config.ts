import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      // Chanuka Design System - Border Radius
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      
      // Chanuka Design System - Colors
      colors: {
        // Base colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Card components
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        
        // Brand colors
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        
        // Utility colors
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        
        // Form elements
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        
        // Chanuka-specific civic engagement colors
        civic: {
          urgent: "hsl(var(--civic-urgent, 0 84% 60%))", // Red for urgent bills
          constitutional: "hsl(var(--civic-constitutional, 45 93% 47%))", // Gold for constitutional flags
          expert: "hsl(var(--civic-expert, 217 91% 60%))", // Blue for expert verification
          community: "hsl(var(--civic-community, 142 76% 36%))", // Green for community engagement
          transparency: "hsl(var(--civic-transparency, 262 83% 58%))", // Purple for transparency scores
        },
        
        // Status colors for bills
        status: {
          introduced: "hsl(var(--status-introduced, 210 40% 50%))",
          committee: "hsl(var(--status-committee, 45 93% 47%))",
          passed: "hsl(var(--status-passed, 142 76% 36%))",
          failed: "hsl(var(--status-failed, 0 84% 60%))",
          signed: "hsl(var(--status-signed, 142 76% 36%))",
          vetoed: "hsl(var(--status-vetoed, 0 84% 60%))",
        },
        
        // Chart colors for data visualization
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      
      // Chanuka Design System - Typography
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      
      fontSize: {
        // Semantic font sizes for civic content
        "bill-title": ["1.5rem", { lineHeight: "2rem", fontWeight: "600" }],
        "bill-summary": ["1rem", { lineHeight: "1.5rem", fontWeight: "400" }],
        "expert-badge": ["0.75rem", { lineHeight: "1rem", fontWeight: "500" }],
        "metric-value": ["2rem", { lineHeight: "2.25rem", fontWeight: "700" }],
        "metric-label": ["0.875rem", { lineHeight: "1.25rem", fontWeight: "500" }],
      },
      
      // Chanuka Design System - Spacing
      spacing: {
        // Civic-specific spacing
        "bill-card": "1.5rem",
        "dashboard-gap": "2rem",
        "filter-panel": "1rem",
        "touch-target": "2.75rem", // 44px minimum touch target
      },
      
      // Chanuka Design System - Animations
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "pulse-civic": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "pulse-civic": "pulse-civic 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      
      // Chanuka Design System - Breakpoints for responsive design
      screens: {
        "xs": "320px",
        "sm": "640px",
        "md": "768px",
        "lg": "1024px",
        "xl": "1280px",
        "2xl": "1536px",
        // Civic-specific breakpoints
        "mobile": "320px",
        "tablet": "768px",
        "desktop": "1024px",
      },
      
      // Chanuka Design System - Box shadows
      boxShadow: {
        "bill-card": "0 2px 8px rgba(0, 0, 0, 0.1)",
        "bill-card-hover": "0 4px 16px rgba(0, 0, 0, 0.15)",
        "filter-panel": "0 4px 12px rgba(0, 0, 0, 0.1)",
        "expert-badge": "0 1px 3px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
} satisfies Config;