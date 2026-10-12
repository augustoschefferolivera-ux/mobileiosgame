// Dano de contato (B §3.3 e §3.6; Q-13 (a); Q-14; design/decisoes-F-003.md §3).
// Uma vez por passo, nas posições finais: o timer de invulnerabilidade
// decrementa; com ele em 0, o inimigo de contato encostado de maior dano acerta
// (empate: o menor slot), o acerto vale dano × 0,3 e o timer vai a 18. Assim o
// contato contínuo rende exatamente 5/s no minuto 0, por mais Ocos que encostem.
import { ARMA } from '../armas/tabela';
import { CAB, CAPACIDADE_DE_INIMIGOS, CENARIO, JOGADOR, JOGADOR3_U8, JOGADOR_U8, VAGAS_DE_ARMA, type Estado } from '../nucleo/estado';
import { EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import type { DadosDaVigilia } from './dados';
import { RAIO_DO_JOGADOR } from './jogador';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from './toro';

/** Invulnerabilidade pós-acerto de contato: 0,3 s = 18 passos (B §3.3), contando o do acerto. */
export const PASSOS_DE_INVULNERABILIDADE = 18;
/** Valor do acerto: dano por segundo × 0,3 (Q-13 (a)); separado do timer, que o nó Casco alonga (F-010). */
export const FATOR_DO_ACERTO_DE_CONTATO = 0.3;
/**
 * Folga do contato: um corpo empurrado até encostar e gravado em Float32 fica a
 * ±1 ulp da soma dos raios; 1/16 px (1/8 de pixel do canvas) é invisível.
 */
export const FOLGA_DO_CONTATO = 1 / 16;

/** Origem do dano ao jogador (código numérico; as features seguintes acrescentam). */
export const ORIGEM_DO_DANO = { contato: 1, golpe: 2, projetil: 3 } as const;

/** Dano bruto do acerto em curso no jogador: rascunho, para nenhum double atravessar as chamadas (F-006 ET11). */
export const BRUTO = new Float64Array(1);

/** Desfecho de `resolverAcertoNoJogador` (o mesmo código do campo do evento `golpeInimigo`). */
export const DESFECHO = { acertou: 1, esquivado: 2, aparado: 3 } as const;

/**
 * Único caminho de dano ao jogador. Aplica o valor bruto de BRUTO[0] (antes da
 * armadura e da Brasa Firme, que são das F-005 a F-007); com o jogador
 * invulnerável do cenário, não muda o HP. Em 0, nada acontece até a F-007.
 */
export function danoAoJogador(e: Estado, _origem: number): void {
  if (e.cab[CAB.cenario]! & CENARIO.jogadorInvulneravel) return;
  const j = e.jogador;
  j[JOGADOR.hp] = Math.fround(Math.max(0, j[JOGADOR.hp]! - BRUTO[0]!));
}

/**
 * Ponto único de todo acerto no jogador (EP1): contato, golpe e projétil. O
 * dano bruto vem em BRUTO[0] e o atacante em `slot` (−1 = sem alvo). Ordem: aparo
 * (da etapa seguinte) > i-frames da esquiva > dano. Nos i-frames não tira HP,
 * não liga timer algum e devolve DESFECHO.esquivado; o 1º acerto evitado da
 * esquiva é a esquiva perfeita (EP2): evento, congelamento, Poder e faca extra.
 * O contato só conta com `invulContato` = 0 (Q-14), o que a chamada já garante.
 */
export function resolverAcertoNoJogador(e: Estado, dados: DadosDaVigilia, origem: number, slot: number): number {
  const u8 = e.jogador3U8;
  const c = dados.combate;
  const passoDaEsquiva = u8[JOGADOR3_U8.esquivaPasso]!;
  if (passoDaEsquiva < c.esquivaIframesDe || passoDaEsquiva > c.esquivaIframesAte) {
    danoAoJogador(e, origem);
    return DESFECHO.acertou;
  }
  if (u8[JOGADOR3_U8.esquivaPerfeitaDada] === 0 && (origem !== ORIGEM_DO_DANO.contato || e.jogadorU8[JOGADOR_U8.invulContato] === 0)) {
    u8[JOGADOR3_U8.esquivaPerfeitaDada] = 1;
    u8[JOGADOR3_U8.congelamento] = c.congelamento;
    u8[JOGADOR3_U8.poderPassos] = c.poderPassos;
    for (let v = 0; v < VAGAS_DE_ARMA; v++) if (e.build.codigo[v] === ARMA.facas_de_sal) u8[JOGADOR3_U8.facaExtra] = 1;
    FLOATS_DO_EVENTO[0] = e.jogador[JOGADOR.x]!;
    FLOATS_DO_EVENTO[1] = e.jogador[JOGADOR.y]!;
    FLOATS_DO_EVENTO[2] = 0;
    FLOATS_DO_EVENTO[3] = 0;
    const tipo = slot < 0 ? 0 : e.inimigos.tipo[slot]!;
    gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.esquivaPerfeita, 0, origem, slot, slot < 0 ? 0 : e.pool.geracao[slot]!, tipo, 0, 0);
  }
  return DESFECHO.esquivado;
}

/** Devolve o slot que acertou neste passo, ou −1. */
export function aplicarContato(e: Estado, dados: DadosDaVigilia): number {
  const u8 = e.jogadorU8;
  const timer = u8[JOGADOR_U8.invulContato]!;
  if (timer > 0) u8[JOGADOR_U8.invulContato] = timer - 1;
  if (u8[JOGADOR_U8.invulContato]! > 0) return -1;
  const ini = e.inimigos;
  const t = dados.tipos;
  const pos = e.pool.posicao;
  const jx = e.jogador[JOGADOR.x]!;
  const jy = e.jogador[JOGADOR.y]!;
  let escolhido = -1;
  let maiorDano = -1;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    if (pos[s]! < 0) continue;
    const tipo = ini.tipo[s]!;
    if (t.contato[tipo] !== 1) continue;
    const alcance = RAIO_DO_JOGADOR + t.raio[tipo]! + FOLGA_DO_CONTATO;
    // O delta de deltaNoToro, em linha (no V8, a chamada devolveria um HeapNumber).
    let dx = ini.x[s]! - jx;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = ini.y[s]! - jy;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    if (dx * dx + dy * dy > alcance * alcance) continue;
    if (ini.dano[s]! > maiorDano) {
      maiorDano = ini.dano[s]!;
      escolhido = s;
    }
  }
  if (escolhido < 0) return -1;
  BRUTO[0] = maiorDano * FATOR_DO_ACERTO_DE_CONTATO;
  if (resolverAcertoNoJogador(e, dados, ORIGEM_DO_DANO.contato, escolhido) !== DESFECHO.acertou) return -1;
  u8[JOGADOR_U8.invulContato] = PASSOS_DE_INVULNERABILIDADE;
  return escolhido;
}
