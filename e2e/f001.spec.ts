// F-001 na Playwright (projeto taps-game): F-001.2, .3, .4, .6, .7 (meta), .8,
// .11 e .15. A seed vem de VDC_SEED (o --seed do scripts/verify.sh).
import { expect, test } from '@playwright/test';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alvosDoAcender } from '../src/entrada/alvos';
import { BYTES_ESTADO } from '../src/logica/nucleo/estado';
import { PASSOS_REFERENCIA, ROTEIRO_REFERENCIA } from '../src/logica/nucleo/referencia';
import { insetsZerados, type Insets } from '../src/plataforma/safeArea';
import { EVIDENCIAS, RAIZ, SEED, SEM_HORDA, abrir, paraPagina, proximoFrame, tocarAcender } from './apoio';

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
  // #jogo ocupa a altura dinâmica do viewport (100dvh, lista iOS de B §3.14).
  expect(
    await page.evaluate(() =>
      Array.from(document.styleSheets).flatMap((f) => Array.from(f.cssRules)).some(
        (r) => r instanceof CSSStyleRule && r.selectorText === '#jogo' && r.style.height === '100dvh',
      ),
    ),
  ).toBe(true);
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
    const antes = (await medir())[2];
    await page.setViewportSize(v);
    // Espera o FIT reagir (o estilo do canvas muda); no 390 × 844 ele volta ao inicial.
    await page.waitForFunction(
      ([a, alvo]) => {
        const w = document.querySelector<HTMLCanvasElement>('#jogo canvas')!.style.width;
        return alvo ? w === alvo : w !== a;
      },
      [antes, v.width === 390 ? css0 : ''] as const,
    );
    const [w, h] = await medir();
    expect([w, h], JSON.stringify(v)).toEqual([780, 1688]);
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
      gestureend: gesto('gestureend'),
      dblclick: gesto('dblclick'),
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
    gestureend: true,
    dblclick: true,
    touchActionCanvas: 'none',
    touchActionBody: 'none',
    overscroll: 'none',
  });
  // Toques reais (CDP) num arrasto de pull-to-refresh acima do botão: um ouvinte na fase de
  // bolha do window, o último a rodar, registra se os nossos handlers impediram o padrão.
  await page.evaluate(() => {
    const w = window as unknown as { __impedidos: string[] };
    w.__impedidos = [];
    for (const tipo of ['touchstart', 'touchmove', 'touchend']) {
      window.addEventListener(tipo, (e) => w.__impedidos.push(`${tipo}:${e.defaultPrevented}`));
    }
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 20 }] });
  for (let y = 40; y <= 360; y += 40) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const impedidos = await page.evaluate(() => (window as unknown as { __impedidos: string[] }).__impedidos);
  expect(impedidos.length).toBeGreaterThanOrEqual(3);
  expect(impedidos.filter((x) => x.endsWith(':false'))).toEqual([]);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.estado)).toBe('ACENDER');
});

test('F-001.11: mesmo hash da seed no passo 1.000 no Vitest (Node) e no Chromium', async ({ page }) => {
  const arquivo = join(RAIZ, '.verify', 'referencia-f001.json');
  expect(existsSync(arquivo), 'rode o Vitest antes (scripts/verify.sh grava a referência)').toBe(true);
  const ref = JSON.parse(readFileSync(arquivo, 'utf-8')) as { seed: number; passos: number; hash: string };
  expect(ref.seed).toBe(SEED);
  expect(ref.passos).toBe(PASSOS_REFERENCIA);
  // A Vigília completa, com a horda; o TETO explícito, como no Node (design/decisoes-F-003.md §6).
  await abrir(page, '&teto=300');
  // O mesmo roteiro de ComandosDoPasso do Vitest, desde o passo 0 (design/decisoes-F-002.md §6).
  await page.evaluate((roteiro) => window.__GAME_DEBUG__.entrada.roteiro(roteiro), ROTEIRO_REFERENCIA);
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

test('__GAME_DEBUG__: fps, vivos por tipo, passos perdidos e memória (B §4 F-001)', async ({ page }) => {
  await abrir(page, SEM_HORDA);
  await tocarAcender(page);
  await page.waitForFunction(() => window.__GAME_DEBUG__.fps > 0 && window.__GAME_DEBUG__.passo > 0);
  const d = await page.evaluate(() => {
    const g = window.__GAME_DEBUG__;
    return {
      fps: g.fps,
      vivos: g.vivos,
      recusados: g.recusados,
      passos_perdidos: g.passos_perdidos,
      relogioIgualPasso: g.relogio === g.passo,
      memoria: g.memoriaEstimadaMB,
    };
  });
  expect(d.fps).toBeGreaterThan(0);
  expect(d.vivos).toEqual({
    oco_das_lanternas: 0, oco_grande: 0, novica_de_sal: 0, oco_grande_coroado: 0, o_lanterneiro: 0,
    projeteis: 0, efeitos: 0, pickups: 0, particulas: 0,
  });
  expect(d.recusados).toEqual({ inimigos: 0, projeteis: 0, efeitos: 0, pickups: 0 });
  expect(Number.isInteger(d.passos_perdidos) && d.passos_perdidos >= 0).toBe(true);
  expect(d.relogioIgualPasso).toBe(true);
  // Sem MSAA (ADR-0003 §9): cor em dobro + depth/stencil a 780 × 1688; mais o atlas (512² RGBA) e o buffer
  // de instâncias da horda, na CPU e na GPU (500 × 168 B × 2; design/decisoes-F-003.md §8).
  expect(d.memoria).toBeCloseTo((BYTES_ESTADO + 780 * 1688 * 4 * 3 + 512 * 512 * 4 + 2 * 500 * 168) / (1024 * 1024), 3);
});

test('driver real: ≈ 60 passos por segundo e pausa observada entre frames', async ({ page }) => {
  await abrir(page);
  await tocarAcender(page);
  const ler = (): Promise<[number, number]> => page.evaluate(() => [window.__GAME_DEBUG__.passo, performance.now()]);
  const [p0, t0] = await ler();
  await page.waitForTimeout(1500);
  const [p1, t1] = await ler();
  const esperado = ((t1 - t0) / 1000) * 60;
  expect(p1 - p0, 'nunca mais que 60 Hz (um passo extra por frame daria ≈ 120)').toBeLessThanOrEqual(esperado * 1.1 + 2);
  expect(p1 - p0, 'o driver acompanha o tempo real').toBeGreaterThanOrEqual(esperado * 0.3);
  await page.evaluate(() => window.__GAME_DEBUG__.pausar());
  const parado = await page.evaluate(() => window.__GAME_DEBUG__.passo);
  await proximoFrame(page);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.passo)).toBe(parado);
  await page.evaluate(() => window.__GAME_DEBUG__.retomar());
  await page.waitForFunction((p) => window.__GAME_DEBUG__.passo > p, parado);
});

test('F-001.7 e F-001.13 de ponta a ponta: insets emulados chegam aos alvos em pt', async ({ page }) => {
  const insets: Insets = { topo: 59, direita: 0, baixo: 34, esquerda: 0 };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', {
    insets: { top: insets.topo, right: insets.direita, bottom: insets.baixo, left: insets.esquerda },
  });
  await abrir(page);
  // 390 × 844 sem letterbox: 1 px CSS = 1 pt.
  expect(await page.evaluate(() => window.__GAME_DEBUG__.safeArea)).toEqual(insets);
  const semInsets = alvosDoAcender(insetsZerados(), [])[0]!;
  const comInsets = alvosDoAcender(insets, [])[0]!;
  expect(comInsets.y).toBeGreaterThan(semInsets.y + 2);
  // Um ponto dentro do botão sem insets, mas fora do botão deslocado pela safe-area, não acende.
  const p = await paraPagina(page, 195, semInsets.y + 1);
  await page.touchscreen.tap(p.x, p.y);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.estado)).toBe('ACENDER');
  await tocarAcender(page, insets);
});

test('o desbloqueio acontece no touchend, não no touchstart (B §3.14)', async ({ page }) => {
  await abrir(page);
  const b = alvosDoAcender(insetsZerados(), [])[0]!;
  const p = await paraPagina(page, b.x + b.largura / 2, b.y + b.altura / 2);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => [window.__GAME_DEBUG__.estado, window.__GAME_DEBUG__.audio()])).toEqual([
    'ACENDER',
    'suspended',
  ]);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => window.__GAME_DEBUG__.estado === 'VIGILIA');
  await page.waitForFunction(() => window.__GAME_DEBUG__.audio() === 'running');
});

