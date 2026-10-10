import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Vite 8 (Rolldown). Chunking: build.rolldownOptions.output.codeSplitting (rollupOptions é alias
// deprecado em Vite 8). O Phaser (~1,3 MB min / ~350 KB gzip) vai para um chunk próprio com hash
// estável entre releases do jogo, para o service worker não baixar a engine de novo a cada deploy.
export default defineConfig({
  server: { host: true },
  preview: { port: 4173, strictPort: true },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1500, // o chunk do Phaser sozinho passa de 1 MB; o aviso padrão (500 kB) só gera ruído
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'phaser', test: /node_modules[\\/]phaser[\\/]/ }],
        },
      },
    },
  },
  plugins: [
    // PWA: service worker gerado pelo Workbox (generateSW). Manifest continua em public/manifest.webmanifest
    // (manifest: false evita duplicar). autoUpdate: no iOS a atualização só aplica ao fechar o app standalone.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,webmanifest,png,webp,jpg,svg,woff2,m4a,mp3,ogg}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // padrão do Workbox é 2 MiB; o chunk do Phaser tem ~1,4 MB e um atlas 2048² pode passar
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
