// F-010 na Playwright (projeto taps-game; design/decisoes-F-010.md "Critérios"): F-010.4 (o fluxo Acender → Santuário → Vigília →
// Apagar → Resultado → Santuário → comprar → nova Vigília) e F-010.6 (manifest, service worker, convite, pausa automática, APAGANDO
// que conclui, overlay de paisagem). Com VDC_EVIDENCIAS=1 grava em production/evidencias/F-010/. Os testes esperam pelo `estado`
// do debug, nunca por um tempo fixo. A Vigília `?inicio=19:00` termina sozinha no Apagar (sem tutorial e sem Cinzas a atrasar).
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alvosDaArvore, alvosDoAcender, alvosDoConvite, alvosDoResultado, alvosDoSantuario, type Alvo } from '../src/entrada/alvos';
import { EVIDENCIAS, RAIZ, abrir, paraPagina, proximoFrame, textoDe, tocarAcender } from './apoio';

/** As Almas garantidas do 1º Apagar (D10 GA1; ALMAS_GARANTIDAS em src/logica/save/meta.ts, que o Node não importa por causa do JSON). */
const ALMAS_GARANTIDAS = 300;
const DIR = join(RAIZ, 'production', 'evidencias', 'F-010');
const NO_FOLEGO = 2;
const NO_PELE = 1;
const URL_APAGAR = '&inicio=19:00&santuario=1';

async function capturar(page: Page, nome: string, info: { outputPath: (n: string) => string }, largura = 390, altura = 844): Promise<void> {
  const destino = EVIDENCIAS ? join(DIR, nome) : info.outputPath(nome);
  mkdirSync(dirname(destino), { recursive: true });
  const png = await page.screenshot({ path: destino, scale: 'css' });
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([largura, altura]);
}

type Fabrica = (insets: Parameters<typeof alvosDoSantuario>[0], out: Alvo[]) => Alvo[];

/** Toca o centro do alvo `id` da tela dada pela fábrica de alvos (os mesmos retângulos que a cena usa). */
async function tocarAlvo(page: Page, fabrica: Fabrica, id: string): Promise<void> {
  const insets = await page.evaluate(() => window.__GAME_DEBUG__.safeArea);
  const a = fabrica(insets, []).find((x) => x.id === id);
  if (!a) throw new Error(`alvo ${id} não existe`);
  const p = await paraPagina(page, a.x + a.largura / 2, a.y + a.altura / 2);
  await page.touchscreen.tap(p.x, p.y);
  await proximoFrame(page);
}

const esperar = (page: Page, fn: () => boolean, ms = 30_000) => page.waitForFunction(fn, null, { timeout: ms, polling: 'raf' });
const esperarCena = (page: Page, cena: string) => page.waitForFunction((c) => window.__GAME_DEBUG__.cena === c, cena, { timeout: 30_000, polling: 'raf' });
const esperarEstado = (page: Page, alvo: string) => page.waitForFunction((a) => window.__GAME_DEBUG__.estado === a, alvo, { timeout: 60_000, polling: 'raf' });
const lerMeta = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.meta);
const lerSantuario = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.santuario!);

/** Só o toque em Acender (o `tocarAcender` do apoio segue até a Vigília); com `?santuario=1` a próxima cena é o Santuário. */
async function acender(page: Page): Promise<void> {
  const insets = await page.evaluate(() => window.__GAME_DEBUG__.safeArea);
  const b = alvosDoAcender(insets, [])[0]!;
  const p = await paraPagina(page, b.x + b.largura / 2, b.y + b.altura / 2);
  await page.touchscreen.tap(p.x, p.y);
  await esperarCena(page, 'Santuario');
}

/** Do Acender ao Resultado do Apagar. */
async function apagar(page: Page): Promise<void> {
  await tocarAcender(page);
  await esperarEstado(page, 'FIM(apagar)');
  await esperarCena(page, 'Resultado');
}

test('F-010.4: Acender → Santuário → Vigília → Apagar → Resultado com o balão → Iselda → 300 Almas → Fôlego → Vigília (hpMax 156)', async ({ page }, info) => {
  test.setTimeout(150_000);
  await abrir(page, URL_APAGAR);
  expect(await page.evaluate(() => localStorage.length), 'storage limpo').toBe(0);
  const insets = await page.evaluate(() => window.__GAME_DEBUG__.safeArea);
  const acender = await page.evaluate(() => ({ cena: window.__GAME_DEBUG__.cena }));
  expect(acender.cena).toBe('Acender');

  // Acender → Santuário (com ?santuario=1 o ?inicio também passa por ele).
  const alvoAcender = alvosDoAcender(insets, [])[0]!;
  const pa = await paraPagina(page, alvoAcender.x + alvoAcender.largura / 2, alvoAcender.y + alvoAcender.altura / 2);
  await page.touchscreen.tap(pa.x, pa.y);
  await esperarCena(page, 'Santuario');
  expect(await page.evaluate(() => window.__GAME_DEBUG__.estado)).toBe('SANTUARIO');
  let s = await lerSantuario(page);
  expect(s.falaDeIselda, 'sem Apagar ainda, Iselda não se apresenta').toBe(false);
  expect(s.arvoreAberta).toBe(false);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toEqual(expect.arrayContaining(['A9.SANTUARIO.ALMAS', 'A9.SANTUARIO.VIGILIA']));
  await page.waitForTimeout(300);
  await capturar(page, 'santuario.png', info);

  // Vigília → Apagar → Resultado com o balão das Cinzas.
  await tocarAlvo(page, alvosDoSantuario, 'vigilia');
  await esperarEstado(page, 'FIM(apagar)');
  await esperarCena(page, 'Resultado');
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({ texto: window.__GAME_DEBUG__.textoAtivo, resultado: window.__GAME_DEBUG__.vigilia!.resultado!, meta: window.__GAME_DEBUG__.meta }));
  expect(r.texto, 'o balão do 1º Apagar').toContain('A2.TUTORIAL.05');
  expect(textoDe('A2.TUTORIAL.05')).not.toBe('');
  expect(r.meta.primeiroApagarFeito).toBe(true);
  const liquido = r.resultado.almasAoSantuario;
  expect(r.meta.almas, 'GA1: max(300, Almas líquidas)').toBe(Math.max(ALMAS_GARANTIDAS, liquido));
  await capturar(page, 'resultado-balao.png', info);

  // Qualquer toque fecha o balão; Voltar leva ao Santuário, com Iselda apresentando e a árvore aberta.
  await tocarAlvo(page, alvosDoResultado, 'voltar');
  if ((await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).includes('A2.TUTORIAL.05')) await tocarAlvo(page, alvosDoResultado, 'voltar');
  await esperarCena(page, 'Santuario');
  s = await lerSantuario(page);
  expect(s).toMatchObject({ falaDeIselda: true, arvoreAberta: true, selecionado: NO_FOLEGO, conviteAberto: false });
  expect(s.almas).toBe(Math.max(ALMAS_GARANTIDAS, liquido));
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toContain('A9.SANTUARIO.ISELDA_FALA_01');
  await page.waitForTimeout(300);
  await capturar(page, 'iselda-apresenta.png', info);

  // A árvore com o tooltip de outro nó (Pele), e de volta ao Fôlego: o 1º toque só seleciona, o 2º compra.
  await tocarAlvo(page, alvosDaArvore, `no${NO_PELE}`);
  s = await lerSantuario(page);
  expect(s.selecionado).toBe(NO_PELE);
  expect(s.ranks.every((x) => x === 0)).toBe(true);
  await page.waitForTimeout(300);
  await capturar(page, 'arvore.png', info);
  const antes = (await lerMeta(page)).almas;
  await tocarAlvo(page, alvosDaArvore, `no${NO_FOLEGO}`);
  expect((await lerMeta(page)).fundacao.gasto, 'o 1º toque não gasta').toBe(0);
  await tocarAlvo(page, alvosDaArvore, `no${NO_FOLEGO}`);
  const comprado = await lerMeta(page);
  expect(comprado.almas, 'Almas − 300').toBe(antes - 300);
  expect(comprado.fundacao.ranks[NO_FOLEGO]).toBe(1);
  expect(comprado.fundacao.gasto).toBe(300);
  expect(await page.evaluate(() => localStorage.getItem('vdc.meta')), 'a compra foi gravada').not.toBeNull();

  // Voltar → Vigília: o jogador nasce com hpMax 156 (base 130, Σ% 15 + 5).
  await tocarAlvo(page, alvosDaArvore, 'voltar');
  expect((await lerSantuario(page)).arvoreAberta).toBe(false);
  await tocarAlvo(page, alvosDoSantuario, 'vigilia');
  await esperarEstado(page, 'VIGILIA');
  expect((await page.evaluate(() => window.__GAME_DEBUG__.jogador!.hpMax))).toBe(156);

  // O 2º Apagar não repete a garantia: as Almas só somam o líquido da Vigília.
  await esperarEstado(page, 'FIM(apagar)');
  await esperarCena(page, 'Resultado');
  const r2 = await page.evaluate(() => ({ resultado: window.__GAME_DEBUG__.vigilia!.resultado!, meta: window.__GAME_DEBUG__.meta }));
  expect(r2.meta.almas, 'sem nova garantia').toBe(comprado.almas + r2.resultado.almasAoSantuario);
  expect(r2.meta.vigiliasConcluidas).toBe(2);
});

/** A soma de conferência do meta (FNV-1a em duas metades, src/logica/save/meta.ts `somaDoTexto`; o Node não importa o módulo por causa do JSON). */
function somaDoTexto(texto: string): string {
  let hi = 0x811c;
  let lo = 0x9dc5;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    for (let b = 0; b < 2; b++) {
      lo ^= b === 0 ? c & 0xff : c >>> 8;
      const baixo = lo * 0x193;
      hi = (hi * 0x193 + (baixo >>> 16) + ((lo & 0xff) << 8)) & 0xffff;
      lo = baixo & 0xffff;
    }
  }
  return hi.toString(16).padStart(4, '0') + lo.toString(16).padStart(4, '0');
}

/** Um meta v3 depois de uma Vigília concluída e de Iselda vista, com a soma certa, para a página ler como se fosse dela. */
function metaGravado(campos: { almas?: number; vigiliasConcluidas?: number; conviteRecusadoEm?: number | null }): string {
  const corpo = {
    versao: 3,
    seq: 3,
    almas: campos.almas ?? 1000,
    brasas: 0,
    mancha: null,
    tutoriais: 7,
    primeiroApagarFeito: true,
    opcoes: { som: true, flashes: true, numerosDeDano: true },
    vigiliasConcluidas: campos.vigiliasConcluidas ?? 1,
    proximaIdVigilia: 2,
    ultimaEncerrada: null,
    fundacao: { ranks: [0, 0, 0, 0, 0, 0, 0, 0], gasto: 0 },
    marcos: 3,
    conviteRecusadoEm: campos.conviteRecusadoEm ?? null,
  };
  const texto = JSON.stringify(corpo);
  return JSON.stringify({ ...corpo, soma: somaDoTexto(texto) });
}

/** Grava o meta antes de qualquer script da página, só quando o armazenamento ainda está vazio. */
async function semearMeta(contexto: BrowserContext, texto: string): Promise<void> {
  await contexto.addInitScript((t) => {
    try {
      if (localStorage.getItem('vdc.meta') === null) localStorage.setItem('vdc.meta', t);
    } catch {
      /* sem armazenamento */
    }
  }, texto);
}

const ABRIR_NO_SANTUARIO = '&santuario=1';

test('F-010.6: manifest válido, ícones 192 e 512, service worker ativo depois do 2º load e a página abre offline', async ({ page, context }) => {
  test.setTimeout(60_000);
  await abrir(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).not.toBeNull();
  const resposta = await page.request.get(new URL(href!, page.url()).toString());
  expect(resposta.ok()).toBe(true);
  const manifest = (await resposta.json()) as { name: string; display: string; icons: { src: string; sizes: string; type: string }[] };
  expect(manifest.display).toBe('standalone');
  expect(manifest.name).toBe(textoDe('A8.SISTEMA.TITULO'));
  for (const tam of ['192x192', '512x512']) {
    const icone = manifest.icons.find((i) => i.sizes === tam);
    expect(icone, `ícone ${tam}`).toBeDefined();
    const r = await page.request.get(new URL(icone!.src, new URL(href!, page.url())).toString());
    expect(r.ok(), icone!.src).toBe(true);
    expect(r.headers()['content-type']).toContain('image/png');
    const png = await r.body();
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([Number(tam.split('x')[0]), Number(tam.split('x')[1])]);
  }

  // O service worker se registra depois do load; no 2º load ele está ativo e controla a página.
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated', null, { timeout: 20_000 });
  await abrir(page);
  await page.reload();
  await page.waitForFunction(() => window.__GAME_DEBUG__?.estado === 'ACENDER');
  const registro = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return { ativo: r?.active?.state ?? null, controlada: navigator.serviceWorker.controller !== null };
  });
  expect(registro).toEqual({ ativo: 'activated', controlada: true });

  // Offline: a página sai do cache do service worker e chega à Tela de Acender.
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__GAME_DEBUG__?.estado === 'ACENDER', null, { timeout: 20_000 });
  expect(await page.title()).toBe(textoDe('A8.SISTEMA.TITULO'));
  expect(await page.evaluate(() => window.__GAME_DEBUG__.cena)).toBe('Acender');
  await context.setOffline(false);
});

test('F-010.6: convite depois da 1ª Vigília, "Agora não" grava conviteRecusadoEm e ele só volta 5 Vigílias depois', async ({ page }, info) => {
  test.setTimeout(150_000);
  await abrir(page, URL_APAGAR);
  await apagar(page);
  await tocarAlvo(page, alvosDoResultado, 'voltar');
  if ((await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).includes('A2.TUTORIAL.05')) await tocarAlvo(page, alvosDoResultado, 'voltar');
  await esperarCena(page, 'Santuario');
  expect((await lerSantuario(page)).conviteAberto, 'Iselda primeiro, o convite nunca na mesma chegada').toBe(false);
  await tocarAlvo(page, alvosDaArvore, 'voltar');
  expect((await lerMeta(page)).vigiliasConcluidas).toBe(1);

  // Na chegada seguinte ao Santuário (a página recarregada, o meta no localStorage) o convite abre.
  await abrir(page, ABRIR_NO_SANTUARIO);
  await acender(page);
  expect(await lerSantuario(page)).toMatchObject({ conviteAberto: true, falaDeIselda: false, arvoreAberta: false });
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toEqual(expect.arrayContaining(['A8.SISTEMA.CONVITE_PWA', 'A8.SISTEMA.CONVITE_PASSOS', 'A8.SISTEMA.AGORA_NAO']));
  await page.waitForTimeout(300);
  await capturar(page, 'convite.png', info);
  await tocarAlvo(page, alvosDoConvite, 'agoraNao');
  expect((await lerSantuario(page)).conviteAberto).toBe(false);
  expect((await lerMeta(page)).conviteRecusadoEm).toBe(1);
  const gravado = await page.evaluate(() => JSON.parse(localStorage.getItem('vdc.meta')!) as { conviteRecusadoEm: number });
  expect(gravado.conviteRecusadoEm).toBe(1);
});

test('F-010.6: o convite só volta com vigiliasConcluidas + 5 depois da recusa', async ({ browser, baseURL }) => {
  test.setTimeout(60_000);
  // Recusado em 2: com 6 concluídas (+4) não volta; com 7 (+5) volta.
  for (const [concluidas, volta] of [
    [6, false],
    [7, true],
  ] as const) {
    const contexto = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, baseURL });
    await semearMeta(contexto, metaGravado({ vigiliasConcluidas: concluidas, conviteRecusadoEm: 2 }));
    const pagina = await contexto.newPage();
    await abrir(pagina, ABRIR_NO_SANTUARIO);
    await acender(pagina);
    expect((await lerSantuario(pagina)).conviteAberto, `${concluidas} concluídas, recusado em 2`).toBe(volta);
    await contexto.close();
  }
});

test('F-010.6: em display-mode standalone o convite não aparece e o persist() é chamado na compra', async ({ page }) => {
  test.setTimeout(60_000);
  await semearMeta(page.context(), metaGravado({ almas: 1000 }));
  await page.addInitScript(() => {
    const w = window as unknown as { __persist: number };
    w.__persist = 0;
    const original = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => (q.includes('display-mode: standalone') ? ({ ...original('(min-width: 0px)'), matches: true, media: q } as MediaQueryList) : original(q));
    if (navigator.storage) navigator.storage.persist = async () => (w.__persist++, true);
  });
  await abrir(page, ABRIR_NO_SANTUARIO);
  await acender(page);
  expect((await lerSantuario(page)).conviteAberto, 'instalado: sem convite').toBe(false);
  expect(await page.evaluate(() => (window as unknown as { __persist: number }).__persist), 'o boot em standalone já pede o armazenamento persistente (ST2)').toBe(1);
  await esperar(page, () => window.__GAME_DEBUG__.persistido === true);
  await tocarAlvo(page, alvosDoSantuario, 'iselda');
  await tocarAlvo(page, alvosDaArvore, `no${NO_FOLEGO}`);
  await tocarAlvo(page, alvosDaArvore, `no${NO_FOLEGO}`);
  expect((await lerMeta(page)).fundacao.gasto).toBe(300);
  expect(await page.evaluate(() => (window as unknown as { __persist: number }).__persist), 'a compra pede de novo').toBe(2);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.persistido)).toBe(true);
});

/** Simula a aba indo para segundo plano (`hidden`) ou voltando (`visible`), como o Safari faz. */
async function mudarVisibilidade(page: Page, estado: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((e) => {
    Object.defineProperty(document, 'visibilityState', { value: e, configurable: true });
    Object.defineProperty(document, 'hidden', { value: e === 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, estado);
}

const relogios = (page: Page) => page.evaluate(() => ({ passo: window.__GAME_DEBUG__.passo, relogio: window.__GAME_DEBUG__.relogio }));

test('F-010.6: visibilitychange (hidden) pausa sozinho, solta o joystick, não anda por 1 s e o toque que retoma não vira esquiva', async ({ page }, info) => {
  test.setTimeout(60_000);
  await abrir(page, '&cenario=sem_horda&tutorial=0');
  await tocarAcender(page);
  await esperar(page, () => window.__GAME_DEBUG__.passo > 60);
  // Um dedo no joystick, andando.
  await page.evaluate(() => {
    const e = window.__GAME_DEBUG__.entrada;
    e.injetar('inicio', 42, 120, 700, performance.now());
    e.injetar('move', 42, 190, 700, performance.now());
  });
  await esperar(page, () => window.__GAME_DEBUG__.entrada.joystick.ativo);
  await mudarVisibilidade(page, 'hidden');
  await esperar(page, () => window.__GAME_DEBUG__.pausa.ativa);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.pausa)).toEqual({ ativa: true, origem: 'automatica' });
  await proximoFrame(page);
  expect((await page.evaluate(() => window.__GAME_DEBUG__.entrada.joystick)).ativo, 'o joystick foi solto').toBe(false);
  const parado = await relogios(page);
  await page.waitForTimeout(1000);
  expect(await relogios(page), 'passo e relogio parados por 1 s').toEqual(parado);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toContain('A6.PAUSA.TOQUE_PARA_CONTINUAR');
  await mudarVisibilidade(page, 'visible');
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => window.__GAME_DEBUG__.pausa)).ativa, 'voltar a ficar visível não retoma sozinho').toBe(true);
  await capturar(page, 'pausa-automatica.png', info);

  // O toque que retoma: a pausa fecha e o jogador não esquiva nem gasta stamina.
  const antes = await page.evaluate(() => ({ stamina: window.__GAME_DEBUG__.jogador!.stamina, esquivas: window.__GAME_DEBUG__.ultimosEventos.filter((e) => e.tipo === 'esquiva').length }));
  const p = await paraPagina(page, 195, 420);
  await page.touchscreen.tap(p.x, p.y);
  await esperar(page, () => !window.__GAME_DEBUG__.pausa.ativa);
  await esperar(page, () => window.__GAME_DEBUG__.passo > 0 && window.__GAME_DEBUG__.relogio > 0);
  const durante = await relogios(page);
  await esperar(page, () => window.__GAME_DEBUG__.relogio > 30);
  const depois = await page.evaluate(() => ({ passo: window.__GAME_DEBUG__.passo, stamina: window.__GAME_DEBUG__.jogador!.stamina, esquiva: window.__GAME_DEBUG__.jogador!.esquiva.passo, esquivas: window.__GAME_DEBUG__.ultimosEventos.filter((e) => e.tipo === 'esquiva').length }));
  expect(depois.passo).toBeGreaterThan(durante.passo);
  expect(depois.esquivas, 'nenhuma esquiva nova').toBe(antes.esquivas);
  expect(depois.esquiva).toBe(0);
  expect(depois.stamina).toBeGreaterThanOrEqual(antes.stamina);
});

/** Do Acender até o passo `n` da fase APAGANDO, sem tutorial. Devolve o hash do estado no FIM e o que o debug mostra. */
async function apagarComInterrupcao(browser: Browser, baseURL: string | undefined, interromperNoPasso: number | null) {
  // Um contexto novo por rodada: o armazenamento começa limpo, como o do 1º Apagar de um jogador novo.
  const contexto = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, baseURL });
  const page = await contexto.newPage();
  await abrir(page, `${URL_APAGAR}&tutorial=0`);
  await acender(page);
  await tocarAlvo(page, alvosDoSantuario, 'vigilia');
  if (interromperNoPasso !== null) {
    // Espera dentro da página, por quadro, para sair da aba no passo exato da fase APAGANDO.
    await page.evaluate(
      (n) =>
        new Promise<void>((ok) => {
          const olhar = (): void => {
            const d = window.__GAME_DEBUG__;
            if (d.estado === 'APAGANDO' && d.vigilia!.apagandoPassos >= n) {
              Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
              document.dispatchEvent(new Event('visibilitychange'));
              ok();
            } else requestAnimationFrame(olhar);
          };
          olhar();
        }),
      interromperNoPasso,
    );
  }
  await esperarEstado(page, 'FIM(apagar)');
  await esperarCena(page, 'Resultado');
  if (interromperNoPasso !== null) await mudarVisibilidade(page, 'visible');
  await page.waitForTimeout(500);
  const lido = await page.evaluate(() => ({
    hash: window.__GAME_DEBUG__.hash(),
    apagando: window.__GAME_DEBUG__.vigilia!.apagandoPassos,
    meta: window.__GAME_DEBUG__.meta,
    guardada: localStorage.getItem('vdc.vigilia'),
    pausa: window.__GAME_DEBUG__.pausa,
  }));
  await contexto.close();
  return lido;
}

test('F-010.6: sair da aba em APAGANDO (passo 10) conclui o FIM, credita o meta uma vez e o hash é o de um Apagar sem interrupção', async ({ browser, baseURL }) => {
  test.setTimeout(150_000);
  const limpo = await apagarComInterrupcao(browser, baseURL, null);
  expect(limpo.apagando).toBe(30);
  const cortado = await apagarComInterrupcao(browser, baseURL, 10);
  expect(cortado.apagando, 'os passos que faltavam rodaram').toBe(30);
  expect(cortado.meta.vigiliasConcluidas, 'creditado uma vez').toBe(1);
  expect(cortado.meta.primeiroApagarFeito).toBe(true);
  expect(cortado.guardada, 'vdc.vigilia removido').toBeNull();
  expect(cortado.hash).toBe(limpo.hash);
  expect(cortado.meta.almas).toBe(limpo.meta.almas);
  expect(cortado.meta.seq).toBe(limpo.meta.seq);
});

test('F-010.6: em 844 × 390 o #gire aparece com o texto, a simulação para; voltar a 390 × 844 mostra a pausa automática', async ({ page }, info) => {
  test.setTimeout(60_000);
  await abrir(page, '&cenario=sem_horda&tutorial=0');
  await tocarAcender(page);
  await esperar(page, () => window.__GAME_DEBUG__.passo > 60);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#gire')).toBeVisible();
  await expect(page.locator('#gire')).toHaveText(textoDe('A8.SISTEMA.GIRE'));
  await esperar(page, () => window.__GAME_DEBUG__.pausa.ativa);
  const parado = await relogios(page);
  await page.waitForTimeout(1000);
  expect(await relogios(page), 'a simulação não anda sob o overlay').toEqual(parado);
  await capturar(page, 'paisagem-844x390.png', info, 844, 390);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#gire')).toBeHidden();
  expect(await page.evaluate(() => window.__GAME_DEBUG__.pausa)).toEqual({ ativa: true, origem: 'automatica' });
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toContain('A6.PAUSA.TOQUE_PARA_CONTINUAR');
});
