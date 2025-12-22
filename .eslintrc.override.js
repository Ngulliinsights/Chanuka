/**
 * ESLint Override Configuration
 * 
 * This file provides permanent solutions to recurring linting issues
 * by properly configuring ESLint rules for the project patterns.
 */

module.exports = {
  extends: ['.eslintrc.js'],
  rules: {
    // ===== PROP-TYPES RULES =====
    // Disable prop-types validation for TypeScript projects
    // TypeScript provides compile-time type checking which is superior
    'react/prop-types': 'off',
    
    // ===== REACT-REFRESH RULES =====
    // Allow utility functions and hooks in component files
    // This is common in modern React development
    'react-refresh/only-export-components': ['warn', { 
      allowConstantExport: true,
      allowExportNames: ['useAssetLoadingContext', 'useIntegration', 'LoadingError', 'getErrorDisplayMessage']
    }],
    
    // ===== UNUSED VARIABLES =====
    // Allow unused variables that start with underscore
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true
    }],
    
    // ===== IMPORT RULES =====
    // Relax import ordering for internal modules
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      },
      pathGroups: [
        {
          pattern: '@client/**',
          group: 'internal',
          position: 'before'
        },
        {
          pattern: '@/**',
          group: 'internal',
          position: 'after'
        }
      ],
      pathGroupsExcludedImportTypes: ['builtin']
    }],
    
    // ===== INLINE STYLES =====
    // Allow inline styles for dynamic values (like progress bars)
    // This is necessary for components that need dynamic styling
    'no-inline-styles': 'off'
  },
  
  // ===== FILE-SPECIFIC OVERRIDES =====
  overrides: [
    // TypeScript React files - disable prop-types completely
    {
      files: ['**/*.tsx'],
      rules: {
        'react/prop-types': 'off'
      }
    },
    
    // Hook files - allow export of hooks
    {
      files: ['**/hooks/**/*.ts', '**/hooks/**/*.tsx'],
      rules: {
        'react-refresh/only-export-components': 'off'
      }
    },
    
    // Utility files - allow export of utilities
    {
      files: ['**/utils/**/*.ts', '**/utils/**/*.tsx'],
      rules: {
        'react-refresh/only-export-components': 'off'
      }
    },
    
    // Context files - allow export of context and hooks
    {
      files: ['**/context/**/*.ts', '**/context/**/*.tsx'],
      rules: {
        'react-refresh/only-export-components': 'off'
      }
    },
    
    // Type definition files - allow all exports
    {
      files: ['**/types/**/*.ts', '**/*.d.ts'],
      rules: {
        'react-refresh/only-export-components': 'off'
      }
    }
  ]
};