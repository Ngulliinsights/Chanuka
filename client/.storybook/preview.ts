import type { Preview } from '@storybook/react'
import { DARK_MODE_EVENT_NAME } from 'storybook-addon-dark-mode'
import '../src/lib/design-system/theme/light.css'
import '../src/lib/design-system/theme/dark.css'
import '../src/lib/design-system/theme/high-contrast.css'
import '../src/styles/globals.css'
import { ThemeProvider } from '../src/lib/design-system/theme/theme-provider'
import React from 'react'

// Default theme
const theme = 'light'

// Global dark mode listener
if (typeof window !== 'undefined') {
  window.addEventListener(DARK_MODE_EVENT_NAME, ({ detail }) => {
    const isDark = detail.theme === 'dark'
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  })
}

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    darkMode: {
      current: theme,
      dark: {
        appBg: 'hsl(210 40% 15%)',
        appContentBg: 'hsl(210 40% 20%)',
        appBorderColor: 'hsl(210 40% 30%)',
        barBg: 'hsl(210 40% 10%)',
        barBorderColor: 'hsl(210 40% 25%)',
        barTextColor: 'hsl(210 40% 80%)',
        brandTitle: 'Chanuka Design System',
        brandUrl: '#'
      },
      light: {
        appBg: 'hsl(210 40% 98%)',
        appContentBg: 'hsl(210 40% 96%)',
        appBorderColor: 'hsl(210 40% 90%)',
        barBg: 'hsl(210 40% 100%)',
        barBorderColor: 'hsl(210 40% 95%)',
        barTextColor: 'hsl(210 40% 30%)',
        brandTitle: 'Chanuka Design System',
        brandUrl: '#'
      }
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px'
          }
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px'
          }
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1440px',
            height: '900px'
          }
        }
      }
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true
          },
          {
            id: 'aria-required-attr',
            enabled: true
          }
        ]
      }
    }
  },
  decorators: [
    (Story, { parameters }) => {
      const isDark = parameters.darkMode?.current === 'dark'
      
      React.useEffect(() => {
        document.documentElement.setAttribute(
          'data-theme',
          isDark ? 'dark' : 'light'
        )
      }, [isDark])

      return (
        <ThemeProvider initialTheme={isDark ? 'dark' : 'light'}>
          <div className="p-4">
            <Story />
          </div>
        </ThemeProvider>
      )
    }
  ]
}

export default preview
