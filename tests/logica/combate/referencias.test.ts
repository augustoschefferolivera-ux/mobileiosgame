// Evidências e referência da F-006 (design/decisoes-F-006.md VT7, VT9). Com VDC_EVIDENCIAS=1 (scripts/verify.sh) grava:
//  - production/evidencias/F-006/janelas.log: 16 linhas de janela, cada uma com esperado, obtido e `iguais=`
//    (esquiva 3, aparo 3, regeneração 2, aparo falho 3, Contra-ataque 3, congelamento 2);
//  - .verify/referencia-f006.json: o roteiro do vídeo (`roteiroDoVideo`, esquiva e aparo em passos absolutos
//    achados aqui) na Vigília de produção a partir de 1:00, a seed fixa e os hashes de 5 marcas (esquiva, esquiva
//    perfeita, passo congelado, aparo e 1º passo vivo do Contra-ataque), que a Playwright confere no Chromium.
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARMA, indiceDoNivel } from '../../../src/logica/armas/tabela';
import { TIPO_DE_PROJETIL, CAB, CENARIO, JOGADOR, JOGADOR2, JOGADOR3, JOGADOR3_U8, TODOS_OS_TUTORIAIS, criarEstado, hashEstado, type Estado, type ParametrosDaVigilia } from '../../../src/logica/nucleo/estado';
import { fonteDoRoteiro, type AcaoDeRoteiro, type FonteDeComandos, type Roteiro } from '../../../src/logica/nucleo/comandos';
import { EVENTO, FLAG } from '../../../src/logica/nucleo/eventos';
import { hex8 } from '../../../src/logica/nucleo/hash';
import { avancar } from '../../../src/logica/nucleo/passo';
import { SEED_DA_F006 } from '../../../src/logica/nucleo/referencia';
import { modalAberto } from '../../../src/logica/progressao/modal';
import { FASE_DO_ATAQUE, TIPO as TIPOS } from '../../../src/logica/mundo/tipos';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { CAPACIDADE_DE_PROJETEIS } from '../../../src/logica/nucleo/estado';
import { DADOS_DA_CHARNECA } from '../apoio';
import { ACAO, D_LIVRE as D, LONGE, aparoEm, criar, esquivaEm, eventosDe, fonteDeAcoes, junto, laco, slotsVivos } from './apoio';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ATQ = CENARIO.diretorDesligado | CENARIO.ataques;
const SEM_DANO = ATQ | CENARIO.jogadorInvulneravel;
const GRANDE = [{ codigo: 2, dx: 0, dy: -70 }];
const passo = (e: Estado): number => e.cab[CAB.passo]!;
const hp = (e: Estado): number => e.jogador[JOGADOR.hp]!;
const stamina = (e: Estado): number => e.jogador3[JOGADOR3.stamina]!;
const um = (e: Estado, fonte: FonteDeComandos, n = 1): void => void avancar(e, D, fonte, n);

/** Uma linha de janela do janelas.log: `iguais=` sai da comparação de esperado e obtido. */
const linhas: string[] = [];
function janela(nome: string, esperado: string | number, obtido: string | number): void {
  linhas.push(`janela=${nome} esperado=${esperado} obtido=${obtido} iguais=${String(esperado) === String(obtido)}`);
}

/** Passo do golpe do Oco Grande a 70 px (T = 1, h = T + 36), lido do evento. */
function passoDoGolpe(): number {
  const e = criar({ cenario: SEM_DANO, inimigos: GRANDE });
  um(e, fonteDeAcoes([]), 60);
  return eventosDe(e, EVENTO.golpeInimigo)[0]!.passo;
}

function linhasDeEsquiva(): void {
  for (const K of [2, 13, 14]) {
    const e = criar({ inimigos: [LONGE] });
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
    const [s] = slotsVivos(e);
    if (K > 1) um(e, fonte, K - 1);
    junto(e, s!, 0, 20);
    const antes = hp(e);
    um(e, fonte);
    janela(`esquiva passo=${K}`, K === 14 ? 'dano' : 'sem_dano', hp(e) < antes ? 'dano' : 'sem_dano');
  }
}

function linhasDeAparo(): void {
  const h = passoDoGolpe();
  for (const d of [10, 11, 12]) {
    const e = criar({ cenario: ATQ, inimigos: GRANDE });
    const c = h - d;
    um(e, fonteDeAcoes([aparoEm(c - 1)]), h + 3);
    const aparou = eventosDe(e, EVENTO.aparo).length === 1 && hp(e) === e.jogador2[JOGADOR2.hpMax];
    janela(`aparo h-c=${d}`, d <= 11 ? 'aparado' : 'dano', aparou ? 'aparado' : 'dano');
  }
}

function linhasDeRegeneracao(): void {
  const e = criar();
  const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
  um(e, fonte); // passo G = 1: o gasto
  const g = passo(e);
  const gasta = stamina(e);
  const emG: Record<number, number> = {};
  for (let k = 1; k <= 31; k++) {
    um(e, fonte);
    emG[k] = stamina(e);
  }
  janela('regeneracao passo=G+30', 'sem_regeneracao', emG[30] === gasta ? 'sem_regeneracao' : 'com_regeneracao');
  janela('regeneracao passo=G+31', 'com_regeneracao', emG[31]! > gasta ? 'com_regeneracao' : 'sem_regeneracao');
  expect(g).toBe(1);
}

/** O passo da 1ª regeneração depois do gasto em G (a stamina sobe pela 1ª vez), até 80 passos. */
function primeiraRegeneracao(e: Estado, fonte: FonteDeComandos, depoisDe: number): number {
  let anterior = stamina(e);
  for (let k = 0; k < 80; k++) {
    um(e, fonte);
    if (passo(e) > depoisDe && stamina(e) > anterior) return passo(e);
    anterior = stamina(e);
  }
  return -1;
}

function linhasDeAparoFalho(): void {
  const G = 10;
  // Falho: o telegrafo do Oco Grande em curso e o golpe (h = 37) a mais de 11 passos do toque.
  const e = criar({ cenario: SEM_DANO, inimigos: GRANDE });
  const fonte = fonteDeAcoes([aparoEm(G - 1)]);
  um(e, fonte, G);
  expect(passo(e)).toBe(G);
  const P0 = G + 12;
  const st = new Map<number, number>();
  let primeira = -1;
  let anterior = stamina(e);
  for (let k = 0; k < 60; k++) {
    um(e, fonte);
    st.set(passo(e), stamina(e));
    if (primeira < 0 && stamina(e) > anterior) primeira = passo(e);
    anterior = stamina(e);
  }
  let constante = true;
  for (let p = P0; p <= P0 + 24; p++) if (st.get(p) !== st.get(P0)) constante = false;
  janela(`aparo_falho stamina P0=${P0} a P0+24`, 'constante', constante ? 'constante' : 'varia');
  janela('aparo_falho primeira_regeneracao=G+37', G + 37, primeira);
  // Controle: o mesmo toque sem nenhuma ameaça é o aparo vazio e volta a regenerar em G+31.
  const c = criar();
  const fc = fonteDeAcoes([aparoEm(G - 1)]);
  um(c, fc, G);
  janela('aparo_vazio controle primeira_regeneracao=G+31', G + 31, primeiraRegeneracao(c, fc, G));
  expect(eventosDe(c, EVENTO.aparoVazio)).toHaveLength(1);
}

const ESPADA = ARMA.espada_longa_do_juramento;

/** Um aparo bem-sucedido em h = 37 com uma arma no nível 8 e o Oco Grande com 9.999 de HP; devolve o estado logo antes do aparo. */
function comAparoEm(arma: number): { e: Estado; fonte: FonteDeComandos } {
  const e = criar({ cenario: SEM_DANO, armas: [{ codigo: arma, nivel: 8 }], inimigos: GRANDE });
  for (const s of slotsVivos(e)) e.inimigos.hp[s] = 9999;
  // Sem disparo natural: a vaga só age pelo Contra-ataque (recarga e pulso longe).
  e.build.recarga[0] = 1000;
  e.build.esperaPulso[0] = 1000;
  e.jogador[JOGADOR.dirX] = 1;
  e.jogador[JOGADOR.dirY] = 0;
  return { e, fonte: fonteDeAcoes([aparoEm(29)]) };
}

function linhasDeContraAtaque(): void {
  const t = D.armas;
  // Espada: 4 golpes com a flag contra.
  {
    const { e, fonte } = comAparoEm(ESPADA);
    um(e, fonte, 140);
    const golpes = eventosDe(e, EVENTO.golpe).filter((x) => x.flags & FLAG.contra).length;
    janela('contra_ataque arma=espada_longa salva', '4_golpes', `${golpes}_golpes`);
  }
  // Facas: as nf facas no mesmo passo (o 1º passo vivo), todas de uma vez.
  {
    const { e, fonte } = comAparoEm(ARMA.facas_de_sal);
    const g = laco('referencias: aparo das facas');
    while (eventosDe(e, EVENTO.aparo).length === 0) {
      g();
      um(e, fonte);
    }
    let facas = 0;
    for (let k = 0; k < 8 && facas === 0; k++) {
      um(e, fonte);
      for (let p = 0; p < e.projeteis.x.length; p++) if (e.poolDeProjeteis.posicao[p]! >= 0 && e.projeteis.tipo[p] === TIPO_DE_PROJETIL.faca) facas++;
    }
    janela('contra_ataque arma=facas_de_sal salva', `${t.projeteis[indiceDoNivel(ARMA.facas_de_sal, 8)]}_facas`, `${facas}_facas`);
  }
  // Círculo: 1 tick extra com a flag contra, sem pulso.
  {
    const { e, fonte } = comAparoEm(ARMA.circulo_de_sal);
    um(e, fonte, 140);
    const ticks = eventosDe(e, EVENTO.acerto).filter((x) => x.flags & FLAG.contra).length;
    const pulsos = eventosDe(e, EVENTO.pulso).length;
    janela('contra_ataque arma=circulo_de_sal salva', '1_tick_0_pulsos', `${ticks}_tick_${pulsos}_pulsos`);
  }
}

function linhasDeCongelamento(): void {
  const { e, fonte } = comAparoEm(ESPADA);
  const g = laco('referencias: aparo da espada');
  while (eventosDe(e, EVENTO.aparo).length === 0) {
    g();
    um(e, fonte);
  }
  const [p0, r0] = [passo(e), e.cab[CAB.relogio]!];
  let parado = true;
  for (let k = 0; k < 5; k++) {
    um(e, fonte);
    if (passo(e) !== p0 || e.cab[CAB.relogio] !== r0) parado = false;
  }
  janela('congelamento passos=5 passo_e_relogio', 'parados', parado ? 'parados' : 'andam');
  um(e, fonte);
  janela('congelamento passo=6', 'anda', passo(e) === p0 + 1 && e.cab[CAB.relogio] === r0 + 1 ? 'anda' : 'parado');
}

describe('janelas.log: 16 linhas de janela, todas iguais=true (VT9)', () => {
  it('esquiva 3, aparo 3, regeneração 2, aparo falho 3, Contra-ataque 3 e congelamento 2', () => {
    linhas.length = 0;
    linhasDeEsquiva();
    linhasDeAparo();
    linhasDeRegeneracao();
    linhasDeAparoFalho();
    linhasDeContraAtaque();
    linhasDeCongelamento();
    expect(linhas).toHaveLength(16);
    for (const l of linhas) expect(l, l).toContain('iguais=true');
    expect(linhas.join('\n')).not.toContain('iguais=false');
  }, 30_000);
});

// ---------------------------------------------------------------------------------------------------------------
// Referência Node × Chromium e roteiro do vídeo (VT7, VT9)

/** A Vigília de produção a partir de 1:00 (`?tutorial=0&inicio=01:00&teto=300`), parada, com a esquiva e o aparo do roteiro. */
const PARAMS_DO_VIDEO: Partial<ParametrosDaVigilia> = { cenario: CENARIO.ataques, tutoriaisVistos: TODOS_OS_TUTORIAIS, relogioInicial: 3600, inicioLivre: true, teto: 300 };
const PARADO_NO_VIDEO: Roteiro = [{ passo: 0, mx: 0, my: 0 }];

const estadoDoVideo = (seed: number): Estado => criarEstado(seed, DADOS_DA_CHARNECA, PARAMS_DO_VIDEO);
const fonteDoVideo = (acoes: readonly AcaoDeRoteiro[]): FonteDeComandos => fonteDoRoteiro(PARADO_NO_VIDEO, undefined, acoes);

/** Roda `n` passos num rascunho copiado de `base` e devolve o rascunho. */
function rascunho(base: Estado, rasc: Estado, fonte: FonteDeComandos, n: number): Estado {
  rasc.bytes.set(base.bytes);
  avancar(rasc, DADOS_DA_CHARNECA, fonte, n);
  return rasc;
}

/** O 1º passo em que a ação dada produz o evento pedido (busca por cópia do estado, a cada passo da base). */
function acharAcao(seed: number, antes: readonly AcaoDeRoteiro[], de: number, ate: number, acao: number, evento: number, janela: number): number {
  const base = estadoDoVideo(seed);
  const rasc = estadoDoVideo(seed);
  const fonteBase = fonteDoVideo(antes);
  const g = laco('referencias: acharAcao');
  while (passo(base) < de) {
    g();
    avancar(base, DADOS_DA_CHARNECA, fonteBase, 1);
  }
  for (let t = de; t <= ate; t++) {
    const p0 = passo(base);
    const r = rascunho(base, rasc, fonteDoVideo([...antes, { passo: t, acoes: acao }]), janela);
    if (eventosDe(r, evento).some((x) => x.passo > p0)) return t;
    avancar(base, DADOS_DA_CHARNECA, fonteBase, 1);
    if (hp(base) <= 0 || modalAberto(base)) break;
  }
  return -1;
}

interface Marca {
  passo: number;
  congelamento: number;
  hash: string;
}

function referenciaDoVideo(seed: number) {
  const tE = acharAcao(seed, [], 5, 900, ACAO.esquiva, EVENTO.esquivaPerfeita, 24);
  expect(tE).toBeGreaterThan(0);
  const esquivaDeAcao: AcaoDeRoteiro = { passo: tE, acoes: ACAO.esquiva };
  const tA = acharAcao(seed, [esquivaDeAcao], tE + 30, tE + 900, ACAO.aparo, EVENTO.aparo, 20);
  expect(tA).toBeGreaterThan(0);
  const acoes: AcaoDeRoteiro[] = [esquivaDeAcao, { passo: tA, acoes: ACAO.aparo }];
  // As marcas, passo a passo pelo mesmo caminho do Chromium (`avancar(1)` com o roteiro).
  const e = estadoDoVideo(seed);
  const fonte = fonteDoVideo(acoes);
  const marca = (): Marca => ({ passo: passo(e), congelamento: e.jogador3U8[JOGADOR3_U8.congelamento]!, hash: hex8(hashEstado(e)) });
  const m: Partial<Record<'esquiva' | 'esquivaPerfeita' | 'congelado' | 'aparo' | 'contraAtaque', Marca>> = {};
  let fim = -1;
  for (let k = 0; k < 4000 && fim < 0; k++) {
    expect(avancar(e, DADOS_DA_CHARNECA, fonte, 1)).toBe(1);
    if (!m.esquiva && eventosDe(e, EVENTO.esquiva).some((x) => x.passo === passo(e))) m.esquiva = marca();
    if (!m.esquivaPerfeita && eventosDe(e, EVENTO.esquivaPerfeita).some((x) => x.passo === passo(e))) m.esquivaPerfeita = marca();
    if (m.esquivaPerfeita && !m.congelado && e.jogador3U8[JOGADOR3_U8.congelamento] === 2) m.congelado = marca();
    if (!m.aparo && eventosDe(e, EVENTO.aparo).some((x) => x.passo === passo(e))) m.aparo = marca();
    if (m.aparo && !m.contraAtaque && passo(e) === m.aparo.passo + 1) {
      m.contraAtaque = marca();
      fim = passo(e) + 60;
    }
  }
  // O vídeo termina 60 passos depois do Contra-ataque, sem modal aberto nem morte.
  const gf = laco('referencias: fim do vídeo');
  while (passo(e) < fim) {
    gf();
    expect(avancar(e, DADOS_DA_CHARNECA, fonte, 1)).toBe(1);
    expect(modalAberto(e)).toBe(false);
  }
  expect(hp(e)).toBeGreaterThan(0);
  return { seed, params: { cenario: 'producao', relogio_inicial_s: 60, teto: 300 }, roteiroDoVideo: { movimento: PARADO_NO_VIDEO, acoes, fim }, marcas: m };
}

/**
 * A captura `telegrafos-390x844.png` (VT9): na receita `telegrafos` (Oco Grande, duas Noviças, Facas nv1 e o
 * jogador parado e invulnerável), o 1º passo a partir de T+30 da cunha em que há, ao mesmo tempo, o Oco Grande
 * ainda em telegrafo (cunha quase sólida), uma Noviça em telegrafo (a faixa), um projétil de Sal e uma faca no ar.
 */
function capturaDosTelegrafos(seed: number): { passo: number; hash: string; passoDoGolpe: number } {
  const e = criarEstado(seed, DADOS_DA_CHARNECA, { ...parametrosDoCenario('telegrafos'), teto: 300 });
  let T = -1;
  for (let k = 0; k < 200; k++) {
    avancar(e, DADOS_DA_CHARNECA, fonteDoVideo([]), 1);
    const grandes = slotsVivos(e).filter((s) => e.inimigos.tipo[s] === TIPOS.oco_grande);
    if (T < 0 && grandes.some((s) => e.inimigos.ataqueFase[s] === FASE_DO_ATAQUE.telegrafo)) T = passo(e);
    if (T < 0 || passo(e) < T + 30) continue;
    const cunha = grandes.some((s) => e.inimigos.ataqueFase[s] === FASE_DO_ATAQUE.telegrafo && e.inimigos.ataqueTimer[s]! <= 6);
    const faixa = slotsVivos(e).some((s) => e.inimigos.tipo[s] === TIPOS.novica_de_sal && e.inimigos.ataqueFase[s] === FASE_DO_ATAQUE.telegrafo);
    let sal = false;
    let faca = false;
    for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) {
      if (e.poolDeProjeteis.posicao[p]! < 0) continue;
      if (e.projeteis.tipo[p] === TIPO_DE_PROJETIL.sal) sal = true;
      // A faca fora de baixo do triângulo do jogador (≥ 40 px), para aparecer na imagem.
      if (e.projeteis.tipo[p] === TIPO_DE_PROJETIL.faca && Math.hypot(e.projeteis.x[p]! - e.jogador[JOGADOR.x]!, e.projeteis.y[p]! - e.jogador[JOGADOR.y]!) >= 40) faca = true;
    }
    if (cunha && faixa && sal && faca) return { passo: passo(e), hash: hex8(hashEstado(e)), passoDoGolpe: T + 36 };
  }
  throw new Error('telegrafos: nenhum passo mostra cunha, faixa, projétil de Sal e faca juntos');
}

describe('referência da F-006 (Node × Chromium) e roteiro do vídeo', () => {
  it('a captura dos telegrafos: cunha no fim do telegrafo, faixa e projétil da Noviça e uma faca, juntos, até o golpe', () => {
    const c = capturaDosTelegrafos(SEED_DA_F006);
    expect(c.passo).toBeGreaterThanOrEqual(c.passoDoGolpe - 6);
    expect(c.passo).toBeLessThan(c.passoDoGolpe);
    expect(capturaDosTelegrafos(SEED_DA_F006)).toEqual(c);
  }, 30_000);

  it(`seed ${SEED_DA_F006}: acha uma esquiva perfeita e um aparo bem-sucedido na Vigília a partir de 1:00, em menos de 1.500 passos`, () => {
    const r = referenciaDoVideo(SEED_DA_F006);
    expect(r.roteiroDoVideo.acoes).toHaveLength(2);
    expect(r.roteiroDoVideo.fim).toBeLessThan(1500);
    expect(Object.keys(r.marcas).sort()).toEqual(['aparo', 'congelado', 'contraAtaque', 'esquiva', 'esquivaPerfeita']);
    expect(r.marcas.esquivaPerfeita!.congelamento).toBe(5);
    expect(r.marcas.congelado!.passo).toBe(r.marcas.esquivaPerfeita!.passo);
    expect(r.marcas.congelado!.hash).not.toBe(r.marcas.esquivaPerfeita!.hash);
    expect(r.marcas.contraAtaque!.passo).toBe(r.marcas.aparo!.passo + 1);
    // Determinístico: o mesmo caminho dá as mesmas marcas.
    expect(referenciaDoVideo(SEED_DA_F006)).toEqual(r);
  }, 60_000);
});

afterAll(() => {
  if (process.env['VDC_EVIDENCIAS'] !== '1') return;
  const dir = join(RAIZ, 'production', 'evidencias', 'F-006');
  mkdirSync(dir, { recursive: true });
  const cabecalho = [
    '# F-006 — janelas medidas pelo caminho real (Vitest, tests/logica/combate/referencias.test.ts)',
    `# Gerado em ${new Date().toISOString()} com Node ${process.version}; esperado vem da D6 (design/decisoes-F-006.md), obtido da simulação.`,
  ];
  if (linhas.length === 16) writeFileSync(join(dir, 'janelas.log'), [...cabecalho, ...linhas].join('\n') + '\n');
  mkdirSync(join(RAIZ, '.verify'), { recursive: true });
  writeFileSync(join(RAIZ, '.verify', 'referencia-f006.json'), JSON.stringify({ ...referenciaDoVideo(SEED_DA_F006), telegrafos: capturaDosTelegrafos(SEED_DA_F006) }, null, 2) + '\n');
});
