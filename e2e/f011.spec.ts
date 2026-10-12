// F-011 na Playwright (design/arte/style-card.md; F-011.8): as capturas 390 × 844 de cada cena com a arte, em
// passos fixos (a imagem pausada depende só da seed e do passo), para abrir e conferir legibilidade e escala.
// Com VDC_EVIDENCIAS=1 (o verify), vão para production/evidencias/F-011/.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alvoDaPausa } from '../src/entrada/alvos';
import { EVIDENCIAS, RAIZ, abrir, paraPagina, proximoFrame, tocarAcender } from './apoio';

const DIR = join(RAIZ, 'production', 'evidencias', 'F-011');

async function capturar(page: Page, nome: string, info: { outputPath: (n: string) => string }): Promise<void> {
  const destino = EVIDENCIAS ? join(DIR, nome) : info.outputPath(nome);
  mkdirSync(dirname(destino), { recursive: true });
  const png = await page.screenshot({ path: destino, scale: 'css' });
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([390, 844]);
}

/** Pausa a simulação no passo `alvo` e espera 2 quadros (com a simulação pausada, o render usa alfa = 1). */
async function pausarNoPasso(page: Page, alvo: number): Promise<void> {
  const passo = await page.evaluate((a) => {
    const d = window.__GAME_DEBUG__;
    d.pausar();
    d.avancar(Math.max(0, a - d.passo));
    return d.passo;
  }, alvo);
  expect(passo).toBe(alvo);
  await proximoFrame(page);
  await proximoFrame(page);
}

const quadros = async (page: Page, n: number): Promise<void> => {
  for (let k = 0; k < n; k++) await proximoFrame(page);
};

test('Acender: o Aldric e a luz da brasa no lugar do logotipo', async ({ page }, info) => {
  await abrir(page);
  await quadros(page, 4);
  await capturar(page, 'acender-390x844.png', info);
});

test('Vigília com a horda e as 3 armas: o Aldric, a luz, o golpe, as facas, o Círculo de Sal, as partículas e os pickups', async ({ page }, info) => {
  await abrir(page, '&cenario=tres_armas&tutorial=0');
  await tocarAcender(page);
  await pausarNoPasso(page, 400);
  await capturar(page, 'vigilia-horda-390x844.png', info);
});

test('Vigília com médios: o Oco Grande e a Noviça telegrafando (setor e silhueta branca) e o projétil de sal', async ({ page }, info) => {
  await abrir(page, '&cenario=horda_com_ataques&tutorial=0');
  await tocarAcender(page);
  await pausarNoPasso(page, 300);
  await capturar(page, 'vigilia-medios-390x844.png', info);
});

test('modal de level up com os ícones em pixel (4 pt por px)', async ({ page }, info) => {
  await abrir(page, '&cenario=nivel_tres&teto=300');
  await tocarAcender(page);
  await page.waitForFunction(() => window.__GAME_DEBUG__.levelUp?.aberto === true, null, { timeout: 30_000 });
  await quadros(page, 20);
  await capturar(page, 'modal-390x844.png', info);
});

test('pausa com a build e os ícones', async ({ page }, info) => {
  await abrir(page, '&cenario=tres_armas&tutorial=0');
  await tocarAcender(page);
  const ins = await page.evaluate(() => window.__GAME_DEBUG__.safeArea);
  const p = alvoDaPausa(ins, { id: '', x: 0, y: 0, largura: 0, altura: 0 });
  const q = await paraPagina(page, p.x + p.largura / 2, p.y + p.altura / 2);
  await page.touchscreen.tap(q.x, q.y);
  await page.waitForFunction(() => window.__GAME_DEBUG__.pausa.ativa);
  await quadros(page, 8);
  await capturar(page, 'pausa-390x844.png', info);
});

test('Resultado depois do Apagar (o Aldric ajoelhado vira cinza por baixo)', async ({ page }) => {
  test.setTimeout(90_000);
  await abrir(page, '&inicio=19:00&almas=1000&tutorial=0');
  await tocarAcender(page);
  await page.waitForFunction(() => window.__GAME_DEBUG__.estado === 'FIM(apagar)', null, { timeout: 60_000 });
  await quadros(page, 30);
  await capturar(page, 'resultado-390x844.png', test.info());
});
