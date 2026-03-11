// client/vitest.config.ts
import { defineConfig } from "file:///C:/Users/Access%20Granted/Downloads/projects/SimpleTool/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.24_terser@5.44.1/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Access%20Granted/Downloads/projects/SimpleTool/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21/node_modules/@vitejs/plugin-react/dist/index.js";
import { resolve } from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///C:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/vitest.config.ts";
var __dirname = resolve(fileURLToPath(__vite_injected_original_import_meta_url), "..");
var vitest_config_default = defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts", "./tests/setup/modules/client.ts"],
    css: true,
    testTimeout: 1e4,
    hookTimeout: 5e3,
    // Only includes standard unit tests
    include: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}"
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.integration.test.{ts,tsx}",
      "**/*.e2e.test.{ts,tsx}",
      "**/*.performance.test.{ts,tsx}",
      "**/*.a11y.test.{ts,tsx}"
    ],
    environmentOptions: {
      jsdom: {
        resources: "usable",
        url: "http://localhost:3000"
      }
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "../../coverage/client/unit",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "src/**/*.d.ts",
        "src/test-utils/**",
        "src/**/*.stories.{ts,tsx}",
        "src/__tests__/**"
      ],
      all: true,
      skipFull: false
    },
    reporters: ["verbose"],
    retry: process.env.CI ? 2 : 0,
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
      "@": resolve(__dirname, "./src"),
      "@client": resolve(__dirname, "./src"),
      "@client/*": resolve(__dirname, "./src/*"),
      "@shared": resolve(__dirname, "../../shared"),
      "@shared/*": resolve(__dirname, "../../shared/*"),
      "@shared/core": resolve(__dirname, "../../shared/core/src"),
      "@shared/core/*": resolve(__dirname, "../../shared/core/src/*"),
      "@server/infrastructure/schema": resolve(__dirname, "../../shared/schema"),
      "@server/infrastructure/schema/*": resolve(__dirname, "../../shared/schema/*"),
      "@server/infrastructure/database": resolve(__dirname, "./src/stubs/database-stub.ts"),
      "@shared/utils": resolve(__dirname, "../../shared/utils"),
      "@shared/utils/*": resolve(__dirname, "../../shared/utils/*"),
      "@server/infrastructure/database/*": resolve(__dirname, "./src/stubs/database-stub.ts"),
      "@shared/core/middleware": resolve(__dirname, "./src/stubs/middleware-stub.ts"),
      "@client/utils/logger": resolve(__dirname, "./src/utils/logger.ts"),
      "@client/test-utils": resolve(__dirname, "./src/test-utils"),
      "@client/@types": resolve(__dirname, "./src/@types")
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiY2xpZW50L3ZpdGVzdC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBY2Nlc3MgR3JhbnRlZFxcXFxEb3dubG9hZHNcXFxccHJvamVjdHNcXFxcU2ltcGxlVG9vbFxcXFxjbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFjY2VzcyBHcmFudGVkXFxcXERvd25sb2Fkc1xcXFxwcm9qZWN0c1xcXFxTaW1wbGVUb29sXFxcXGNsaWVudFxcXFx2aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9BY2Nlc3MlMjBHcmFudGVkL0Rvd25sb2Fkcy9wcm9qZWN0cy9TaW1wbGVUb29sL2NsaWVudC92aXRlc3QuY29uZmlnLnRzXCI7Ly8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlc3RcIiAvPlxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCdcblxuY29uc3QgX19kaXJuYW1lID0gcmVzb2x2ZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCksICcuLicpXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgc2V0dXBGaWxlczogWycuL3ZpdGVzdC5zZXR1cC50cycsICcuL3Rlc3RzL3NldHVwL21vZHVsZXMvY2xpZW50LnRzJ10sXG4gICAgY3NzOiB0cnVlLFxuICAgIHRlc3RUaW1lb3V0OiAxMDAwMCxcbiAgICBob29rVGltZW91dDogNTAwMCxcblxuICAgIC8vIE9ubHkgaW5jbHVkZXMgc3RhbmRhcmQgdW5pdCB0ZXN0c1xuICAgIGluY2x1ZGU6IFtcbiAgICAgICcqKi8qLnRlc3Que3RzLHRzeH0nLFxuICAgICAgJyoqLyouc3BlYy57dHMsdHN4fScsXG4gICAgXSxcbiAgICBleGNsdWRlOiBbXG4gICAgICAnKiovbm9kZV9tb2R1bGVzLyoqJyxcbiAgICAgICcqKi9kaXN0LyoqJyxcbiAgICAgICcqKi8qLmludGVncmF0aW9uLnRlc3Que3RzLHRzeH0nLFxuICAgICAgJyoqLyouZTJlLnRlc3Que3RzLHRzeH0nLFxuICAgICAgJyoqLyoucGVyZm9ybWFuY2UudGVzdC57dHMsdHN4fScsXG4gICAgICAnKiovKi5hMTF5LnRlc3Que3RzLHRzeH0nLFxuICAgIF0sXG5cbiAgICBlbnZpcm9ubWVudE9wdGlvbnM6IHtcbiAgICAgIGpzZG9tOiB7XG4gICAgICAgIHJlc291cmNlczogJ3VzYWJsZScsXG4gICAgICAgIHVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICBjb3ZlcmFnZToge1xuICAgICAgcHJvdmlkZXI6ICd2OCcsXG4gICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2pzb24nLCAnaHRtbCcsICdsY292J10sXG4gICAgICByZXBvcnRzRGlyZWN0b3J5OiAnLi4vLi4vY292ZXJhZ2UvY2xpZW50L3VuaXQnLFxuICAgICAgaW5jbHVkZTogWydzcmMvKiovKi57dHMsdHN4fSddLFxuICAgICAgZXhjbHVkZTogW1xuICAgICAgICAnbm9kZV9tb2R1bGVzLyoqJyxcbiAgICAgICAgJ2Rpc3QvKionLFxuICAgICAgICAnc3JjLyoqLyouZC50cycsXG4gICAgICAgICdzcmMvdGVzdC11dGlscy8qKicsXG4gICAgICAgICdzcmMvKiovKi5zdG9yaWVzLnt0cyx0c3h9JyxcbiAgICAgICAgJ3NyYy9fX3Rlc3RzX18vKionLFxuICAgICAgXSxcbiAgICAgIGFsbDogdHJ1ZSxcbiAgICAgIHNraXBGdWxsOiBmYWxzZSxcbiAgICB9LFxuXG4gICAgcmVwb3J0ZXJzOiBbJ3ZlcmJvc2UnXSxcbiAgICByZXRyeTogcHJvY2Vzcy5lbnYuQ0kgPyAyIDogMCxcbiAgICBwb29sOiAndGhyZWFkcycsXG4gICAgcG9vbE9wdGlvbnM6IHtcbiAgICAgIHRocmVhZHM6IHtcbiAgICAgICAgc2luZ2xlVGhyZWFkOiBmYWxzZSxcbiAgICAgICAgaXNvbGF0ZTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICdAY2xpZW50JzogcmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuICAgICAgJ0BjbGllbnQvKic6IHJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvKicpLFxuICAgICAgJ0BzaGFyZWQnOiByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3NoYXJlZCcpLFxuICAgICAgJ0BzaGFyZWQvKic6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vc2hhcmVkLyonKSxcbiAgICAgICdAc2hhcmVkL2NvcmUnOiByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3NoYXJlZC9jb3JlL3NyYycpLFxuICAgICAgJ0BzaGFyZWQvY29yZS8qJzogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9zaGFyZWQvY29yZS9zcmMvKicpLFxuICAgICAgJ0BzZXJ2ZXIvaW5mcmFzdHJ1Y3R1cmUvc2NoZW1hJzogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9zaGFyZWQvc2NoZW1hJyksXG4gICAgICAnQHNlcnZlci9pbmZyYXN0cnVjdHVyZS9zY2hlbWEvKic6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vc2hhcmVkL3NjaGVtYS8qJyksXG4gICAgICAnQHNlcnZlci9pbmZyYXN0cnVjdHVyZS9kYXRhYmFzZSc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvc3R1YnMvZGF0YWJhc2Utc3R1Yi50cycpLFxuICAgICAgJ0BzaGFyZWQvdXRpbHMnOiByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3NoYXJlZC91dGlscycpLFxuICAgICAgJ0BzaGFyZWQvdXRpbHMvKic6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vc2hhcmVkL3V0aWxzLyonKSxcbiAgICAgICdAc2VydmVyL2luZnJhc3RydWN0dXJlL2RhdGFiYXNlLyonOiByZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3N0dWJzL2RhdGFiYXNlLXN0dWIudHMnKSxcbiAgICAgICdAc2hhcmVkL2NvcmUvbWlkZGxld2FyZSc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvc3R1YnMvbWlkZGxld2FyZS1zdHViLnRzJyksXG4gICAgICAnQGNsaWVudC91dGlscy9sb2dnZXInOiByZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3V0aWxzL2xvZ2dlci50cycpLFxuICAgICAgJ0BjbGllbnQvdGVzdC11dGlscyc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvdGVzdC11dGlscycpLFxuICAgICAgJ0BjbGllbnQvQHR5cGVzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9AdHlwZXMnKSxcbiAgICB9LFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBQ3hCLFNBQVMscUJBQXFCO0FBSmlOLElBQU0sMkNBQTJDO0FBTWhTLElBQU0sWUFBWSxRQUFRLGNBQWMsd0NBQWUsR0FBRyxJQUFJO0FBRTlELElBQU8sd0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixNQUFNO0FBQUEsSUFDSixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixZQUFZLENBQUMscUJBQXFCLGlDQUFpQztBQUFBLElBQ25FLEtBQUs7QUFBQSxJQUNMLGFBQWE7QUFBQSxJQUNiLGFBQWE7QUFBQTtBQUFBLElBR2IsU0FBUztBQUFBLE1BQ1A7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1A7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUVBLG9CQUFvQjtBQUFBLE1BQ2xCLE9BQU87QUFBQSxRQUNMLFdBQVc7QUFBQSxRQUNYLEtBQUs7QUFBQSxNQUNQO0FBQUEsSUFDRjtBQUFBLElBRUEsVUFBVTtBQUFBLE1BQ1IsVUFBVTtBQUFBLE1BQ1YsVUFBVSxDQUFDLFFBQVEsUUFBUSxRQUFRLE1BQU07QUFBQSxNQUN6QyxrQkFBa0I7QUFBQSxNQUNsQixTQUFTLENBQUMsbUJBQW1CO0FBQUEsTUFDN0IsU0FBUztBQUFBLFFBQ1A7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxNQUNBLEtBQUs7QUFBQSxNQUNMLFVBQVU7QUFBQSxJQUNaO0FBQUEsSUFFQSxXQUFXLENBQUMsU0FBUztBQUFBLElBQ3JCLE9BQU8sUUFBUSxJQUFJLEtBQUssSUFBSTtBQUFBLElBQzVCLE1BQU07QUFBQSxJQUNOLGFBQWE7QUFBQSxNQUNYLFNBQVM7QUFBQSxRQUNQLGNBQWM7QUFBQSxRQUNkLFNBQVM7QUFBQSxNQUNYO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssUUFBUSxXQUFXLE9BQU87QUFBQSxNQUMvQixXQUFXLFFBQVEsV0FBVyxPQUFPO0FBQUEsTUFDckMsYUFBYSxRQUFRLFdBQVcsU0FBUztBQUFBLE1BQ3pDLFdBQVcsUUFBUSxXQUFXLGNBQWM7QUFBQSxNQUM1QyxhQUFhLFFBQVEsV0FBVyxnQkFBZ0I7QUFBQSxNQUNoRCxnQkFBZ0IsUUFBUSxXQUFXLHVCQUF1QjtBQUFBLE1BQzFELGtCQUFrQixRQUFRLFdBQVcseUJBQXlCO0FBQUEsTUFDOUQsaUNBQWlDLFFBQVEsV0FBVyxxQkFBcUI7QUFBQSxNQUN6RSxtQ0FBbUMsUUFBUSxXQUFXLHVCQUF1QjtBQUFBLE1BQzdFLG1DQUFtQyxRQUFRLFdBQVcsOEJBQThCO0FBQUEsTUFDcEYsaUJBQWlCLFFBQVEsV0FBVyxvQkFBb0I7QUFBQSxNQUN4RCxtQkFBbUIsUUFBUSxXQUFXLHNCQUFzQjtBQUFBLE1BQzVELHFDQUFxQyxRQUFRLFdBQVcsOEJBQThCO0FBQUEsTUFDdEYsMkJBQTJCLFFBQVEsV0FBVyxnQ0FBZ0M7QUFBQSxNQUM5RSx3QkFBd0IsUUFBUSxXQUFXLHVCQUF1QjtBQUFBLE1BQ2xFLHNCQUFzQixRQUFRLFdBQVcsa0JBQWtCO0FBQUEsTUFDM0Qsa0JBQWtCLFFBQVEsV0FBVyxjQUFjO0FBQUEsSUFDckQ7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
