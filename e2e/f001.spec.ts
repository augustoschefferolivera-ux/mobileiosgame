// F-001 na Playwright (projeto taps-game): F-001.2, .3, .4, .6, .7 (meta), .8,
// .11 e .15. A seed vem de VDC_SEED (o --seed do scripts/verify.sh).
import { expect, test, type Page } from '@playwright/test';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alvosDoAcender } from '../src/entrada/alvos';
import { PASSOS_REFERENCIA, SEED_PADRAO } from '../src/logica/nucleo/referencia';
import { insetsZerados } from '../src/plataforma/safeArea';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = Number(process.env['VDC_SEED'] ?? SEED_PADRAO);
const EVIDENCIAS = process.env['VDC_EVIDENCIAS'] === '1';

interface Debug {
  passo: number;
  estado: string;
  seed: number;
  textoAtivo: string[];
  eventos: { evento: string; passo: number; campos: Record<string, unknown> }[];
  desbloqueioDoAudio: string | null;
  somTravado: boolean;
  hash(): string | null;
  audio(): string;
  pausar(): void;
  avancar(n: number): void;
}
declare global {
  interface Window {
    __GAME_DEBUG__: Debug;
  }
}

async function abrir(page: Page): Promise<void> {
  await page.goto(`/?seed=${SEED}`);
  await page.waitForFunction(() => window.__GAME_DEBUG__?.estado === 'ACENDER');
}

/** Ponto lógico (pt) → coordenada da página, pela caixa do canvas. */
async function paraPagina(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const caixa = await page.locator('#jogo canvas').boundingBox();
  if (!caixa) throw new Error('canvas sem caixa');
  return { x: caixa.x + (x * caixa.width) / 390, y: caixa.y + (y * caixa.height) / 844 };
}

async function tocarAcender(page: Page): Promise<void> {
  const b = alvosDoAcender(insetsZerados(), [])[0]!;
  const p = await paraPagina(page, b.x + b.largura / 2, b.y + b.altura / 2);
  await page.touchscreen.tap(p.x, p.y);
  await page.waitForFunction(() => window.__GAME_DEBUG__.estado === 'VIGILIA');
}

const proximoFrame = (page: Page): Promise<void> =>
  page.evaluate(() => new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok()))));

test('F-001.2 e F-001.7: 390 × 844 sem barras de rolagem, viewport-fit=cover e screenshot', async ({ page }, info) => {
  await abrir(page);
  const m = await page.evaluate(() => ({
    sh: document.scrollingElement!.scrollHeight,
    sw: document.scrollingElement!.scrollWidth,
    ih: innerHeight,
    iw: innerWidth,
    meta: document.querySelector('meta[name=viewport]')?.getAttribute('content') ?? '',
  }));
  expect(m.iw).toBe(390);
  expect(m.ih).toBe(844);
  expect(m.sh).toBeLessThanOrEqual(m.ih);
  expect(m.sw).toBeLessThanOrEqual(m.iw);
  expect(m.meta).toContain('viewport-fit=cover');
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toEqual(
    expect.arrayContaining(['A1.ACENDER.BOTAO', 'A1.ACENDER.AVISO_AUDIO']),
  );
  const destino = EVIDENCIAS
    ? join(RAIZ, 'production', 'evidencias', 'F-001', 'screenshot-390x844.png')
    : info.outputPath('screenshot-390x844.png');
  mkdirSync(dirname(destino), { recursive: true });
  const png = await page.screenshot({ path: destino, scale: 'css' });
  expect(png.readUInt32BE(16)).toBe(390); // largura no cabeçalho IHDR
  expect(png.readUInt32BE(20)).toBe(844); // altura
});

test('F-001.4 e F-001.3: áudio suspended antes e running depois do toque; o passo avança', async ({ page }) => {
  await abrir(page);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.audio())).toBe('suspended');
  // Sem toque, nada retoma o áudio nem começa a Vigília.
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => [window.__GAME_DEBUG__.audio(), window.__GAME_DEBUG__.estado])).toEqual([
    'suspended',
    'ACENDER',
  ]);
  // Um toque fora do botão não acende nem desbloqueia: o unlock automático do Phaser está desligado.
  const fora = await paraPagina(page, 195, 120);
  await page.touchscreen.tap(fora.x, fora.y);
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => [window.__GAME_DEBUG__.estado, window.__GAME_DEBUG__.audio(), window.__GAME_DEBUG__.somTravado]),
  ).toEqual(['ACENDER', 'suspended', true]);

  await tocarAcender(page);
  await page.waitForFunction(() => window.__GAME_DEBUG__.audio() === 'running');
  await page.waitForFunction(() => window.__GAME_DEBUG__.desbloqueioDoAudio === 'running');
  // O campo privado unlocked que marcamos chega ao BaseSoundManager real, que zera locked (F-001.14).
  await page.waitForFunction(() => window.__GAME_DEBUG__.somTravado === false);
  const p1 = await page.evaluate(() => window.__GAME_DEBUG__.passo);
  await proximoFrame(page);
  await page.waitForTimeout(100);
  const p2 = await page.evaluate(() => window.__GAME_DEBUG__.passo);
  expect(p2).toBeGreaterThan(p1);
});

test('F-001.6: o canvas fica em 780 × 1688 depois de resize e rotação', async ({ page }) => {
  await abrir(page);
  const medir = (): Promise<[number, number, string]> =>
    page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('#jogo canvas')!;
      return [c.width, c.height, c.style.width];
    });
  const [w0, h0, css0] = await medir();
  expect([w0, h0]).toEqual([780, 1688]);
  for (const v of [
    { width: 430, height: 932 },
    { width: 375, height: 667 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(v);
    await page.waitForTimeout(700); // o ScaleManager confere o pai a cada 500 ms
    const [w, h, css] = await medir();
    expect([w, h], JSON.stringify(v)).toEqual([780, 1688]);
    if (v.width !== 390) expect(css, 'o FIT reagiu ao novo tamanho').not.toBe(css0);
  }
});

test('F-001.8: touchmove não passivo com preventDefault; touch-action none', async ({ page }) => {
  await abrir(page);
  const r = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#jogo canvas')!;
    const mover = (alvo: EventTarget): boolean => {
      const toque = new Touch({ identifier: 1, target: alvo, clientX: 195, clientY: 300 });
      const e = new TouchEvent('touchmove', { cancelable: true, bubbles: true, touches: [toque], changedTouches: [toque] });
      alvo.dispatchEvent(e);
      return e.defaultPrevented;
    };
    const gesto = (tipo: string): boolean => {
      const e = new Event(tipo, { cancelable: true, bubbles: true });
      document.dispatchEvent(e);
      return e.defaultPrevented;
    };
    return {
      canvas: mover(canvas),
      documento: mover(document.body),
      gesturestart: gesto('gesturestart'),
      gesturechange: gesto('gesturechange'),
      contextmenu: gesto('contextmenu'),
      touchActionCanvas: getComputedStyle(canvas).touchAction,
      touchActionBody: getComputedStyle(document.body).touchAction,
      overscroll: getComputedStyle(document.documentElement).overscrollBehaviorY,
    };
  });
  expect(r).toEqual({
    canvas: true,
    documento: true,
    gesturestart: true,
    gesturechange: true,
    contextmenu: true,
    touchActionCanvas: 'none',
    touchActionBody: 'none',
    overscroll: 'none',
  });
  // Arrasto real para baixo a partir do topo (pull-to-refresh), acima do botão: a página não rola.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 20 }] });
  for (let y = 40; y <= 360; y += 40) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await page.evaluate(() => [scrollX, scrollY, window.__GAME_DEBUG__.estado])).toEqual([0, 0, 'ACENDER']);
});

test('F-001.11: mesmo hash da seed no passo 1.000 no Vitest (Node) e no Chromium', async ({ page }) => {
  const arquivo = join(RAIZ, '.verify', 'referencia-f001.json');
  expect(existsSync(arquivo), 'rode o Vitest antes (scripts/verify.sh grava a referência)').toBe(true);
  const ref = JSON.parse(readFileSync(arquivo, 'utf-8')) as { seed: number; passos: number; hash: string };
  expect(ref.seed).toBe(SEED);
  expect(ref.passos).toBe(PASSOS_REFERENCIA);
  await abrir(page);
  await tocarAcender(page);
  await proximoFrame(page);
  const r = await page.evaluate((alvo) => {
    const d = window.__GAME_DEBUG__;
    d.pausar();
    const ja = d.passo;
    if (ja > alvo) return { ja, passo: d.passo, hash: null, seed: d.seed };
    d.avancar(alvo - ja);
    return { ja, passo: d.passo, hash: d.hash(), seed: d.seed };
  }, PASSOS_REFERENCIA);
  expect(r.ja, 'o driver rodou passos reais antes do avancar').toBeGreaterThan(0);
  expect(r.seed).toBe(SEED);
  expect(r.passo).toBe(PASSOS_REFERENCIA);
  if (EVIDENCIAS) {
    appendFileSync(
      join(RAIZ, 'production', 'evidencias', 'F-001', 'determinismo.log'),
      `chromium (Playwright): seed=${r.seed} passos=${r.passo} (${r.ja} pelo driver real + ${r.passo - r.ja} por avancar) hash=${r.hash} iguais=${r.hash === ref.hash}\n`,
    );
  }
  expect(r.hash).toBe(ref.hash);
});

test('F-001.15: telemetria local em __GAME_DEBUG__.eventos, sem rede', async ({ page }) => {
  const depoisDaCarga: string[] = [];
  let carregou = false;
  page.on('request', (req) => {
    if (carregou && /^https?:/.test(req.url())) depoisDaCarga.push(req.url());
  });
  await abrir(page);
  await page.waitForLoadState('networkidle');
  carregou = true;
  await tocarAcender(page);
  await page.waitForTimeout(1000);
  const eventos = await page.evaluate(() => window.__GAME_DEBUG__.eventos);
  expect(eventos.map((e) => e.evento)).toContain('vigilia_inicio');
  expect(eventos.find((e) => e.evento === 'vigilia_inicio')).toEqual({
    evento: 'vigilia_inicio',
    passo: 0,
    campos: { personagem: 'aldric', mapa: 'charneca_das_lanternas', ciclo: 1, maldicao: 0, reliquias: [], arvore_pct: 0 },
  });
  expect(depoisDaCarga).toEqual([]);
});
