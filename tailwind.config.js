// Root Tailwind config - delegates to client config for consistency
// This ensures tools can detect Tailwind while using the actual client config
import clientConfig from './client/tailwind.config.ts';

export default {
  content: [
    "./client/src/**/*.{js,ts,jsx,tsx,html}",
    "./client/index.html"
  ],
  // Import the actual config from client to maintain consistency
  presets: [clientConfig],
};
