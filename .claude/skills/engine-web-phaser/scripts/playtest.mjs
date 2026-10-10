#!/usr/bin/env node
// playtest.mjs — abre o jogo web em WebKit/Chromium emulando um iPhone, captura screenshot,
// console, erros de página e window.__GAME_DEBUG__; opcionalmente executa toques.
// Uso: node playtest.mjs --url http://127.0.0.1:4173/ --out <dir> [--device "iPhone 15"]
//      [--browser webkit|chromium] [--wait 4000] [--taps "x,y;x,y"] [--taps-game "gx,gy;gx,gy"] [--timeout 60] [--seed 42]
// --taps usa px CSS do viewport; --taps-game usa coordenadas DO JOGO (ex.: 390,844 = centro de um canvas
// 780×1688) e converte pelo canvas.getBoundingClientRect() — independe do dispositivo emulado.
// --seed define window.__GAME_SEED__ antes de qualquer script da página (addInitScript); src/main.ts
// deve ler esse valor e passar `seed: [String(window.__GAME_SEED__)]` ao GameConfig para que
// Phaser.Math.RND seja determinístico e o screenshot comparável entre execuções.
// Exige 'playwright' resolvível a partir do cwd (npm i -D playwright; npx playwright install webkit).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
  return acc;
}, []));
if (args.help || !args.url) {
  console.log('Uso: node playtest.mjs --url <url> --out <dir> [--device "iPhone 15"] [--browser webkit|chromium] [--wait ms] [--taps "x,y;x,y"] [--taps-game "gx,gy;gx,gy"] [--timeout s] [--seed n]');
  process.exit(args.help ? 0 : 4);
}
const out = args.out || '.';
mkdirSync(out, { recursive: true });
const require = createRequire(join(process.cwd(), 'package.json'));
const pw = require('playwright');
const browserName = args.browser || 'webkit';
const wait = Number(args.wait || 4000);
const timeout = Number(args.timeout || 60) * 1000;
const deviceName = args.device || 'iPhone 15';
const device = pw.devices[deviceName] || pw.devices['iPhone 13'];
if (!pw.devices[deviceName]) console.warn(`[playtest] dispositivo "${deviceName}" não existe no Playwright; usando "iPhone 13"`);

const consoleLines = [];
const pageErrors = [];
const seed = args.seed && args.seed !== 'true' ? String(args.seed) : null;
const result = { url: args.url, browser: browserName, device: pw.devices[deviceName] ? deviceName : 'iPhone 13', seed, ok: false, reasons: [] };

const browser = await pw[browserName].launch({ headless: true });
const context = await browser.newContext({ ...device });
if (seed !== null) await context.addInitScript((s) => { window.__GAME_SEED__ = s; }, seed);
const page = await context.newPage();
page.setDefaultTimeout(timeout);
page.on('console', m => consoleLines.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => pageErrors.push(String(e && e.stack || e)));
page.on('requestfailed', r => consoleLines.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText || ''}`));

try {
  await page.goto(args.url, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(wait);

  const tapsExecutados = [];
  if (args.taps && args.taps !== 'true') {
    for (const pair of args.taps.split(';').filter(Boolean)) {
      const [x, y] = pair.split(',').map(Number);
      await page.touchscreen.tap(x, y);
      tapsExecutados.push({ css: [x, y] });
      await page.waitForTimeout(400);
    }
  }
  if (args['taps-game'] && args['taps-game'] !== 'true') {
    for (const pair of args['taps-game'].split(';').filter(Boolean)) {
      const [gx, gy] = pair.split(',').map(Number);
      // Converte coordenada do jogo (baseSize do Phaser = canvas.width/height) para px CSS do viewport.
      const css = await page.evaluate(([x, y]) => {
        const c = document.querySelector('canvas');
        if (!c) return null;
        const r = c.getBoundingClientRect();
        return [r.left + (x * r.width) / c.width, r.top + (y * r.height) / c.height];
      }, [gx, gy]);
      if (!css) { result.reasons.push('taps-game: nenhum <canvas>'); break; }
      await page.touchscreen.tap(css[0], css[1]);
      tapsExecutados.push({ game: [gx, gy], css: [Math.round(css[0]), Math.round(css[1])] });
      await page.waitForTimeout(400);
    }
  }
  if (tapsExecutados.length) { result.taps = tapsExecutados; await page.waitForTimeout(800); }

  const info = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const dbg = window.__GAME_DEBUG__ || null;
    let webgl = null;
    try { webgl = !!(canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'))); } catch (_) { webgl = null; }
    return {
      hasCanvas: !!canvas,
      canvasSize: canvas ? { w: canvas.width, h: canvas.height, cssW: canvas.clientWidth, cssH: canvas.clientHeight } : null,
      devicePixelRatio: window.devicePixelRatio,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      webgl,
      debug: dbg ? JSON.parse(JSON.stringify(dbg)) : null,
    };
  });
  await page.screenshot({ path: join(out, 'screenshot.png') });
  writeFileSync(join(out, 'state.json'), JSON.stringify(info, null, 2));
  result.info = info;
  if (!info.hasCanvas) result.reasons.push('nenhum <canvas> na página');
  if (pageErrors.length) result.reasons.push(`${pageErrors.length} pageerror(s)`);
  if (info.debug && Array.isArray(info.debug.errors) && info.debug.errors.length) result.reasons.push(`__GAME_DEBUG__.errors: ${info.debug.errors.length}`);
  if (info.debug && typeof info.debug.fps === 'number' && info.debug.fps > 0 && info.debug.fps < 30) result.reasons.push(`fps baixo no emulador: ${info.debug.fps}`);
  result.ok = result.reasons.length === 0;
} catch (e) {
  result.reasons.push(`exceção: ${e && e.message || e}`);
  try { await page.screenshot({ path: join(out, 'screenshot.png') }); } catch (_) {}
} finally {
  writeFileSync(join(out, 'console.log'), [...consoleLines, ...pageErrors.map(e => `[pageerror] ${e}`)].join('\n') + '\n');
  writeFileSync(join(out, 'playtest.json'), JSON.stringify(result, null, 2));
  await browser.close();
}
console.log(`[playtest] ${result.ok ? 'OK' : 'REPROVADO'} ${result.reasons.join('; ')}`);
process.exit(result.ok ? 0 : 2);
