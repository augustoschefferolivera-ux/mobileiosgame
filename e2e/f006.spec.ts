// F-006 na Playwright (projeto taps-game; design/decisoes-F-006.md VT7, VT8, VT9): F-006.5 (swipe e toque
// duplo geram esquiva), F-006.6 (toque no botão Aparo no telegrafo), F-006.8 (prompts dos minutos 1 e 3), a
// referência Node × Chromium e as evidências: o vídeo esquiva-e-aparo.webm e os quatro PNG de revisão.
// As referências e o roteiro do vídeo vêm do Vitest (tests/logica/combate/referencias.test.ts).
import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alvoDoAparo, type Alvo } from '../src/entrada/alvos';
import { caixaDaBarraDeStamina } from '../src/cenas/layoutDoHud';
import { COR } from '../src/cenas/paleta';
import type { AcaoDeRoteiro, Roteiro } from '../src/logica/nucleo/comandos';
import { FORMA } from '../src/logica/nucleo/eventos';
import { SEED_DA_F006 } from '../src/logica/nucleo/referencia';
import { insetsZerados } from '../src/plataforma/safeArea';
import { EVIDENCIAS, RAIZ, SEM_HORDA, abrir, corNoCanvas, distancia, paraPagina, proximoFrame, rgb, tocarAcender } from './apoio';

const INSETS = insetsZerados();
const BOTAO_APARO = alvoDoAparo(INSETS, { id: '', x: 0, y: 0, largura: 0, altura: 0 });
const centro = (a: Alvo) => ({ x: a.x + a.largura / 2, y: a.y + a.altura / 2 });
const DIR_DAS_EVIDENCIAS = join(RAIZ, 'production', 'evidencias', 'F-006');
/** Os parâmetros de URL da Vigília de produção a partir de 1:00 que o Vitest usou (referencias.test.ts). */
const URL_DO_VIDEO = '&tutorial=0&inicio=01:00&teto=300';

interface Marca {
  passo: number;
  congelamento: number;
  hash: string;
}
interface ReferenciaF006 {
  seed: number;
  roteiroDoVideo: { movimento: Roteiro; acoes: AcaoDeRoteiro[]; fim: number };
  marcas: Record<'esquiva' | 'esquivaPerfeita' | 'congelado' | 'aparo' | 'contraAtaque', Marca>;
  telegrafos: { passo: number; hash: string; passoDoGolpe: number };
}

function referencia(): ReferenciaF006 {
  const arquivo = join(RAIZ, '.verify', 'referencia-f006.json');
  expect(existsSync(arquivo), 'rode o Vitest antes (scripts/verify.sh grava referencia-f006.json)').toBe(true);
  const ref = JSON.parse(readFileSync(arquivo, 'utf-8')) as ReferenciaF006;
  expect(ref.seed).toBe(SEED_DA_F006);
  return ref;
}

const quadros = (page: Page, n = 2): Promise<void> => (async () => { for (let k = 0; k < n; k++) await proximoFrame(page); })();

/** Roda `n` passos na pausa do debug e devolve quantos rodaram. */
const avancar = (page: Page, n: number): Promise<number> => page.evaluate((n) => window.__GAME_DEBUG__.avancar(n), n);

/** Toque real (CDP) num ponto lógico. */
async function tocar(page: Page, p: { x: number; y: number }): Promise<void> {
  const q = await paraPagina(page, p.x, p.y);
  await page.touchscreen.tap(q.x, q.y);
}

/** Roda passo a passo, na pausa, até o 1º evento `telegrafo` da forma dada (ou o limite), e devolve-o. */
async function ateOTelegrafo(page: Page, forma: number, limite = 1500) {
  const e = await page.evaluate(
    ([forma, limite]) => {
      const d = window.__GAME_DEBUG__;
      d.pausar();
      for (let k = 0; k < limite!; k++) {
        d.avancar(1);
        const achado = d.ultimosEventos.find((x) => x.tipo === 'telegrafo' && x.forma === forma);
        if (achado) return achado;
      }
      return null;
    },
    [forma, limite] as const,
  );
  expect(e, `nenhum telegrafo da forma ${forma} em ${limite} passos`).not.toBeNull();
  return e!;
}

/** Roda passo a passo até `CAB.passo` ≥ alvo e `congelamento` = cong (a marca de referência); devolve o estado lido. */
async function ateAMarca(page: Page, m: Marca): Promise<{ passo: number; congelamento: number; hash: string | null }> {
  return page.evaluate((m) => {
    const d = window.__GAME_DEBUG__;
    d.pausar();
    for (let k = 0; k < 20_000; k++) {
      const j = d.jogador!;
      if (d.passo > m.passo || (d.passo === m.passo && j.congelamento === m.congelamento)) break;
      if (d.avancar(1) === 0) break;
    }
    return { passo: d.passo, congelamento: d.jogador!.congelamento, hash: d.hash() };
  }, m);
}

async function capturar(page: Page, nome: string, info: { outputPath: (n: string) => string }): Promise<void> {
  const destino = EVIDENCIAS ? join(DIR_DAS_EVIDENCIAS, nome) : info.outputPath(nome);
  mkdirSync(dirname(destino), { recursive: true });
  const png = await page.screenshot({ path: destino, scale: 'css' });
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([390, 844]);
}

/** O roteiro do vídeo (movimento e ações) imposto desde o passo 0, antes de Acender. */
async function imporRoteiro(page: Page, ref: ReferenciaF006): Promise<void> {
  await page.evaluate((r) => window.__GAME_DEBUG__.entrada.roteiro(r.movimento, r.acoes), ref.roteiroDoVideo);
}

// ---------------------------------------------------------------------------------------------------------------
// F-006.5

test('F-006.5: swipe sintético gera esquiva (e 385 pt/s não); dois toques curtos geram esquiva na última direção', async ({ page }) => {
  test.setTimeout(90_000);
  await abrir(page, SEM_HORDA);
  await tocarAcender(page);
  await page.evaluate(() => window.__GAME_DEBUG__.pausar());
  const estado = () => page.evaluate(() => ({ j: window.__GAME_DEBUG__.jogador!, esquivas: window.__GAME_DEBUG__.ultimosEventos.filter((e) => e.tipo === 'esquiva').length }));
  const antes = await estado();
  expect(antes.j.stamina).toBe(100);
  expect(antes.j.esquivaPasso).toBe(0);
  // 50 pt em 80 ms = 625 pt/s (≥ 24 pt e > 400 pt/s); as marcas ficam a menos de 60 s do relógio do quadro.
  const injetar = (tipo: 'inicio' | 'move' | 'fim', id: number, x: number, y: number, dt: number) =>
    page.evaluate(([tipo, id, x, y, dt, t0]) => window.__GAME_DEBUG__.entrada.injetar(tipo!, id!, x!, y!, t0! + dt!), [tipo, id, x, y, dt, T0] as const);
  const T0 = await page.evaluate(() => Math.round(performance.now()));
  await injetar('inicio', 21, 100, 650, 0);
  await injetar('move', 21, 150, 650, 80);
  await quadros(page);
  await avancar(page, 1);
  const depois = await estado();
  expect(depois.j.stamina).toBe(75);
  expect(depois.j.esquivaPasso).toBeGreaterThan(0);
  expect(depois.esquivas).toBe(1);
  await injetar('fim', 21, 150, 650, 90);
  await quadros(page);
  // Contraprova: 50 pt em 130 ms (385 pt/s) não gera esquiva (a igualdade exata em 400 pt/s fica no Vitest).
  await avancar(page, 60);
  const T1 = await page.evaluate(() => Math.round(performance.now()));
  const lento = (tipo: 'inicio' | 'move' | 'fim', x: number, y: number, dt: number) =>
    page.evaluate(([tipo, x, y, dt, t0]) => window.__GAME_DEBUG__.entrada.injetar(tipo!, 22, x!, y!, t0! + dt!), [tipo, x, y, dt, T1] as const);
  await lento('inicio', 100, 700, 0);
  await lento('move', 150, 700, 130);
  await quadros(page);
  await avancar(page, 1);
  expect((await estado()).esquivas).toBe(1);
  await lento('fim', 150, 700, 140);
  await quadros(page);
  await avancar(page, 60);
  // Toque duplo: dois toques de 100 ms, 150 ms entre eles e a 20 pt, geram esquiva (a última direção, sem mira).
  const antesDuplo = await estado();
  const T2 = await page.evaluate(() => Math.round(performance.now()));
  const duplo = (tipo: 'inicio' | 'fim', id: number, x: number, dt: number) =>
    page.evaluate(([tipo, id, x, dt, t0]) => window.__GAME_DEBUG__.entrada.injetar(tipo!, id!, x!, 650, t0! + dt!), [tipo, id, x, dt, T2] as const);
  await duplo('inicio', 23, 100, 0);
  await duplo('fim', 23, 100, 100);
  await duplo('inicio', 24, 120, 250);
  await quadros(page);
  await avancar(page, 1);
  const d = await estado();
  expect(d.esquivas).toBe(antesDuplo.esquivas + 1);
  expect(d.j.stamina).toBeLessThan(antesDuplo.j.stamina);
  await duplo('fim', 24, 120, 300);
});

// ---------------------------------------------------------------------------------------------------------------
// F-006.6

for (const modo of ['toque real (CDP)', 'injetar'] as const) {
  test(`F-006.6: toque no botão Aparo durante o telegrafo do Oco Grande gera aparo (${modo})`, async ({ page }) => {
    test.setTimeout(120_000);
    await abrir(page, '&tutorial=0&inicio=01:00&teto=300');
    await tocarAcender(page);
    // O 1º telegrafo de qualquer Oco Grande (nascem 3 no passo 1); o golpe cai em T+36.
    const tele = await ateOTelegrafo(page, FORMA.arcoInimigo);
    const T = tele.passo;
    await avancar(page, T + 30 - (await page.evaluate(() => window.__GAME_DEBUG__.passo)));
    expect(await page.evaluate(() => window.__GAME_DEBUG__.passo)).toBe(T + 30);
    expect(await page.evaluate(() => window.__GAME_DEBUG__.jogador!.stamina)).toBe(100);
    if (modo === 'injetar') {
      const c = centro(BOTAO_APARO);
      await page.evaluate(([x, y]) => window.__GAME_DEBUG__.entrada.injetar('inicio', 31, x!, y!, Math.round(performance.now())), [c.x, c.y] as const);
    } else {
      await tocar(page, centro(BOTAO_APARO));
    }
    await quadros(page);
    await avancar(page, 1);
    // O custo exato: 100 → 85, sem regeneração no passo do gasto.
    expect(await page.evaluate(() => window.__GAME_DEBUG__.jogador!.stamina)).toBe(85);
    // Depois do golpe (T+36), comparando CAB.passo (o congelamento do aparo para o passo).
    await page.evaluate((alvo) => {
      const d = window.__GAME_DEBUG__;
      for (let k = 0; k < 200 && d.passo < alvo; k++) d.avancar(1);
    }, T + 37);
    const r = await page.evaluate(() => {
      const d = window.__GAME_DEBUG__;
      return { eventos: d.ultimosEventos, stamina: d.jogador!.stamina, telemetria: d.eventos.filter((e) => e.evento === 'aparo') };
    });
    const aparo = r.eventos.find((e) => e.tipo === 'aparo');
    expect(aparo, 'evento aparo').toBeDefined();
    expect(aparo!.alvo).toEqual(tele.alvo);
    const golpe = r.eventos.find((e) => e.tipo === 'golpeInimigo' && e.alvo?.slot === tele.alvo!.slot && e.alvo?.geracao === tele.alvo!.geracao);
    expect(golpe, 'golpeInimigo do mesmo Oco').toBeDefined();
    expect(golpe!.passo).toBe(T + 36);
    expect(golpe!.extra).toBe(3);
    // min(100, antes − 15 + 30) = 100.
    expect(r.stamina).toBe(100);
    expect(r.telemetria.map((e) => e.campos)).toContainEqual({ minuto: 1, sucesso: true, alvo: 'oco_grande' });
  });
}

// ---------------------------------------------------------------------------------------------------------------
// F-006.8

/** Os projéteis de Sal vivos e a posição do jogador, para achar o instante de tocar o botão (impacto em ~7 passos). */
async function passosAteOImpacto(page: Page): Promise<number> {
  return page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    const j = d.jogador!;
    let melhor = Infinity;
    for (const p of d.projeteis().filter((q) => q.tipo === 'sal')) {
      const v = Math.hypot(p.vx, p.vy);
      const dist = Math.hypot(p.x - j.x, p.y - j.y) - 16 - 6;
      if (v > 0) melhor = Math.min(melhor, dist / v);
    }
    return melhor;
  });
}

test('F-006.8 (a): ?inicio=01:00 — o prompt de esquiva só no 1º telegrafo do Oco Grande, fica depois do golpe e some com a esquiva', async ({ page }) => {
  test.setTimeout(120_000);
  await abrir(page, '&inicio=01:00&visto=mover&teto=300');
  await tocarAcender(page);
  await page.evaluate(() => window.__GAME_DEBUG__.pausar());
  expect(await page.evaluate(() => window.__GAME_DEBUG__.relogio)).toBeGreaterThanOrEqual(3600);
  // Relógio em 3.700 e nenhum telegrafo ainda: o prompt não aparece (reprova gatilho por relógio).
  await avancar(page, 3700 - (await page.evaluate(() => window.__GAME_DEBUG__.relogio)));
  expect(await page.evaluate(() => window.__GAME_DEBUG__.ultimosEventos.some((e) => e.tipo === 'telegrafo'))).toBe(false);
  await quadros(page);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).not.toContain('A2.TUTORIAL.02');
  // Até o evento e um quadro: o prompt está na tela.
  const tele = await ateOTelegrafo(page, FORMA.arcoInimigo);
  await quadros(page);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toContain('A2.TUTORIAL.02');
  expect(await page.evaluate(() => window.__GAME_DEBUG__.jogador!.prompts.esquiva)).toBe(1);
  // Sem esquiva do jogador, o prompt continua depois do golpe (T+36).
  await page.evaluate((alvo) => {
    const d = window.__GAME_DEBUG__;
    for (let k = 0; k < 100 && d.passo < alvo; k++) d.avancar(1);
  }, tele.passo + 40);
  await quadros(page);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toContain('A2.TUTORIAL.02');
  // Uma esquiva por swipe sintético o cumpre; o fade de 200 ms termina e o texto sai.
  const t0 = await page.evaluate(() => Math.round(performance.now()));
  await page.evaluate((t0) => {
    const d = window.__GAME_DEBUG__;
    d.entrada.injetar('inicio', 41, 100, 650, t0);
    d.entrada.injetar('move', 41, 150, 650, t0 + 80);
  }, t0);
  await quadros(page);
  await avancar(page, 1);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.jogador!.prompts.esquiva)).toBe(2);
  await page.waitForFunction(() => !window.__GAME_DEBUG__.textoAtivo.includes('A2.TUTORIAL.02'), null, { timeout: 10_000 });
});

test('F-006.8 (b): ?inicio=03:00 — o prompt de aparo só depois do 1º telegrafo de Noviça; o aparo com o projétil na janela o cumpre', async ({ page }) => {
  test.setTimeout(120_000);
  await abrir(page, '&inicio=03:00&visto=mover,esquiva&teto=300');
  await tocarAcender(page);
  await page.evaluate(() => window.__GAME_DEBUG__.pausar());
  await quadros(page);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).not.toContain('A2.TUTORIAL.03');
  await ateOTelegrafo(page, FORMA.projetilSal);
  await quadros(page);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toContain('A2.TUTORIAL.03');
  expect(await page.evaluate(() => window.__GAME_DEBUG__.jogador!.prompts.aparo)).toBe(1);
  // Roda até o projétil de Sal mais próximo estar a ~7 passos do impacto (anel sólido); então o botão.
  let faltam = Infinity;
  for (let k = 0; k < 400 && !(faltam <= 7); k++) {
    await avancar(page, 1);
    faltam = await passosAteOImpacto(page);
  }
  expect(faltam, 'projétil de Sal a caminho').toBeLessThanOrEqual(7);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.jogador!.stamina)).toBeGreaterThanOrEqual(15);
  await tocar(page, centro(BOTAO_APARO));
  await quadros(page);
  await page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    for (let k = 0; k < 20 && !d.ultimosEventos.some((e) => e.tipo === 'aparo'); k++) d.avancar(1);
  });
  const r = await page.evaluate(() => ({ aparos: window.__GAME_DEBUG__.ultimosEventos.filter((e) => e.tipo === 'aparo').length, aparo: window.__GAME_DEBUG__.jogador!.prompts.aparo }));
  expect(r.aparos).toBeGreaterThanOrEqual(1);
  expect(r.aparo).toBe(2);
  await page.waitForFunction(() => !window.__GAME_DEBUG__.textoAtivo.includes('A2.TUTORIAL.03'), null, { timeout: 10_000 });
});

test('F-006.8 (c): ?tutorial=0 — nenhum dos dois prompts, mesmo com telegrafos acontecendo', async ({ page }) => {
  test.setTimeout(120_000);
  await abrir(page, '&tutorial=0&inicio=03:00&teto=300');
  await tocarAcender(page);
  await ateOTelegrafo(page, FORMA.arcoInimigo);
  await quadros(page);
  const tx = await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo);
  expect(tx).not.toContain('A2.TUTORIAL.02');
  expect(tx).not.toContain('A2.TUTORIAL.03');
  await ateOTelegrafo(page, FORMA.projetilSal);
  await quadros(page);
  const ty = await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo);
  expect(ty.filter((i) => i.startsWith('A2.TUTORIAL'))).toEqual([]);
});

test('câmera lenta (FB5): dispara no quadro do prompt de esquiva, dura 500 ms de tempo real e não volta', async ({ page }) => {
  test.setTimeout(120_000);
  await abrir(page, '&inicio=01:00&visto=mover&teto=300');
  await tocarAcender(page);
  // Sem pausa: o driver ao vivo. Amostra a escala a cada quadro até o prompt e mais 3 s.
  const escalas = await page.evaluate(
    () =>
      new Promise<number[]>((resolver) => {
        const d = window.__GAME_DEBUG__;
        const vistas: number[] = [];
        let fim = Infinity;
        const amostrar = (agora: number): void => {
          vistas.push(d.escalaDeTempo);
          if (fim === Infinity && d.jogador!.prompts.esquiva === 1) fim = agora + 3000;
          if (agora > fim || agora > 30_000 + inicio) resolver(vistas);
          else requestAnimationFrame(amostrar);
        };
        const inicio = performance.now();
        requestAnimationFrame(amostrar);
      }),
  );
  expect(escalas).toContain(0.5);
  const primeira = escalas.indexOf(0.5);
  expect(escalas.slice(0, primeira).every((v) => v === 1)).toBe(true);
  const ultima = escalas.lastIndexOf(0.5);
  expect(escalas.slice(ultima + 1).every((v) => v === 1)).toBe(true);
});

// ---------------------------------------------------------------------------------------------------------------
// Node × Chromium e as evidências

test('Node × Chromium: as 5 marcas do roteiro do vídeo têm o hash do Vitest (esquiva, perfeita, congelado, aparo, Contra-ataque)', async ({ page }) => {
  test.setTimeout(180_000);
  const ref = referencia();
  await abrir(page, URL_DO_VIDEO, false, SEED_DA_F006);
  await imporRoteiro(page, ref);
  await tocarAcender(page);
  await page.evaluate(() => window.__GAME_DEBUG__.pausar());
  const linhas: string[] = [];
  for (const nome of ['esquiva', 'esquivaPerfeita', 'congelado', 'aparo', 'contraAtaque'] as const) {
    const m = ref.marcas[nome];
    const lido = await ateAMarca(page, m);
    expect([lido.passo, lido.congelamento], nome).toEqual([m.passo, m.congelamento]);
    linhas.push(`chromium (Playwright), ${nome}: seed=${SEED_DA_F006} passo=${lido.passo} hash=${lido.hash} iguais=${lido.hash === m.hash}`);
    expect(lido.hash, nome).toBe(m.hash);
  }
  if (EVIDENCIAS) appendFileSync(join(RAIZ, 'production', 'evidencias', 'F-001', 'determinismo.log'), linhas.join('\n') + '\n');
});

test('evidência: vídeo esquiva-e-aparo.webm (≥ 10 s) com a esquiva perfeita, o congelamento e o aparo do roteiro fixo', async ({ browser }, info) => {
  test.setTimeout(180_000);
  const ref = referencia();
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
  const inicio = Date.now();
  const page = await contexto.newPage();
  await abrir(page, URL_DO_VIDEO, false, SEED_DA_F006);
  await page.waitForTimeout(1200);
  await imporRoteiro(page, ref);
  await tocarAcender(page);
  await page.evaluate(() => window.__GAME_DEBUG__.pausar());
  // Em lotes pequenos, com espera entre eles: cada quadro renderizado avança poucos passos e o vídeo mostra
  // os eventos mesmo a ≈ 8 fps (WebGL por software).
  const vistoEm: Record<string, number> = {};
  const fim = ref.roteiroDoVideo.fim;
  for (let guarda = 0; guarda < 2000; guarda++) {
    const r = await page.evaluate(() => {
      const d = window.__GAME_DEBUG__;
      d.avancar(5);
      return { passo: d.passo, cong: d.jogador!.congelamento, tipos: d.ultimosEventos.map((e) => e.tipo) };
    });
    const agora = Date.now() - inicio;
    if (r.tipos.includes('esquivaPerfeita') && vistoEm['perfeita'] === undefined) vistoEm['perfeita'] = agora;
    if (r.cong > 0 && vistoEm['congelamento'] === undefined && r.tipos.includes('esquivaPerfeita')) vistoEm['congelamento'] = agora;
    if (r.tipos.includes('aparo') && vistoEm['aparo'] === undefined) vistoEm['aparo'] = agora;
    if (r.passo >= fim) break;
    await page.waitForTimeout(50);
  }
  expect(vistoEm['perfeita'], 'esquivaPerfeita no vídeo').toBeDefined();
  expect(vistoEm['aparo'], 'aparo no vídeo').toBeDefined();
  // Fecha o vídeo com o último quadro parado por um instante e o contexto aberto por pelo menos 10 s.
  await page.waitForTimeout(600);
  const falta = 11_000 - (Date.now() - inicio);
  if (falta > 0) await page.waitForTimeout(falta);
  expect(Date.now() - inicio).toBeGreaterThanOrEqual(10_000);
  const video = page.video()!;
  await contexto.close();
  const destino = EVIDENCIAS ? join(DIR_DAS_EVIDENCIAS, 'esquiva-e-aparo.webm') : info.outputPath('esquiva-e-aparo.webm');
  mkdirSync(dirname(destino), { recursive: true });
  await video.saveAs(destino);
  expect(statSync(destino).size).toBeGreaterThan(0);
  // ffprobe e ffmpeg (em /usr/bin): a duração entre 10 e 20 s e 3 quadros para a revisão; tolerante à ausência.
  try {
    const duracao = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', destino], { encoding: 'utf-8' }).trim());
    if (Number.isFinite(duracao)) {
      expect(duracao, 'duração do vídeo (s)').toBeGreaterThanOrEqual(10);
      expect(duracao, 'duração do vídeo (s)').toBeLessThanOrEqual(20);
    }
    for (const [nome, ms] of [['perfeita', vistoEm['perfeita']], ['congelamento', vistoEm['congelamento'] ?? vistoEm['perfeita']], ['aparo', vistoEm['aparo']]] as const) {
      const saida = info.outputPath(`video-${nome}.png`);
      mkdirSync(dirname(saida), { recursive: true });
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(Math.max(0, ms! / 1000 + 0.3)), '-i', destino, '-frames:v', '1', saida]);
    }
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') throw erro;
  }
});

test('evidência: esquiva-perfeita-390x844.png (o flash com ?flash=segurar)', async ({ page }, info) => {
  test.setTimeout(120_000);
  const ref = referencia();
  await abrir(page, `${URL_DO_VIDEO}&flash=segurar`, false, SEED_DA_F006);
  await imporRoteiro(page, ref);
  await tocarAcender(page);
  const lido = await ateAMarca(page, ref.marcas.esquivaPerfeita);
  expect(lido.hash).toBe(ref.marcas.esquivaPerfeita.hash);
  await quadros(page, 3);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.flash), 'flash').toBeGreaterThan(0);
  // O fundo composto com branco a 0,35: em algum ponto sem inimigo nem HUD, fundo × 0,65 + 255 × 0,35.
  const fundo = rgb(COR.fundo);
  const esperado = fundo.map((v) => Math.round(v * 0.65 + 255 * 0.35));
  const amostras = [{ x: 8, y: 330 }, { x: 8, y: 520 }, { x: 382, y: 330 }, { x: 382, y: 560 }, { x: 195, y: 250 }];
  const distancias: number[] = [];
  for (const p of amostras) distancias.push(distancia(await corNoCanvas(page, p), esperado));
  expect(Math.min(...distancias), `fundo com flash ${esperado} (distâncias ${distancias})`).toBeLessThanOrEqual(10);
  await capturar(page, 'esquiva-perfeita-390x844.png', info);
});

test('evidência: telegrafos-390x844.png (a cunha, a faixa e o projétil da Noviça, uma faca, o botão e a barra)', async ({ page }, info) => {
  test.setTimeout(120_000);
  const ref = referencia();
  await abrir(page, '&cenario=telegrafos&teto=300', false, SEED_DA_F006);
  await tocarAcender(page);
  const lido = await ateAMarca(page, { passo: ref.telegrafos.passo, congelamento: 0, hash: ref.telegrafos.hash });
  expect([lido.passo, lido.hash]).toEqual([ref.telegrafos.passo, ref.telegrafos.hash]);
  await quadros(page, 3);
  const cena = await page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    return { inimigos: d.inimigos(), projeteis: d.projeteis(), cam: d.camera!, jogador: d.jogador! };
  });
  expect(cena.projeteis.some((p) => p.tipo === 'sal')).toBe(true);
  expect(cena.projeteis.some((p) => p.tipo === 'faca')).toBe(true);
  // A silhueta branca do Oco Grande em telegrafo, no ponto dele na tela (câmera centrada no jogador).
  const grande = cena.inimigos.find((i) => i.tipo === 'oco_grande')!;
  const naTela = { x: 195 + (grande.x - cena.cam.x), y: 422 + (grande.y - cena.cam.y) };
  expect(distancia(await corNoCanvas(page, naTela), [255, 255, 255]), 'silhueta branca do Oco Grande').toBeLessThanOrEqual(24);
  // O botão Aparo no canto (o anel de osso) e a barra de stamina cheia (preenchimento de osso até o fim).
  const botao = centro(BOTAO_APARO);
  const fundo = rgb(COR.fundo);
  expect(distancia(await corNoCanvas(page, { x: botao.x + 31, y: botao.y }), fundo), 'anel do botão Aparo').toBeGreaterThan(40);
  const barra = caixaDaBarraDeStamina(INSETS, { x: 0, y: 0, largura: 0, altura: 0 });
  const meio = barra.y + barra.altura / 2;
  expect(distancia(await corNoCanvas(page, { x: barra.x + 4, y: meio }), rgb(COR.osso)), 'início da barra').toBeLessThanOrEqual(24);
  expect(distancia(await corNoCanvas(page, { x: barra.x + barra.largura - 4, y: meio }), rgb(COR.osso)), 'fim da barra (stamina 100)').toBeLessThanOrEqual(24);
  await capturar(page, 'telegrafos-390x844.png', info);
});

test('evidência: tutorial-esquiva-390x844.png e tutorial-aparo-390x844.png (o prompt visível no 1º telegrafo)', async ({ page }, info) => {
  test.setTimeout(150_000);
  // Esquiva: ?inicio=01:00&visto=mover, no passo do evento telegrafo do Oco Grande mais um quadro e o fade de 200 ms.
  await abrir(page, '&inicio=01:00&visto=mover&teto=300', false, SEED_DA_F006);
  await tocarAcender(page);
  await ateOTelegrafo(page, FORMA.arcoInimigo);
  await quadros(page);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toContain('A2.TUTORIAL.02');
  await page.waitForTimeout(400);
  await quadros(page);
  await capturar(page, 'tutorial-esquiva-390x844.png', info);
  // Aparo: ?inicio=03:00&visto=mover,esquiva, com o glifo ⟲ conferido na imagem.
  await abrir(page, '&inicio=03:00&visto=mover,esquiva&teto=300', false, SEED_DA_F006);
  await tocarAcender(page);
  await ateOTelegrafo(page, FORMA.projetilSal);
  await quadros(page);
  const textos = await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo);
  expect(textos).toContain('A2.TUTORIAL.03');
  expect(textos).not.toContain('A2.TUTORIAL.02');
  await page.waitForTimeout(400);
  await quadros(page);
  await capturar(page, 'tutorial-aparo-390x844.png', info);
});
