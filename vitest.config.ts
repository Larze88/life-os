import { defineConfig } from 'vitest/config';

// Runs all workspace test projects with a single `npm test`.
export default defineConfig({
  test: {
    projects: ['shared', 'backend', 'frontend'],
  },
});
