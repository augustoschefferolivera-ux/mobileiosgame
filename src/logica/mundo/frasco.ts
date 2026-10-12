// Frasco de Brasa (design/decisoes-F-007.md FR1 a FR7): bit 4 inicia, bit 8 cancela, a cura anda 120
// passos e o dano líquido acima de 15% do `hpMax` a interrompe (a interrupção mora em contato.ts, que
// chama `interromperFrasco`). Regra do laço quente: tudo em linha, os floats vão por FLOATS_DO_EVENTO.
import { ACAO, type ComandosDoPasso } from '../nucleo/comandos';
import { CAB, FASE, JOGADOR, JOGADOR2, JOGADOR3_U8, JOGADOR4, JOGADOR4_U32, JOGADOR4_U8, type Estado } from '../nucleo/estado';
import { EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import type { DadosDaVigilia } from './dados';

/**
 * Comandos do Frasco do passo (dentro dos comandos do jogador, depois da esquiva e do aparo, antes
 * da regeneração): 8 vence o 4 e só vale com a cura em curso (FR6); 4 inicia só com a fase VIVA,
 * sem cura, com carga, HP abaixo do máximo, fora da esquiva e da janela do aparo (FR1; o aparo falho
 * deixa). Negado, não muda estado algum. O toque gasta a carga, grava a cura por passo com o `hpMax`
 * do início (FR2) e põe a espera da regeneração em pelo menos 120 (FR5).
 */
export function comandosDoFrasco(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): void {
  const acoes = cmd.acoes[0]!;
  if ((acoes & (ACAO.frasco | ACAO.frascoCancelar)) === 0) return;
  const u8 = e.jogador4U8;
  if ((acoes & ACAO.frascoCancelar) !== 0) {
    if (u8[JOGADOR4_U8.frascoPasso]! > 0) cancelarFrasco(e);
    return;
  }
  if (u8[JOGADOR4_U8.fase] !== FASE.viva || u8[JOGADOR4_U8.frascoPasso]! > 0 || u8[JOGADOR4_U8.frascoCargas] === 0) return;
  const j3 = e.jogador3U8;
  if (j3[JOGADOR3_U8.esquivaPasso]! > 0 || j3[JOGADOR3_U8.aparoJanela]! > 0) return;
  const j = e.jogador;
  const hp = j[JOGADOR.hp]!;
  const hpMax = e.jogador2[JOGADOR2.hpMax]!;
  if (!(hp < hpMax)) return;
  const c = dados.combate;
  u8[JOGADOR4_U8.frascoCargas] = u8[JOGADOR4_U8.frascoCargas]! - 1;
  u8[JOGADOR4_U8.frascoPasso] = 1;
  const total = Math.fround((hpMax * c.frascoCuraPct) / 100);
  e.jogador4[JOGADOR4.frascoRestante] = total;
  e.jogador4[JOGADOR4.frascoPorPasso] = Math.fround(total / c.frascoPassos);
  e.jogador4U32[JOGADOR4_U32.frascosUsados] = e.jogador4U32[JOGADOR4_U32.frascosUsados]! + 1;
  if (j3[JOGADOR3_U8.esperaRegen]! < c.frascoEsperaRegen) j3[JOGADOR3_U8.esperaRegen] = c.frascoEsperaRegen;
  FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
  FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
  FLOATS_DO_EVENTO[2] = hp;
  FLOATS_DO_EVENTO[3] = hpMax;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.frascoIniciado, 0, 0, -1, 0, 0, 0, 0);
}

/** Cura de um passo (depois dos comandos, antes de qualquer dano do passo): `c` por passo e, no 120, o resto (FR2). */
export function rodarFrasco(e: Estado, dados: DadosDaVigilia): void {
  const u8 = e.jogador4U8;
  const p = u8[JOGADOR4_U8.frascoPasso]!;
  if (p === 0) return;
  const j4 = e.jogador4;
  const j = e.jogador;
  const hpMax = e.jogador2[JOGADOR2.hpMax]!;
  let cura: number;
  if (p < dados.combate.frascoPassos) {
    cura = j4[JOGADOR4.frascoPorPasso]!;
    j4[JOGADOR4.frascoRestante] = j4[JOGADOR4.frascoRestante]! - cura;
    u8[JOGADOR4_U8.frascoPasso] = p + 1;
  } else {
    cura = Math.max(0, j4[JOGADOR4.frascoRestante]!);
    j4[JOGADOR4.frascoRestante] = 0;
    u8[JOGADOR4_U8.frascoPasso] = 0;
  }
  j[JOGADOR.hp] = Math.min(hpMax, j[JOGADOR.hp]! + cura);
}

/** Zera a cura em curso, sem evento (morte e Abandonar, FR9). A carga não volta. */
export function zerarFrasco(e: Estado): void {
  e.jogador4U8[JOGADOR4_U8.frascoPasso] = 0;
  e.jogador4[JOGADOR4.frascoRestante] = 0;
  e.jogador4[JOGADOR4.frascoPorPasso] = 0;
}

/** Interrupção pelo dano (FR3): a carga não volta, a cura feita fica; o dano líquido já está em FLOATS_DO_EVENTO[2] (escrito por `danoAoJogador`). */
export function interromperFrasco(e: Estado): void {
  const j = e.jogador;
  const feitos = e.jogador4U8[JOGADOR4_U8.frascoPasso]! - 1;
  FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
  FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
  FLOATS_DO_EVENTO[3] = feitos;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.frascoInterrompido, 0, 0, -1, 0, 0, 0, 0);
  zerarFrasco(e);
}

/** Cancelamento ao segurar (FR6): carga gasta, cura feita fica, a espera da regeneração segue. */
function cancelarFrasco(e: Estado): void {
  const j = e.jogador;
  FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
  FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
  FLOATS_DO_EVENTO[2] = e.jogador4U8[JOGADOR4_U8.frascoPasso]! - 1;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.frascoCancelado, 0, 0, -1, 0, 0, 0, 0);
  zerarFrasco(e);
}
