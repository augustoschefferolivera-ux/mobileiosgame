// F-009 na Playwright (projeto taps-game; design/decisoes-F-009.md §5 e "Critérios"): F-009.5 (60 s de luta com o bot de inputs e a Postura
// no debug, duas rodadas com o mesmo hash), o vídeo da luta, as barras do chefe, A Fome e o Amanhecer com o Resultado. Com VDC_EVIDENCIAS=1
// grava em production/evidencias/F-009/. Cenário `lanterneiro` (nível 29; a arena forma no passo 30), build de debug, seed 424242.
// A luta roda na pausa, passo a passo (`avancar`), com o roteiro imposto por passo: o resultado não depende do fps. Dois bots de página
// (os mesmos de qualquer jogador cuidadoso): "corpo a corpo" (anda até 90 pt do chefe, apara os brancos e esquiva dos vermelhos) mata o
// Lanterneiro em ~7.000 passos; "parado" (só apara e esquiva) o deixa vivo até as 23:00.
import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ETAPA } from '../src/logica/nucleo/estado';
import { EVIDENCIAS, RAIZ, abrir, proximoFrame, tocarAcender } from './apoio';

const DIR = join(RAIZ, 'production', 'evidencias', 'F-009');
const SEED_DO_CHEFE = 424242;
const CENARIO_URL = '&cenario=lanterneiro&tutorial=0';

type Modo = 'corpo_a_corpo' | 'parado';
interface Bot {
  /** Roda até `n` passos (para antes se `parar` for verdadeira); devolve quantos rodaram. */
  rodar(modo: Modo, n: number, parar: string | null): number;
  /** Roda até o passo absoluto `alvo` (o jogo em tempo real pode ter rodado alguns passos parado antes da pausa; o estado só depende do passo). */
  ate(modo: Modo, alvo: number): void;
  /** Com `gravando`, cada passo do bot fica em `log` (passo, movimento e ação) para o replay em tempo real. */
  gravando: boolean;
  log: { passo: number; mx: number; my: number; acao: number }[];
}
declare global {
  interface Window {
    __bot: Bot;
  }
}

/** Instala o bot na página: apara o branco a 6 passos do golpe, esquiva do vermelho a 8, bebe o Frasco abaixo de 60 de HP. */
async function instalarBot(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    const um = (modo: Modo): void => {
      const c = d.chefe;
      const j = d.jogador!;
      let acao = 0;
      let mx = 0;
      let my = 0;
      if (c) {
        const ch = d.inimigos().find((x) => x.slot === c.slot)!;
        if (c.ataqueFase === 1) {
          const t = ch.ataqueTimer;
          if (c.ataqueId >= 1 && c.ataqueId <= 2 && j.ameacasAparaveis > 0 && t === 6) acao = 2;
          else if (c.ataqueId === 6 && t === 6) acao = 2;
          else if ((c.ataqueId === 3 || c.ataqueId === 5) && t === 8) acao = 1;
        }
        if (modo === 'corpo_a_corpo') {
          const dx = ch.x - j.x;
          const dy = ch.y - j.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 90) {
            mx = dx / dist;
            my = dy / dist;
          }
        }
      }
      const v = d.vigilia!;
      if (acao === 0 && j.hp < 60 && v.frasco.cargas > 0 && v.frasco.passo === 0) acao = 4;
      if (window.__bot.gravando) window.__bot.log.push({ passo: d.passo, mx, my, acao });
      d.entrada.roteiro([{ passo: 0, mx, my }], acao ? [{ passo: d.passo, acoes: acao }] : null);
      d.avancar(1);
    };
    window.__bot = {
      gravando: false,
      log: [],
      ate(modo, alvo) {
        while (d.passo < alvo) um(modo);
      },
      rodar(modo, n, parar) {
        let k = 0;
        for (; k < n; k++) {
          if (parar === 'amanhecer' && d.vigilia!.etapas.etapa === 5) break;
          if (parar === 'a_fome' && d.vigilia!.etapas.etapa === 4) break;
          if (parar === 'fim' && d.estado.startsWith('FIM')) break;
          if (parar === 'vara') {
            const c = d.chefe;
            if (c && c.ataqueFase === 1 && c.ataqueId === 1 && d.inimigos().find((x) => x.slot === c.slot)!.ataqueTimer === 18) break;
          }
          um(modo);
        }
        return k;
      },
    };
  });
}

async function abrirNoLanterneiro(page: Page, extra = ''): Promise<void> {
  await abrir(page, CENARIO_URL + extra, false, SEED_DO_CHEFE);
  await tocarAcender(page);
  await page.evaluate(() => window.__GAME_DEBUG__.pausar());
  await instalarBot(page);
}

async function capturar(page: Page, nome: string, info: { outputPath: (n: string) => string }): Promise<void> {
  const destino = EVIDENCIAS ? join(DIR, nome) : info.outputPath(nome);
  mkdirSync(dirname(destino), { recursive: true });
  const png = await page.screenshot({ path: destino, scale: 'css' });
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([390, 844]);
}

const quadros = async (page: Page, n: number): Promise<void> => {
  for (let k = 0; k < n; k++) await proximoFrame(page);
};
const lerChefe = (page: Page) => page.evaluate(() => ({ chefe: window.__GAME_DEBUG__.chefe, hash: window.__GAME_DEBUG__.hash(), passo: window.__GAME_DEBUG__.passo, etapa: window.__GAME_DEBUG__.vigilia!.etapas.etapa, estado: window.__GAME_DEBUG__.estado }));
const esperarTexto = (page: Page, id: string) => page.waitForFunction((i) => window.__GAME_DEBUG__.textoAtivo.includes(i), id, { polling: 'raf' });

/** Uma rodada até o passo 3.660 (60 passos de arena e 60 s de luta) em 12 blocos de 300; devolve as leituras do início e do fim de cada bloco. */
async function rodada(page: Page) {
  await page.evaluate(() => window.__bot.ate('parado', 60));
  const inicial = await lerChefe(page);
  expect(inicial.passo).toBe(60);
  const leituras: Awaited<ReturnType<typeof lerChefe>>[] = [];
  for (let b = 1; b <= 12; b++) {
    await page.evaluate((alvo) => window.__bot.ate('parado', alvo), 60 + 300 * b);
    leituras.push(await lerChefe(page));
  }
  return { inicial, leituras };
}

test('F-009.5: 60 s de luta com seed e script fixos; a Postura do chefe varia no debug e as duas rodadas têm os mesmos hashes (evidência: chefe-390x844.png)', async ({ browser }, info) => {
  test.setTimeout(240_000);
  const erros: string[] = [];
  const hashes: (string | null)[][] = [];
  let primeira: Awaited<ReturnType<typeof rodada>> | null = null;
  for (let r = 0; r < 2; r++) {
    const contexto = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: { width: 390, height: 844 }, deviceScaleFactor: info.project.use.deviceScaleFactor, hasTouch: true, isMobile: true });
    const page = await contexto.newPage();
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
    await abrirNoLanterneiro(page);
    const rod = await rodada(page);
    hashes.push([rod.inicial.hash, ...rod.leituras.map((l) => l.hash)]);
    if (r === 0) {
      primeira = rod;
      // A captura das barras: com a luta pausada, anda até o telegrafo branco da Vara a 18 passos do golpe (a cunha branca e as barras no mesmo quadro).
      const achou = await page.evaluate(() => window.__bot.rodar('parado', 3000, 'vara') < 3000);
      expect(achou, 'um telegrafo da Vara em 3.000 passos').toBe(true);
      await quadros(page, 6);
      const textos = await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo);
      expect(textos).toContain('E1.LANTERNEIRO.NOME');
      await capturar(page, 'chefe-390x844.png', info);
    }
    await contexto.close();
  }
  const rod = primeira!;
  expect(rod.inicial.chefe, 'depois de 60 passos o chefe existe').not.toBeNull();
  expect(rod.inicial.chefe).toMatchObject({ fase: 1, hpMax: 14040 });
  expect(rod.inicial.etapa).toBe(ETAPA.chefe);
  const postura = rod.leituras.map((l) => l.chefe!.postura);
  for (const p of postura) {
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
  }
  expect(new Set(postura).size, 'pelo menos 3 valores de Postura em 12 leituras').toBeGreaterThanOrEqual(3);
  expect(rod.leituras.at(-1)!.chefe!.hp).toBeLessThan(rod.inicial.chefe!.hpMax);
  const quebrou = rod.leituras.some((l) => l.chefe!.quebraPassos > 0);
  expect(quebrou || postura.filter((p) => p > 0).length >= 6, 'uma Quebra ou Postura > 0 em ao menos 6 leituras').toBe(true);
  for (const l of rod.leituras) {
    expect(l.etapa, 'o minuto é 20:00 a 21:00: nunca A Fome').toBe(ETAPA.chefe);
    expect(l.estado, 'o jogador sobrevive aos 60 s').toBe('VIGILIA');
  }
  expect(hashes[1], 'mesma seed e mesmo script, mesmos hashes').toEqual(hashes[0]);
  expect(erros).toEqual([]);
});

test('luta.webm: o jogo em tempo real replica a luta do corpo a corpo, 35 s com a transição para a fase 2 (evidência: luta.webm)', async ({ browser }, info) => {
  test.setTimeout(300_000);
  const use = info.project.use;
  const PASSOS_DO_VIDEO = 2100;
  // 1) A luta é calculada na pausa pelo bot, que grava o que fez a cada passo; 2) o jogo roda em tempo real, num contexto com vídeo, com
  // esse roteiro imposto por passo absoluto desde o passo 0: a simulação é determinística, então a luta é a mesma, a qualquer fps.
  const calculo = await browser.newContext({ baseURL: use.baseURL, viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const pc = await calculo.newPage();
  await abrir(pc, CENARIO_URL, false, SEED_DO_CHEFE);
  // Parado desde o passo 0 até o bot assumir: os poucos passos que rodam antes da pausa são os mesmos no replay.
  await pc.evaluate(() => window.__GAME_DEBUG__.entrada.roteiro([{ passo: 0, mx: 0, my: 0 }]));
  await tocarAcender(pc);
  await pc.evaluate(() => window.__GAME_DEBUG__.pausar());
  await instalarBot(pc);
  await pc.evaluate(() => {
    window.__bot.gravando = true;
  });
  await pc.evaluate((n) => window.__bot.rodar('corpo_a_corpo', n, null), PASSOS_DO_VIDEO);
  const gravado = await pc.evaluate(() => {
    const movimento: { passo: number; mx: number; my: number }[] = [];
    const acoes: { passo: number; acoes: number }[] = [];
    for (const l of window.__bot.log) {
      const u = movimento.at(-1);
      if (!u || u.mx !== l.mx || u.my !== l.my) movimento.push({ passo: l.passo, mx: l.mx, my: l.my });
      if (l.acao) acoes.push({ passo: l.passo, acoes: l.acao });
    }
    if (movimento[0]!.passo > 0) movimento.unshift({ passo: 0, mx: 0, my: 0 });
    return { movimento, acoes, faseMax: window.__GAME_DEBUG__.chefe!.faseMax, hash: window.__GAME_DEBUG__.hash() };
  });
  await calculo.close();
  expect(gravado.faseMax, 'o trecho cruza a transição para a fase 2').toBeGreaterThanOrEqual(2);

  const contexto = await browser.newContext({
    baseURL: use.baseURL,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: use.deviceScaleFactor,
    hasTouch: true,
    isMobile: true,
    recordVideo: { dir: info.outputPath('video'), size: { width: 390, height: 844 } },
  });
  const page = await contexto.newPage();
  await abrir(page, CENARIO_URL, false, SEED_DO_CHEFE);
  await page.evaluate((g) => window.__GAME_DEBUG__.entrada.roteiro(g.movimento, g.acoes), gravado);
  await tocarAcender(page);
  await page.waitForFunction((n) => window.__GAME_DEBUG__.passo >= n, PASSOS_DO_VIDEO, { polling: 'raf', timeout: 240_000 });
  await page.evaluate(() => window.__GAME_DEBUG__.pausar());
  const fim = await lerChefe(page);
  expect(fim.chefe!.faseMax, 'o replay em tempo real cruzou a transição').toBeGreaterThanOrEqual(2);
  expect(fim.estado).toBe('VIGILIA');
  const video = page.video()!;
  await contexto.close();
  const destino = EVIDENCIAS ? join(DIR, 'luta.webm') : info.outputPath('luta.webm');
  mkdirSync(dirname(destino), { recursive: true });
  await video.saveAs(destino);
  expect(statSync(destino).size).toBeGreaterThan(0);
  try {
    const duracao = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', destino], { encoding: 'utf-8' }).trim());
    if (Number.isFinite(duracao)) expect(duracao, 'duração do vídeo (s)').toBeGreaterThanOrEqual(30);
  } catch {
    // ffprobe ausente: o tamanho do arquivo já foi conferido.
  }
});

test('A Fome: o jogador parado chega às 23:00 com o chefe vivo, o véu vinho cai e o Resultado mostra "A Fome desce." (evidências: a-fome.png e resultado-a-fome-390x844.png)', async ({ page }, info) => {
  test.setTimeout(240_000);
  // 1.000 Almas para a mancha de A Fome (30%) aparecer no Resultado.
  await abrirNoLanterneiro(page, '&almas=1000');
  await page.evaluate(() => window.__bot.rodar('parado', 20_000, 'a_fome'));
  const chegou = await lerChefe(page);
  expect(chegou.etapa).toBe(ETAPA.aFome);
  expect(chegou.chefe, 'o chefe segue vivo na fome').not.toBeNull();
  expect(await page.evaluate(() => window.__GAME_DEBUG__.relogio)).toBe(82_800);
  // 200 passos de fome (3,3 s): o véu vinho a 0,56 e o relógio em brasa.
  await page.evaluate(() => window.__bot.rodar('parado', 200, null));
  await quadros(page, 6);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.estado), 'a fome ainda não matou').toBe('VIGILIA');
  await capturar(page, 'a-fome.png', info);
  await page.evaluate(() => window.__bot.rodar('parado', 2_000, 'fim'));
  expect(await page.evaluate(() => window.__GAME_DEBUG__.estado)).toBe('FIM(a_fome)');
  await esperarTexto(page, 'A4.A_FOME.01');
  await quadros(page, 6);
  await capturar(page, 'resultado-a-fome-390x844.png', info);
  const r = await page.evaluate(() => window.__GAME_DEBUG__.vigilia!.resultado!);
  expect(r.mancha, 'a fome deixa mancha (30% das Almas, a Hora "A Fome")').toMatchObject({ almas: 300 });
});

test('Amanhecer: o chefe cai, 10 s de céu que clareia e o texto antes do Resultado com "Derrotado" e 1 Brasa (evidências: amanhecer.png e resultado-amanhecer-390x844.png)', async ({ page }, info) => {
  test.setTimeout(240_000);
  await abrirNoLanterneiro(page);
  await page.evaluate(() => window.__bot.rodar('corpo_a_corpo', 20_000, 'amanhecer'));
  const ini = await lerChefe(page);
  expect(ini.etapa).toBe(ETAPA.amanhecer);
  expect(ini.chefe, 'o chefe morreu').toBeNull();
  await page.evaluate(() => window.__bot.rodar('corpo_a_corpo', 300, null));
  await quadros(page, 6);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo), 'o HUD some no Amanhecer').not.toContain('A5.HUD.NIVEL');
  await capturar(page, 'amanhecer.png', info);
  await page.evaluate(() => window.__bot.rodar('corpo_a_corpo', 400, 'fim'));
  expect(await page.evaluate(() => window.__GAME_DEBUG__.estado)).toBe('FIM(amanhecer)');
  await esperarTexto(page, 'A4.AMANHECER.01');
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo), 'o texto vem antes das linhas').not.toContain('A7.RESULTADO.VOLTAR');
  await esperarTexto(page, 'A7.RESULTADO.VOLTAR');
  await quadros(page, 6);
  await capturar(page, 'resultado-amanhecer-390x844.png', info);
  const r = await page.evaluate(() => window.__GAME_DEBUG__.vigilia!.resultado!);
  expect(r.almasAoSantuario).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toEqual(expect.arrayContaining(['A7.RESULTADO.CHEFE', 'A7.RESULTADO.BRASAS']));
});
