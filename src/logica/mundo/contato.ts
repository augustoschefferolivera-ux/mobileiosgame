// Dano de contato (B §3.3 e §3.6; Q-13 (a); Q-14; design/decisoes-F-003.md §3).
// Uma vez por passo, nas posições finais: o timer de invulnerabilidade
// decrementa; com ele em 0, o inimigo de contato encostado de maior dano acerta
// (empate: o menor slot), o acerto vale dano × 0,3 e o timer vai a 18. Assim o
// contato contínuo rende exatamente 5/s no minuto 0, por mais Ocos que encostem.
import { ARMA } from '../armas/tabela';
import { CAB, CAPACIDADE_DE_INIMIGOS, CENARIO, JOGADOR, JOGADOR2, JOGADOR3, JOGADOR3_U8, JOGADOR4, JOGADOR4_U32, JOGADOR4_U8, JOGADOR_U8, PROMPT, VAGAS_DE_ARMA, type Estado } from '../nucleo/estado';
import { EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import { armadura } from '../progressao/dano';
import type { DadosDaVigilia } from './dados';
import { interromperFrasco } from './frasco';
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

/** Dano líquido do último `danoAoJogador` (depois da armadura e da Brasa Firme): rascunho, nenhum double atravessa chamada. */
export const LIQUIDO = new Float64Array(1);
/** Rascunho de `reducaoDeArmadura`: [0] = redução (0 a 0,75), [1] = multiplicador do dano (1 a 0,25). */
export const REDUCAO = new Float64Array(2);

/** Teto da redução pela armadura (DM1): A = 60 já a alcança; acima, o dano fica em 25%. */
const ARMADURA_DO_TETO = 60;

/**
 * Curva da armadura (DM1): redução `min(0,75, A/(A+20))` e o multiplicador `20/(A+20)` (piso 0,25),
 * escritos em REDUCAO. A negativa ou NaN é erro (a armadura vem das passivas, inteira e ≥ 0).
 */
export function reducaoDeArmadura(a: number): void {
  if (!(a >= 0 && a < Infinity)) throw new Error(`armadura inválida: ${a}`);
  REDUCAO[0] = Math.min(0.75, a / (a + 20));
  REDUCAO[1] = a >= ARMADURA_DO_TETO ? 0.25 : 20 / (a + 20);
}

/**
 * Único caminho de dano ao jogador (DM1, DM6). Aplica o bruto de BRUTO[0] (que fica intacto, para
 * o evento do golpe) → armadura `× 20/(A+20)` → Brasa Firme `× 0,8` com a stamina estritamente acima
 * do limiar, cada passo em Float32; o líquido vai a LIQUIDO[0]. Com o jogador invulnerável do
 * cenário, não muda nada. Perdido o HP: soma o HP efetivamente perdido em `danoRecebido`, emite
 * `danoAoJogador` e, se a cura do Frasco corre e o líquido passa de 15% do `hpMax` (estrito),
 * interrompe a cura (FR3). Sem arredondamento: o HUD usa `ceil` (DM4).
 */
export function danoAoJogador(e: Estado, dados: DadosDaVigilia, origem: number): void {
  if (e.cab[CAB.cenario]! & CENARIO.jogadorInvulneravel) {
    LIQUIDO[0] = 0;
    return;
  }
  const c = dados.combate;
  reducaoDeArmadura(armadura(e, dados));
  let d = Math.fround(BRUTO[0]! * REDUCAO[1]!);
  if (e.jogador3[JOGADOR3.stamina]! > c.brasaFirmeLimiar) d = Math.fround(d * c.brasaFirmeFator);
  LIQUIDO[0] = d;
  const j = e.jogador;
  const antes = j[JOGADOR.hp]!;
  const depois = Math.fround(Math.max(0, antes - d));
  j[JOGADOR.hp] = depois;
  if (!(d > 0)) return;
  const j4 = e.jogador4;
  j4[JOGADOR4.danoRecebido] = Math.fround(j4[JOGADOR4.danoRecebido]! + (antes - depois));
  FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
  FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
  FLOATS_DO_EVENTO[2] = d;
  FLOATS_DO_EVENTO[3] = depois;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.danoAoJogador, 0, origem, -1, 0, 0, 0, 0);
  if (e.jogador4U8[JOGADOR4_U8.frascoPasso]! > 0 && d > Math.fround((e.jogador2[JOGADOR2.hpMax]! * c.frascoInterrompePct) / 100)) {
    interromperFrasco(e);
  }
}

/**
 * Ponto único de todo acerto no jogador (EP1): contato, golpe e projétil. O
 * dano bruto vem em BRUTO[0] e o atacante em `slot` (−1 = sem alvo). Ordem: aparo
 * (resolvido antes, em ataques.ts e aparo.ts) > i-frames da esquiva > dano. Nos i-frames não tira HP,
 * não liga timer algum e devolve DESFECHO.esquivado; o 1º acerto evitado da
 * esquiva é a esquiva perfeita (EP2): evento, congelamento, Poder e faca extra.
 * O contato só conta com `invulContato` = 0 (Q-14), o que a chamada já garante.
 */
export function resolverAcertoNoJogador(e: Estado, dados: DadosDaVigilia, origem: number, slot: number): number {
  const u8 = e.jogador3U8;
  const c = dados.combate;
  const passoDaEsquiva = u8[JOGADOR3_U8.esquivaPasso]!;
  if (passoDaEsquiva < c.esquivaIframesDe || passoDaEsquiva > c.esquivaIframesAte) {
    danoAoJogador(e, dados, origem);
    // Com o prompt de aparo na tela, o golpe ou o projétil que fere conta como falha do tutorial (AP11 (b)).
    if (origem !== ORIGEM_DO_DANO.contato && u8[JOGADOR3_U8.promptAparo] === PROMPT.visivel && u8[JOGADOR3_U8.falhasDeAparo]! < 255) {
      u8[JOGADOR3_U8.falhasDeAparo] = u8[JOGADOR3_U8.falhasDeAparo]! + 1;
    }
    return DESFECHO.acertou;
  }
  if (u8[JOGADOR3_U8.esquivaPerfeitaDada] === 0 && (origem !== ORIGEM_DO_DANO.contato || e.jogadorU8[JOGADOR_U8.invulContato] === 0)) {
    u8[JOGADOR3_U8.esquivaPerfeitaDada] = 1;
    u8[JOGADOR3_U8.congelamento] = c.congelamento;
    u8[JOGADOR3_U8.poderPassos] = c.poderPassos;
    e.jogador4U32[JOGADOR4_U32.esquivasPerfeitas] = e.jogador4U32[JOGADOR4_U32.esquivasPerfeitas]! + 1;
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
    // Atordoado não fere por contato (PQ4).
    if (ini.quebradaPassos[s]! > 0) continue;
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
