/* global process, console */
// Roda um script TypeScript de scripts/arte com a resolução do Vite (imports
// sem extensão e JSON, como no jogo): `node scripts/arte/rodar.mjs amostras`.
import { createServer } from 'vite';

const nome = process.argv[2];
if (!nome) {
  console.error('uso: node scripts/arte/rodar.mjs <script> [args]');
  process.exit(2);
}
const servidor = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true } });
try {
  const modulo = await servidor.ssrLoadModule(`/scripts/arte/${nome}.ts`);
  await modulo.principal(process.argv.slice(3));
} finally {
  await servidor.close();
}
