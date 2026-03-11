// shared/vitest.config.ts
import path from "path";
import { defineConfig } from "file:///C:/Users/Access%20Granted/Downloads/projects/SimpleTool/node_modules/.pnpm/vitest@3.2.4_@types+node@20.19.24_@vitest+ui@3.2.4_jsdom@26.1.0_terser@5.44.1/node_modules/vitest/dist/config.js";
var __vite_injected_original_dirname = "C:\\Users\\Access Granted\\Downloads\\projects\\SimpleTool\\shared";
var vitest_config_default = defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts", "**/*.spec.ts"],
    exclude: ["node_modules", "dist", "**/examples/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/examples/**"
      ]
    }
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__vite_injected_original_dirname, "."),
      "@server": path.resolve(__vite_injected_original_dirname, "../server"),
      "@client": path.resolve(__vite_injected_original_dirname, "../client/src")
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic2hhcmVkL3ZpdGVzdC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBY2Nlc3MgR3JhbnRlZFxcXFxEb3dubG9hZHNcXFxccHJvamVjdHNcXFxcU2ltcGxlVG9vbFxcXFxzaGFyZWRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFjY2VzcyBHcmFudGVkXFxcXERvd25sb2Fkc1xcXFxwcm9qZWN0c1xcXFxTaW1wbGVUb29sXFxcXHNoYXJlZFxcXFx2aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9BY2Nlc3MlMjBHcmFudGVkL0Rvd25sb2Fkcy9wcm9qZWN0cy9TaW1wbGVUb29sL3NoYXJlZC92aXRlc3QuY29uZmlnLnRzXCI7aW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHRlc3Q6IHtcclxuICAgIGdsb2JhbHM6IHRydWUsXHJcbiAgICBlbnZpcm9ubWVudDogJ25vZGUnLFxyXG4gICAgaW5jbHVkZTogWycqKi8qLnRlc3QudHMnLCAnKiovKi5zcGVjLnRzJ10sXHJcbiAgICBleGNsdWRlOiBbJ25vZGVfbW9kdWxlcycsICdkaXN0JywgJyoqL2V4YW1wbGVzLyoqJ10sXHJcbiAgICBjb3ZlcmFnZToge1xyXG4gICAgICBwcm92aWRlcjogJ3Y4JyxcclxuICAgICAgcmVwb3J0ZXI6IFsndGV4dCcsICdqc29uJywgJ2h0bWwnXSxcclxuICAgICAgZXhjbHVkZTogW1xyXG4gICAgICAgICdub2RlX21vZHVsZXMvJyxcclxuICAgICAgICAnZGlzdC8nLFxyXG4gICAgICAgICcqKi8qLnRlc3QudHMnLFxyXG4gICAgICAgICcqKi8qLnNwZWMudHMnLFxyXG4gICAgICAgICcqKi9leGFtcGxlcy8qKidcclxuICAgICAgXVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgJ0BzaGFyZWQnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLicpLFxyXG4gICAgICAnQHNlcnZlcic6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9zZXJ2ZXInKSxcclxuICAgICAgJ0BjbGllbnQnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vY2xpZW50L3NyYycpXHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEwWCxPQUFPLFVBQVU7QUFFM1ksU0FBUyxvQkFBb0I7QUFGN0IsSUFBTSxtQ0FBbUM7QUFJekMsSUFBTyx3QkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBLElBQ0osU0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsU0FBUyxDQUFDLGdCQUFnQixjQUFjO0FBQUEsSUFDeEMsU0FBUyxDQUFDLGdCQUFnQixRQUFRLGdCQUFnQjtBQUFBLElBQ2xELFVBQVU7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLFVBQVUsQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ2pDLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsV0FBVyxLQUFLLFFBQVEsa0NBQVcsR0FBRztBQUFBLE1BQ3RDLFdBQVcsS0FBSyxRQUFRLGtDQUFXLFdBQVc7QUFBQSxNQUM5QyxXQUFXLEtBQUssUUFBUSxrQ0FBVyxlQUFlO0FBQUEsSUFDcEQ7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
