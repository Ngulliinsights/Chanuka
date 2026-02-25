// Root PostCSS config - delegates to client for consistency
// NOTE: This file exists to support root-level tooling.
// The actual PostCSS configuration is in client/postcss.config.js
export default {
  plugins: {
    tailwindcss: {
      config: './client/tailwind.config.ts',
    },
    autoprefixer: {},
  },
};





































