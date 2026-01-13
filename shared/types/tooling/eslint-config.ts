// ============================================================================
// ESLINT CONFIGURATION FOR TYPE CONSISTENCY
// ============================================================================
// Rules and configurations to enforce type consistency across the codebase

/**
 * ESLint configuration for TypeScript type consistency
 * This configuration enforces the type patterns and conventions defined in the
 * type system standardization requirements.
 */
export const ESLINT_TYPE_CONSISTENCY_RULES = {
  // ==========================================================================
  // Core Type Consistency Rules
  // ==========================================================================

  '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
  '@typescript-eslint/consistent-type-imports': ['error', {
    prefer: 'type-imports',
    disallowTypeAnnotations: false
  }],
  '@typescript-eslint/consistent-type-exports': ['error', {
    prefer: 'type-exports'
  }],

  // ==========================================================================
  // Naming Conventions
  // ==========================================================================

  '@typescript-eslint/naming-convention': [
    'error',
    // Interface names should be PascalCase
    {
      selector: 'interface',
      format: ['PascalCase'],
      custom: {
        regex: '^I[A-Z]',
        match: false
      }
    },
    // Type names should be PascalCase
    {
      selector: 'typeAlias',
      format: ['PascalCase']
    },
    // Enum names should be PascalCase
    {
      selector: 'enum',
      format: ['PascalCase']
    },
    // Enum members should be UPPER_SNAKE_CASE
    {
      selector: 'enumMember',
      format: ['UPPER_CASE']
    },
    // Function and method names should be camelCase
    {
      selector: 'function',
      format: ['camelCase']
    },
    // Variable and parameter names should be camelCase
    {
      selector: 'variable',
      format: ['camelCase', 'UPPER_CASE']
    },
    // Class names should be PascalCase
    {
      selector: 'class',
      format: ['PascalCase']
    }
  ],

  // ==========================================================================
  // Type Safety Rules
  // ==========================================================================

  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/restrict-template-expressions': ['error', {
    allowNumber: true,
    allowBoolean: true,
    allowAny: false,
    allowNullish: false
  }],

  // ==========================================================================
  // Import/Export Rules
  // ==========================================================================

  'import/order': ['error', {
    groups: [
      'builtin',
      'external',
      'internal',
      'parent',
      'sibling',
      'index',
      'object',
      'type'
    ],
    'newlines-between': 'always',
    alphabetize: {
      order: 'asc',
      caseInsensitive: true
    }
  }],

  // ==========================================================================
  // Documentation Rules
  // ==========================================================================

  'jsdoc/check-types': 'error',
  'jsdoc/require-jsdoc': ['error', {
    contexts: [
      'ClassDeclaration',
      'ClassExpression',
      'MethodDefinition',
      'FunctionDeclaration',
      'TSInterfaceDeclaration',
      'TSTypeAliasDeclaration',
      'TSEnumDeclaration'
    ]
  }],

  // ==========================================================================
  // Pattern-Specific Rules
  // ==========================================================================

  '@typescript-eslint/explicit-function-return-type': ['error', {
    allowExpressions: true,
    allowTypedFunctionExpressions: true,
    allowHigherOrderFunctions: true
  }],

  '@typescript-eslint/explicit-module-boundary-types': 'error',

  '@typescript-eslint/member-ordering': ['error', {
    default: [
      'signature',
      'public-static-field',
      'protected-static-field',
      'private-static-field',
      'public-instance-field',
      'protected-instance-field',
      'private-instance-field',
      'constructor',
      'public-instance-method',
      'protected-instance-method',
      'private-instance-method'
    ]
  }],

  // ==========================================================================
  // Backward Compatibility Rules
  // ==========================================================================

  '@typescript-eslint/no-inferrable-types': ['error', {
    ignoreParameters: true,
    ignoreProperties: true
  }],

  '@typescript-eslint/ban-types': ['error', {
    types: {
      Object: {
        message: 'Use Record<string, unknown> or a specific type instead',
        fixWith: 'Record<string, unknown>'
      },
      Function: {
        message: 'Use a specific function type instead',
        fixWith: '() => void'
      },
      Boolean: {
        message: 'Use boolean instead',
        fixWith: 'boolean'
      },
      Number: {
        message: 'Use number instead',
        fixWith: 'number'
      },
      String: {
        message: 'Use string instead',
        fixWith: 'string'
      },
      Symbol: {
        message: 'Use symbol instead',
        fixWith: 'symbol'
      }
    },
    extendDefaults: true
  }]
};

/**
 * ESLint configuration object that can be extended in .eslintrc files
 */
export const ESLINT_CONFIG = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:jsdoc/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'jsdoc'
  ],
  rules: ESLINT_TYPE_CONSISTENCY_RULES,
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true
      }
    }
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: ESLINT_TYPE_CONSISTENCY_RULES
    },
    {
      files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off'
      }
    }
  ]
};

/**
 * Type for ESLint rule configuration
 */
export interface ESLintRuleConfig {
  [ruleName: string]: any;
}

/**
 * Type for complete ESLint configuration
 */
export interface ESLintConfiguration {
  extends?: string | string[];
  parser?: string;
  parserOptions?: {
    ecmaVersion?: number;
    sourceType?: 'script' | 'module';
    project?: string | string[];
    tsconfigRootDir?: string;
  };
  plugins?: string[];
  rules?: ESLintRuleConfig;
  settings?: {
    [key: string]: any;
  };
  overrides?: Array<{
    files?: string | string[];
    rules?: ESLintRuleConfig;
  }>;
}

/**
 * Type guard for ESLint configuration validation
 */
export function isESLintConfiguration(config: unknown): config is ESLintConfiguration {
  return (
    typeof config === 'object' &&
    config !== null &&
    ('extends' in config || 'parser' in config || 'rules' in config)
  );
}