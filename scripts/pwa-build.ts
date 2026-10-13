// PWA do build (design/decisoes-F-010.md PW1, PW2): o manifest e o service worker saem do Vite como arquivos gerados. O nome do app vem
// de `t('A8.SISTEMA.TITULO')` (pt-BR.json); o service worker leva o id do build no nome do cache e a lista de arquivos do build.
// Sem DOM: o Vitest avalia o texto do service worker num sandbox.
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface IconeDoManifesto {
  readonly src: string;
  readonly sizes: string;
  readonly type: string;
  readonly purpose?: string;
}

/** Os ícones provisórios (PW4), em `public/icones/` (gerados por scripts/gerar-icones.py). */
export const ICONES: readonly IconeDoManifesto[] = [
  { src: './icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: './icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: './icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

export const COR_DO_APP = '#1a1f2b';

/** O manifest da PWA (PW1). `titulo` é o texto de `A8.SISTEMA.TITULO`. */
export function montarManifesto(titulo: string): string {
  return JSON.stringify(
    {
      name: titulo,
      short_name: titulo,
      display: 'standalone',
      orientation: 'portrait',
      start_url: './',
      scope: './',
      lang: 'pt-BR',
      background_color: COR_DO_APP,
      theme_color: COR_DO_APP,
      icons: ICONES,
    },
    null,
    2,
  );
}

/** O nome do cache de um build: `vdc-<id>`, o mesmo id do cache `vdc.teto` (PW2). */
export function nomeDoCache(build: string): string {
  return `vdc-${build}`;
}

/**
 * O texto do service worker (PW2, revisto a pedido do usuário em 2026-10-13: o deploy novo não aparecia no iPhone). A navegação
 * vai primeiro à rede e só sem rede cai no `index.html` do cache, ignorando a busca (`?seed=` funciona offline); os outros
 * arquivos (com hash no nome) vêm do cache e, se faltarem, da rede. `skipWaiting` e `clients.claim`: a versão nova assume já;
 * a página aberta segue com o JS que carregou (só a próxima navegação muda). O `activate` apaga os caches `vdc-` de outros builds.
 */
export function montarServiceWorker(build: string, arquivos: readonly string[]): string {
  return `// Gerado no build (scripts/pwa-build.ts; design/decisoes-F-010.md PW2). Não editar.
const CACHE = ${JSON.stringify(nomeDoCache(build))};
const ARQUIVOS = ${JSON.stringify(arquivos)};
const aqui = (relativo) => new URL(relativo, self.registration.scope).href;

self.addEventListener('install', (evento) => {
  self.skipWaiting();
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS.map(aqui))));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('vdc-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  if (pedido.mode === 'navigate') {
    evento.respondWith(fetch(pedido).catch(() => caches.match(aqui('index.html'), { ignoreSearch: true })));
    return;
  }
  evento.respondWith(caches.match(pedido).then((r) => r || fetch(pedido)));
});
`;
}

/** Todos os arquivos de uma pasta (caminhos relativos a ela, com "/"), para a lista do precache. */
export function arquivosDaPasta(pasta: string): string[] {
  const saida: string[] = [];
  const andar = (dir: string): void => {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) andar(caminho);
      else saida.push(relative(pasta, caminho).split('\\').join('/'));
    }
  };
  andar(pasta);
  return saida.sort();
}
