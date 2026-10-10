import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true },
  preview: { port: 4173, strictPort: true },
  build: { target: 'es2022', sourcemap: false },
});
