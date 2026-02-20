module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: [
      "./tsconfig.json",
      "./client/tsconfig.json",
      "./server/tsconfig.json",
      "./shared/tsconfig.json",
    ],
  },
  plugins: ["@typescript-eslint", "import"],
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: [
          "./tsconfig.json",
          "./client/tsconfig.json",
          "./server/tsconfig.json",
          "./shared/tsconfig.json",
        ],
      },
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
  rules: {
    "@typescript-eslint/no-unused-vars": "off", // Handled in overrides per-section
    "@typescript-eslint/no-explicit-any": "off", // Allow for placeholder implementations
    "@typescript-eslint/prefer-nullish-coalescing": "off", // Stylistic preference
    "@typescript-eslint/prefer-optional-chain": "off", // Stylistic preference
    "@typescript-eslint/no-namespace": "off", // Allow namespaces for legacy code
    "@typescript-eslint/no-non-null-assertion": "off", // Allow non-null assertions
    "@typescript-eslint/ban-types": "off", // Allow Function, Object types
    "import/no-unresolved": "warn", // Warn instead of error on unresolved
    "no-restricted-imports": "warn", // Warn instead of error on restricted imports
    "no-case-declarations": "off", // Allow declarations in case blocks for intermediate states
    "no-control-regex": "off", // Allow in specific contexts
    "no-useless-escape": "off", // Allow escape sequences in patterns
    "no-console": "off", // Allow console for development
    "no-prototype-builtins": "warn", // Warn on prototype access
    "no-var": "warn", // Warn on var usage
    "prefer-const": "off", // Allow reassigned declarations
    "max-depth": "off", // Allow nested blocks
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    // Module Boundary Enforcement Rules
    "no-restricted-imports": [
      "error",
      {
        paths: [
          // Client cannot import server modules
          {
            name: "@server",
            message:
              "Client modules cannot import server modules. Use API calls instead.",
          },
          {
            name: "server",
            message:
              "Client modules cannot import server modules. Use API calls instead.",
          },
          // Server cannot import client modules
          {
            name: "@client",
            message:
              "Server modules cannot import client modules. Use shared types/interfaces.",
          },
          {
            name: "client",
            message:
              "Server modules cannot import client modules. Use shared types/interfaces.",
          },
          // Shared cannot import client or server modules
          {
            name: "@client",
            message:
              "Shared modules cannot import client modules. Keep shared modules pure.",
          },
          {
            name: "client",
            message:
              "Shared modules cannot import client modules. Keep shared modules pure.",
          },
          {
            name: "@server",
            message:
              "Shared modules cannot import server modules. Keep shared modules pure.",
          },
          {
            name: "server",
            message:
              "Shared modules cannot import server modules. Keep shared modules pure.",
          },
        ],
        patterns: [
          // Prevent client from importing server files
          {
            group: ["**/server/**"],
            message:
              "Client modules cannot import server files. Use API calls instead.",
          },
          // Prevent server from importing client files
          {
            group: ["**/client/**"],
            message:
              "Server modules cannot import client files. Use shared types/interfaces.",
          },
          // Prevent shared from importing client or server files
          {
            group: ["**/client/**", "**/server/**"],
            message:
              "Shared modules cannot import client or server files. Keep shared modules pure.",
          },
          // Validation Single Source of Truth - Prevent local redefinitions
          {
            group: ["zod"],
            importNames: ["z"],
            message:
              "Use validation primitives from @shared/validation instead of defining local schemas. Import emailSchema, uuidSchema, userRoleSchema, etc.",
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ["**/vitest.config.ts"],
      rules: {
        "@typescript-eslint/no-unused-vars": "off",
      },
    },
    {
      files: ["client/src/__tests__/strategic/**/*.test.ts", "client/src/__tests__/strategic/**/*.test.tsx"],
      rules: {
        "@typescript-eslint/no-unused-vars": "off",
        "import/no-unresolved": "off",
        "import/order": "off",
      },
    },
    {
      files: ["client/**/*"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
      ],
      plugins: ["react", "react-hooks", "react-refresh", "import"],
      settings: {
        react: {
          version: "detect",
        },
        "import/resolver": {
          typescript: {
            alwaysTryTypes: true,
            project: "./client/tsconfig.json",
          },
        },
      },
      rules: {
        "react/react-in-jsx-scope": "off", // Not needed with React 17+
        "react/prop-types": "off", // Disable PropTypes for TypeScript files
        "react/display-name": "off", // Disable display-name warnings for wrapped components
        "react/no-unescaped-entities": "warn", // Converted to warning - common in content
        "react/jsx-no-undef": "warn", // Warn instead of error for custom elements
        "react-hooks/rules-of-hooks": "warn", // Warn for hook order issues
        "@typescript-eslint/no-unused-vars": "off", // Many unused vars are from incomplete implementations or intentional patterns
        "@typescript-eslint/no-explicit-any": "off", // TypeScript allows any for flexibility
        "import/no-unresolved": "off", // Many modules are planned but not yet implemented
        "react-refresh/only-export-components": "off", // Allow mixed exports for utility functions
        "no-useless-escape": "warn",
        "no-control-regex": "warn",
        "no-case-declarations": "warn",
        "no-mixed-spaces-and-tabs": "off", // Handled by Prettier
        "no-extra-semi": "off", // Handled by Prettier
        "react-hooks/exhaustive-deps": "warn", // Convert to warning
      },
    },
    {
      files: ["server/**/*"],
      settings: {
        "import/resolver": {
          typescript: {
            alwaysTryTypes: true,
            project: "./server/tsconfig.json",
          },
        },
      },
    },
    {
      files: ["client/src/lib/**/*"],
      settings: {
        "import/resolver": {
          typescript: {
            alwaysTryTypes: true,
            project: "./client/tsconfig.json",
          },
        },
      },
    },
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
      parserOptions: {
        project: null,
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-var-requires": "off",
        "jsx-a11y/label-has-associated-control": "off",
        "jsx-a11y/no-static-element-interactions": "off",
        "jsx-a11y/click-events-have-key-events": "off",
        "jsx-a11y/interactive-supports-focus": "off",
        "jsx-a11y/form-has-associated-label": "off",
        "jsx-a11y/no-noninteractive-element-to-interactive-role": "off",
        "jsx-a11y/anchor-is-valid": "off",
        "react-hooks/exhaustive-deps": "off",
        "react-refresh/only-export-components": "off",
      },
    },
    {
      files: ["**/.eslintrc*.js", "**/.eslintrc*.cjs"],
      parserOptions: {
        project: null,
      },
    },
    {
      files: ["client/src/components/**/*.tsx"],
      rules: {
        "stylelint/no-style-component": "off",
      },
    },
    {
      files: ["*.js"],
      parser: "espree",
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: null,
      },
      rules: {
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};
