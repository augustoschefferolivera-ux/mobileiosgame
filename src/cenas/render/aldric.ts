// O quadro do Aldric pelo estado (F-011, style card §4 e §7), sem Phaser: o
// Apagar (ajoelhado e a cinza em 3 quadros), a esquiva (agachado, rolando,
// agachado), o aparo e o Frasco em 2 quadros, o andar de 4 e o parado de 2.
// Tudo pelo passo da simulação: a imagem pausada depende só do estado.
import { CAB, FASE, JOGADOR, JOGADOR3, JOGADOR3_U8, JOGADOR4_U8, type Estado } from '../../logica/nucleo/estado';
import { indiceDaMoldura } from './atlas';

const i = indiceDaMoldura;
export const QUADROS_DO_ALDRIC = {
  parado: [i('aldric_parado'), i('aldric_parado_2')],
  andar: [i('aldric_andar_1'), i('aldric_parado'), i('aldric_andar_3'), i('aldric_parado')],
  agachado: i('aldric_agachado'),
  rolando: i('aldric_rolando'),
  aparo: [i('aldric_aparo'), i('aldric_aparo_2')],
  frasco: [i('aldric_frasco'), i('aldric_frasco_2')],
  apagar: [i('aldric_ajoelhado'), i('aldric_cinza_0'), i('aldric_cinza_1'), i('aldric_cinza_2')],
} as const;

/** Passos do Apagar em que cada quadro começa (o APAGANDO dura 30 passos). */
const INICIO_DO_APAGAR = [0, 10, 17, 24] as const;
/** Passos da esquiva (1 a 21): agachado até o 5º, rolando até o 16º, agachado até o fim. */
const ROLANDO = { de: 6, ate: 16 } as const;

export function quadroDoAldric(e: Estado): number {
  const u3 = e.jogador3U8;
  const u4 = e.jogador4U8;
  const passo = e.cab[CAB.passo]!;
  const fase = u4[JOGADOR4_U8.fase]!;
  if (fase !== FASE.viva) {
    const p = u4[JOGADOR4_U8.apagandoPassos]!;
    let q = 0;
    while (q < 3 && p >= INICIO_DO_APAGAR[q + 1]!) q++;
    return QUADROS_DO_ALDRIC.apagar[q]!;
  }
  const esquiva = u3[JOGADOR3_U8.esquivaPasso]!;
  if (esquiva > 0) return esquiva >= ROLANDO.de && esquiva <= ROLANDO.ate ? QUADROS_DO_ALDRIC.rolando : QUADROS_DO_ALDRIC.agachado;
  if (u3[JOGADOR3_U8.aparoJanela]! > 0) return QUADROS_DO_ALDRIC.aparo[(passo >> 2) & 1]!;
  if (u4[JOGADOR4_U8.frascoPasso]! > 0) return QUADROS_DO_ALDRIC.frasco[(passo >> 4) & 1]!;
  const j = e.jogador;
  const andando = j[JOGADOR.x] !== j[JOGADOR.xAnt] || j[JOGADOR.y] !== j[JOGADOR.yAnt];
  return andando ? QUADROS_DO_ALDRIC.andar[(passo >> 3) & 3]! : QUADROS_DO_ALDRIC.parado[(passo >> 5) & 1]!;
}

/** Virado para a esquerda (o sprite espelhado): pela direção da esquiva em curso, senão pela última direção. */
export function aldricEspelhado(e: Estado): boolean {
  const dx = e.jogador3U8[JOGADOR3_U8.esquivaPasso]! > 0 ? e.jogador3[JOGADOR3.esquivaDirX]! : e.jogador[JOGADOR.dirX]!;
  return dx < -1e-4;
}
