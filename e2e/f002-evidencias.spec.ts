// Evidências da F-002 (B §4: "vídeo curto ou 3 screenshots sequenciais";
// design/decisoes-F-002.md §8 e §2): o vídeo movimento.webm de 390 × 844 com o
// roteiro do §8, os 3 PNG sequenciais tirados durante o vídeo e a imagem do
// mapa 3 × 3 com os obstáculos, para revisão. Com VDC_EVIDENCIAS=1
// (scripts/verify.sh), grava em production/evidencias/F-002/.
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ALTURA_DA_TELA, ALTURA_DO_MAPA as H, LARGURA_DA_TELA, LARGURA_DO_MAPA as W } from '../src/logica/mundo/toro';
import { EVIDENCIAS, RAIZ, SEED, SEM_HORDA, abrir, arrastarDevagar, paraPagina, proximoFrame, tocarAcender } from './apoio';

const DIR = join(RAIZ, 'production', 'evidencias', 'F-002');
// Lido do disco: o ESM do Node exige atributo de importação para JSON.
const charneca = JSON.parse(readFileSync(join(RAIZ, 'src', 'dados', 'regioes', 'charneca_das_lanternas.json'), 'utf-8')) as {
  inicio_jogador: { x: number; y: number };
  obstaculos: { x: number; y: number; tamanho_px: number }[];
};
const destino = (arquivo: string, outputPath: (n: string) => string): string => {
  const caminho = EVIDENCIAS ? join(DIR, arquivo) : outputPath(arquivo);
  mkdirSync(dirname(caminho), { recursive: true });
  return caminho;
};

async function tocar(page: Page, cdp: CDPSession, tipo: 'touchStart' | 'touchMove', x: number, y: number): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: [await paraPagina(page, x, y)] });
}
const soltar = (cdp: CDPSession) => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

test('evidência: vídeo de 390 × 844 e 3 screenshots sequenciais (roteiro do §8)', async ({ browser }, info) => {
  test.setTimeout(90_000);
  const use = info.project.use;
  const contexto = await browser.newContext({
    baseURL: use.baseURL,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: use.deviceScaleFactor,
    hasTouch: true,
    isMobile: true,
    // Sem o tamanho, a Playwright reduz o vídeo para caber em 800 × 800.
    recordVideo: { dir: info.outputPath('video'), size: { width: 390, height: 844 } },
  });
  const page = await contexto.newPage();
  const cdp = await contexto.newCDPSession(page);
  const foto = (n: number) => page.screenshot({ path: destino(`movimento-${n}-390x844.png`, (a) => info.outputPath(a)), scale: 'css' });

  await abrir(page, SEM_HORDA);
  await page.waitForTimeout(1200);
  await tocarAcender(page);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.seed)).toBe(SEED);

  // 1. Relógio a 0:10 e retomar (avancar deixa a simulação pausada): o prompt aparece.
  await page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    d.pausar();
    d.avancar(600 - d.relogio);
    d.retomar();
  });
  await page.waitForFunction(() => window.__GAME_DEBUG__.textoAtivo.includes('A2.TUTORIAL.01'));
  await page.waitForTimeout(2300);
  await foto(1);

  // 2. Tocar e arrastar para a direita: o joystick aparece, o prompt some e a câmera segue pelo corredor.
  await tocar(page, cdp, 'touchStart', 100, 650);
  await arrastarDevagar(page, { x: 100, y: 650 }, { x: 170, y: 650 }, (x, y) => tocar(page, cdp, 'touchMove', x, y));
  await page.waitForFunction(() => !window.__GAME_DEBUG__.textoAtivo.includes('A2.TUTORIAL.01'));
  await page.waitForTimeout(1500);
  await foto(2);

  // 3. Cruzar a costura em x (de x = 585 a 144 px/s, ≈ 4,1 s) e 4. encostar no obstáculo e deslizar.
  await page.waitForFunction(() => window.__GAME_DEBUG__.jogador!.x < 400, undefined, { timeout: 20_000 });
  await page.waitForFunction(() => window.__GAME_DEBUG__.jogador!.y < 1266 - 6, undefined, { timeout: 20_000 });
  // A posição é lida antes da captura: no contêiner a captura leva quase 1 s de jogo (≈ 100 px a mais depois das camadas da F-006).
  const deslize = await page.evaluate(() => window.__GAME_DEBUG__.jogador!);
  expect(deslize.x).toBeGreaterThan(150);
  // O contato com o obstáculo (230, 1278, 80 px) começa em x = 286; o deslize lido depende do tempo da captura no contêiner (277 na F-007).
  expect(deslize.x).toBeLessThan(290);
  await page.waitForTimeout(300);
  await foto(3);
  await page.waitForTimeout(2000);

  // 5. Soltar e tocar em outro ponto: o joystick aparece em outro lugar.
  await soltar(cdp);
  await page.waitForTimeout(800);
  await tocar(page, cdp, 'touchStart', 60, 790);
  await proximoFrame(page);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.entrada.joystick)).toMatchObject({ ativo: true, origemX: 60, origemY: 790 });
  await page.waitForTimeout(1200);
  await soltar(cdp);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.toquesPerdidos)).toBe(0);

  const video = page.video()!;
  await contexto.close();
  await video.saveAs(destino('movimento.webm', (a) => info.outputPath(a)));
});

test('evidência: mapa 3 × 3 com os obstáculos, o início, a zona livre e o corredor (§2)', async ({ page }, info) => {
  const k = 0.5;
  const obst = charneca.obstaculos
    .map((o) => `<circle cx="${o.x * k}" cy="${o.y * k}" r="${(o.tamanho_px / 2) * k}" fill="#2b3340" stroke="#e8dcc4" stroke-opacity="0.35"/>`)
    .join('');
  const telas: string[] = [];
  for (let c = 0; c < 3; c++) {
    for (let l = 0; l < 3; l++) {
      const n = charneca.obstaculos.filter((o) => Math.floor(o.x / LARGURA_DA_TELA) === c && Math.floor(o.y / ALTURA_DA_TELA) === l).length;
      const [x, y] = [c * LARGURA_DA_TELA * k, l * ALTURA_DA_TELA * k];
      telas.push(
        `<rect x="${x}" y="${y}" width="${LARGURA_DA_TELA * k}" height="${ALTURA_DA_TELA * k}" fill="none" stroke="#e8dcc4" stroke-opacity="0.25" stroke-dasharray="4 4"/>`,
        `<text x="${x + 8}" y="${y + 20}" fill="#e8dcc4" font-family="sans-serif" font-size="14">(${c}, ${l}): ${n}</text>`,
      );
    }
  }
  const { x: sx, y: sy } = charneca.inicio_jogador;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * k}" height="${H * k}">
    <rect width="100%" height="100%" fill="#1a1f2b"/>
    <rect x="${(sx - 16) * k}" y="${(sy - 16) * k}" width="${(W - sx + 16) * k}" height="${32 * k}" fill="#ffb347" fill-opacity="0.12"/>
    <circle cx="${sx * k}" cy="${sy * k}" r="${192 * k}" fill="none" stroke="#ffb347" stroke-opacity="0.5" stroke-dasharray="6 4"/>
    ${telas.join('')}${obst}
    <circle cx="${sx * k}" cy="${sy * k}" r="${16 * k}" fill="#ffb347"/>
  </svg>`;
  await page.setViewportSize({ width: W * k, height: H * k });
  // Sem o meta viewport, o contexto isMobile diagrama a 980 px e reduz a página.
  await page.setContent(
    `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#1a1f2b">${svg}</body></html>`,
  );
  const png = await page.screenshot({ path: destino('mapa-585x1266.png', (a) => info.outputPath(a)), scale: 'css' });
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([585, 1266]);
});
