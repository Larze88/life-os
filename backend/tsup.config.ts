import { defineConfig } from 'tsup';

// Bundles the server (including @lifeos/shared) into one file. Native and runtime
// dependencies from package.json stay external and are installed in the image.
export default defineConfig({
  entry: ['src/server.ts', 'src/db/migrate-cli.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: ['@lifeos/shared'],
});
