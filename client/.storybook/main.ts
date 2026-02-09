import type { StorybookConfig } from '@storybook/react-vite'
import path from 'path'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|js|jsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-viewport',
    '@storybook/addon-a11y',
    '@storybook/addon-toolbars',
    'storybook-addon-dark-mode'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  core: {
    builder: '@storybook/builder-vite'
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop: { name: string; parent?: { fileName: string } }) => {
        if (prop.name.startsWith('aria-')) {
          return true
        }
        if (prop.name.startsWith('data-')) {
          return true
        }
        return prop.parent ? !/node_modules/.test(prop.parent.fileName) : true
      }
    }
  },
  viteFinal: async (config: Record<string, any>) => {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@client': path.resolve(__dirname, '../src')
        }
      }
    }
  }
}

export default config
