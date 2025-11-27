module.exports = {
  extends: [
    '../.eslintrc.cjs',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
    'plugin:jsx-a11y/recommended',
  ],
  env: {
    browser: true,
    es2022: true,
  },
  plugins: ['react', 'react-hooks', 'react-refresh', 'jsx-a11y'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Accessibility rules for Chanuka UI upgrade
    'jsx-a11y/no-autofocus': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/no-static-element-interactions': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/html-has-lang': 'error',
    'jsx-a11y/lang': 'error',
    'jsx-a11y/no-redundant-roles': 'error',
    'jsx-a11y/scope': 'error',
    'jsx-a11y/label-has-associated-control': 'error',
    
    // Design System Compliance Rules
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ImportDeclaration[source.value=/\\.module\\.css$/]',
        message: 'CSS modules are not allowed. Use design system classes instead. See: client/src/shared/design-system/README.md'
      },
      {
        selector: 'ImportDeclaration[source.value=/\\.css$/]:not([source.value*="design-system"]):not([source.value*="index.css"])',
        message: 'Direct CSS imports in components are not allowed. Use design system classes instead.'
      }
    ],
    // Allow inline styles for legitimate use cases, warn about static styling
    'react/forbid-dom-props': [
      'warn',
      {
        forbid: [
          {
            propName: 'style',
            message: 'Consider using design system classes for static styling. Inline styles are OK for dynamic values, calculations, and performance-critical animations.',
            allowedFor: [
              // Allow for components that commonly need dynamic styling
              'div[className*="progress"]',
              'div[className*="chart"]', 
              'div[className*="visualization"]',
              'svg',
              'circle',
              'rect',
              'line',
              'path'
            ]
          }
        ]
      }
    ],
  },
};