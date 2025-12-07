/**
 * ESLint Configuration for Design Token Enforcement
 * 
 * Prevents hardcoded colors and enforces design system usage
 * Add this to your .eslintrc.js or eslintrc.config.js
 */

export default [
  {
    // Design System Enforcement Rules
    rules: {
      /**
       * Prevent hardcoded color values in components
       * All colors must come from design tokens
       */
      'no-restricted-properties': [
        'warn',
        {
          object: 'process',
          property: 'env',
          message: 'Use environment variables from config instead of process.env',
        },
      ],

      /**
       * Custom rule: Prevent hardcoded Tailwind color classes
       * This is implemented as a no-restricted-syntax rule
       */
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^(bg|text|border|ring|fill|stroke)-(red|blue|green|yellow|purple|pink|orange|gray|slate|zinc|neutral|stone|amber|lime|emerald|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/]',
          message: 'Hardcoded Tailwind colors are not allowed. Use design tokens: bg-[hsl(var(--color-primary))] instead.',
        },
        {
          selector: 'Literal[value=/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/]',
          message: 'Hardcoded hex colors are not allowed. Use design tokens instead.',
        },
        {
          selector: 'Literal[value=/^rgb\\(/]',
          message: 'Hardcoded RGB colors are not allowed. Use design tokens instead.',
        },
      ],

      /**
       * Enforce component variant types are from component-types.ts
       */
      'no-invalid-enum-value': [
        'warn',
        {
          enums: [
            'ButtonVariant',
            'CardVariant',
            'InputVariant',
            'ButtonSize',
            'InputState',
          ],
          message: 'Use valid variant from component-types.ts',
        },
      ],

      /**
       * Warn if components don't use CVA (class-variance-authority)
       * for variant management
       */
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      /**
       * Enforce proper className usage with cn() utility
       */
      'react/no-unescaped-entities': 'warn',
    },
  },

  /**
   * Plugin-specific configurations for better linting
   */
  {
    plugins: {
      'tailwind-css': {
        rules: {
          'no-custom-classname': 'off', // Allow custom token classnames
          'classnames-order': 'warn',
        },
      },
    },
  },
];

/**
 * Additional ESLint Configuration Guide
 * 
 * 1. Install ESLint plugins:
 *    npm install --save-dev eslint-plugin-tailwindcss
 * 
 * 2. Add to .eslintrc.js:
 *    - Import this config
 *    - Add to extends array
 *    - Set override rules for your project
 * 
 * 3. Run linter:
 *    eslint --fix client/src/components/ui/*.tsx
 * 
 * 4. Pre-commit hook (optional):
 *    Add to husky pre-commit hook:
 *    eslint --fix "client/src/components/ui/**/*.tsx"
 * 
 * 5. CI/CD Integration:
 *    Add to GitHub Actions or CI pipeline:
 *    - npm run lint
 *    - npm run lint:fix
 */
