import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  alias: {
    '@': path.resolve(__dirname),
    '@server': path.resolve(__dirname),
    '@chanuka/shared': path.resolve(__dirname, '../shared'),
    '@shared': path.resolve(__dirname, '../shared'),
  },
});
