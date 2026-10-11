// Vite 8 (ADR-0001). `base: './'` para servir de qualquer subcaminho (GitHub Pages, Q-29).
// O build de debug (`vite build --mode debug`) aceita os parâmetros de URL do ADR-0002 §14.
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import pacote from './package.json' with { type: 'json' };

/** Identificador do build para o cache `vdc.teto` (design/decisoes-F-004.md §5): a versão e o commit. */
function idDoBuild(): string {
  try {
    return `${pacote.version}+${execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()}`;
  } catch {
    return pacote.version;
  }
}

export default defineConfig({
  base: './',
  define: { __VDC_BUILD__: JSON.stringify(idDoBuild()) },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
  },
});
