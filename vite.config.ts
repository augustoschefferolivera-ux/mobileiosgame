// Vite 8 (ADR-0001). `base: './'` para servir de qualquer subcaminho (GitHub Pages, Q-29).
// O build de debug (`vite build --mode debug`) aceita os parâmetros de URL do ADR-0002 §14.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import pacote from './package.json' with { type: 'json' };
import textos from './src/dados/textos/pt-BR.json' with { type: 'json' };
import { arquivosDaPasta, montarManifesto, montarServiceWorker } from './scripts/pwa-build.ts';

/** Identificador do build para o cache `vdc.teto` (design/decisoes-F-004.md §5): a versão e o commit. */
function idDoBuild(): string {
  try {
    return `${pacote.version}+${execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()}`;
  } catch {
    return pacote.version;
  }
}

/** O título do app (`A8.SISTEMA.TITULO`), lido do pt-BR.json como o `t(id)` do jogo. */
function tituloDoApp(): string {
  const achado = textos.textos.find((x) => x.id === 'A8.SISTEMA.TITULO');
  if (!achado) throw new Error('pt-BR.json sem A8.SISTEMA.TITULO');
  return achado.texto;
}

/**
 * PWA (design/decisoes-F-010.md PW1, PW2): emite `manifest.webmanifest` e `sw.js` no build. A lista do precache é o que o build
 * produziu (o index, os assets, o manifest) mais o que mora em `public/` (ícones), sem os mapas de fonte. No `vite dev` só o manifest
 * é servido; o service worker não é registrado em dev.
 */
function pwa(): Plugin {
  return {
    name: 'vdc-pwa',
    configureServer(servidor) {
      servidor.middlewares.use('/manifest.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json');
        res.end(montarManifesto(tituloDoApp()));
      });
    },
    generateBundle(_opcoes, pacoteDoBuild) {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: montarManifesto(tituloDoApp()) });
      const arquivos = new Set<string>(['./', 'index.html', 'manifest.webmanifest']);
      for (const nome of Object.keys(pacoteDoBuild)) if (!nome.endsWith('.map')) arquivos.add(nome);
      if (existsSync('public')) for (const nome of arquivosDaPasta('public')) arquivos.add(nome);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: montarServiceWorker(idDoBuild(), [...arquivos].sort()) });
    },
  };
}

export default defineConfig({
  plugins: [pwa()],
  base: './',
  define: { __VDC_BUILD__: JSON.stringify(idDoBuild()) },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
  },
});
