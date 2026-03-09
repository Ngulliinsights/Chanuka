/**
 * Entry point that registers our custom path alias resolver hook
 * before tsx processes module imports. Use with --import flag:
 *   node --import ./resolve-paths.mjs --import tsx index.ts
 */
import { register } from 'node:module';

// Register our custom resolver hook in the loader worker thread
register('./resolve-paths-hook.mjs', { parentURL: import.meta.url });
