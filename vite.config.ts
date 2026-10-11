// Vite 8 (ADR-0001). `base: './'` para servir de qualquer subcaminho (GitHub Pages, Q-29).
// O build de debug (`vite build --mode debug`) aceita os parâmetros de URL do ADR-0002 §14.
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
  },
});
