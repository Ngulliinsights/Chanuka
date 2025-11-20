/**
 * Vite Plugin to Suppress Development Warnings
 */

export function suppressWarningsPlugin() {
  return {
    name: 'suppress-warnings',
    configureServer(server) {
      // Suppress Vite server warnings
      const originalWarn = server.config.logger.warn;
      server.config.logger.warn = (msg, options) => {
        // Suppress specific warning patterns
        if (msg.includes('hmr') || 
            msg.includes('optimize') || 
            msg.includes('dependency') ||
            msg.includes('reload')) {
          return;
        }
        originalWarn(msg, options);
      };
    },
    buildStart() {
      // Suppress build warnings
      this.warn = () => {};
    }
  };
}
