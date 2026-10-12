// Baú e União (design/decisoes-F-005.md §4, B1 a B5 e U2). A abertura é
// síncrona, no passo da coleta: primeiro a União (relógio ≥ 10:00, a arma de
// origem no nível dela, a passiva presente, o resultado fora da build; sem
// RNG); senão, a quantidade 1/3/5 no subfluxo `baus` pelo índice de queda, e
// os itens distintos por um embaralhamento parcial, cada um com +1 nível; o
// que falta vira Bolsa de Almas. O resultado vai para a fila de baús do
// estado, que o modal mostra. Rascunhos em módulo, nada alocado.
import type { DadosDaVigilia } from '../mundo/dados';
import { EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import {
  BAU,
  BYTES_POR_BAU,
  CAB,
  CATEGORIA_DE_ITEM,
  PROGRESSAO,
  VAGAS_DE_ARMA,
  VAGAS_DE_PASSIVA,
  baseDoFluxo,
  type Estado,
} from '../nucleo/estado';
import { SORTEADO, semear, sortear } from '../nucleo/rng';
import { recalcularDano, vagaDaArma, vagaDaPassiva } from './atributos';
import { indiceUniforme } from './oferta';
import { liberarPickup } from './pickups';
import { DOIS_A_32 } from './tabela';

/** Itens elegíveis do baú: (categoria << 8) | vaga, em ordem fixa (armas pela vaga, depois passivas). */
const ELEGIVEIS = new Int32Array(VAGAS_DE_ARMA + VAGAS_DE_PASSIVA);

/** Índice da União que o baú daria agora, ou −1 (B2). */
export function uniaoDisponivel(e: Estado, dados: DadosDaVigilia): number {
  if (e.cab[CAB.relogio]! < dados.progressao.relogioDaUniaoNoBau) return -1;
  return uniaoForjavel(e, dados);
}

/** Índice da União que a Forja da Fogueira daria agora, ou −1: as mesmas condições do baú, sem o gate de relógio (FG5). */
export function uniaoForjavel(e: Estado, dados: DadosDaVigilia): number {
  const t = dados.progressao;
  for (let u = 0; u < t.uniaoArma.length; u++) {
    const v = vagaDaArma(e, t.uniaoArma[u]!);
    if (v < 0 || e.build.nivel[v]! < t.uniaoArmaNivel[u]!) continue;
    if (vagaDaPassiva(e, t.uniaoPassiva[u]!) < 0 || vagaDaArma(e, t.uniaoResultado[u]!) >= 0) continue;
    return u;
  }
  return -1;
}

/**
 * A União entra na vaga da arma de origem (U2): código do resultado, nível 1
 * e todos os timers em 0 (uma sequência pendente é descartada); as passivas
 * não mudam. Porta única: o baú agora, a Forja na F-008. Grava `uniao`.
 */
export function aplicarUniao(e: Estado, dados: DadosDaVigilia, u: number): void {
  const t = dados.progressao;
  const v = vagaDaArma(e, t.uniaoArma[u]!);
  if (v < 0) throw new Error('aplicarUniao: a arma de origem não está na build');
  const b = e.build;
  b.codigo[v] = t.uniaoResultado[u]!;
  b.nivel[v] = 1;
  b.recarga[v] = b.esperaPulso[v] = b.golpe[v] = b.esperaGolpe[v] = 0;
  // A sequência pendente do Contra-ataque é descartada junto dos outros timers (CA5).
  b.caSeq[v] = b.caEspera[v] = 0;
  FLOATS_DO_EVENTO[0] = t.uniaoPassiva[u]!;
  FLOATS_DO_EVENTO[1] = FLOATS_DO_EVENTO[2] = FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.uniao, t.uniaoResultado[u]!, 0, -1, 0, 0, 0, 0);
  recalcularDano(e, dados);
}

/** Quantidade de itens pelo sorteio a = ⌊u × 100 / 2³²⌋ (B1): o 1º limite acumulado acima de a. */
export function quantidadeDoBau(u: number, dados: DadosDaVigilia): number {
  const t = dados.progressao;
  const a = Math.floor((u * 100) / DOIS_A_32);
  for (let i = 0; i < t.bauAte.length; i++) if (a < t.bauAte[i]!) return t.bauQuantidade[i]!;
  return t.bauQuantidade[t.bauAte.length - 1]!;
}

function gravarItem(e: Estado, fila: number, k: number, categoria: number, codigo: number, nivel: number): void {
  const f = e.filaDeBaus;
  f[fila + BAU.categoria + k] = categoria;
  f[fila + BAU.codigo + k] = codigo;
  f[fila + BAU.nivel + k] = nivel;
  FLOATS_DO_EVENTO[0] = nivel;
  FLOATS_DO_EVENTO[1] = FLOATS_DO_EVENTO[2] = FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.item, codigo, categoria, -1, 0, 0, 0, 0);
}

/**
 * Abre o baú do pickup `slot` (B1, B2, B5): libera o pickup, aplica o conteúdo,
 * grava o resultado na próxima entrada da fila de baús e os eventos `bau`,
 * `item` (um por item) e `uniao`, e soma um baú por fechar. Quem chama garante
 * que a fila tem vaga.
 */
export function abrirBau(e: Estado, dados: DadosDaVigilia, slot: number): void {
  const t = dados.progressao;
  const pk = e.pickups;
  const indice = pk.valor[slot]!;
  const tipoDoPickup = pk.tipo[slot]!;
  FLOATS_DO_EVENTO[0] = pk.x[slot]!;
  FLOATS_DO_EVENTO[1] = pk.y[slot]!;
  liberarPickup(e, slot);
  const pr = e.progresso;
  const entrada = pr[PROGRESSAO.bausPorFechar]!;
  const fila = entrada * BYTES_POR_BAU;
  e.filaDeBaus.fill(0, fila, fila + BYTES_POR_BAU);
  const u = uniaoDisponivel(e, dados);
  if (u >= 0) {
    FLOATS_DO_EVENTO[2] = indice;
    FLOATS_DO_EVENTO[3] = 0;
    gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.bau, 0, tipoDoPickup, -1, 0, 0, 0, 0);
    e.filaDeBaus[fila + BAU.uniao] = u + 1;
    aplicarUniao(e, dados, u);
  } else {
    const base = baseDoFluxo('baus');
    semear(e.rng, base, e.cab[CAB.seed]!, 'baus', indice);
    sortear(e.rng, base);
    const n = quantidadeDoBau(SORTEADO[0]!, dados);
    FLOATS_DO_EVENTO[2] = indice;
    FLOATS_DO_EVENTO[3] = n;
    gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.bau, 0, tipoDoPickup, -1, 0, 0, 0, 0);
    const a = dados.armas;
    let m = 0;
    for (let v = 0; v < VAGAS_DE_ARMA; v++) {
      const c = e.build.codigo[v]!;
      if (c !== 0 && e.build.nivel[v]! < a.nivelMax[c]!) ELEGIVEIS[m++] = (CATEGORIA_DE_ITEM.arma << 8) | v;
    }
    for (let v = 0; v < VAGAS_DE_PASSIVA; v++) {
      const c = e.passivas.codigo[v]!;
      if (c !== 0 && e.passivas.nivel[v]! < t.passivaNivelMax[c]!) ELEGIVEIS[m++] = (CATEGORIA_DE_ITEM.passiva << 8) | v;
    }
    const sobem = n < m ? n : m;
    for (let k = 0; k < sobem; k++) {
      sortear(e.rng, base);
      const j = k + indiceUniforme(SORTEADO[0]!, m - k);
      const escolhido = ELEGIVEIS[j]!;
      ELEGIVEIS[j] = ELEGIVEIS[k]!;
      ELEGIVEIS[k] = escolhido;
      const v = escolhido & 0xff;
      if (escolhido >> 8 === CATEGORIA_DE_ITEM.arma) {
        const nivel = e.build.nivel[v]! + 1;
        e.build.nivel[v] = nivel;
        gravarItem(e, fila, k, CATEGORIA_DE_ITEM.arma, e.build.codigo[v]!, nivel);
      } else {
        const nivel = e.passivas.nivel[v]! + 1;
        e.passivas.nivel[v] = nivel;
        gravarItem(e, fila, k, CATEGORIA_DE_ITEM.passiva, e.passivas.codigo[v]!, nivel);
      }
    }
    for (let k = sobem; k < n; k++) {
      pr[PROGRESSAO.almas] = pr[PROGRESSAO.almas]! + t.bolsaAlmas;
      gravarItem(e, fila, k, CATEGORIA_DE_ITEM.bolsa, 0, 0);
    }
    e.filaDeBaus[fila + BAU.itens] = n;
    recalcularDano(e, dados);
  }
  pr[PROGRESSAO.bausPorFechar] = entrada + 1;
}
