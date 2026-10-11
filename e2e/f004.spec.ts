// F-004 na Playwright (projeto taps-game; design/decisoes-F-004.md §7 e §8):
// F-004.4 (inimigos morrem sem input), F-004.5 (números de dano desligáveis na
// pausa), F-004.6 (botão, gesto e tela de pausa), a evidência das três armas
// (E7), a sonda do TETO e a igualdade gpu × image das camadas das armas.
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { CAIXA_DA_OPCAO, alvoDaPausa, alvosDaTelaDePausa, caixaDaOpcao } from '../src/entrada/alvos';
import { COR } from '../src/cenas/paleta';
import { insetsZerados } from '../src/plataforma/safeArea';
import { EVIDENCIAS, RAIZ, SEED, abrir, esperarIguais, paraPagina, proximoFrame, tocarAcender } from './apoio';

const TRES_ARMAS = '&cenario=tres_armas&teto=300';
const INSETS = insetsZerados();
const BOTAO = alvoDaPausa(INSETS, { id: '', x: 0, y: 0, largura: 0, altura: 0 });
const [OPCAO, CONTINUAR] = alvosDaTelaDePausa(INSETS, []);
const centro = (a: { x: number; y: number; largura: number; altura: number }) => ({ x: a.x + a.largura / 2, y: a.y + a.altura / 2 });

/** Referência do Vitest em .verify (scripts/verify.sh grava antes da Playwright). */
function referencia(nome: string): { seed: number; passo: number; hash: string } {
  const arquivo = join(RAIZ, '.verify', nome);
  expect(existsSync(arquivo), `rode o Vitest antes (scripts/verify.sh grava ${nome})`).toBe(true);
  const ref = JSON.parse(readFileSync(arquivo, 'utf-8')) as { seed: number; passo: number; hash: string };
  expect(ref.seed).toBe(SEED);
  return ref;
}

/**
 * Toques por CDP com vários dedos (Input.dispatchTouchEvent): cada chamada dá os dedos que ficam na tela; um dedo
 * que some da lista é solto (o touchEnd vai sem dedos e solta todos). A caixa do canvas é lida uma vez, para que
 * cada toque seja uma ida só ao navegador.
 */
async function dedos(page: Page): Promise<(tipo: 'touchStart' | 'touchMove' | 'touchEnd', pontos: { id: number; x: number; y: number }[]) => Promise<void>> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  const origem = await paraPagina(page, 0, 0);
  const fim = await paraPagina(page, 390, 844);
  const [sx, sy] = [(fim.x - origem.x) / 390, (fim.y - origem.y) / 844];
  return async (tipo, pontos) => {
    const touchPoints = pontos.map((p) => ({ x: origem.x + p.x * sx, y: origem.y + p.y * sy, id: p.id }));
    await cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints });
  };
}

/**
 * Dedos por TouchEvent sintético no canvas (o caminho da camada de toque, com o timeStamp do navegador), para soltar
 * um dedo só: no CDP do Chromium, o touchEnd solta todos, e um dedo fora da lista de um touchMove continua na tela.
 */
function dedosNoDom(page: Page) {
  const enviar = (tipo: 'touchstart' | 'touchmove' | 'touchend', id: number, x: number, y: number): Promise<void> =>
    page.evaluate(
      ([tipo, id, x, y]) => {
        const w = window as unknown as { __dedos?: Map<number, { x: number; y: number }> };
        const dedos = (w.__dedos ??= new Map());
        const canvas = document.querySelector<HTMLCanvasElement>('#jogo canvas')!;
        const caixa = canvas.getBoundingClientRect();
        const toque = (i: number, p: { x: number; y: number }): Touch =>
          new Touch({ identifier: i, target: canvas, clientX: caixa.left + (p.x * caixa.width) / 390, clientY: caixa.top + (p.y * caixa.height) / 844 });
        const ponto = tipo === 'touchend' ? dedos.get(id)! : { x, y };
        if (tipo === 'touchend') dedos.delete(id);
        else dedos.set(id, ponto);
        const ativos = Array.from(dedos, ([i, p]) => toque(i, p));
        canvas.dispatchEvent(new TouchEvent(tipo, { cancelable: true, bubbles: true, touches: ativos, targetTouches: ativos, changedTouches: [toque(id, ponto)] }));
      },
      [tipo, id, x, y] as const,
    );
  return {
    por: (id: number, p: { x: number; y: number }) => enviar('touchstart', id, p.x, p.y),
    mover: (id: number, p: { x: number; y: number }) => enviar('touchmove', id, p.x, p.y),
    tirar: (id: number) => enviar('touchend', id, 0, 0),
  };
}

/** Grava o timeStamp dos touchstart e touchend que a página recebe (o relógio do tradutor). */
async function gravarToques(page: Page): Promise<() => Promise<{ tipo: string; t: number; dedos: number }[]>> {
  await page.evaluate(() => {
    const w = window as unknown as { __toques: { tipo: string; t: number; dedos: number }[] };
    w.__toques = [];
    for (const tipo of ['touchstart', 'touchend']) {
      window.addEventListener(tipo, (e) => w.__toques.push({ tipo, t: e.timeStamp, dedos: (e as TouchEvent).touches.length }), { capture: true });
    }
  });
  return () => page.evaluate(() => (window as unknown as { __toques: { tipo: string; t: number; dedos: number }[] }).__toques.splice(0));
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

const pausa = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.pausa);
const passo = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.passo);

test('F-004.4: sem toques, a Vigília normal mata o 1º inimigo até o passo 1.800, no passo do Node', async ({ page }) => {
  test.setTimeout(150_000);
  await abrir(page, '&teto=300');
  await tocarAcender(page);
  const inicio = Date.now();
  let morte = -1;
  while (morte < 0 && Date.now() - inicio < 120_000) {
    const r = await page.evaluate(() => {
      const d = window.__GAME_DEBUG__;
      const m = d.ultimosEventos.find((e) => e.tipo === 'morte');
      return { morte: m ? m.passo : -1, criados: d.entrada.joystick.criados, pausa: d.pausa.ativa, perdidos: d.toquesPerdidos };
    });
    expect([r.criados, r.pausa, r.perdidos]).toEqual([0, false, 0]);
    morte = r.morte;
    if (morte < 0) await page.waitForTimeout(250);
  }
  expect(morte, 'nenhuma morte em 120 s reais').toBeGreaterThan(0);
  expect(morte).toBeLessThanOrEqual(1800);
  const ref = referencia('referencia-f004.json');
  expect(morte).toBe(ref.passo);
  // O hash no passo da 1ª morte, numa Vigília nova pausada logo depois do Acender (os passos do driver são parados).
  await abrir(page, '&teto=300');
  await tocarAcender(page);
  const hash = await page.evaluate((alvo) => {
    const d = window.__GAME_DEBUG__;
    d.pausar();
    d.avancar(alvo - d.passo);
    return d.hash();
  }, ref.passo);
  if (EVIDENCIAS) {
    appendFileSync(join(RAIZ, 'production', 'evidencias', 'F-001', 'determinismo.log'), `chromium (Playwright), 1ª morte da Vigília normal: seed=${SEED} passo=${ref.passo} hash=${hash} iguais=${hash === ref.hash}\n`);
  }
  expect(hash).toBe(ref.hash);
});

test('F-004.5: com a opção desligada na pausa, nenhum número vivo enquanto os acertos seguem no anel; religada, voltam', async ({ page }) => {
  test.setTimeout(150_000);
  await abrir(page, TRES_ARMAS);
  await tocarAcender(page);
  // Só pausa depois do 1º acerto (no tres_armas, entre os passos 158 e 190).
  await page.waitForFunction(() => window.__GAME_DEBUG__.ultimosEventos.some((e) => e.tipo === 'acerto'), null, { timeout: 60_000 });
  const caixa = caixaDaOpcao(OPCAO!);
  const meioDaCaixa = { x: caixa.x + CAIXA_DA_OPCAO.lado / 2, y: caixa.y + CAIXA_DA_OPCAO.lado / 2 };
  const alternar = async (ligada: boolean): Promise<number> => {
    await tocar(page, centro(BOTAO));
    await page.waitForFunction(() => window.__GAME_DEBUG__.pausa.ativa);
    await tocar(page, centro(OPCAO!));
    await page.waitForFunction((l) => window.__GAME_DEBUG__.opcoes.numerosDeDano === l, ligada);
    // A caixa (P9): cheia de osso quando ligada; vazia (o véu sobre o botão) quando desligada. Depois do fade de 200 ms.
    await page.waitForTimeout(300);
    await proximoFrame(page);
    const cor = await corNoCanvas(page, meioDaCaixa);
    if (ligada) expect(distancia(cor, rgb(COR.osso)), `caixa ligada: ${cor}`).toBeLessThanOrEqual(2);
    else expect(distancia(cor, rgb(COR.osso)), `caixa desligada: ${cor}`).toBeGreaterThan(60);
    await tocar(page, centro(CONTINUAR!));
    await page.waitForFunction(() => !window.__GAME_DEBUG__.pausa.ativa);
    return passo(page);
  };
  const fim = await alternar(false);
  let atual = fim;
  while (atual < fim + 120) {
    const r = await page.evaluate(() => ({ n: window.__GAME_DEBUG__.numerosDeDano, passo: window.__GAME_DEBUG__.passo }));
    expect(r.n).toBe(0);
    atual = r.passo;
    await proximoFrame(page);
  }
  const acertosDepois = await page.evaluate((f) => window.__GAME_DEBUG__.ultimosEventos.filter((e) => e.tipo === 'acerto' && e.passo > f).length, fim);
  expect(acertosDepois).toBeGreaterThan(0);
  const religada = await alternar(true);
  // O passo em que o 1º número novo aparece: até 60 passos depois do Continuar (o tick da aura sai a cada 30).
  const aparece = await (
    await page.waitForFunction(() => (window.__GAME_DEBUG__.numerosDeDano > 0 ? window.__GAME_DEBUG__.passo : 0), null, { timeout: 30_000 })
  ).jsonValue();
  expect(aparece - religada, `número no passo ${aparece}, Continuar no ${religada}`).toBeLessThanOrEqual(60);
});

test.describe('F-004.6: botão, gesto e tela de pausa', () => {
  test('(a) botão: pausa com origem botao; passo, relógio e hash parados; a tela mostra a build sem o que é das F-006 e F-007', async ({ page }) => {
    await abrir(page, '&teto=300');
    await tocarAcender(page);
    const toque = await dedos(page);
    // Começar no botão e soltar fora não pausa.
    await toque('touchStart', [{ id: 1, ...centro(BOTAO) }]);
    await toque('touchMove', [{ id: 1, x: 200, y: 300 }]);
    await toque('touchEnd', []);
    await proximoFrame(page);
    expect((await pausa(page)).ativa).toBe(false);
    await tocar(page, centro(BOTAO));
    await page.waitForFunction(() => window.__GAME_DEBUG__.pausa.ativa);
    expect(await pausa(page)).toEqual({ ativa: true, origem: 'botao' });
    const ler = () => page.evaluate(() => ({ p: window.__GAME_DEBUG__.passo, r: window.__GAME_DEBUG__.relogio, h: window.__GAME_DEBUG__.hash(), estado: window.__GAME_DEBUG__.estado }));
    const antes = await ler();
    for (let q = 0; q < 30; q++) await proximoFrame(page);
    expect(await ler()).toEqual(antes);
    expect(antes.estado).toBe('VIGILIA');
    const textos = await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo);
    for (const id of ['A6.PAUSA.TITULO', 'A6.PAUSA.NUMEROS', 'A6.PAUSA.CONTINUAR', 'F1.ESPADA_LONGA_DO_JURAMENTO.NOME', 'A6.PAUSA.NIVEL']) expect(textos).toContain(id);
    for (const id of ['A6.PAUSA.ABANDONAR', 'A6.PAUSA.SOM', 'A6.PAUSA.FLASHES']) expect(textos).not.toContain(id);
  });

  test('(b) gesto: dois dedos parados na metade de cima por 1 s pausam; 300 ms, movidos 20 pt ou um deles no joystick, não', async ({ page }) => {
    await abrir(page, '&teto=300');
    await tocarAcender(page);
    const toque = await dedos(page);
    const lerToques = await gravarToques(page);
    // O tempo conta do 2º dedo; a ida do toque ao navegador (até um quadro a 8 fps) sai da espera.
    const segurar = async (pontos: { id: number; x: number; y: number }[], ms: number, mover?: { id: number; x: number; y: number }[]) => {
      await toque('touchStart', pontos.slice(0, 1));
      const t0 = Date.now();
      await toque('touchStart', pontos);
      if (mover) await toque('touchMove', mover);
      await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
      await toque('touchEnd', []);
      await proximoFrame(page);
    };
    await segurar([{ id: 1, x: 150, y: 200 }, { id: 2, x: 250, y: 220 }], 300);
    // O teste vale se a página viu o 2º dedo por menos de 500 ms (pelo timeStamp dos eventos, o relógio do tradutor).
    const vistos = await lerToques();
    const inicio = vistos.find((v) => v.tipo === 'touchstart' && v.dedos === 2)!;
    const soltura = vistos.find((v) => v.tipo === 'touchend' && v.t >= inicio.t)!;
    expect(soltura.t - inicio.t, 'tempo dos 2 dedos visto pela página').toBeLessThan(500);
    expect((await pausa(page)).ativa).toBe(false);
    await segurar([{ id: 3, x: 150, y: 200 }, { id: 4, x: 250, y: 220 }], 1000, [{ id: 3, x: 170, y: 200 }, { id: 4, x: 250, y: 220 }]);
    expect((await pausa(page)).ativa).toBe(false);
    await segurar([{ id: 5, x: 100, y: 600 }, { id: 6, x: 250, y: 220 }], 1000);
    expect((await pausa(page)).ativa).toBe(false);
    await segurar([{ id: 7, x: 150, y: 200 }, { id: 8, x: 250, y: 220 }], 1000);
    expect(await pausa(page)).toEqual({ ativa: true, origem: 'gesto' });
  });

  test('(c, d) Continuar: fora não retoma; nele retoma sem rajada; o joystick só volta com um toque novo', async ({ page }) => {
    await abrir(page, '&teto=300');
    await tocarAcender(page);
    const dedo = dedosNoDom(page);
    // Um dedo no joystick, empurrando para a direita, e o outro toca o botão de pausa.
    await dedo.por(1, { x: 100, y: 600 });
    await dedo.mover(1, { x: 160, y: 600 });
    await page.waitForFunction(() => window.__GAME_DEBUG__.entrada.joystick.ativo);
    await dedo.por(2, centro(BOTAO));
    await dedo.tirar(2);
    await page.waitForFunction(() => window.__GAME_DEBUG__.pausa.ativa);
    expect((await page.evaluate(() => window.__GAME_DEBUG__.entrada.joystick)).ativo).toBe(false);
    const perdidos0 = await page.evaluate(() => window.__GAME_DEBUG__.passos_perdidos);
    const p0 = await passo(page);
    // Fora do Continuar não retoma.
    await dedo.por(3, { x: 195, y: 300 });
    await dedo.tirar(3);
    await page.waitForTimeout(3000);
    expect((await pausa(page)).ativa).toBe(true);
    // No Continuar, retoma.
    await dedo.por(4, centro(CONTINUAR!));
    await dedo.tirar(4);
    await page.waitForFunction(() => !window.__GAME_DEBUG__.pausa.ativa);
    await proximoFrame(page);
    await proximoFrame(page);
    expect(await passo(page)).toBeGreaterThan(p0);
    // 3 s de pausa não viram passos perdidos (a 8 fps, o jogo perde ≈ 2,5 por quadro; a mutação daria ≈ 175).
    expect((await page.evaluate(() => window.__GAME_DEBUG__.passos_perdidos)) - perdidos0).toBeLessThan(60);
    // O dedo antigo continua na tela, mas não é dono: o jogador não anda.
    const j0 = await page.evaluate(() => window.__GAME_DEBUG__.jogador!);
    await dedo.mover(1, { x: 170, y: 600 });
    for (let q = 0; q < 5; q++) await proximoFrame(page);
    const j1 = await page.evaluate(() => window.__GAME_DEBUG__.jogador!);
    expect([j1.x, j1.y]).toEqual([j0.x, j0.y]);
    expect((await page.evaluate(() => window.__GAME_DEBUG__.entrada.joystick)).ativo).toBe(false);
    await dedo.tirar(1);
    await dedo.por(5, { x: 100, y: 600 });
    await page.waitForFunction(() => window.__GAME_DEBUG__.entrada.joystick.ativo);
    await dedo.tirar(5);
  });
});

test('evidência (E7): as três armas no nv8 no passo da referência, com golpe, faca em voo e números vivos', async ({ page }, info) => {
  const ref = referencia('referencia-tres-armas.json');
  await abrir(page, TRES_ARMAS);
  await tocarAcender(page);
  const r = await page.evaluate((alvo) => {
    const d = window.__GAME_DEBUG__;
    d.pausar();
    d.avancar(alvo - d.passo);
    return { passo: d.passo, hash: d.hash() };
  }, ref.passo);
  await proximoFrame(page);
  await proximoFrame(page);
  expect(r).toEqual({ passo: ref.passo, hash: ref.hash });
  const d = await page.evaluate(() => ({ numeros: window.__GAME_DEBUG__.numerosDeDano, facas: window.__GAME_DEBUG__.vivos.projeteis, build: window.__GAME_DEBUG__.build }));
  expect(d.numeros).toBeGreaterThan(0);
  expect(d.facas).toBeGreaterThan(0);
  expect(d.build.armas.map((a) => `${a.id} ${a.nivel}`)).toEqual(['espada_longa_do_juramento 8', 'facas_de_sal 8', 'circulo_de_sal 8']);
  if (EVIDENCIAS) {
    appendFileSync(join(RAIZ, 'production', 'evidencias', 'F-001', 'determinismo.log'), `chromium (Playwright), tres_armas: seed=${SEED} passo=${ref.passo} hash=${r.hash} iguais=${r.hash === ref.hash}\n`);
  }
  const destino = EVIDENCIAS ? join(RAIZ, 'production', 'evidencias', 'F-004', 'tres-armas-390x844.png') : info.outputPath('tres-armas-390x844.png');
  mkdirSync(dirname(destino), { recursive: true });
  const png = await page.screenshot({ path: destino, scale: 'css' });
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([390, 844]);
  // A captura pausada depende só da seed e do passo: uma 2ª, 2 quadros depois, sai igual.
  await proximoFrame(page);
  expect((await page.screenshot({ scale: 'css' })).equals(png)).toBe(true);
});

test('as camadas das armas desenham o mesmo nos dois modos de render (gpu × image)', async ({ page }) => {
  const imagens: Buffer[] = [];
  for (const modo of ['', '&render=image']) {
    await abrir(page, TRES_ARMAS + modo);
    await tocarAcender(page);
    await page.evaluate(() => {
      const d = window.__GAME_DEBUG__;
      d.pausar();
      d.avancar(601 - d.passo);
    });
    await proximoFrame(page);
    await proximoFrame(page);
    imagens.push(await page.locator('#jogo canvas').screenshot({ scale: 'device' }));
  }
  await esperarIguais(page, imagens[0]!, imagens[1]!, 'gpu × image no passo 601 do tres_armas', true);
});

test('sonda do TETO: sem ?teto e sem ?sonda=0, a origem é sonda (ou fallback se o toque vier antes do fim)', async ({ page }) => {
  await abrir(page, '', true);
  await page.waitForTimeout(2000);
  const teto = await page.evaluate(() => window.__GAME_DEBUG__.teto);
  expect(['sonda', 'fallback']).toContain(teto.origem);
  if (teto.origem === 'sonda') expect(teto.sondaMs).toBeGreaterThan(0);
  expect([300, 500]).toContain(teto.valor);
});
