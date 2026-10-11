// F-003 na Playwright (projeto taps-game; design/decisoes-F-003.md §5, §7 e §8):
// F-003.10 (TETO e origem), o render padrão e o aquecimento do shader, a
// captura do debug com 300 vivos (E3), a horda desenhada igual à simulação nos
// dois modos de render (com o slot morto), a igualdade gpu × image × buffer
// dinâmico e o F-003.4 (E1). O F-003.7 (heap de 60 s) fica em f003-heap.spec.ts.
import { expect, test, type Page } from '@playwright/test';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { COR, COR_DO_INIMIGO } from '../src/cenas/paleta';
import { alvoDaPausa } from '../src/entrada/alvos';
import { insetsZerados } from '../src/plataforma/safeArea';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro } from '../src/logica/mundo/toro';
import { EVIDENCIAS, RAIZ, SEED, abrir, esperarIguais, proximoFrame, tocarAcender, type Debug } from './apoio';

const HORDA = '&cenario=horda&teto=300';
/** Meia dimensão do desenho de cada tipo, em pt (círculo de 32 e quadrados de 48). */
const MEIO: Record<string, number> = { oco_das_lanternas: 16, oco_grande: 24, novica_de_sal: 24 };
const DPR = 3;

const totalDeVivos = (v: Debug['vivos']): number =>
  v.oco_das_lanternas + v.oco_grande + v.novica_de_sal + v.oco_grande_coroado + v.o_lanterneiro;

async function abrirHorda(page: Page, extra = ''): Promise<void> {
  await abrir(page, HORDA + extra);
  await tocarAcender(page);
}

/** Pausa, leva o contador ao passo `alvo` e espera 2 frames (com a simulação pausada, o render usa alfa = 1). */
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

/** Os pixels do canvas na escala do dispositivo (1.170 × 2.532), não um screenshot reduzido. */
const pixelsDoCanvas = (page: Page): Promise<Buffer> => page.locator('#jogo canvas').screenshot({ scale: 'device' });

/** Cor (r, g, b) de cada ponto (em pt) de um PNG, decodificado no próprio navegador. */
async function cores(page: Page, png: Buffer, pontos: { x: number; y: number }[]): Promise<number[][]> {
  return page.evaluate(
    async ({ b64, pontos, dpr }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      [c.width, c.height] = [img.width, img.height];
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      return pontos.map((p) => Array.from(ctx.getImageData(Math.floor(p.x * dpr), Math.floor(p.y * dpr), 1, 1).data.slice(0, 3)));
    },
    { b64: png.toString('base64'), pontos, dpr: DPR },
  );
}

interface NaTela {
  slot: number;
  tipo: string;
  x: number;
  y: number;
}

/** Inimigos vivos em pt da tela (câmera no centro, 195 × 422), pela cópia mais próxima da câmera. */
async function naTela(page: Page): Promise<{ lista: NaTela[]; jogador: { x: number; y: number } }> {
  const r = await page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    return { inimigos: d.inimigos(), camera: d.camera!, jogador: d.jogador! };
  });
  const tela = (x: number, y: number) => ({
    x: 195 + deltaNoToro(r.camera.x, Math.round(x * 2) / 2, W),
    y: 422 + deltaNoToro(r.camera.y, Math.round(y * 2) / 2, H),
  });
  return { lista: r.inimigos.map((i) => ({ slot: i.slot, tipo: i.tipo, ...tela(i.x, i.y) })), jogador: tela(r.jogador.x, r.jogador.y) };
}

/** O centro de `a` está dentro do desenho de `b` (com 2 pt de folga, pelo quadrado que contém o círculo)? */
const cobre = (b: NaTela, a: NaTela): boolean => Math.abs(b.x - a.x) < MEIO[b.tipo]! + 2 && Math.abs(b.y - a.y) < MEIO[b.tipo]! + 2;

/** O botão de pausa da F-004, desenhado por cima da horda (design/decisoes-F-004.md, T18). */
const PAUSA = alvoDaPausa(insetsZerados(), { id: '', x: 0, y: 0, largura: 0, altura: 0 });
/** O desenho de `a` (com 2 pt de folga) não encosta no botão de pausa? */
const longeDaPausa = (a: NaTela): boolean =>
  a.x - MEIO[a.tipo]! - 2 > PAUSA.x + PAUSA.largura || a.y - MEIO[a.tipo]! - 2 > PAUSA.y + PAUSA.altura;

/** Visíveis, longe das bordas, do botão de pausa e do jogador; `isolado` pede que nenhum outro cubra o centro, `topo` só os de slot maior. */
function escolher(lista: NaTela[], jogador: { x: number; y: number }, n: number, isolado: boolean): NaTela[] {
  return lista
    .filter((a) => a.x > 30 && a.x < 360 && a.y > 60 && a.y < 784)
    .filter(longeDaPausa)
    .filter((a) => Math.hypot(a.x - jogador.x, a.y - jogador.y) > MEIO[a.tipo]! + 24 + 2)
    .filter((a) => !lista.some((b) => b.slot !== a.slot && (isolado || b.slot > a.slot) && cobre(b, a)))
    .slice(0, n);
}

const rgb = (cor: number): number[] => [(cor >> 16) & 255, (cor >> 8) & 255, cor & 255];
const perto = (a: number[], b: number[]): boolean => a.every((v, i) => Math.abs(v - b[i]!) <= 2);

test('F-003.10: sem ?teto, numa tela fora da classe antiga (DPR 3, 390 × 844), o TETO é 300 com origem fallback', async ({ page }) => {
  for (const [extra, esperado] of [
    ['', { valor: 300, origem: 'fallback', sondaMs: null }],
    ['&teto=500', { valor: 500, origem: 'override', sondaMs: null }],
    ['&teto=300', { valor: 300, origem: 'override', sondaMs: null }],
    ['&teto=400', { valor: 300, origem: 'fallback', sondaMs: null }],
  ] as const) {
    await abrir(page, extra);
    expect(await page.evaluate(() => window.__GAME_DEBUG__.teto), extra).toEqual(esperado);
  }
});

test('render padrão (gpu, buffer estático, stride 42) e o aquecimento: o programa do layer já está no cache antes da Vigília', async ({ page }) => {
  await abrir(page, HORDA);
  await page.waitForFunction(() => window.__GAME_DEBUG__.render.programaAquecido);
  const antes = await page.evaluate(() => window.__GAME_DEBUG__.render);
  expect(antes).toMatchObject({ modo: 'gpu', origem: 'parametro', buffer: 'estatico', capacidade: 500 });
  expect(antes.programasDoLayer).toBeGreaterThanOrEqual(1);
  await tocarAcender(page);
  await proximoFrame(page);
  const depois = await page.evaluate(() => window.__GAME_DEBUG__.render);
  expect(depois).toMatchObject({ modo: 'gpu', stride: 42, buffer: 'estatico' });
  expect(depois.programasDoLayer, 'a Vigília não compilou um programa novo').toBe(antes.programasDoLayer);

  await abrir(page, HORDA + '&buffer=dinamico');
  await tocarAcender(page);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.render)).toMatchObject({ modo: 'gpu', buffer: 'dinamico', stride: 42 });
  await abrir(page, HORDA + '&render=image');
  await tocarAcender(page);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.render)).toMatchObject({ modo: 'image', stride: null });
});

test('sem unidade de textura no vertex shader, a horda cai sozinha para image (render.origem = fallback, §7)', async ({ page }) => {
  await page.addInitScript(() => {
    const MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0x8b4c;
    for (const contexto of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = contexto.prototype.getParameter;
      contexto.prototype.getParameter = function (this: WebGLRenderingContext, p: number): unknown {
        return p === MAX_VERTEX_TEXTURE_IMAGE_UNITS ? 0 : original.call(this, p);
      };
    }
  });
  await abrir(page, HORDA);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.render)).toMatchObject({ modo: 'image', origem: 'fallback' });
  await tocarAcender(page);
  await pausarNoPasso(page, 600);
  const d = await page.evaluate(() => ({ render: window.__GAME_DEBUG__.render, vivos: window.__GAME_DEBUG__.vivos }));
  expect(d.render).toMatchObject({ modo: 'image', origem: 'fallback', stride: null });
  expect(totalDeVivos(d.vivos)).toBe(300);
  const { lista, jogador } = await naTela(page);
  const visiveis = escolher(lista, jogador, 5, false);
  const lidas = await cores(page, await pixelsDoCanvas(page), visiveis);
  visiveis.forEach((a, i) => expect(perto(lidas[i]!, rgb(COR_DO_INIMIGO[a.tipo]!)), `slot ${a.slot} = ${lidas[i]}`).toBe(true));
});

test('evidência (E3): captura do debug com 300 vivos no passo 1.800 do cenário horda', async ({ page }, info) => {
  await abrirHorda(page, '&debug=1');
  await pausarNoPasso(page, 1800);
  // O painel atualiza a cada 500 ms.
  await page.waitForTimeout(700);
  const d = await page.evaluate(() => {
    const g = window.__GAME_DEBUG__;
    return { vivos: g.vivos, teto: g.teto, cenario: g.cenario, recusados: g.recusados, diretor: g.diretor, seed: g.seed };
  });
  expect(totalDeVivos(d.vivos)).toBe(300);
  expect(d.vivos.oco_das_lanternas + d.vivos.oco_grande + d.vivos.novica_de_sal).toBe(300);
  expect([d.teto.valor, d.cenario, d.recusados.inimigos, d.seed]).toEqual([300, 'horda', 0, SEED]);
  expect(d.diretor).toMatchObject({ linha: 19, alvo: 300, spawns: 300 });
  // O mesmo hash do Node no passo 1.800 do cenário horda (a referência é do Vitest, design/decisoes-F-003.md §6).
  const arquivo = join(RAIZ, '.verify', 'referencia-horda.json');
  expect(existsSync(arquivo), 'rode o Vitest antes (scripts/verify.sh grava a referência)').toBe(true);
  const ref = JSON.parse(readFileSync(arquivo, 'utf-8')) as { seed: number; passos: number; hash: string };
  expect([ref.seed, ref.passos]).toEqual([SEED, 1800]);
  const hash = await page.evaluate(() => window.__GAME_DEBUG__.hash());
  if (EVIDENCIAS) {
    appendFileSync(
      join(RAIZ, 'production', 'evidencias', 'F-001', 'determinismo.log'),
      `chromium (Playwright), cenário horda: seed=${SEED} passos=1800 hash=${hash} iguais=${hash === ref.hash}\n`,
    );
  }
  expect(hash).toBe(ref.hash);
  const painel = await page.locator('pre.painel-debug').textContent();
  expect(painel).toContain('vivos 300');
  expect(painel).toContain('passo 1800');
  const destino = EVIDENCIAS
    ? join(RAIZ, 'production', 'evidencias', 'F-003', 'debug-300-vivos-390x844.png')
    : info.outputPath('debug-300-vivos-390x844.png');
  mkdirSync(dirname(destino), { recursive: true });
  const png = await page.screenshot({ path: destino, scale: 'css' });
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([390, 844]);
});

test('a horda desenhada corresponde à simulação nos dois modos, e o slot que morre some da tela (§8)', async ({ page }) => {
  const imagens: Record<string, Buffer[]> = {};
  for (const modo of ['gpu', 'image'] as const) {
    await abrirHorda(page, `&render=${modo}`);
    expect(await page.evaluate(() => window.__GAME_DEBUG__.render.modo)).toBe(modo);
    await pausarNoPasso(page, 600);
    const { lista, jogador } = await naTela(page);
    const visiveis = escolher(lista, jogador, 10, false);
    expect(visiveis.length, 'inimigos visíveis e não cobertos').toBe(10);
    const antes = await pixelsDoCanvas(page);
    const lidas = await cores(page, antes, visiveis);
    visiveis.forEach((a, i) => expect(perto(lidas[i]!, rgb(COR_DO_INIMIGO[a.tipo]!)), `${modo}: slot ${a.slot} (${a.tipo}) = ${lidas[i]}`).toBe(true));

    // O slot morto: 3 inimigos visíveis sem ninguém por cima nem por baixo do centro.
    const removidos = escolher(lista, jogador, 3, true);
    expect(removidos.length, 'inimigos isolados para remover').toBe(3);
    await page.evaluate((slots) => slots.forEach((s) => window.__GAME_DEBUG__.removerInimigo(s)), removidos.map((r) => r.slot));
    await proximoFrame(page);
    await proximoFrame(page);
    const depois = await pixelsDoCanvas(page);
    const fundo = await cores(page, depois, removidos);
    removidos.forEach((a, i) => expect(perto(fundo[i]!, rgb(COR.fundo)), `${modo}: slot ${a.slot} removido = ${fundo[i]}`).toBe(true));
    imagens[modo] = [antes, depois];
  }
  await esperarIguais(page, imagens['gpu']![0]!, imagens['image']![0]!, 'gpu × image no passo 600');
  await esperarIguais(page, imagens['gpu']![1]!, imagens['image']![1]!, 'gpu × image depois das remoções');
});

test('com ?buffer=dinamico (DYNAMIC_DRAW), a imagem é a mesma do buffer padrão no mesmo passo (§7)', async ({ page }) => {
  const imagens: Buffer[] = [];
  for (const extra of ['', '&buffer=dinamico']) {
    await abrirHorda(page, extra);
    await pausarNoPasso(page, 600);
    imagens.push(await pixelsDoCanvas(page));
  }
  await esperarIguais(page, imagens[0]!, imagens[1]!, 'estático × dinâmico');
});

/** Percentil por posição na lista ordenada (o mesmo de src/cenas/medidas.ts). */
function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const v = [...valores].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.floor(p * v.length))]!;
}

test('F-003.4 (E1): 300 vivos por 30 s com CPU 4×; passo + resto até PRE_RENDER < 10 ms; fps só com GPU de hardware', async ({ page }, info) => {
  test.setTimeout(120_000);
  await abrir(page, HORDA + '&debug=1');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  try {
    await tocarAcender(page);
    await page.waitForTimeout(10_000);
    const inicio = await page.evaluate(() => ({ n0: window.__GAME_DEBUG__.quadrosContados, t0: performance.now() }));
    const leituras: { vivos: number; fps: number; drawCalls: number | null; passosPerdidos: number }[] = [];
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      leituras.push(
        await page.evaluate(() => {
          const d = window.__GAME_DEBUG__;
          const v = d.vivos;
          return {
            vivos: v.oco_das_lanternas + v.oco_grande + v.novica_de_sal + v.oco_grande_coroado + v.o_lanterneiro,
            fps: d.fps,
            drawCalls: d.render.drawCalls,
            passosPerdidos: d.passos_perdidos,
          };
        }),
      );
    }
    const fim = await page.evaluate(() => {
      const d = window.__GAME_DEBUG__;
      return { n1: d.quadrosContados, t1: performance.now(), quadros: d.quadros(), webgl: d.webgl, render: d.render, seed: d.seed };
    });
    // A janela de medida: os quadros contados entre as duas leituras; com mais de 2.048 (o anel), só os últimos.
    const naJanela = fim.n1 - inicio.n0;
    expect(naJanela, 'quadros na janela de 30 s').toBeGreaterThan(0);
    const medidos = fim.quadros.slice(-Math.min(naJanela, fim.quadros.length));
    const passo = percentil(medidos.filter((q) => q.passos >= 1).map((q) => q.simulacao / q.passos), 0.95);
    const resto = percentil(medidos.map((q) => q.ateRender - q.simulacao), 0.95);
    const restoInteiro = percentil(medidos.map((q) => q.total - q.simulacao), 0.95);
    const fpsConferido = !fim.webgl.software;
    const segundos = (fim.t1 - inicio.t0) / 1000;
    const fpsMedio = naJanela / segundos;
    const vivosOk = leituras.every((l) => l.vivos === 300);
    const drawCalls = Math.max(...leituras.map((l) => l.drawCalls ?? Infinity));
    const criterios = {
      vivos_300_nas_30_leituras: vivosOk,
      passo_mais_resto_ate_pre_render_menor_que_10ms: passo + resto < 10,
      draw_calls_ate_150: drawCalls <= 150,
      ...(fpsConferido
        ? {
            fps_55_nas_30_leituras: leituras.every((l) => l.fps >= 55),
            fps_medio_55: fpsMedio >= 55,
            passo_mais_resto_do_quadro_inteiro_menor_que_10ms: passo + restoInteiro < 10,
          }
        : {}),
    };
    const aprovado = Object.values(criterios).every(Boolean);
    const relatorio = {
      criterio: 'F-003.4 (design/decisoes-F-003.md §8, E1)',
      url: `?seed=${SEED}${HORDA}&debug=1`,
      cpu_throttling: 4,
      seed: fim.seed,
      renderer: fim.webgl.renderer,
      fps_conferido: fpsConferido,
      ...(fpsConferido ? {} : { aviso: 'fps não conferido: WebGL por software' }),
      quadros_medidos: medidos.length,
      janela_s: Number(segundos.toFixed(2)),
      janela_parcial: medidos.length < naJanela,
      fps_medio: Number(fpsMedio.toFixed(2)),
      fps_leituras: leituras.map((l) => Number(l.fps.toFixed(1))),
      vivos_leituras: leituras.map((l) => l.vivos),
      passos_perdidos: leituras[leituras.length - 1]!.passosPerdidos,
      draw_calls_max: drawCalls,
      ms: {
        p95_passo: Number(passo.toFixed(3)),
        p95_resto_ate_pre_render: Number(resto.toFixed(3)),
        soma: Number((passo + resto).toFixed(3)),
        p95_resto_do_quadro_inteiro: Number(restoInteiro.toFixed(3)),
        p50_quadro_inteiro: Number(percentil(medidos.map((q) => q.total), 0.5).toFixed(3)),
        p95_quadro_inteiro: Number(percentil(medidos.map((q) => q.total), 0.95).toFixed(3)),
      },
      criterios,
      aprovado,
    };
    const destino = EVIDENCIAS
      ? join(RAIZ, 'production', 'evidencias', 'F-003', 'desempenho-30s.json')
      : info.outputPath('desempenho-30s.json');
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, JSON.stringify(relatorio, null, 2) + '\n');
    if (!fpsConferido) info.annotations.push({ type: 'aviso', description: 'F-003.4: fps não conferido (WebGL por software)' });
    expect(relatorio, JSON.stringify(relatorio.ms)).toMatchObject({ aprovado: true });
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
});
