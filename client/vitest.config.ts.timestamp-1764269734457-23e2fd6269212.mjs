// client/vitest.config.ts
import { defineConfig } from "file:///C:/Users/Access%20Granted/Downloads/projects/SimpleTool/node_modules/.pnpm/vitest@3.2.4_@types+node@20.19.24_@vitest+ui@3.2.4_jsdom@26.1.0_terser@5.44.1/node_modules/vitest/dist/config.js";
import react from "file:///C:/Users/Access%20Granted/Downloads/projects/SimpleTool/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21/node_modules/@vitejs/plugin-react/dist/index.js";
import { resolve } from "path";
import { fileURLToPath } from "url";

// client/src/__tests__/coverage/coverage-config.ts
var coverageConfig = {
  // Global coverage thresholds (80%+ as required)
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  },
  // Per-file coverage thresholds for critical components
  perFile: {
    // Core components should have higher coverage
    "src/components/bills/enhanced-bills-dashboard.tsx": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    "src/components/bill-detail/BillDetailView.tsx": {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    "src/pages/IntelligentSearchPage.tsx": {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // API and service layers should have high coverage
    "src/services/*.ts": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    "src/hooks/*.ts": {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Store and state management
    "src/store/slices/*.ts": {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  // Files to exclude from coverage
  exclude: [
    "src/test-utils/**",
    "src/**/*.test.{ts,tsx}",
    "src/**/*.spec.{ts,tsx}",
    "src/**/*.stories.{ts,tsx}",
    "src/**/*.d.ts",
    "src/vite-env.d.ts",
    "src/main.tsx",
    "src/App.tsx"
    // Entry point, mostly routing
  ],
  // Coverage reporters
  reporters: [
    "text",
    "text-summary",
    "html",
    "json",
    "lcov",
    "clover"
  ],
  // Output directories
  reportsDirectory: "./coverage",
  // Coverage collection patterns
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}",
    "!src/**/*.stories.{ts,tsx}",
    "!src/test-utils/**",
    "!src/main.tsx"
  ]
};
var testCategories = {
  unit: {
    pattern: "**/*.test.{ts,tsx}",
    exclude: ["**/*.integration.test.{ts,tsx}", "**/*.e2e.test.{ts,tsx}", "**/*.performance.test.{ts,tsx}"],
    coverageThreshold: coverageConfig.global
  },
  integration: {
    pattern: "**/*.integration.test.{ts,tsx}",
    coverageThreshold: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  e2e: {
    pattern: "**/*.e2e.test.{ts,tsx}",
    // E2E tests don't contribute to code coverage
    coverageThreshold: null
  },
  performance: {
    pattern: "**/*.performance.test.{ts,tsx}",
    coverageThreshold: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  accessibility: {
    pattern: "**/*.a11y.test.{ts,tsx}",
    coverageThreshold: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};

// client/vitest.config.ts
var __vite_injected_original_import_meta_url = "file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/vitest.config.ts";
var vitest_config_default = defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-utils/setup.ts"],
    css: true,
    // Test configuration
    testTimeout: 1e4,
    hookTimeout: 5e3,
    // Test file patterns - ONLY .test.{ts,tsx} files for Vitest
    include: ["**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.spec.{ts,tsx}",
      // Exclude Playwright spec files
      "**/*.integration.test.{ts,tsx}",
      "**/*.e2e.test.{ts,tsx}",
      "**/*.performance.test.{ts,tsx}"
    ],
    // Environment options
    environmentOptions: {
      jsdom: {
        resources: "usable",
        url: "http://localhost:3000"
      }
    },
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: coverageConfig.reporters,
      reportsDirectory: coverageConfig.reportsDirectory,
      // Coverage thresholds
      // Cast to `any` to accommodate custom per-file threshold mapping
      thresholds: {
        global: coverageConfig.global,
        perFile: coverageConfig.perFile
      },
      // Files to include/exclude
      include: coverageConfig.collectCoverageFrom,
      exclude: coverageConfig.exclude,
      // Additional coverage options
      all: true,
      skipFull: false,
      clean: true
    },
    reporters: ["verbose"],
    // Retry configuration
    retry: process.env.CI ? 2 : 0,
    // Parallel execution
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true
      }
    }
  },
  resolve: {
    alias: {
      "@": resolve(resolve(fileURLToPath(__vite_injected_original_import_meta_url), ".."), "./src"),
      "@client": resolve(resolve(fileURLToPath(__vite_injected_original_import_meta_url), ".."), "./src"),
      "@chanuka/shared": resolve(resolve(fileURLToPath(__vite_injected_original_import_meta_url), ".."), "../shared"),
      "@shared": resolve(resolve(fileURLToPath(__vite_injected_original_import_meta_url), ".."), "../shared"),
      "@tests": resolve(resolve(fileURLToPath(__vite_injected_original_import_meta_url), ".."), "../tests")
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiY2xpZW50L3ZpdGVzdC5jb25maWcudHMiLCAiY2xpZW50L3NyYy9fX3Rlc3RzX18vY292ZXJhZ2UvY292ZXJhZ2UtY29uZmlnLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiYzpcXFxcVXNlcnNcXFxcQWNjZXNzIEdyYW50ZWRcXFxcRG93bmxvYWRzXFxcXHByb2plY3RzXFxcXFNpbXBsZVRvb2xcXFxcY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJjOlxcXFxVc2Vyc1xcXFxBY2Nlc3MgR3JhbnRlZFxcXFxEb3dubG9hZHNcXFxccHJvamVjdHNcXFxcU2ltcGxlVG9vbFxcXFxjbGllbnRcXFxcdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vYzovVXNlcnMvQWNjZXNzJTIwR3JhbnRlZC9Eb3dubG9hZHMvcHJvamVjdHMvU2ltcGxlVG9vbC9jbGllbnQvdml0ZXN0LmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGVzdC9jb25maWcnO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xyXG5pbXBvcnQgeyBjb3ZlcmFnZUNvbmZpZyB9IGZyb20gJy4vc3JjL19fdGVzdHNfXy9jb3ZlcmFnZS9jb3ZlcmFnZS1jb25maWcnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXHJcbiAgdGVzdDoge1xyXG4gICAgZ2xvYmFsczogdHJ1ZSxcclxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxyXG4gICAgc2V0dXBGaWxlczogWycuL3NyYy90ZXN0LXV0aWxzL3NldHVwLnRzJ10sXHJcbiAgICBjc3M6IHRydWUsXHJcbiAgICBcclxuICAgIC8vIFRlc3QgY29uZmlndXJhdGlvblxyXG4gICAgdGVzdFRpbWVvdXQ6IDEwMDAwLFxyXG4gICAgaG9va1RpbWVvdXQ6IDUwMDAsXHJcbiAgICBcclxuICAgIC8vIFRlc3QgZmlsZSBwYXR0ZXJucyAtIE9OTFkgLnRlc3Que3RzLHRzeH0gZmlsZXMgZm9yIFZpdGVzdFxyXG4gICAgaW5jbHVkZTogWycqKi8qLnRlc3Que3RzLHRzeH0nXSxcclxuICAgIGV4Y2x1ZGU6IFtcclxuICAgICAgJyoqL25vZGVfbW9kdWxlcy8qKicsXHJcbiAgICAgICcqKi9kaXN0LyoqJyxcclxuICAgICAgJyoqLyouc3BlYy57dHMsdHN4fScsIC8vIEV4Y2x1ZGUgUGxheXdyaWdodCBzcGVjIGZpbGVzXHJcbiAgICAgICcqKi8qLmludGVncmF0aW9uLnRlc3Que3RzLHRzeH0nLFxyXG4gICAgICAnKiovKi5lMmUudGVzdC57dHMsdHN4fScsXHJcbiAgICAgICcqKi8qLnBlcmZvcm1hbmNlLnRlc3Que3RzLHRzeH0nLFxyXG4gICAgXSxcclxuICAgIFxyXG4gICAgLy8gRW52aXJvbm1lbnQgb3B0aW9uc1xyXG4gICAgZW52aXJvbm1lbnRPcHRpb25zOiB7XHJcbiAgICAgIGpzZG9tOiB7XHJcbiAgICAgICAgcmVzb3VyY2VzOiAndXNhYmxlJyxcclxuICAgICAgICB1cmw6ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIFxyXG4gICAgLy8gQ292ZXJhZ2UgY29uZmlndXJhdGlvblxyXG4gICAgY292ZXJhZ2U6IHtcclxuICAgICAgcHJvdmlkZXI6ICd2OCcsXHJcbiAgICAgIHJlcG9ydGVyOiBjb3ZlcmFnZUNvbmZpZy5yZXBvcnRlcnMsXHJcbiAgICAgIHJlcG9ydHNEaXJlY3Rvcnk6IGNvdmVyYWdlQ29uZmlnLnJlcG9ydHNEaXJlY3RvcnksXHJcbiAgICAgIFxyXG4gICAgICAvLyBDb3ZlcmFnZSB0aHJlc2hvbGRzXHJcbiAgICAgIC8vIENhc3QgdG8gYGFueWAgdG8gYWNjb21tb2RhdGUgY3VzdG9tIHBlci1maWxlIHRocmVzaG9sZCBtYXBwaW5nXHJcbiAgICAgIHRocmVzaG9sZHM6ICh7XHJcbiAgICAgICAgZ2xvYmFsOiBjb3ZlcmFnZUNvbmZpZy5nbG9iYWwsXHJcbiAgICAgICAgcGVyRmlsZTogY292ZXJhZ2VDb25maWcucGVyRmlsZSxcclxuICAgICAgfSBhcyBhbnkpLFxyXG4gICAgICBcclxuICAgICAgLy8gRmlsZXMgdG8gaW5jbHVkZS9leGNsdWRlXHJcbiAgICAgIGluY2x1ZGU6IGNvdmVyYWdlQ29uZmlnLmNvbGxlY3RDb3ZlcmFnZUZyb20sXHJcbiAgICAgIGV4Y2x1ZGU6IGNvdmVyYWdlQ29uZmlnLmV4Y2x1ZGUsXHJcbiAgICAgIFxyXG4gICAgICAvLyBBZGRpdGlvbmFsIGNvdmVyYWdlIG9wdGlvbnNcclxuICAgICAgYWxsOiB0cnVlLFxyXG4gICAgICBza2lwRnVsbDogZmFsc2UsXHJcbiAgICAgIGNsZWFuOiB0cnVlLFxyXG4gICAgfSxcclxuICAgIFxyXG4gICAgcmVwb3J0ZXJzOiBbJ3ZlcmJvc2UnXSxcclxuICAgIFxyXG4gICAgLy8gUmV0cnkgY29uZmlndXJhdGlvblxyXG4gICAgcmV0cnk6IHByb2Nlc3MuZW52LkNJID8gMiA6IDAsXHJcbiAgICBcclxuICAgIC8vIFBhcmFsbGVsIGV4ZWN1dGlvblxyXG4gICAgcG9vbDogJ3RocmVhZHMnLFxyXG4gICAgcG9vbE9wdGlvbnM6IHtcclxuICAgICAgdGhyZWFkczoge1xyXG4gICAgICAgIHNpbmdsZVRocmVhZDogZmFsc2UsXHJcbiAgICAgICAgaXNvbGF0ZTogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAnQCc6IHJlc29sdmUocmVzb2x2ZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCksICcuLicpLCAnLi9zcmMnKSxcclxuICAgICAgJ0BjbGllbnQnOiByZXNvbHZlKHJlc29sdmUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpLCAnLi4nKSwgJy4vc3JjJyksXHJcbiAgICAgICdAY2hhbnVrYS9zaGFyZWQnOiByZXNvbHZlKHJlc29sdmUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpLCAnLi4nKSwgJy4uL3NoYXJlZCcpLFxyXG4gICAgICAnQHNoYXJlZCc6IHJlc29sdmUocmVzb2x2ZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCksICcuLicpLCAnLi4vc2hhcmVkJyksXHJcbiAgICAgICdAdGVzdHMnOiByZXNvbHZlKHJlc29sdmUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpLCAnLi4nKSwgJy4uL3Rlc3RzJyksXHJcbiAgICB9LFxyXG4gIH0sXHJcbn0pO1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcImM6XFxcXFVzZXJzXFxcXEFjY2VzcyBHcmFudGVkXFxcXERvd25sb2Fkc1xcXFxwcm9qZWN0c1xcXFxTaW1wbGVUb29sXFxcXGNsaWVudFxcXFxzcmNcXFxcX190ZXN0c19fXFxcXGNvdmVyYWdlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJjOlxcXFxVc2Vyc1xcXFxBY2Nlc3MgR3JhbnRlZFxcXFxEb3dubG9hZHNcXFxccHJvamVjdHNcXFxcU2ltcGxlVG9vbFxcXFxjbGllbnRcXFxcc3JjXFxcXF9fdGVzdHNfX1xcXFxjb3ZlcmFnZVxcXFxjb3ZlcmFnZS1jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2M6L1VzZXJzL0FjY2VzcyUyMEdyYW50ZWQvRG93bmxvYWRzL3Byb2plY3RzL1NpbXBsZVRvb2wvY2xpZW50L3NyYy9fX3Rlc3RzX18vY292ZXJhZ2UvY292ZXJhZ2UtY29uZmlnLnRzXCI7LyoqXHJcbiAqIFRlc3QgQ292ZXJhZ2UgQ29uZmlndXJhdGlvblxyXG4gKiBEZWZpbmVzIGNvdmVyYWdlIHRocmVzaG9sZHMgYW5kIHJlcG9ydGluZyBjb25maWd1cmF0aW9uXHJcbiAqL1xyXG5cclxuZXhwb3J0IGNvbnN0IGNvdmVyYWdlQ29uZmlnID0ge1xyXG4gIC8vIEdsb2JhbCBjb3ZlcmFnZSB0aHJlc2hvbGRzICg4MCUrIGFzIHJlcXVpcmVkKVxyXG4gIGdsb2JhbDoge1xyXG4gICAgYnJhbmNoZXM6IDgwLFxyXG4gICAgZnVuY3Rpb25zOiA4MCxcclxuICAgIGxpbmVzOiA4MCxcclxuICAgIHN0YXRlbWVudHM6IDgwLFxyXG4gIH0sXHJcblxyXG4gIC8vIFBlci1maWxlIGNvdmVyYWdlIHRocmVzaG9sZHMgZm9yIGNyaXRpY2FsIGNvbXBvbmVudHNcclxuICBwZXJGaWxlOiB7XHJcbiAgICAvLyBDb3JlIGNvbXBvbmVudHMgc2hvdWxkIGhhdmUgaGlnaGVyIGNvdmVyYWdlXHJcbiAgICAnc3JjL2NvbXBvbmVudHMvYmlsbHMvZW5oYW5jZWQtYmlsbHMtZGFzaGJvYXJkLnRzeCc6IHtcclxuICAgICAgYnJhbmNoZXM6IDkwLFxyXG4gICAgICBmdW5jdGlvbnM6IDkwLFxyXG4gICAgICBsaW5lczogOTAsXHJcbiAgICAgIHN0YXRlbWVudHM6IDkwLFxyXG4gICAgfSxcclxuICAgICdzcmMvY29tcG9uZW50cy9iaWxsLWRldGFpbC9CaWxsRGV0YWlsVmlldy50c3gnOiB7XHJcbiAgICAgIGJyYW5jaGVzOiA4NSxcclxuICAgICAgZnVuY3Rpb25zOiA4NSxcclxuICAgICAgbGluZXM6IDg1LFxyXG4gICAgICBzdGF0ZW1lbnRzOiA4NSxcclxuICAgIH0sXHJcbiAgICAnc3JjL3BhZ2VzL0ludGVsbGlnZW50U2VhcmNoUGFnZS50c3gnOiB7XHJcbiAgICAgIGJyYW5jaGVzOiA4NSxcclxuICAgICAgZnVuY3Rpb25zOiA4NSxcclxuICAgICAgbGluZXM6IDg1LFxyXG4gICAgICBzdGF0ZW1lbnRzOiA4NSxcclxuICAgIH0sXHJcbiAgICBcclxuICAgIC8vIEFQSSBhbmQgc2VydmljZSBsYXllcnMgc2hvdWxkIGhhdmUgaGlnaCBjb3ZlcmFnZVxyXG4gICAgJ3NyYy9zZXJ2aWNlcy8qLnRzJzoge1xyXG4gICAgICBicmFuY2hlczogOTAsXHJcbiAgICAgIGZ1bmN0aW9uczogOTAsXHJcbiAgICAgIGxpbmVzOiA5MCxcclxuICAgICAgc3RhdGVtZW50czogOTAsXHJcbiAgICB9LFxyXG4gICAgJ3NyYy9ob29rcy8qLnRzJzoge1xyXG4gICAgICBicmFuY2hlczogODUsXHJcbiAgICAgIGZ1bmN0aW9uczogODUsXHJcbiAgICAgIGxpbmVzOiA4NSxcclxuICAgICAgc3RhdGVtZW50czogODUsXHJcbiAgICB9LFxyXG4gICAgXHJcbiAgICAvLyBTdG9yZSBhbmQgc3RhdGUgbWFuYWdlbWVudFxyXG4gICAgJ3NyYy9zdG9yZS9zbGljZXMvKi50cyc6IHtcclxuICAgICAgYnJhbmNoZXM6IDg1LFxyXG4gICAgICBmdW5jdGlvbnM6IDg1LFxyXG4gICAgICBsaW5lczogODUsXHJcbiAgICAgIHN0YXRlbWVudHM6IDg1LFxyXG4gICAgfSxcclxuICB9LFxyXG5cclxuICAvLyBGaWxlcyB0byBleGNsdWRlIGZyb20gY292ZXJhZ2VcclxuICBleGNsdWRlOiBbXHJcbiAgICAnc3JjL3Rlc3QtdXRpbHMvKionLFxyXG4gICAgJ3NyYy8qKi8qLnRlc3Que3RzLHRzeH0nLFxyXG4gICAgJ3NyYy8qKi8qLnNwZWMue3RzLHRzeH0nLFxyXG4gICAgJ3NyYy8qKi8qLnN0b3JpZXMue3RzLHRzeH0nLFxyXG4gICAgJ3NyYy8qKi8qLmQudHMnLFxyXG4gICAgJ3NyYy92aXRlLWVudi5kLnRzJyxcclxuICAgICdzcmMvbWFpbi50c3gnLFxyXG4gICAgJ3NyYy9BcHAudHN4JywgLy8gRW50cnkgcG9pbnQsIG1vc3RseSByb3V0aW5nXHJcbiAgXSxcclxuXHJcbiAgLy8gQ292ZXJhZ2UgcmVwb3J0ZXJzXHJcbiAgcmVwb3J0ZXJzOiBbXHJcbiAgICAndGV4dCcsXHJcbiAgICAndGV4dC1zdW1tYXJ5JyxcclxuICAgICdodG1sJyxcclxuICAgICdqc29uJyxcclxuICAgICdsY292JyxcclxuICAgICdjbG92ZXInLFxyXG4gIF0sXHJcblxyXG4gIC8vIE91dHB1dCBkaXJlY3Rvcmllc1xyXG4gIHJlcG9ydHNEaXJlY3Rvcnk6ICcuL2NvdmVyYWdlJyxcclxuICBcclxuICAvLyBDb3ZlcmFnZSBjb2xsZWN0aW9uIHBhdHRlcm5zXHJcbiAgY29sbGVjdENvdmVyYWdlRnJvbTogW1xyXG4gICAgJ3NyYy8qKi8qLnt0cyx0c3h9JyxcclxuICAgICchc3JjLyoqLyouZC50cycsXHJcbiAgICAnIXNyYy8qKi8qLnRlc3Que3RzLHRzeH0nLFxyXG4gICAgJyFzcmMvKiovKi5zcGVjLnt0cyx0c3h9JyxcclxuICAgICchc3JjLyoqLyouc3Rvcmllcy57dHMsdHN4fScsXHJcbiAgICAnIXNyYy90ZXN0LXV0aWxzLyoqJyxcclxuICAgICchc3JjL21haW4udHN4JyxcclxuICBdLFxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHRlc3RDYXRlZ29yaWVzID0ge1xyXG4gIHVuaXQ6IHtcclxuICAgIHBhdHRlcm46ICcqKi8qLnRlc3Que3RzLHRzeH0nLFxyXG4gICAgZXhjbHVkZTogWycqKi8qLmludGVncmF0aW9uLnRlc3Que3RzLHRzeH0nLCAnKiovKi5lMmUudGVzdC57dHMsdHN4fScsICcqKi8qLnBlcmZvcm1hbmNlLnRlc3Que3RzLHRzeH0nXSxcclxuICAgIGNvdmVyYWdlVGhyZXNob2xkOiBjb3ZlcmFnZUNvbmZpZy5nbG9iYWwsXHJcbiAgfSxcclxuICBcclxuICBpbnRlZ3JhdGlvbjoge1xyXG4gICAgcGF0dGVybjogJyoqLyouaW50ZWdyYXRpb24udGVzdC57dHMsdHN4fScsXHJcbiAgICBjb3ZlcmFnZVRocmVzaG9sZDoge1xyXG4gICAgICBicmFuY2hlczogNzAsXHJcbiAgICAgIGZ1bmN0aW9uczogNzAsXHJcbiAgICAgIGxpbmVzOiA3MCxcclxuICAgICAgc3RhdGVtZW50czogNzAsXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgXHJcbiAgZTJlOiB7XHJcbiAgICBwYXR0ZXJuOiAnKiovKi5lMmUudGVzdC57dHMsdHN4fScsXHJcbiAgICAvLyBFMkUgdGVzdHMgZG9uJ3QgY29udHJpYnV0ZSB0byBjb2RlIGNvdmVyYWdlXHJcbiAgICBjb3ZlcmFnZVRocmVzaG9sZDogbnVsbCxcclxuICB9LFxyXG4gIFxyXG4gIHBlcmZvcm1hbmNlOiB7XHJcbiAgICBwYXR0ZXJuOiAnKiovKi5wZXJmb3JtYW5jZS50ZXN0Lnt0cyx0c3h9JyxcclxuICAgIGNvdmVyYWdlVGhyZXNob2xkOiB7XHJcbiAgICAgIGJyYW5jaGVzOiA2MCxcclxuICAgICAgZnVuY3Rpb25zOiA2MCxcclxuICAgICAgbGluZXM6IDYwLFxyXG4gICAgICBzdGF0ZW1lbnRzOiA2MCxcclxuICAgIH0sXHJcbiAgfSxcclxuICBcclxuICBhY2Nlc3NpYmlsaXR5OiB7XHJcbiAgICBwYXR0ZXJuOiAnKiovKi5hMTF5LnRlc3Que3RzLHRzeH0nLFxyXG4gICAgY292ZXJhZ2VUaHJlc2hvbGQ6IHtcclxuICAgICAgYnJhbmNoZXM6IDcwLFxyXG4gICAgICBmdW5jdGlvbnM6IDcwLFxyXG4gICAgICBsaW5lczogNzAsXHJcbiAgICAgIHN0YXRlbWVudHM6IDcwLFxyXG4gICAgfSxcclxuICB9LFxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHF1YWxpdHlHYXRlcyA9IHtcclxuICAvLyBNaW5pbXVtIHRlc3QgY291bnRzIGZvciBkaWZmZXJlbnQgdGVzdCB0eXBlc1xyXG4gIG1pbmltdW1UZXN0czoge1xyXG4gICAgdW5pdDogMTAwLFxyXG4gICAgaW50ZWdyYXRpb246IDIwLFxyXG4gICAgZTJlOiAxNSxcclxuICAgIHBlcmZvcm1hbmNlOiAxMCxcclxuICAgIGFjY2Vzc2liaWxpdHk6IDI1LFxyXG4gIH0sXHJcbiAgXHJcbiAgLy8gUGVyZm9ybWFuY2UgdGhyZXNob2xkc1xyXG4gIHBlcmZvcm1hbmNlOiB7XHJcbiAgICBtYXhUZXN0RHVyYXRpb246IDMwMDAwLCAvLyAzMCBzZWNvbmRzIG1heCBwZXIgdGVzdFxyXG4gICAgbWF4U3VpdGVEdXJhdGlvbjogMzAwMDAwLCAvLyA1IG1pbnV0ZXMgbWF4IHBlciB0ZXN0IHN1aXRlXHJcbiAgICBtZW1vcnlMZWFrVGhyZXNob2xkOiAxMDAwMDAwMCwgLy8gMTBNQiBtZW1vcnkgaW5jcmVhc2UgdGhyZXNob2xkXHJcbiAgfSxcclxuICBcclxuICAvLyBBY2Nlc3NpYmlsaXR5IHJlcXVpcmVtZW50c1xyXG4gIGFjY2Vzc2liaWxpdHk6IHtcclxuICAgIHdjYWdMZXZlbDogJ0FBJyxcclxuICAgIHdjYWdWZXJzaW9uOiAnMi4xJyxcclxuICAgIGNvbG9yQ29udHJhc3RSYXRpbzogNC41LFxyXG4gICAgdG91Y2hUYXJnZXRTaXplOiA0NCwgLy8gcGl4ZWxzXHJcbiAgfSxcclxuICBcclxuICAvLyBDb2RlIHF1YWxpdHkgbWV0cmljc1xyXG4gIGNvZGVRdWFsaXR5OiB7XHJcbiAgICBtYXhDb21wbGV4aXR5OiAxMCxcclxuICAgIG1heEZpbGVMZW5ndGg6IDUwMCxcclxuICAgIG1heEZ1bmN0aW9uTGVuZ3RoOiA1MCxcclxuICAgIGR1cGxpY2F0ZUNvZGVUaHJlc2hvbGQ6IDUsIC8vIHBlcmNlbnRhZ2VcclxuICB9LFxyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY292ZXJhZ2VDb25maWc7XHJcblxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTBYLFNBQVMsb0JBQW9CO0FBQ3ZaLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFDeEIsU0FBUyxxQkFBcUI7OztBQ0V2QixJQUFNLGlCQUFpQjtBQUFBO0FBQUEsRUFFNUIsUUFBUTtBQUFBLElBQ04sVUFBVTtBQUFBLElBQ1YsV0FBVztBQUFBLElBQ1gsT0FBTztBQUFBLElBQ1As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
