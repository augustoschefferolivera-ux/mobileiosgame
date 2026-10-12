// F-005 na Playwright (projeto taps-game; design/decisoes-F-005.md §8):
// F-005.4 (subir ao nível 3 e escolher as cartas por toques, no nivel_tres) e
// F-005.7 (baú e União no bau_uniao), com as evidências do modal e da União.
// As referências vêm do Vitest (tests/logica/progressao/referencias.test.ts).
import { expect, test, type Page } from '@playwright/test';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alvoDaPausa, alvosDasCartas, alvosDoBau, type Alvo } from '../src/entrada/alvos';
import type { Roteiro } from '../src/logica/nucleo/comandos';
import { COR } from '../src/cenas/paleta';
import { insetsZerados } from '../src/plataforma/safeArea';
import { EVIDENCIAS, RAIZ, SEED, abrir, arrastarDevagar, paraPagina, proximoFrame, tocarAcender } from './apoio';

const INSETS = insetsZerados();
const CARTAS = alvosDasCartas(INSETS, []);
const [CONTINUAR] = alvosDoBau(INSETS, []);
const BOTAO = alvoDaPausa(INSETS, { id: '', x: 0, y: 0, largura: 0, altura: 0 });
const centro = (a: Alvo) => ({ x: a.x + a.largura / 2, y: a.y + a.altura / 2 });
/** Na área do joystick (x < 234, y ≥ 422) e no vão de 12 pt entre as cartas 0 e 1: fora de toda carta. */
const NO_VAO = { x: 100, y: CARTAS[1]!.y - 6 };

interface Carta {
  tipo: string;
  item: string | null;
}
interface ReferenciaF005 {
  seed: number;
  abertura: { passo: number; nivel: number; pendentes: number; hash: string; cartas: Carta[] };
  segunda: { pendentes: number; cartas: Carta[] };
  fim: { passo: number; nivel: number; hash: string; build: { armas: { id: string; nivel: number }[]; passivas: { id: string; nivel: number }[] } };
}
interface ReferenciaUniao {
  seed: number;
  roteiro: Roteiro;
  bau: number;
  golpe: { passo: number; hash: string };
  captura: { passo: number; hash: string };
}

function referencia<T extends { seed: number }>(nome: string): T {
  const arquivo = join(RAIZ, '.verify', nome);
  expect(existsSync(arquivo), `rode o Vitest antes (scripts/verify.sh grava ${nome})`).toBe(true);
  const ref = JSON.parse(readFileSync(arquivo, 'utf-8')) as T;
  expect(ref.seed).toBe(SEED);
  return ref;
}

async function tocar(page: Page, p: { x: number; y: number }): Promise<void> {
  const q = await paraPagina(page, p.x, p.y);
  await page.touchscreen.tap(q.x, q.y);
}

/** Cor (r, g, b) do canvas num ponto em pt, pelos pixels na escala do dispositivo. */
async function corNoCanvas(page: Page, p: { x: number; y: number }): Promise<number[]> {
  const png = await page.locator('#jogo canvas').screenshot({ scale: 'device' });
  return page.evaluate(
    async ({ b64, x, y }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      [c.width, c.height] = [img.width, img.height];
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      return Array.from(ctx.getImageData(Math.floor((x * img.width) / 390), Math.floor((y * img.height) / 844), 1, 1).data.slice(0, 3));
    },
    { b64: png.toString('base64'), x: p.x, y: p.y },
  );
}
const rgb = (cor: number): number[] => [(cor >> 16) & 255, (cor >> 8) & 255, cor & 255];
const distancia = (a: number[], b: number[]): number => Math.max(...a.map((v, i) => Math.abs(v - b[i]!)));

const levelUp = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.levelUp!);

/** Toca e espera a seleção mudar para `esperada` (≈ 8 fps no contêiner: um quadro entre toques). */
async function tocarCarta(page: Page, k: number, esperada: number | null): Promise<void> {
  await tocar(page, centro(CARTAS[k]!));
  await page.waitForFunction((s) => window.__GAME_DEBUG__.levelUp?.selecionada === s, esperada, { timeout: 30_000 });
}

/** Avança pela pausa do debug até o passo alvo (o avancar devolve 0 com modal aberto). */
async function avancarAte(page: Page, alvo: number): Promise<{ passo: number; hash: string | null }> {
  return page.evaluate((alvo) => {
    const d = window.__GAME_DEBUG__;
    d.pausar();
    while (d.passo < alvo) if (d.avancar(alvo - d.passo) === 0) break;
    return { passo: d.passo, hash: d.hash() };
  }, alvo);
}

async function capturar(page: Page, nome: string, info: { outputPath: (n: string) => string }): Promise<void> {
  const destino = EVIDENCIAS ? join(RAIZ, 'production', 'evidencias', 'F-005', nome) : info.outputPath(nome);
  mkdirSync(dirname(destino), { recursive: true });
  const png = await page.screenshot({ path: destino, scale: 'css' });
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([390, 844]);
}

test('F-005.4: no nivel_tres, nível 3 com 2 ofertas no passo 1; modal parado; cartas por toques (seleciona, troca, fora nada, confirma)', async ({ page }, info) => {
  test.setTimeout(120_000);
  const ref = referencia<ReferenciaF005>('referencia-f005.json');
  await abrir(page, '&cenario=nivel_tres&teto=300');
  await tocarAcender(page);
  // 1. O modal abre no passo 1, com o nível 3 e as cartas e o hash da referência.
  await page.waitForFunction(() => window.__GAME_DEBUG__.levelUp?.aberto === true, null, { timeout: 30_000 });
  const aberto = await page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    return { passo: d.passo, nivel: d.jogador!.nivel, lu: d.levelUp!, hash: d.hash() };
  });
  expect([aberto.passo, aberto.nivel, aberto.lu.pendentes, aberto.hash]).toEqual([ref.abertura.passo, 3, 2, ref.abertura.hash]);
  expect(aberto.lu.cartas.map((c) => ({ tipo: c.tipo, item: c.item }))).toEqual(ref.abertura.cartas);
  expect(aberto.lu.selecionada).toBeNull();
  // 2. Parado: o botão de pausa, o gesto de 2 dedos por 1 s e um toque na área do joystick não fazem nada.
  await tocar(page, centro(BOTAO));
  const cdp = await page.context().newCDPSession(page);
  const [a, b] = [await paraPagina(page, 150, 200), await paraPagina(page, 250, 220)];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y, id: 1 }, { x: b.x, y: b.y, id: 2 }] });
  await page.waitForTimeout(1000);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await tocar(page, NO_VAO);
  for (let k = 0; k < 30; k++) await proximoFrame(page);
  const parado = await page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    return { passo: d.passo, relogio: d.relogio, hash: d.hash(), pausa: d.pausa.ativa, criados: d.entrada.joystick.criados, sel: d.levelUp!.selecionada };
  });
  expect(parado).toEqual({ passo: ref.abertura.passo, relogio: ref.abertura.passo, hash: ref.abertura.hash, pausa: false, criados: 0, sel: null });
  // 3. Carta 1 seleciona (e mostra o CONFIRMAR); a 0 troca; fora não muda; a 0 de novo confirma.
  await tocarCarta(page, 1, 1);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toContain('A10.LEVELUP.CONFIRMAR');
  // A evidência: a 1ª oferta com a carta do meio selecionada, depois do fade (200 ms + 2 quadros).
  await page.waitForTimeout(250);
  await proximoFrame(page);
  await proximoFrame(page);
  await capturar(page, 'modal-390x844.png', info);
  // A seleção desenhada: o contorno de 4 pt em brasa por fora da carta 1 e, na carta 0, o fundo escuro da carta.
  const carta1 = CARTAS[1]!;
  expect(distancia(await corNoCanvas(page, { x: carta1.x - 1, y: carta1.y + carta1.altura / 2 }), rgb(COR.brasa)), 'contorno da selecionada').toBeLessThanOrEqual(24);
  expect(distancia(await corNoCanvas(page, { x: CARTAS[0]!.x - 1, y: CARTAS[0]!.y + 76 }), rgb(COR.brasa)), 'a carta 0 sem contorno').toBeGreaterThan(60);
  await tocarCarta(page, 0, 0);
  await tocar(page, NO_VAO);
  for (let k = 0; k < 4; k++) await proximoFrame(page);
  expect((await levelUp(page)).selecionada).toBe(0);
  await tocar(page, centro(CARTAS[0]!));
  await page.waitForFunction(() => window.__GAME_DEBUG__.levelUp?.pendentes === 1, null, { timeout: 30_000 });
  const segunda = await levelUp(page);
  expect([segunda.aberto, segunda.selecionada]).toEqual([true, null]);
  expect(segunda.cartas.map((c) => ({ tipo: c.tipo, item: c.item }))).toEqual(ref.segunda.cartas);
  // 4. Com a pausa do debug, a carta 0 da 2ª oferta.
  await page.evaluate(() => window.__GAME_DEBUG__.pausar());
  await tocarCarta(page, 0, 0);
  await tocar(page, centro(CARTAS[0]!));
  await page.waitForFunction(() => window.__GAME_DEBUG__.levelUp?.aberto === false, null, { timeout: 30_000 });
  // 5. Fila vazia no passo 1: nível 3, a build das duas cartas e o hash da referência; retomada, o passo anda.
  const fim = await page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    return { passo: d.passo, nivel: d.jogador!.nivel, hash: d.hash(), build: { armas: d.build.armas.map((a) => ({ id: a.id, nivel: a.nivel })), passivas: d.build.passivas } };
  });
  expect(fim).toEqual({ passo: ref.fim.passo, nivel: ref.fim.nivel, hash: ref.fim.hash, build: ref.fim.build });
  if (EVIDENCIAS) {
    appendFileSync(join(RAIZ, 'production', 'evidencias', 'F-001', 'determinismo.log'), `chromium (Playwright), nivel_tres depois das 2 cartas: seed=${SEED} passo=${fim.passo} hash=${fim.hash} iguais=${fim.hash === ref.fim.hash}\n`);
  }
  await page.evaluate(() => window.__GAME_DEBUG__.retomar());
  await page.waitForFunction((p) => window.__GAME_DEBUG__.passo > p, fim.passo, { timeout: 30_000 });
  // 6. Fila fechada e a simulação andando: o tradutor voltou à Vigília, e um toque novo arrastando na área do joystick o cria e move o jogador.
  const antes = await page.evaluate(() => ({ criados: window.__GAME_DEBUG__.entrada.joystick.criados, x: window.__GAME_DEBUG__.jogador!.x }));
  expect(antes.criados).toBe(0);
  const de = await paraPagina(page, 100, 650);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: de.x, y: de.y, id: 7 }] });
  await arrastarDevagar(page, { x: 100, y: 650 }, { x: 170, y: 650 }, async (x, y) => {
    const p = await paraPagina(page, x, y);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y, id: 7 }] });
  });
  await page.waitForFunction((x0) => window.__GAME_DEBUG__.entrada.joystick.criados > 0 && window.__GAME_DEBUG__.jogador!.x > x0 + 10, antes.x, { timeout: 30_000 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
});

test('F-005.7: no bau_uniao, encostar no baú depois das 10:00 forma a União na vaga da Espada; o 1º golpe da Lâmina é o do Node', async ({ page }, info) => {
  test.setTimeout(120_000);
  const ref = referencia<ReferenciaUniao>('referencia-uniao.json');
  await abrir(page, '&cenario=bau_uniao&teto=300');
  // O mesmo roteiro do Vitest, desde o passo 0: para cima até o baú, depois parado.
  await page.evaluate((r) => window.__GAME_DEBUG__.entrada.roteiro(r), ref.roteiro);
  await tocarAcender(page);
  await page.waitForFunction(() => window.__GAME_DEBUG__.bau?.aberto === true, null, { timeout: 60_000 });
  // A pausa do debug antes do Continuar: o 1º golpe da Lâmina pode sair logo no passo seguinte.
  await page.evaluate(() => window.__GAME_DEBUG__.pausar());
  const bau = await page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    return { passo: d.passo, tipos: d.ultimosEventos.map((e) => e.tipo), bau: d.bau!, texto: d.textoAtivo };
  });
  expect(bau.passo).toBe(ref.bau);
  expect(bau.tipos).toEqual(expect.arrayContaining(['bau', 'uniao']));
  expect(bau.bau.uniao).toBe(true);
  expect(bau.texto).toContain('A10.BAU.TITULO');
  // O modal desenhado (fade de 200 ms + 2 quadros): o fundo do Continuar, no canto de dentro da caixa.
  await page.waitForTimeout(250);
  await proximoFrame(page);
  await proximoFrame(page);
  expect(distancia(await corNoCanvas(page, { x: CONTINUAR!.x + 6, y: CONTINUAR!.y + 6 }), rgb(COR.cinzaFrio)), 'fundo do Continuar').toBeLessThanOrEqual(24);
  await tocar(page, centro(CONTINUAR!));
  await page.waitForFunction(() => window.__GAME_DEBUG__.bau?.aberto === false, null, { timeout: 30_000 });
  const build = await page.evaluate(() => window.__GAME_DEBUG__.build);
  expect(build.armas[0]!.id).toBe('lamina_do_juramento_eterno');
  expect(build.passivas.map((p) => p.id)).toContain('elmo_sem_rosto');
  const golpe = await avancarAte(page, ref.golpe.passo);
  expect(golpe).toEqual(ref.golpe);
  expect(await page.evaluate((p) => window.__GAME_DEBUG__.ultimosEventos.some((e) => e.tipo === 'golpe' && e.arma === 'lamina_do_juramento_eterno' && e.passo === p), ref.golpe.passo)).toBe(true);
  // A evidência da União: no passo da captura, com a onda em brasa e os números.
  const captura = await avancarAte(page, ref.captura.passo);
  await proximoFrame(page);
  await proximoFrame(page);
  expect(captura).toEqual(ref.captura);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.vivos.efeitos)).toBeGreaterThan(0);
  if (EVIDENCIAS) {
    appendFileSync(join(RAIZ, 'production', 'evidencias', 'F-001', 'determinismo.log'), `chromium (Playwright), bau_uniao: seed=${SEED} golpe=${golpe.passo} captura=${captura.passo} hash=${captura.hash} iguais=${captura.hash === ref.captura.hash && golpe.hash === ref.golpe.hash}\n`);
  }
  await capturar(page, 'uniao-390x844.png', info);
});
