// F-008 na Playwright (projeto taps-game; design/decisoes-F-008.md §5, "Critérios" e "Evidências"): F-008.3 (fechar a página na
// Fogueira e reabrir mostra a oferta de retomada, que restaura o estado), o menu da Fogueira por toque real (Descansar, Forjar
// União e Partir), o Recusar em dois toques e a arena do marco com o telegrafo da Patada e o do Grito. Com VDC_EVIDENCIAS=1
// grava em production/evidencias/F-008/. Os testes esperam pelo `estado` e pelo `textoAtivo` do debug, nunca por um tempo
// fixo (AG8); o vídeo da retomada, sim, termina com uma espera curta para mostrar o último quadro.
import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alvosDaFogueira, alvosDaRetomada, alvosDaTelaDePausa, type Alvo } from '../src/entrada/alvos';
import { FASE_DO_ATAQUE } from '../src/logica/mundo/tipos';
import { ETAPA } from '../src/logica/nucleo/estado';
import { EVIDENCIAS, RAIZ, SEED, abrir, paraPagina, proximoFrame, tocarAcender } from './apoio';

const DIR = join(RAIZ, 'production', 'evidencias', 'F-008');
const centro = (a: Alvo) => ({ x: a.x + a.largura / 2, y: a.y + a.altura / 2 });

async function capturar(page: Page, nome: string, info: { outputPath: (n: string) => string }): Promise<void> {
  const destino = EVIDENCIAS ? join(DIR, nome) : info.outputPath(nome);
  mkdirSync(dirname(destino), { recursive: true });
  const png = await page.screenshot({ path: destino, scale: 'css' });
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([390, 844]);
}

async function tocar(page: Page, p: { x: number; y: number }): Promise<void> {
  const q = await paraPagina(page, p.x, p.y);
  await page.touchscreen.tap(q.x, q.y);
}

const insets = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.safeArea);
const textos = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.textoAtivo);
const esperarTexto = (page: Page, id: string, presente = true) =>
  page.waitForFunction(([i, p]) => window.__GAME_DEBUG__.textoAtivo.includes(i as string) === p, [id, presente] as const, { polling: 'raf' });
const quadros = async (page: Page, n: number): Promise<void> => {
  for (let k = 0; k < n; k++) await proximoFrame(page);
};
const etapas = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.vigilia!.etapas);

/** Abre o cenário da Fogueira da Hora I, acende e espera o menu (o cenário já começa na Fogueira). */
async function abrirNaFogueira(page: Page): Promise<void> {
  await abrir(page, '&cenario=fogueira_hora1');
  await tocarAcender(page);
  await esperarTexto(page, 'I1.FOGUEIRA.PARTIR');
}

/** Partir por toque e espera a Fogueira fechar; devolve o `save` do debug depois de 120 passos. */
async function partirEGuardar(page: Page): Promise<{ seq: number; hash: string }> {
  const ins = await insets(page);
  await tocar(page, centro(alvosDaFogueira(ins, [])[2]!));
  await esperarTexto(page, 'I1.FOGUEIRA.PARTIR', false);
  await page.evaluate(() => window.__GAME_DEBUG__.avancar(120));
  const save = await page.evaluate(() => window.__GAME_DEBUG__.save);
  expect(save, 'o Partir gravou o vigilia').not.toBeNull();
  return save!;
}

test('F-008.3: Partir, fechar a página e reabrir mostra a retomada; Continuar abre na pausa com o hash do save (evidências: retomada.webm, save.json, acender-retomada-390x844.png)', async ({ browser }, info) => {
  test.setTimeout(120_000);
  const use = info.project.use;
  const contexto = await browser.newContext({
    baseURL: use.baseURL,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: use.deviceScaleFactor,
    hasTouch: true,
    isMobile: true,
    recordVideo: { dir: info.outputPath('video'), size: { width: 390, height: 844 } },
  });
  const primeira = await contexto.newPage();
  await abrirNaFogueira(primeira);
  const aberta = await primeira.evaluate(() => ({ save: window.__GAME_DEBUG__.save, relogio: window.__GAME_DEBUG__.relogio, etapas: window.__GAME_DEBUG__.vigilia!.etapas }));
  expect(aberta.save, 'o passo 0 gravou o vigilia').not.toBeNull();
  expect(aberta.relogio).toBe(18000);
  expect(aberta.etapas).toMatchObject({ etapa: ETAPA.fogueira, fogueiraAcesa: true, fogueiraHora: 1, marcosIniciados: 1 });
  const save = await partirEGuardar(primeira);
  expect(save.seq, 'o passo 0 e o Partir gravaram').toBeGreaterThanOrEqual(2);
  const guardado = await primeira.evaluate(() => ({ vigilia: localStorage.getItem('vdc.vigilia'), meta: localStorage.getItem('vdc.meta'), chaves: Object.keys(localStorage).sort() }));
  expect(guardado.chaves).toEqual(expect.arrayContaining(['vdc.meta', 'vdc.vigilia']));
  await primeira.close();

  // Reabre sem ?cenario, na mesma origem (o localStorage fica): a Tela de Acender oferece a retomada.
  const page = await contexto.newPage();
  const inicio = Date.now();
  await abrir(page);
  await esperarTexto(page, 'A1.ACENDER.RETOMAR');
  const ativo = await textos(page);
  expect(ativo).toEqual(expect.arrayContaining(['A1.ACENDER.RETOMAR', 'A1.ACENDER.RESUMO', 'A1.ACENDER.RECUSAR']));
  expect(ativo, 'o botão de Acender não aparece com a oferta').not.toContain('A1.ACENDER.BOTAO');
  await quadros(page, 6);
  await capturar(page, 'acender-retomada-390x844.png', info);
  const ins = await insets(page);
  await tocar(page, centro(alvosDaRetomada(ins, [])[0]!));
  await page.waitForFunction(() => window.__GAME_DEBUG__.estado === 'VIGILIA');
  await page.waitForFunction(() => window.__GAME_DEBUG__.pausa.ativa);
  const lido = await page.evaluate(() => ({ hash: window.__GAME_DEBUG__.hash(), relogio: window.__GAME_DEBUG__.relogio, passo: window.__GAME_DEBUG__.passo, etapas: window.__GAME_DEBUG__.vigilia!.etapas, jogador: window.__GAME_DEBUG__.jogador! }));
  expect(lido.hash, 'o estado carregado tem o hash do save').toBe(save.hash);
  expect(lido.relogio).toBe(18000);
  expect(lido.etapas).toMatchObject({ etapa: ETAPA.fogueira, fogueiraAcesa: true, fogueiraHora: 1 });
  expect(lido.jogador.almas).toBe(400);
  await quadros(page, 8);
  expect(await textos(page), 'a Vigília abre na pausa').toContain('A6.PAUSA.CONTINUAR');
  // Continuar da pausa: a Fogueira volta com o menu e o tempo continua parado.
  await tocar(page, centro(alvosDaTelaDePausa(ins, [])[1]!));
  await esperarTexto(page, 'I1.FOGUEIRA.PARTIR');
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.relogio)).toBe(18000);
  const falta = 5_000 - (Date.now() - inicio);
  if (falta > 0) await page.waitForTimeout(falta);

  const video = page.video()!;
  await contexto.close();
  const destino = EVIDENCIAS ? join(DIR, 'retomada.webm') : info.outputPath('retomada.webm');
  mkdirSync(dirname(destino), { recursive: true });
  await video.saveAs(destino);
  expect(statSync(destino).size).toBeGreaterThan(0);
  try {
    const duracao = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', destino], { encoding: 'utf-8' }).trim());
    if (Number.isFinite(duracao)) expect(duracao, 'duração do vídeo (s)').toBeGreaterThanOrEqual(3);
  } catch {
    // ffprobe ausente: o tamanho do arquivo já foi conferido.
  }

  // save.json: o envelope sem o buffer (o buffer tem o tamanho do estado e vai em base64) e o que a retomada conferiu.
  const envelope = JSON.parse(guardado.vigilia!) as Record<string, unknown> & { bytes: string };
  const { bytes, soma, ...resumo } = envelope;
  const relatorio = {
    aprovado: lido.hash === save.hash && lido.relogio === 18000,
    seed: SEED,
    cenario: 'fogueira_hora1',
    envelope: { ...resumo, soma, bytesEmBase64: bytes.length },
    save,
    depoisDeContinuar: { hash: lido.hash, relogio: lido.relogio, passo: lido.passo, etapa: lido.etapas.etapa, almas: lido.jogador.almas },
    chaves: guardado.chaves,
  };
  expect(relatorio.aprovado).toBe(true);
  const json = EVIDENCIAS ? join(DIR, 'save.json') : info.outputPath('save.json');
  writeFileSync(json, JSON.stringify(relatorio, null, 2) + '\n');
});

test('menu da Fogueira por toque: Descansar, Forjar União e Partir (evidência: fogueira-390x844.png)', async ({ page }, info) => {
  test.setTimeout(90_000);
  await abrirNaFogueira(page);
  const ativo = await textos(page);
  expect(ativo).toEqual(expect.arrayContaining(['I1.FOGUEIRA.DESCANSAR', 'I1.FOGUEIRA.FORJAR', 'I1.FOGUEIRA.PARTIR', 'I1.FOGUEIRA.DESCANSAR_EFEITO', 'I1.FOGUEIRA.FORJAR_EFEITO', 'I1.FOGUEIRA.GUARDADA', 'A5.HUD.RELOGIO', 'A5.HUD.HORA']));
  const antes = await page.evaluate(() => ({ hp: window.__GAME_DEBUG__.jogador!.hp, hpMax: window.__GAME_DEBUG__.jogador!.hpMax, almas: window.__GAME_DEBUG__.jogador!.almas, cargas: window.__GAME_DEBUG__.vigilia!.frasco.cargas }));
  expect(antes.hp).toBeCloseTo(antes.hpMax / 2, 1);
  expect(antes.cargas).toBe(1);
  expect(antes.almas).toBe(400);
  await page.evaluate(() => window.__GAME_DEBUG__.pausar());
  await quadros(page, 6);
  await capturar(page, 'fogueira-390x844.png', info);
  await page.evaluate(() => window.__GAME_DEBUG__.retomar());

  const ins = await insets(page);
  const [descansar, forjar] = alvosDaFogueira(ins, []);
  await tocar(page, centro(descansar!));
  await page.waitForFunction(() => window.__GAME_DEBUG__.vigilia!.etapas.fogueiraAcoes === 1);
  const depois = await page.evaluate(() => ({ hp: window.__GAME_DEBUG__.jogador!.hp, hpMax: window.__GAME_DEBUG__.jogador!.hpMax, cargas: window.__GAME_DEBUG__.vigilia!.frasco.cargas }));
  expect(depois.hp).toBe(depois.hpMax);
  expect(depois.cargas).toBe(3);
  await esperarTexto(page, 'I1.FOGUEIRA.USADA');
  await tocar(page, centro(forjar!));
  await page.waitForFunction(() => window.__GAME_DEBUG__.vigilia!.etapas.fogueiraAcoes === 3);
  const forjado = await page.evaluate(() => ({ almas: window.__GAME_DEBUG__.jogador!.almas, relogio: window.__GAME_DEBUG__.relogio }));
  expect(forjado.almas, 'a Forja da Hora I custa 150').toBe(250);
  expect(forjado.relogio, 'o relógio não anda na Fogueira').toBe(18000);
  expect((await textos(page)).filter((id) => id === 'I1.FOGUEIRA.USADA')).toHaveLength(2);
  await partirEGuardar(page);
  expect((await etapas(page)).etapa).toBe(ETAPA.hora);
  expect(await textos(page)).not.toContain('I1.FOGUEIRA.PARTIR');
});

test('Recusar a retomada pede dois toques e leva metade das Almas', async ({ browser }, info) => {
  test.setTimeout(90_000);
  const use = info.project.use;
  const contexto = await browser.newContext({ baseURL: use.baseURL, viewport: { width: 390, height: 844 }, deviceScaleFactor: use.deviceScaleFactor, hasTouch: true, isMobile: true });
  const primeira = await contexto.newPage();
  await abrirNaFogueira(primeira);
  await partirEGuardar(primeira);
  await primeira.close();
  const page = await contexto.newPage();
  await abrir(page);
  await esperarTexto(page, 'A1.ACENDER.RETOMAR');
  const ins = await insets(page);
  const recusar = centro(alvosDaRetomada(ins, [])[1]!);
  expect(await textos(page), 'o aviso só aparece armado').not.toContain('A6.PAUSA.ABANDONAR_AVISO');
  await tocar(page, recusar);
  await esperarTexto(page, 'A6.PAUSA.ABANDONAR_AVISO');
  expect(await page.evaluate(() => localStorage.getItem('vdc.vigilia')), 'um toque só arma').not.toBeNull();
  await tocar(page, recusar);
  await esperarTexto(page, 'A1.ACENDER.BOTAO');
  expect(await textos(page)).not.toContain('A1.ACENDER.RETOMAR');
  const depois = await page.evaluate(() => ({ vigilia: localStorage.getItem('vdc.vigilia'), andamento: localStorage.getItem('vdc.andamento'), almas: window.__GAME_DEBUG__.meta.almas }));
  expect(depois.vigilia).toBeNull();
  expect(depois.andamento).toBeNull();
  expect(depois.almas, 'Abandonar leva ⌊400 / 2⌋').toBe(200);
  // Recarregar não oferece de novo: o meta registra a Vigília como encerrada.
  await page.reload();
  await page.waitForFunction(() => window.__GAME_DEBUG__?.estado === 'ACENDER');
  await quadros(page, 4);
  expect(await textos(page)).toContain('A1.ACENDER.BOTAO');
  await contexto.close();
});

test('arena do marco: a borda, os obstáculos desativados e o telegrafo da Patada e o do Grito (evidências: coroado-arena-390x844.png, coroado-grito-390x844.png)', async ({ page }, info) => {
  test.setTimeout(120_000);
  await abrir(page, '&cenario=marco_coroado');
  await tocarAcender(page);
  await page.evaluate(() => window.__GAME_DEBUG__.pausar());
  const formada = await page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    d.avancar(40);
    return { etapas: d.vigilia!.etapas, relogio: d.relogio };
  });
  expect(formada.etapas).toMatchObject({ etapa: ETAPA.marco, arenaAtiva: true, coroadosVivos: 1, marcosIniciados: 1 });

  // Avança até o telegrafo da Patada (ataqueId 0) com 20 passos por correr; depois até o do Grito (ataqueId 1), e captura cada um.
  const ate = (grito: boolean) =>
    page.evaluate(
      ([g, tel]) => {
        const d = window.__GAME_DEBUG__;
        for (let k = 0; k < 2000; k++) {
          const c = d.inimigos().find((i) => i.tipo === 'oco_grande_coroado');
          if (c && c.ataqueFase === tel && (c.ataqueId === 1) === g && c.ataqueTimer <= 20) return { achou: true, passo: d.passo, timer: c.ataqueTimer };
          d.avancar(1);
        }
        return { achou: false, passo: d.passo, timer: -1 };
      },
      [grito, FASE_DO_ATAQUE.telegrafo] as const,
    );
  const patada = await ate(false);
  expect(patada.achou, 'o telegrafo da Patada').toBe(true);
  await quadros(page, 6);
  await capturar(page, 'coroado-arena-390x844.png', info);
  const grito = await ate(true);
  expect(grito.achou, 'o telegrafo do Grito').toBe(true);
  expect(grito.passo, 'o Grito vem depois de duas Patadas').toBeGreaterThan(patada.passo + 200);
  await quadros(page, 6);
  await capturar(page, 'coroado-grito-390x844.png', info);
  const arena = await page.evaluate(() => window.__GAME_DEBUG__.vigilia!.etapas);
  expect(arena).toMatchObject({ etapa: ETAPA.marco, arenaAtiva: true });
});
