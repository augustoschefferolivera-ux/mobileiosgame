// Oferta do level up (design/decisoes-F-005.md §3, L1 a L8): 3 cartas no
// subfluxo `levelup` do nível ofertado (ADR-0002 §5), sempre 7 u32 por oferta
// (1 da ajuda dos 35% e 2 por carta, mesmo quando não usados). Cada carta é
// melhoria de item possuído com 60% ou item novo com 40%, sem repetir item;
// categoria vazia troca para a outra; as duas vazias dão a Bolsa de Almas.
// Depois das 12:00, com a arma de uma União no nível dela, sem a passiva e sem
// a União, e com vaga de passiva, a 1ª carta é a passiva com 35% (piso, L3).
// Item novo só com vaga do seu tipo na build. Os candidatos ficam em rascunhos
// Int32Array, em ordem fixa (armas por código, depois passivas por código).
import { CODIGOS_DE_ARMA } from '../armas/tabela';
import type { DadosDaVigilia } from '../mundo/dados';
import { EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import { CAB, CARTAS, PROGRESSAO, TIPO_DE_CARTA, VAGAS_DE_ARMA, VAGAS_DE_PASSIVA, baseDoFluxo, type Estado } from '../nucleo/estado';
import { SORTEADO, semear, sortear } from '../nucleo/rng';
import { recalcularDano, vagaDaArma, vagaDaPassiva } from './atributos';
import { CODIGOS_DE_PASSIVA, DOIS_A_32 } from './tabela';

/** Categoria sorteada da carta: u abaixo do limiar = melhoria (L2). */
export function categoriaDaCarta(u: number, limiar: number): boolean {
  return u < limiar;
}

/** A ajuda dos 35% força a passiva da União? (u abaixo do limiar; L3). */
export function passivaForcada(u: number, limiar: number): boolean {
  return u < limiar;
}

/** Índice uniforme em [0, k) a partir de um u32: ⌊u × k / 2³²⌋ (exato em double para k ≤ 2²¹). */
export function indiceUniforme(u: number, k: number): number {
  return Math.floor((u * k) / DOIS_A_32);
}

/** Candidatos: (tipo de carta << 8) | código. */
const MELHORIAS = new Int32Array(CODIGOS_DE_ARMA + CODIGOS_DE_PASSIVA);
const NOVOS = new Int32Array(CODIGOS_DE_ARMA + CODIGOS_DE_PASSIVA);
/** Cartas já escolhidas na oferta, no mesmo formato. */
const ESCOLHIDAS = new Int32Array(CARTAS);
const CONTAGEM = new Int32Array(2);

function escolhida(chave: number, n: number): boolean {
  for (let k = 0; k < n; k++) if (ESCOLHIDAS[k] === chave) return true;
  return false;
}

/** A arma é a origem de uma União já formada? (L1: a Espada some do sorteio depois da Lâmina.) */
function origemDeUniaoFormada(e: Estado, dados: DadosDaVigilia, codigo: number): boolean {
  const t = dados.progressao;
  for (let u = 0; u < t.uniaoArma.length; u++) if (t.uniaoArma[u] === codigo && vagaDaArma(e, t.uniaoResultado[u]!) >= 0) return true;
  return false;
}

function vagasLivresDeArma(e: Estado): number {
  let n = 0;
  for (let v = 0; v < VAGAS_DE_ARMA; v++) if (e.build.codigo[v] === 0) n++;
  return n;
}

function vagasLivresDePassiva(e: Estado): number {
  let n = 0;
  for (let v = 0; v < VAGAS_DE_PASSIVA; v++) if (e.passivas.codigo[v] === 0) n++;
  return n;
}

/** Monta MELHORIAS e NOVOS sem os já escolhidos; CONTAGEM = [melhorias, novos]. */
function montarCandidatos(e: Estado, dados: DadosDaVigilia, escolhidas: number): void {
  const a = dados.armas;
  const p = dados.progressao;
  let nm = 0;
  let nn = 0;
  const armaLivre = vagasLivresDeArma(e) > 0;
  const passivaLivre = vagasLivresDePassiva(e) > 0;
  for (let c = 1; c < CODIGOS_DE_ARMA; c++) {
    if (a.nivelMax[c] === 0 || a.uniao[c] === 1) continue;
    const v = vagaDaArma(e, c);
    if (v >= 0) {
      const chave = (TIPO_DE_CARTA.melhoriaDeArma << 8) | c;
      if (e.build.nivel[v]! < a.nivelMax[c]! && !escolhida(chave, escolhidas)) MELHORIAS[nm++] = chave;
    } else if (armaLivre && !origemDeUniaoFormada(e, dados, c)) {
      const chave = (TIPO_DE_CARTA.armaNova << 8) | c;
      if (!escolhida(chave, escolhidas)) NOVOS[nn++] = chave;
    }
  }
  for (let c = 1; c < CODIGOS_DE_PASSIVA; c++) {
    if (p.passivaNivelMax[c] === 0) continue;
    const v = vagaDaPassiva(e, c);
    if (v >= 0) {
      const chave = (TIPO_DE_CARTA.melhoriaDePassiva << 8) | c;
      if (e.passivas.nivel[v]! < p.passivaNivelMax[c]! && !escolhida(chave, escolhidas)) MELHORIAS[nm++] = chave;
    } else if (passivaLivre) {
      const chave = (TIPO_DE_CARTA.passivaNova << 8) | c;
      if (!escolhida(chave, escolhidas)) NOVOS[nn++] = chave;
    }
  }
  CONTAGEM[0] = nm;
  CONTAGEM[1] = nn;
}

/**
 * Passiva que a ajuda dos 35% força, ou 0 (L3): relógio ≥ 12:00, a arma de uma
 * União no nível dela, sem a passiva e sem o resultado, e vaga de passiva livre.
 */
export function passivaDaAjuda(e: Estado, dados: DadosDaVigilia): number {
  const t = dados.progressao;
  if (e.cab[CAB.relogio]! < t.relogioDaAjuda || vagasLivresDePassiva(e) === 0) return 0;
  for (let u = 0; u < t.uniaoArma.length; u++) {
    const v = vagaDaArma(e, t.uniaoArma[u]!);
    if (v < 0 || e.build.nivel[v]! < t.uniaoArmaNivel[u]!) continue;
    if (vagaDaPassiva(e, t.uniaoPassiva[u]!) >= 0 || vagaDaArma(e, t.uniaoResultado[u]!) >= 0) continue;
    return t.uniaoPassiva[u]!;
  }
  return 0;
}

/** Nível ofertado: o do pendente mais antigo (nível − pendentes + 1). */
export function nivelOfertado(e: Estado): number {
  return e.progresso[PROGRESSAO.nivel]! - e.progresso[PROGRESSAO.niveisPendentes]! + 1;
}

/** Há oferta aberta? */
export function ofertaAberta(e: Estado): boolean {
  return e.oferta.tipo[0] !== TIPO_DE_CARTA.nenhuma;
}

/** Sorteia a oferta do nível ofertado no subfluxo `levelup` (L2 a L5). */
export function gerarOferta(e: Estado, dados: DadosDaVigilia): void {
  const t = dados.progressao;
  const base = baseDoFluxo('levelup');
  semear(e.rng, base, e.cab[CAB.seed]!, 'levelup', nivelOfertado(e));
  sortear(e.rng, base);
  const ajuda = passivaDaAjuda(e, dados);
  const forcada = ajuda !== 0 && passivaForcada(SORTEADO[0]!, t.limiarUniao) ? ajuda : 0;
  let n = 0;
  for (let k = 0; k < CARTAS; k++) {
    sortear(e.rng, base);
    const melhoria = categoriaDaCarta(SORTEADO[0]!, t.limiarMelhoria);
    sortear(e.rng, base);
    const u = SORTEADO[0]!;
    let chave: number;
    if (k === 0 && forcada !== 0) {
      chave = (TIPO_DE_CARTA.passivaNova << 8) | forcada;
    } else {
      montarCandidatos(e, dados, n);
      const nm = CONTAGEM[0]!;
      const nn = CONTAGEM[1]!;
      if (nm === 0 && nn === 0) chave = TIPO_DE_CARTA.bolsa << 8;
      else if ((melhoria && nm > 0) || nn === 0) chave = MELHORIAS[indiceUniforme(u, nm)]!;
      else chave = NOVOS[indiceUniforme(u, nn)]!;
    }
    if (chave >> 8 !== TIPO_DE_CARTA.bolsa) ESCOLHIDAS[n++] = chave;
    e.oferta.tipo[k] = chave >> 8;
    e.oferta.item[k] = chave & 0xff;
  }
}

/** Gera a oferta se há nível pendente, nenhum baú na frente da fila e nenhuma oferta aberta (L5). */
export function gerarOfertaSeFor(e: Estado, dados: DadosDaVigilia): void {
  const pr = e.progresso;
  if (pr[PROGRESSAO.niveisPendentes]! > 0 && pr[PROGRESSAO.bausPorFechar] === 0 && !ofertaAberta(e)) gerarOferta(e, dados);
}

/**
 * Aplica a carta k da oferta aberta (L6) e grava o evento `carta`: melhoria
 * (+1 nível, timers mantidos), arma nova (1ª vaga livre, nv1, timers em 0),
 * passiva nova (1ª vaga livre, nv1) ou Bolsa (+50 Almas). A oferta já garante
 * a validade. Depois, o dano vivo é refeito.
 */
export function aplicarCarta(e: Estado, dados: DadosDaVigilia, k: number): void {
  const tipo = e.oferta.tipo[k]!;
  const item = e.oferta.item[k]!;
  const b = e.build;
  if (tipo === TIPO_DE_CARTA.melhoriaDeArma) {
    const v = vagaDaArma(e, item);
    b.nivel[v] = b.nivel[v]! + 1;
  } else if (tipo === TIPO_DE_CARTA.armaNova) {
    const v = vagaDaArma(e, 0);
    b.codigo[v] = item;
    b.nivel[v] = 1;
    b.recarga[v] = b.esperaPulso[v] = b.golpe[v] = b.esperaGolpe[v] = 0;
  } else if (tipo === TIPO_DE_CARTA.melhoriaDePassiva) {
    const v = vagaDaPassiva(e, item);
    e.passivas.nivel[v] = e.passivas.nivel[v]! + 1;
  } else if (tipo === TIPO_DE_CARTA.passivaNova) {
    const v = vagaDaPassiva(e, 0);
    e.passivas.codigo[v] = item;
    e.passivas.nivel[v] = 1;
  } else if (tipo === TIPO_DE_CARTA.bolsa) {
    e.progresso[PROGRESSAO.almas] = e.progresso[PROGRESSAO.almas]! + dados.progressao.bolsaAlmas;
  } else {
    throw new Error(`carta ${k} sem tipo`);
  }
  FLOATS_DO_EVENTO[0] = nivelOfertado(e);
  FLOATS_DO_EVENTO[1] = k;
  FLOATS_DO_EVENTO[2] = 0;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.carta, item, tipo, -1, 0, 0, 0, 0);
  recalcularDano(e, dados);
}

/**
 * A carta completa uma União? (L8): o Elmo novo com a arma da União no nível
 * dela na build, ou a arma da União para o nível dela com a passiva na build;
 * sem a União formada. Função pura, fora do estado.
 */
export function completaUniao(e: Estado, dados: DadosDaVigilia, tipo: number, item: number): number {
  const t = dados.progressao;
  for (let u = 0; u < t.uniaoArma.length; u++) {
    if (vagaDaArma(e, t.uniaoResultado[u]!) >= 0) continue;
    const va = vagaDaArma(e, t.uniaoArma[u]!);
    const temPassiva = vagaDaPassiva(e, t.uniaoPassiva[u]!) >= 0;
    if (tipo === TIPO_DE_CARTA.passivaNova && item === t.uniaoPassiva[u] && va >= 0 && e.build.nivel[va]! >= t.uniaoArmaNivel[u]!) return t.uniaoResultado[u]!;
    if (tipo === TIPO_DE_CARTA.melhoriaDeArma && item === t.uniaoArma[u] && temPassiva && va >= 0 && e.build.nivel[va]! + 1 === t.uniaoArmaNivel[u]) return t.uniaoResultado[u]!;
  }
  return 0;
}

/** Fecha a oferta (os 3 tipos em 0). */
export function limparOferta(e: Estado): void {
  e.oferta.tipo.fill(0);
  e.oferta.item.fill(0);
}
