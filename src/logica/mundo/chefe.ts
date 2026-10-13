// O Lanterneiro (design/decisoes-F-009.md LN1 a LN5, AB1, AB2, PO1 a PO7, FS1): o nascimento na arena de 224 px, a Postura
// e a Quebra, o dano das armas por acerto (um ponto único, em `acertar`), a morte e as fases. A máquina de ataques e os
// relógios por passo (`rodarChefe`) vêm da parte seguinte. Sem RNG. Regra do laço quente: nenhum double atravessa chamada,
// nem nas funções frias (rascunhos: PONTO, ACERTO, FLOATS_DO_EVENTO); os ganhos de Postura entram por código inteiro.
import { ACERTO } from '../armas/acerto';
import {
  CAB,
  CENARIO,
  CHEFE_F32,
  CHEFE_U16,
  CHEFE_U8,
  FOGUEIRA_F32,
  MUNDO,
  PROGRESSAO,
  SEM_CHEFE,
  type Estado,
} from '../nucleo/estado';
import { CAUSA, EVENTO, FLAG, FLOATS_DO_EVENTO, FORMA, gravarEvento } from '../nucleo/eventos';
import { alocar } from '../nucleo/pool';
import { creditarAlmas } from '../progressao/pickups';
import { formarArena } from './arena';
import { CAIXA } from './caixa';
import type { DadosDaVigilia } from './dados';
import { DIRECAO_X, DIRECAO_Y } from './direcoes';
import { FASE_DO_ATAQUE, TIPO } from './tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA } from './toro';

/** Ganhos de Postura (PO1), por código: o valor sai de `dados.chefe`. */
export const GANHO = { aparo: 0, esquiva: 1, espada: 2, faca: 3, circulo: 4, pesada: 5 } as const;

/** Ponto em construção do nascimento: x e y, levados ao toro em Float32. */
const PONTO = new Float64Array(2);

/** O Lanterneiro está vivo e com slot (a arena formada)? */
export function chefeVivo(e: Estado): boolean {
  return e.chefeU16[CHEFE_U16.slot] !== SEM_CHEFE;
}

/**
 * O Lanterneiro surge (AB1, AB2, LN2): forma a arena no jogador (obstáculos tocados `ativo` = 0, massa e médios a < 224 mortos
 * por `CAUSA.arena`) e põe o chefe a `nasce_a_px` (144) do centro, na direção 0 da tabela, com `hpMax` pelo nível do estado com
 * os pendentes, a fase 1 e 120 passos de recuperação. Devolve o slot, ou −1 se já há chefe, se ele já morreu ou sem slot livre.
 * Evento 39. Sem RNG.
 */
export function surgirChefe(e: Estado, dados: DadosDaVigilia): number {
  if (e.chefeU16[CHEFE_U16.slot] !== SEM_CHEFE || e.chefeU8[CHEFE_U8.morto] === 1) return -1;
  const c = dados.chefe;
  CAIXA[0] = c.meiaLargura;
  CAIXA[1] = c.meiaAltura;
  formarArena(e, dados);
  const slot = alocar(e.pool);
  if (slot < 0) {
    e.mundo[MUNDO.recusados] = e.mundo[MUNDO.recusados]! + 1;
    return -1;
  }
  const nivel = e.progresso[PROGRESSAO.nivel]! + e.progresso[PROGRESSAO.niveisPendentes]!;
  const f = e.fogueiraF32;
  PONTO[0] = f[FOGUEIRA_F32.arenaX]! + c.nasceA * DIRECAO_X[0]!;
  PONTO[1] = f[FOGUEIRA_F32.arenaY]! + c.nasceA * DIRECAO_Y[0]!;
  let x = Math.fround(PONTO[0]!);
  if (x < 0) x = Math.fround(x + LARGURA_DO_MAPA);
  if (x >= LARGURA_DO_MAPA) x = Math.fround(x - LARGURA_DO_MAPA);
  let y = Math.fround(PONTO[1]!);
  if (y < 0) y = Math.fround(y + ALTURA_DO_MAPA);
  if (y >= ALTURA_DO_MAPA) y = Math.fround(y - ALTURA_DO_MAPA);
  const ini = e.inimigos;
  ini.x[slot] = ini.xAnt[slot] = x;
  ini.y[slot] = ini.yAnt[slot] = y;
  ini.tipo[slot] = TIPO.o_lanterneiro;
  ini.convertido[slot] = ini.salPct[slot] = ini.salPassos[slot] = ini.kbPassos[slot] = 0;
  ini.quebradaPassos[slot] = 0;
  ini.miraX[slot] = ini.miraY[slot] = 0;
  ini.ataqueId[slot] = ini.ataqueSeq[slot] = 0;
  ini.convocaEspera[slot] = 0;
  ini.dano[slot] = 0;
  ini.ataqueFase[slot] = FASE_DO_ATAQUE.recuperacao;
  ini.ataqueTimer[slot] = c.recuperacaoInicial;
  const hpMax = Math.fround((c.hpBase * (100 + c.hpPctPorNivel * nivel)) / 100);
  ini.hp[slot] = hpMax;
  e.chefeF32[CHEFE_F32.hpMax] = hpMax;
  e.chefeU16[CHEFE_U16.slot] = slot;
  e.chefeU8[CHEFE_U8.fase] = 1;
  e.chefeU8[CHEFE_U8.faseMax] = 1;
  FLOATS_DO_EVENTO[0] = x;
  FLOATS_DO_EVENTO[1] = y;
  FLOATS_DO_EVENTO[2] = hpMax;
  FLOATS_DO_EVENTO[3] = nivel;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.chefeSurgiu, 0, 0, slot, e.pool.geracao[slot]!, TIPO.o_lanterneiro, 0, 0);
  return slot;
}

/** O surgimento do 20:00 só vale com os ataques ligados (sem eles não há telegrafo nem golpe, e o chefe ficaria parado). */
export function chefeLigado(e: Estado): boolean {
  return (e.cab[CAB.cenario]! & CENARIO.ataques) !== 0;
}

/** Cancela o ataque em curso do chefe (Quebra, transição): a máquina volta ao início e a zona de Lanterna ainda sem ponto é solta. */
export function cancelarAtaqueDoChefe(e: Estado): void {
  const s = e.chefeU16[CHEFE_U16.slot]!;
  if (s === SEM_CHEFE) return;
  const ini = e.inimigos;
  ini.ataqueFase[s] = FASE_DO_ATAQUE.livre;
  ini.ataqueTimer[s] = 0;
  ini.ataqueId[s] = 0;
  const u16 = e.chefeU16;
  for (let z = 0; z < 3; z++) if (u16[CHEFE_U16.zonaTimer0 + z] === ZONA_PENDENTE) u16[CHEFE_U16.zonaTimer0 + z] = 0;
}

/** `zonaTimer` de uma zona de Lanterna cujo ponto já foi fixado, mas o telegrafo ainda não acabou (AT5). */
export const ZONA_PENDENTE = 0xffff;

/**
 * Começa a Quebra de Postura (PO2): Postura em 100, `quebraPassos` = 180, uma quebra a mais, o ataque cancelado e o evento 41
 * (forma 1; forma 2 quando vem do Agarrar aparado, PO5).
 */
function iniciarQuebra(e: Estado, dados: DadosDaVigilia, forma: number): void {
  const c = dados.chefe;
  const s = e.chefeU16[CHEFE_U16.slot]!;
  e.chefeF32[CHEFE_F32.postura] = c.posturaMax;
  e.chefeU16[CHEFE_U16.quebraPassos] = c.quebraPassos;
  e.chefeU8[CHEFE_U8.quebraNova] = 1;
  if (e.chefeU8[CHEFE_U8.quebras]! < 255) e.chefeU8[CHEFE_U8.quebras] = e.chefeU8[CHEFE_U8.quebras]! + 1;
  cancelarAtaqueDoChefe(e);
  FLOATS_DO_EVENTO[0] = e.inimigos.x[s]!;
  FLOATS_DO_EVENTO[1] = e.inimigos.y[s]!;
  FLOATS_DO_EVENTO[2] = c.posturaMax;
  FLOATS_DO_EVENTO[3] = c.quebraPassos;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.quebraDoChefe, 0, forma, s, e.pool.geracao[s]!, TIPO.o_lanterneiro, 0, 0);
}

/** Agarrar aparado (PO5): a Quebra é imediata, sem os +25. */
export function quebrarPeloAgarrar(e: Estado, dados: DadosDaVigilia): void {
  if (e.chefeU16[CHEFE_U16.quebraPassos]! > 0 || e.chefeU16[CHEFE_U16.transicaoPassos]! > 0) return;
  iniciarQuebra(e, dados, 2);
}

/**
 * Soma à Postura o ganho de código `quando` (GANHO; PO1) e zera a espera da regeneração (PO3). Nenhum ganho soma na Quebra nem na
 * transição. Ao chegar a 100 começa a Quebra (PO2). A soma é em Float32.
 */
export function ganharPostura(e: Estado, dados: DadosDaVigilia, quando: number): void {
  const u16 = e.chefeU16;
  if (u16[CHEFE_U16.slot] === SEM_CHEFE || u16[CHEFE_U16.quebraPassos]! > 0 || u16[CHEFE_U16.transicaoPassos]! > 0) return;
  const c = dados.chefe;
  const f32 = e.chefeF32;
  u16[CHEFE_U16.posturaOciosa] = 0;
  const ganho =
    quando === GANHO.aparo ? c.ganhoAparo : quando === GANHO.esquiva ? c.ganhoEsquiva : quando === GANHO.espada ? c.ganhoEspada : quando === GANHO.faca ? c.ganhoFaca : quando === GANHO.pesada ? c.ganhoPesada : 0;
  const postura = Math.fround(f32[CHEFE_F32.postura]! + ganho);
  f32[CHEFE_F32.postura] = postura;
  if (postura >= c.posturaMax) iniciarQuebra(e, dados, 1);
}

/** Ganho de Postura do acerto de arma de forma `forma` (PO1): Espada e onda, Faca e o tick do Círculo (zero, mas zera a espera). */
function ganhoDoAcerto(forma: number): number {
  if (forma === FORMA.faca) return GANHO.faca;
  if (forma === FORMA.tick) return GANHO.circulo;
  return GANHO.espada;
}

/**
 * Acerto de arma no Lanterneiro (PO1, PO6, PO7), chamado por `acertar` com o dano em ACERTO[0]. Na transição o acerto é consumido
 * sem dano nem Postura. Senão: dano × 60% fora da Quebra (Postura Firme) ou × 200% dentro, com `FLAG.critico` (os dois são
 * exclusivos e entram em produto com o Contra-ataque, que já vem em ACERTO[0]); o HP não passa do limiar da próxima fase (nunca se
 * pula uma fase; na fase 3 o limiar é 0); a Postura soma o ganho da arma fora da Quebra. Sem Sal. A morte sai pelo `matarInimigo`
 * da varredura das armas (hp ≤ 0).
 */
export function acertarNoChefe(e: Estado, dados: DadosDaVigilia, s: number, arma: number, forma: number, flagsExtra: number): void {
  const u16 = e.chefeU16;
  if (u16[CHEFE_U16.transicaoPassos]! > 0) return;
  const c = dados.chefe;
  const ini = e.inimigos;
  const quebra = u16[CHEFE_U16.quebraPassos]! > 0;
  let flags = flagsExtra;
  let dano = (ACERTO[0]! * (quebra ? c.fatorQuebraPct : c.fatorForaPct)) / 100;
  if (quebra) flags |= FLAG.critico;
  const antes = ini.hp[s]!;
  const fase = e.chefeU8[CHEFE_U8.fase]!;
  const limiar = fase < 3 ? Math.fround((e.chefeF32[CHEFE_F32.hpMax]! * c.limiarPct[fase - 1]!) / 100) : 0;
  let hp = Math.fround(antes - dano);
  if (hp < limiar) hp = antes > limiar ? limiar : antes;
  dano = antes - hp;
  ini.hp[s] = hp;
  if (dano > 0) {
    if (!quebra) ganharPostura(e, dados, ganhoDoAcerto(forma));
    u16[CHEFE_U16.posturaOciosa] = 0;
  }
  FLOATS_DO_EVENTO[0] = ini.x[s]!;
  FLOATS_DO_EVENTO[1] = ini.y[s]!;
  FLOATS_DO_EVENTO[2] = dano;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.acerto, arma, forma, s, e.pool.geracao[s]!, TIPO.o_lanterneiro, hp <= 0 ? flags | FLAG.matou : flags, 0);
}

/**
 * Morte do Lanterneiro (LN5), chamada por `matarInimigo` com `CAUSA.lanterneiro`: `mortes` + 1, as 200 Almas creditadas direto
 * (sem pickup, sem Cinza, sem baú) e `chefeMorto` = 1; evento 45 (x, y, Almas, fase). O Amanhecer (AN1) é da parte seguinte.
 */
export function aoMorrerOChefe(e: Estado, dados: DadosDaVigilia, slot: number): void {
  e.mundo[MUNDO.mortes] = e.mundo[MUNDO.mortes]! + 1;
  creditarAlmas(e, dados.chefe.almas);
  e.chefeU8[CHEFE_U8.morto] = 1;
  FLOATS_DO_EVENTO[0] = e.inimigos.x[slot]!;
  FLOATS_DO_EVENTO[1] = e.inimigos.y[slot]!;
  FLOATS_DO_EVENTO[2] = dados.chefe.almas;
  FLOATS_DO_EVENTO[3] = e.chefeU8[CHEFE_U8.fase]!;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.chefeMorreu, 0, 0, slot, e.pool.geracao[slot]!, TIPO.o_lanterneiro, 0, CAUSA.lanterneiro);
}
