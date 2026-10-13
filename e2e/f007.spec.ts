// F-007 na Playwright (projeto taps-game; design/decisoes-F-007.md §12): F-007.4 (morrer de propósito e ver o
// Resultado), o Frasco por toque real e o "segurar" que o cancela (FR6), a mancha na Vigília seguinte (MC9, MC12), a
// pausa com as estatísticas e o Abandonar (PE3 a PE5) e o HUD com HP 71 e as Almas (HB2, AM5). Com VDC_EVIDENCIAS=1
// grava em production/evidencias/F-007/. Os testes esperam pelo `estado` do debug, nunca por um tempo fixo (AG8).
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alvoDaPausa, alvoDoFrasco, alvosDaTelaDePausa, alvosDoResultado, type Alvo } from '../src/entrada/alvos';
import { EVIDENCIAS, RAIZ, SEM_HORDA, abrir, paraPagina, proximoFrame, textoDe, tocarAcender } from './apoio';

const DIR = join(RAIZ, 'production', 'evidencias', 'F-007');
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
const estado = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.estado);
const esperarEstado = (page: Page, alvo: string, ms = 30_000) =>
  page.waitForFunction((a) => window.__GAME_DEBUG__.estado === a, alvo, { timeout: ms, polling: 'raf' });

/** Guarda em window.__vistos todos os estados que passam (a fase APAGANDO dura 1 s reais). */
async function registrarEstados(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __vistos: string[]; __textos: Set<string> };
    w.__vistos = [];
    w.__textos = new Set();
    const volta = () => {
      const d = window.__GAME_DEBUG__;
      if (w.__vistos[w.__vistos.length - 1] !== d.estado) w.__vistos.push(d.estado);
      for (const id of d.textoAtivo) w.__textos.add(`${d.estado}|${id}`);
      requestAnimationFrame(volta);
    };
    volta();
  });
}

test('F-007.4: morrer de propósito, APAGANDO e FIM(apagar) no passo 30, Resultado sem Reviver (evidência: resultado.png)', async ({ page }, info) => {
  test.setTimeout(90_000);
  await abrir(page, '&inicio=19:00&almas=1000');
  expect(await page.evaluate(() => localStorage.length), 'localStorage limpo no início').toBe(0);
  await registrarEstados(page);
  await tocarAcender(page);
  await esperarEstado(page, 'FIM(apagar)');
  const lido = await page.evaluate(() => {
    const w = window as unknown as { __vistos: string[]; __textos: string[] | Set<string> };
    const d = window.__GAME_DEBUG__;
    return { vistos: w.__vistos, textos: [...(w.__textos as Set<string>)], tela: d.tela, vigilia: d.vigilia!, ativo: d.textoAtivo, hp: d.jogador!.hp, meta: d.meta };
  });
  expect(lido.vistos.filter((e) => e !== 'ACENDER')).toEqual(['VIGILIA', 'APAGANDO', 'FIM(apagar)']);
  expect(lido.vigilia.apagandoPassos).toBe(30);
  expect(lido.hp).toBe(0);
  expect(lido.textos).toContain('APAGANDO|A4.APAGAR.01');
  expect(lido.tela).toBe('resultado');
  expect(lido.ativo).toContain('A4.APAGAR.01');
  for (const rotulo of ['TEMPO', 'NIVEL', 'MORTES', 'DANO', 'ALMAS']) expect(lido.ativo, rotulo).toContain(`A7.RESULTADO.${rotulo}`);
  expect(lido.ativo.some((id) => /REVIVER/i.test(id))).toBe(false);
  expect(lido.ativo, 'a linha da mancha (30% de 1.000)').toContain('A7.RESULTADO.MANCHA');
  expect(lido.ativo, 'as Almas do HUD saem do Resultado').not.toContain('A5.HUD.ALMAS');
  // O único A2.TUTORIAL no Resultado do 1º Apagar é o balão das Cinzas da F-010 (A2.TUTORIAL.05); nenhum prompt de tutorial sob o véu.
  expect(lido.ativo.filter((id) => id.startsWith('A2.TUTORIAL')), 'só o balão das Cinzas sob o véu').toEqual(['A2.TUTORIAL.05']);
  expect(textoDe('A4.APAGAR.01')).not.toBe('');
  expect(lido.meta.seq, 'o meta foi gravado uma vez no fim').toBeGreaterThan(0);
  await page.waitForTimeout(400);
  await capturar(page, 'resultado.png', info);
});

test('Frasco: o toque inicia a cura (40% do HP em 120 passos, 1 carga) e segurar o botão por 300 ms a cancela', async ({ page }, info) => {
  test.setTimeout(60_000);
  await abrir(page, SEM_HORDA);
  await tocarAcender(page);
  const ins = await insets(page);
  const botao = centro(alvoDoFrasco(ins, { id: '', x: 0, y: 0, largura: 0, altura: 0 }));
  const cargas0 = await page.evaluate(() => window.__GAME_DEBUG__.vigilia!.frasco.cargas);
  expect(cargas0).toBe(3);
  await page.evaluate(() => { window.__GAME_DEBUG__.definirHp(60); });
  await tocar(page, botao);
  await page.waitForFunction(() => window.__GAME_DEBUG__.vigilia!.frasco.passo > 0, null, { polling: 'raf' });
  // Congela no meio da cura (a captura leva quase 1 s reais): o trecho claro da barra é o que a cura ainda devolve.
  await page.evaluate(() => { window.__GAME_DEBUG__.pausar!(); window.__GAME_DEBUG__.avancar!(20); });
  await quadrosDeEspera(page, 6);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.vigilia!.frasco.restante)).toBeGreaterThan(0);
  await capturar(page, 'frasco-curando-390x844.png', info);
  await page.evaluate(() => { window.__GAME_DEBUG__.retomar!(); });
  // A cura corre 120 passos (2 s): o HP chega a 120 = 60 + 40% de 150, sem passar.
  await page.waitForFunction(() => window.__GAME_DEBUG__.vigilia!.frasco.passo === 0 && window.__GAME_DEBUG__.vigilia!.frasco.cargas === 2, null, { polling: 'raf', timeout: 10_000 });
  expect(await page.evaluate(() => window.__GAME_DEBUG__.jogador!.hp)).toBeCloseTo(120, 1);

  // Segurar: uma cura nova, e um 2º dedo no botão por ≥ 300 ms (relógio do TouchEvent) a cancela; a carga não volta.
  await page.evaluate(() => { window.__GAME_DEBUG__.definirHp(60); });
  await tocar(page, botao);
  await page.waitForFunction(() => window.__GAME_DEBUG__.vigilia!.frasco.passo > 0, null, { polling: 'raf' });
  const cdp: CDPSession = await page.context().newCDPSession(page);
  const p = await paraPagina(page, botao.x, botao.y);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
  await page.waitForTimeout(420);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await proximoFrame(page);
  const depois = await page.evaluate(() => ({ f: window.__GAME_DEBUG__.vigilia!.frasco, hp: window.__GAME_DEBUG__.jogador!.hp, ev: window.__GAME_DEBUG__.ultimosEventos.some((e) => e.tipo === 'frascoCancelado') }));
  expect(depois.ev, 'evento frascoCancelado').toBe(true);
  expect(depois.f.passo).toBe(0);
  expect(depois.f.cargas, 'a carga gasta não volta').toBe(1);
  expect(depois.hp, 'a cura já feita fica').toBeLessThan(120);
});

const quadrosDeEspera = async (page: Page, n: number): Promise<void> => {
  for (let k = 0; k < n; k++) await proximoFrame(page);
};

test('HUD com HP 71 e 1.240 Almas (evidência: hud-hp71-390x844.png)', async ({ page }, info) => {
  await abrir(page, `${SEM_HORDA}&almas=1240`);
  await tocarAcender(page);
  await page.evaluate(() => { window.__GAME_DEBUG__.definirHp(71); });
  await quadrosDeEspera(page, 6);
  const ativo = await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo);
  expect(ativo).toEqual(expect.arrayContaining(['A5.HUD.HP', 'A5.HUD.ALMAS']));
  expect(await page.evaluate(() => window.__GAME_DEBUG__.jogador!.almas)).toBe(1240);
  await capturar(page, 'hud-hp71-390x844.png', info);
});

test('pausa: estatísticas e Abandonar em duas etapas (evidência: pausa-390x844.png); Almas ×0,5 sem mancha', async ({ page }, info) => {
  test.setTimeout(60_000);
  await abrir(page, '&cenario=tres_armas&almas=281');
  await tocarAcender(page);
  const ins = await insets(page);
  await tocar(page, centro(alvoDaPausa(ins, { id: '', x: 0, y: 0, largura: 0, altura: 0 })));
  await page.waitForFunction(() => window.__GAME_DEBUG__.pausa.ativa);
  await quadrosDeEspera(page, 8);
  const alvos = alvosDaTelaDePausa(ins, []);
  const abandonar = centro(alvos.find((a) => a.id === 'abandonar')!);
  const ativo = await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo);
  expect(ativo).toEqual(expect.arrayContaining(['A6.PAUSA.ABANDONAR', 'A6.PAUSA.MORTES', 'A6.PAUSA.DANO', 'A6.PAUSA.APAROS']));
  expect(ativo, 'as Almas não aparecem na pausa (AM5)').not.toContain('A5.HUD.ALMAS');
  expect(ativo.filter((id) => id.startsWith('A5.HUD.')), 'a Hud some na pausa: a build não cai sobre o HP e os slots').toEqual([]);
  expect(ativo, 'o aviso só aparece armado').not.toContain('A6.PAUSA.ABANDONAR_AVISO');
  await tocar(page, abandonar);
  await quadrosDeEspera(page, 8);
  expect(await page.evaluate(() => window.__GAME_DEBUG__.textoAtivo)).toContain('A6.PAUSA.ABANDONAR_AVISO');
  expect(await estado(page), 'um toque só arma').toBe('VIGILIA');
  await capturar(page, 'pausa-390x844.png', info);
  await tocar(page, abandonar);
  await esperarEstado(page, 'FIM(abandonar)');
  const r = await page.evaluate(() => window.__GAME_DEBUG__.vigilia!.resultado!);
  expect(r.almasAoSantuario).toBe(140);
  expect(r.mancha, 'Abandonar não cria mancha').toBeNull();
});

test('mancha: 1.000 Almas, morrer, Repetir com seed nova e ver a seta e depois o anel da mancha (evidências: mancha.png e mancha-anel-390x844.png)', async ({ page }, info) => {
  test.setTimeout(120_000);
  await abrir(page, '&inicio=19:00&almas=1000');
  // Roteiro: o jogador corre para a direita pelo corredor até morrer (o passo 0 em diante), então a mancha fica longe do início.
  await page.evaluate(() => window.__GAME_DEBUG__.entrada.roteiro([{ passo: 0, mx: 1, my: 0 }]));
  await tocarAcender(page);
  await esperarEstado(page, 'FIM(apagar)');
  await page.evaluate(() => window.__GAME_DEBUG__.entrada.roteiro(null));
  const fim = await page.evaluate(() => ({ r: window.__GAME_DEBUG__.vigilia!.resultado!, seed: window.__GAME_DEBUG__.seed, x: window.__GAME_DEBUG__.jogador!.x }));
  expect(fim.r.mancha!.almas).toBe(300);
  expect(fim.r.almasAoSantuario).toBe(700);
  expect(Math.abs(fim.r.mancha!.x - 585), 'a mancha ficou longe do início').toBeGreaterThan(200);
  await page.waitForTimeout(400);
  const ins = await insets(page);
  const repetir = alvosDoResultado(ins, []).find((a) => a.id === 'repetir')!;
  await tocar(page, centro(repetir));
  await page.waitForFunction(() => window.__GAME_DEBUG__.tela === 'vigilia' && window.__GAME_DEBUG__.estado === 'VIGILIA');
  // Pausa logo, para a horda não matar de novo antes do screenshot (o estado é determinístico; a pausa só congela a tela).
  const nova = await page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    d.pausar!();
    return { seed: d.seed, mancha: d.vigilia!.mancha, passo: d.passo, x: d.jogador!.x, y: d.jogador!.y };
  });
  expect(nova.seed, 'seed nova').not.toBe(fim.seed);
  expect(nova.mancha.ativa).toBe(true);
  expect(nova.mancha.almas).toBe(300);
  expect(nova.mancha.x).toBeCloseTo(fim.r.mancha!.x, 3);
  await quadrosDeEspera(page, 12);
  await capturar(page, 'mancha.png', info);

  // Corre de novo, em passos exatos, até a mancha entrar na vista (a seta some e o anel aparece), antes de recolher.
  const perto = await page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    d.entrada.roteiro([{ passo: 0, mx: 1, my: 0 }]);
    const m = d.vigilia!.mancha;
    for (let k = 0; k < 400; k++) {
      const j = d.jogador!;
      if (Math.hypot(j.x - m.x, j.y - m.y) < 110) break;
      d.avancar!(1);
    }
    const j = d.jogador!;
    return { dist: Math.hypot(j.x - m.x, j.y - m.y), ativa: d.vigilia!.mancha.ativa, hp: j.hp, estado: d.estado };
  });
  expect(perto.estado).toBe('VIGILIA');
  expect(perto.ativa, 'ainda não recolhida').toBe(true);
  expect(perto.dist).toBeLessThan(110);
  await quadrosDeEspera(page, 12);
  await capturar(page, 'mancha-anel-390x844.png', info);
});
