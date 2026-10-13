// Manifest e service worker do build (design/decisoes-F-010.md PW1, PW2, PW4, F-010.6 na parte que o Vitest alcança): o manifest, o
// texto do service worker avaliado num sandbox (instalar, ativar, navegar, buscar) e o registro depois do `load`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { t } from '../../src/cenas/textos';
import { registrarServiceWorker } from '../../src/plataforma/pwa';
import { ICONES, arquivosDaPasta, montarManifesto, montarServiceWorker, nomeDoCache } from '../../scripts/pwa-build';

const RAIZ = join(import.meta.dirname, '..', '..');
const BASE = 'https://exemplo.test/jogo/';

describe('manifest (PW1)', () => {
  const m = JSON.parse(montarManifesto(t('A8.SISTEMA.TITULO'))) as Record<string, unknown>;

  it('nome e nome curto são t(A8.SISTEMA.TITULO); standalone, retrato, escopo e início relativos, pt-BR', () => {
    expect([m['name'], m['short_name']]).toEqual([t('A8.SISTEMA.TITULO'), t('A8.SISTEMA.TITULO')]);
    expect([m['display'], m['orientation'], m['start_url'], m['scope'], m['lang']]).toEqual(['standalone', 'portrait', './', './', 'pt-BR']);
    expect([m['background_color'], m['theme_color']]).toEqual(['#1a1f2b', '#1a1f2b']);
  });

  it('ícones de 192 e 512 (e um maskable) existem em public/ como PNG do tamanho declarado', () => {
    const tamanhos = ICONES.map((i) => i.sizes);
    expect(tamanhos).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(ICONES.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const i of ICONES) {
      const png = readFileSync(join(RAIZ, 'public', i.src.replace('./', '')));
      expect(png.subarray(1, 4).toString('latin1'), i.src).toBe('PNG');
      const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
      expect(`${w}x${h}`, i.src).toBe(i.sizes);
    }
    expect(readFileSync(join(RAIZ, 'public', 'icones', 'apple-touch-icon.png')).readUInt32BE(16)).toBe(180);
  });

  it('o index.html liga o manifest e o apple-touch-icon', () => {
    const html = readFileSync(join(RAIZ, 'index.html'), 'utf-8');
    expect(html).toContain('<link rel="manifest" href="./manifest.webmanifest" />');
    expect(html).toContain('rel="apple-touch-icon" href="./icones/apple-touch-icon.png"');
  });
});

/** Um service worker avaliado com `self`, `caches` e `fetch` falsos. */
function carregar(build: string, arquivos: string[], existentes: string[] = [], semRede = false) {
  const ouvintes = new Map<string, (e: unknown) => void>();
  const caches = new Map<string, Map<string, string>>(existentes.map((n) => [n, new Map()]));
  const apagados: string[] = [];
  const buscados: string[] = [];
  const pilha = {
    open: (nome: string) => {
      if (!caches.has(nome)) caches.set(nome, new Map());
      const c = caches.get(nome)!;
      return Promise.resolve({ addAll: (urls: string[]) => (urls.forEach((u) => c.set(u, `cache:${u}`)), Promise.resolve()) });
    },
    keys: () => Promise.resolve([...caches.keys()]),
    delete: (nome: string) => (apagados.push(nome), caches.delete(nome), Promise.resolve(true)),
    match: (pedido: string | { url: string }, opcoes?: { ignoreSearch?: boolean }) => {
      let url = typeof pedido === 'string' ? pedido : pedido.url;
      if (opcoes?.ignoreSearch) url = url.split('?')[0]!;
      for (const c of caches.values()) if (c.has(url)) return Promise.resolve(c.get(url));
      return Promise.resolve(undefined);
    },
  };
  const skipWaiting = vi.fn();
  const claim = vi.fn();
  const sandbox = {
    self: { addEventListener: (t: string, fn: (e: unknown) => void) => ouvintes.set(t, fn), registration: { scope: BASE }, location: new URL(BASE), skipWaiting, clients: { claim } },
    caches: pilha,
    fetch: (p: { url: string }) => (buscados.push(p.url), semRede ? Promise.reject(new Error('offline')) : Promise.resolve(`rede:${p.url}`)),
    URL,
  };
  // O texto do service worker vira o corpo de uma função cujos parâmetros são os globais do worker.
  new Function('self', 'caches', 'fetch', 'URL', montarServiceWorker(build, arquivos))(sandbox.self, sandbox.caches, sandbox.fetch, sandbox.URL);
  const disparar = async (tipo: string, extra: Record<string, unknown> = {}): Promise<unknown> => {
    let promessa: unknown;
    let resposta: unknown;
    ouvintes.get(tipo)!({ waitUntil: (p: unknown) => (promessa = p), respondWith: (p: unknown) => (resposta = p), ...extra });
    await promessa;
    return await resposta;
  };
  return { disparar, caches, apagados, buscados, skipWaiting, claim };
}

describe('service worker (PW2)', () => {
  const ARQUIVOS = ['./', 'index.html', 'assets/a.js', 'manifest.webmanifest'];

  it('instalar guarda os arquivos do build no cache vdc-<build>, com URLs do escopo, e chama skipWaiting', async () => {
    const sw = carregar('1.0+abc', ARQUIVOS);
    await sw.disparar('install');
    expect([...sw.caches.get(nomeDoCache('1.0+abc'))!.keys()]).toEqual([BASE, `${BASE}index.html`, `${BASE}assets/a.js`, `${BASE}manifest.webmanifest`]);
    expect(sw.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('ativar apaga só os caches vdc- de outros builds e depois chama clients.claim', async () => {
    const sw = carregar('2.0', ARQUIVOS, ['vdc-1.0', 'vdc-2.0', 'outro-cache']);
    await sw.disparar('activate');
    expect(sw.apagados).toEqual(['vdc-1.0']);
    expect([...sw.caches.keys()].sort()).toEqual(['outro-cache', 'vdc-2.0']);
    expect(sw.claim).toHaveBeenCalledTimes(1);
  });

  it('navegação vai à rede primeiro (o deploy novo aparece na primeira abertura); arquivo em cache vem do cache; o que falta vai à rede', async () => {
    const sw = carregar('3.0', ARQUIVOS);
    await sw.disparar('install');
    expect(await sw.disparar('fetch', { request: { method: 'GET', mode: 'navigate', url: `${BASE}?seed=7&debug=1` } })).toBe(`rede:${BASE}?seed=7&debug=1`);
    expect(await sw.disparar('fetch', { request: { method: 'GET', mode: 'no-cors', url: `${BASE}assets/a.js` } })).toBe(`cache:${BASE}assets/a.js`);
    expect(await sw.disparar('fetch', { request: { method: 'GET', mode: 'no-cors', url: `${BASE}assets/novo.js` } })).toBe(`rede:${BASE}assets/novo.js`);
    expect(sw.buscados).toEqual([`${BASE}?seed=7&debug=1`, `${BASE}assets/novo.js`]);
  });

  it('sem rede, a navegação com ?seed= cai no index.html do cache (offline)', async () => {
    const sw = carregar('3.1', ARQUIVOS, [], true);
    await sw.disparar('install');
    expect(await sw.disparar('fetch', { request: { method: 'GET', mode: 'navigate', url: `${BASE}?seed=7` } })).toBe(`cache:${BASE}index.html`);
  });

  it('POST e outra origem passam direto (o service worker não responde)', async () => {
    const sw = carregar('4.0', ARQUIVOS);
    const resposta = vi.fn();
    for (const request of [{ method: 'POST', mode: 'cors', url: `${BASE}x` }, { method: 'GET', mode: 'cors', url: 'https://outro.test/x.js' }]) {
      await sw.disparar('fetch', { request, respondWith: resposta });
    }
    expect(resposta).not.toHaveBeenCalled();
  });

  it('o texto gerado chama skipWaiting e clients.claim (a versão nova assume sem esperar todas as abas fecharem)', () => {
    const texto = montarServiceWorker('x', ARQUIVOS);
    expect(texto).toMatch(/skipWaiting\s*\(/);
    expect(texto).toMatch(/clients\.claim/);
  });
});

describe('arquivosDaPasta e registro', () => {
  it('lista os ícones de public/ com "/" e em ordem', () => {
    expect(arquivosDaPasta(join(RAIZ, 'public'))).toEqual(['icones/apple-touch-icon.png', 'icones/icone-192.png', 'icones/icone-512.png', 'icones/icone-maskable-512.png']);
  });

  it('registra depois do load (ou já, se a página está completa); não registra em dev nem sem a API', () => {
    const register = vi.fn().mockResolvedValue(undefined);
    let aoCarregar: (() => void) | null = null;
    const janela = (estado: string) => ({ document: { readyState: estado }, addEventListener: (_: 'load', fn: () => void) => (aoCarregar = fn) });
    registrarServiceWorker({ serviceWorker: { register } }, janela('loading'), false);
    expect(register).not.toHaveBeenCalled();
    aoCarregar!();
    expect(register).toHaveBeenCalledWith('./sw.js', { scope: './' });
    registrarServiceWorker({ serviceWorker: { register } }, janela('complete'), false);
    expect(register).toHaveBeenCalledTimes(2);
    registrarServiceWorker({ serviceWorker: { register } }, janela('complete'), true);
    registrarServiceWorker({}, janela('complete'), false);
    expect(register).toHaveBeenCalledTimes(2);
  });
});
