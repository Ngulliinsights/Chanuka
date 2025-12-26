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
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "import/no-unresolved": "off", // Temporarily disabled due to resolver issues
    "import/order": [
      "error",
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
        ],
      },
    ],
  },
  overrides: [
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
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/no-explicit-any": "warn",
        "import/no-unresolved": "off", // Temporarily disabled due to resolver issues
        "react-refresh/only-export-components": [
          "warn",
          { allowConstantExport: true },
        ],
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
      files: ["client/src/shared/**/*"],
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
        "jsx-a11y/label-has-associated-control": "off",
        "jsx-a11y/no-static-element-interactions": "off",
        "jsx-a11y/click-events-have-key-events": "off",
        "jsx-a11y/interactive-supports-focus": "off",
        "jsx-a11y/form-has-associated-label": "off",
        "jsx-a11y/no-noninteractive-element-to-interactive-role": "off",
        "jsx-a11y/anchor-is-valid": "off",
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
