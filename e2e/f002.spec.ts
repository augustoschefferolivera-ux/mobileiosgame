// F-002 na Playwright (projeto taps-game): F-002.3 (arrasto move o jogador),
// F-002.4 (dois toques criam o joystick em lugares diferentes), F-002.8 (prompt
// de mover aos 0:10), a área do joystick na safe-area e o mapeamento depois de
// um resize. Toques reais por CDP (Input.dispatchTouchEvent), como na F-001.
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { insetsZerados } from '../src/plataforma/safeArea';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro } from '../src/logica/mundo/toro';
import { SEED, SEM_HORDA, abrir, arrastarDevagar, paraPagina, proximoFrame, tocarAcender, textoDe } from './apoio';

const PROMPT = 'A2.TUTORIAL.01';

/** Um dedo real por CDP, em pt lógicos. */
async function dedo(page: Page): Promise<{
  comecar(x: number, y: number): Promise<void>;
  mover(x: number, y: number): Promise<void>;
  soltar(): Promise<void>;
  cdp: CDPSession;
}> {
  const cdp = await page.context().newCDPSession(page);
  const ponto = async (x: number, y: number) => [await paraPagina(page, x, y)];
  const enviar = async (x: number, y: number) => void (await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: await ponto(x, y) }));
  let atual = { x: 0, y: 0 };
  return {
    cdp,
    comecar: async (x, y) => {
      atual = { x, y };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: await ponto(x, y) });
    },
    // O arrasto vai a ≤ 150 pt/s: um salto rápido do joystick contaria como swipe (decisoes-F-006 GE1, VT5).
    mover: async (x, y) => {
      await arrastarDevagar(page, atual, { x, y }, enviar);
      atual = { x, y };
    },
    soltar: async () => void (await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })),
  };
}

const jogador = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.jogador!);
const joystick = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.entrada.joystick);
const textos = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.textoAtivo);

/** Leva o relógio ao passo `alvo` com a simulação pausada e espera o Hud desenhar. */
async function relogioEm(page: Page, alvo: number): Promise<void> {
  const r = await page.evaluate((a) => {
    const d = window.__GAME_DEBUG__;
    d.pausar();
    d.avancar(Math.max(0, a - d.relogio));
    return d.relogio;
  }, alvo);
  expect(r).toBe(alvo);
  await proximoFrame(page);
}

test('F-002.3: o arrasto move o jogador na direção do arrasto, e soltar para', async ({ page }) => {
  await abrir(page, SEM_HORDA + '&tutorial=0');
  await tocarAcender(page);
  const d = await dedo(page);
  const j0 = await jogador(page);
  expect(j0).toMatchObject({ x: 585, y: 1266, dirX: 0, dirY: -1 });
  // Para a direita, pelo corredor livre: x cresce, y não muda.
  await d.comecar(100, 650);
  // O arrasto leva tempo real (cada toque do CDP espera o quadro, e no WebGL por software o quadro é lento): o jogador segue
  // andando durante ele e dá a volta no mapa até um obstáculo. A leitura vale no 1º quadro com x > x0 + 30, tirada na página.
  await page.evaluate((x0) => {
    const w = window as unknown as { __j1: unknown };
    w.__j1 = null;
    const ler = (): void => {
      const g = window.__GAME_DEBUG__;
      if (g.jogador!.x > x0 + 30) w.__j1 = { j: g.jogador };
      else requestAnimationFrame(ler);
    };
    requestAnimationFrame(ler);
  }, j0.x);
  await d.mover(170, 650);
  await page.waitForFunction(() => (window as unknown as { __j1: unknown }).__j1 !== null);
  const lido = await page.evaluate(() => (window as unknown as { __j1: { j: Awaited<ReturnType<typeof jogador>> } }).__j1);
  const j1 = lido.j;
  expect(j1.y).toBe(j0.y);
  expect([j1.dirX, j1.dirY]).toEqual([1, 0]);
  expect(await joystick(page)).toMatchObject({ ativo: true, origemX: 100, origemY: 650, vx: 1, vy: 0 });
  // Para cima (sem soltar): y diminui (a partir de onde o jogador está agora).
  const antes = await jogador(page);
  await d.mover(100, 580);
  await page.waitForFunction((y1) => {
    const d = window.__GAME_DEBUG__.jogador!.y - y1;
    return (d > 1266 ? d - 2532 : d < -1266 ? d + 2532 : d) < -20;
  }, antes.y);
  const j2 = await jogador(page);
  expect(j2.dirY).toBeLessThan(-0.99);
  await d.soltar();
  await proximoFrame(page);
  const parado = await jogador(page);
  await page.waitForTimeout(300);
  expect(await jogador(page)).toEqual(parado);
  expect(await joystick(page)).toMatchObject({ ativo: false, vx: 0, vy: 0 });
  expect(await page.evaluate(() => window.__GAME_DEBUG__.toquesPerdidos)).toBe(0);
  // A câmera segue o jogador (arredondada para 0,5 pt).
  const cam = await page.evaluate(() => window.__GAME_DEBUG__.camera!);
  expect(Math.abs(deltaNoToro(parado.x, cam.x, W))).toBeLessThanOrEqual(0.25);
  expect(Math.abs(deltaNoToro(parado.y, cam.y, H))).toBeLessThanOrEqual(0.25);
});

test('F-002.3 por entrada.injetar: o mesmo arrasto pela fila da camada de toque', async ({ page }) => {
  await abrir(page, SEM_HORDA + '&tutorial=0');
  await tocarAcender(page);
  const x0 = (await jogador(page)).x;
  await page.evaluate(() => {
    const e = window.__GAME_DEBUG__.entrada;
    e.injetar('inicio', 42, 120, 700, performance.now());
    e.injetar('move', 42, 190, 700, performance.now());
  });
  await page.waitForFunction((x) => window.__GAME_DEBUG__.jogador!.x > x + 20, x0);
  await page.evaluate(() => window.__GAME_DEBUG__.entrada.injetar('fim', 42, 190, 700, performance.now()));
  await proximoFrame(page);
  expect(await joystick(page)).toMatchObject({ ativo: false, origemX: 120, origemY: 700 });
});

test('F-002.4: dois toques em lugares diferentes criam o joystick em lugares diferentes', async ({ page }) => {
  await abrir(page, SEM_HORDA + '&tutorial=0');
  await tocarAcender(page);
  const origens: { x: number; y: number }[] = [];
  for (const [x, y] of [
    [60, 520],
    [200, 780],
  ] as const) {
    const p = await paraPagina(page, x, y);
    await page.touchscreen.tap(p.x, p.y);
    await proximoFrame(page);
    const j = await joystick(page);
    expect(j.ativo).toBe(false);
    origens.push({ x: j.origemX, y: j.origemY });
  }
  expect(origens[0]).toEqual({ x: 60, y: 520 });
  expect(origens[1]).toEqual({ x: 200, y: 780 });
  expect(origens[0]).not.toEqual(origens[1]);
});

test('o joystick só nasce na área: metade de baixo, 60% da esquerda, fora da safe-area', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, right: 0, bottom: 34, left: 0 } });
  await abrir(page, SEM_HORDA + '&tutorial=0');
  await tocarAcender(page, { ...insetsZerados(), topo: 59, baixo: 34 });
  for (const [x, y, nasce] of [
    [100, 400, false], // acima da metade
    [300, 700, false], // nos 40% da direita, livres para os botões
    [100, 830, false], // no inset de baixo
    [100, 800, true],
  ] as const) {
    const p = await paraPagina(page, x, y);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
    await proximoFrame(page);
    expect((await joystick(page)).ativo, `${x}, ${y}`).toBe(nasce);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await proximoFrame(page);
  }
});

test('depois de um resize, o toque continua caindo no ponto certo em pt', async ({ page }) => {
  await abrir(page, SEM_HORDA + '&tutorial=0');
  await tocarAcender(page);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.waitForFunction(() => document.querySelector<HTMLCanvasElement>('#jogo canvas')!.getBoundingClientRect().width > 400);
  await proximoFrame(page);
  const p = await paraPagina(page, 80, 700);
  await page.touchscreen.tap(p.x, p.y);
  await proximoFrame(page);
  const j = await joystick(page);
  expect(j.origemX).toBeCloseTo(80, 0);
  expect(j.origemY).toBeCloseTo(700, 0);
});

test('F-002.8: o prompt de mover aparece no passo 600 e some ao mover', async ({ page }) => {
  await abrir(page, SEM_HORDA);
  await tocarAcender(page);
  await relogioEm(page, 599);
  expect(await textos(page)).not.toContain(PROMPT);
  await relogioEm(page, 600);
  await page.waitForFunction((id) => window.__GAME_DEBUG__.textoAtivo.includes(id), PROMPT);
  await page.evaluate(() => window.__GAME_DEBUG__.retomar());
  const d = await dedo(page);
  await d.comecar(100, 650);
  await d.mover(160, 650);
  await page.waitForFunction((id) => !window.__GAME_DEBUG__.textoAtivo.includes(id), PROMPT);
  await d.soltar();
  // Cumprido nesta Vigília: não volta.
  await relogioEm(page, 1500);
  await page.waitForTimeout(300);
  expect(await textos(page)).not.toContain(PROMPT);
});

test('F-002.8: quem se move antes de 0:10 não vê o prompt', async ({ page }) => {
  await abrir(page, SEM_HORDA);
  await tocarAcender(page);
  const d = await dedo(page);
  await d.comecar(100, 650);
  await d.mover(160, 650);
  await page.waitForFunction(() => window.__GAME_DEBUG__.jogador!.x > 590);
  await d.soltar();
  await relogioEm(page, 700);
  await page.waitForTimeout(300);
  expect(await textos(page)).not.toContain(PROMPT);
});

test('F-002.8: com ?tutorial=0 o prompt não aparece', async ({ page }) => {
  await abrir(page, SEM_HORDA + '&tutorial=0');
  await tocarAcender(page);
  await relogioEm(page, 700);
  await page.waitForTimeout(300);
  expect(await textos(page)).not.toContain(PROMPT);
});

test('sem WebGL, o jogo mostra o aviso no lugar do canvas, em vez de abrir em branco (ADR-0004 §6)', async ({ playwright }, info) => {
  const navegador = await playwright.chromium.launch({ args: ['--disable-webgl', '--disable-webgl2'] });
  try {
    const contexto = await navegador.newContext({
      baseURL: info.project.use.baseURL,
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await contexto.newPage();
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await page.goto(`/?seed=${SEED}`);
    await expect(page.locator('#jogo .sem-webgl')).toHaveText(textoDe('A8.SISTEMA.SEM_WEBGL'));
    expect(await page.locator('#jogo canvas').count()).toBe(0);
    expect(await page.title()).toBe(textoDe('A8.SISTEMA.TITULO'));
    expect(erros).toEqual([]);
  } finally {
    await navegador.close();
  }
});

test('o debug informa os toques simultâneos do aparelho (navigator.maxTouchPoints, Q-29)', async ({ page }) => {
  await abrir(page, SEM_HORDA);
  const [debug, navegador] = await page.evaluate(() => [window.__GAME_DEBUG__.entrada.maxToques, navigator.maxTouchPoints]);
  expect(debug).toBe(navegador);
  expect(debug).toBeGreaterThan(0);
});
