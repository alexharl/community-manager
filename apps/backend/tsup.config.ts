import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  clean: true,
  // Workspace-Paket liegt als TypeScript-Quelltext vor und wird mitgebündelt
  noExternal: ['@cm/shared'],
});
