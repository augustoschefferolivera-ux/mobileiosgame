// A Fome (design/decisoes-F-009.md FM1 a FM3, §4): às 23:00 com o chefe vivo o tempo para e o jogador sangra por um dreno que
// só cresce; não há entidade. Também guarda o que A Fome e o Amanhecer têm em comum: o corte do combate e o passo do jogador
// sem ações (só anda). Regra do laço quente: o dano do tick vai por BRUTO[0], nenhum double atravessa chamada.
import { liberarOnda } from '../armas/ondas';
import { liberarProjetil } from '../armas/projeteis';
import type { ComandosDoPasso } from '../nucleo/comandos';
import {
  CAB,
  CAPACIDADE_DE_EFEITOS,
  CAPACIDADE_DE_INIMIGOS,
  CAPACIDADE_DE_PROJETEIS,
  CAUSA_DO_FIM,
  CHEFE_U16,
  CHEFE_U32,
  CHEFE_U8,
  FASE,
  FOGUEIRA_U8,
  ETAPA,
  JOGADOR,
  JOGADOR2,
  JOGADOR3_U8,
  JOGADOR4_U8,
  type Estado,
} from '../nucleo/estado';
import { EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import { BRUTO, ORIGEM_DO_DANO, danoAoJogador } from './contato';
import type { DadosDaVigilia } from './dados';
import { zerarFrasco } from './frasco';
import { atualizarPromptDeMover, moverJogador } from './jogador';
import { rodarMancha, encerrarVigilia } from './vigilia';

/**
 * O que A Fome e o Amanhecer cortam no instante em que começam (FM1, AN4): projéteis (as facas) e ondas somem, os telegrafos de
 * todo inimigo, a zona de Lanterna, a cegueira e o Agarrar zeram, o Frasco para sem evento (e depois é recusado pela fase) e
 * as janelas de esquiva e aparo fecham. Os inimigos ficam parados onde estão (nenhum passo os move nessas fases).
 */
export function cortarOCombate(e: Estado): void {
  const pp = e.poolDeProjeteis.posicao;
  for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) if (pp[p]! >= 0) liberarProjetil(e, p);
  const po = e.poolDeEfeitos.posicao;
  for (let o = 0; o < CAPACIDADE_DE_EFEITOS; o++) if (po[o]! >= 0) liberarOnda(e, o);
  const ini = e.inimigos;
  const pos = e.pool.posicao;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    if (pos[s]! < 0) continue;
    ini.ataqueFase[s] = 0;
    ini.ataqueTimer[s] = 0;
    ini.ataqueId[s] = 0;
  }
  const u16 = e.chefeU16;
  u16[CHEFE_U16.cegoPassos] = 0;
  u16[CHEFE_U16.zonaTimer0] = u16[CHEFE_U16.zonaTimer1] = u16[CHEFE_U16.zonaTimer2] = 0;
  e.chefeU8[CHEFE_U8.presoPassos] = 0;
  zerarFrasco(e);
  const j3 = e.jogador3U8;
  j3[JOGADOR3_U8.congelamento] = 0;
  j3[JOGADOR3_U8.esquivaPasso] = 0;
  j3[JOGADOR3_U8.aparoJanela] = 0;
  j3[JOGADOR3_U8.aparoFalho] = 0;
}

/**
 * O passo do jogador em A Fome e no Amanhecer: o `passo` anda, o relógio não; só a caminhada vale (esquiva, aparo e Frasco
 * ficam de fora, como na Fogueira: os bits são restituídos para a fonte não perdê-los), e a mancha pode ser recuperada.
 */
export function andarSemAcoes(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): void {
  e.cab[CAB.passo] = e.cab[CAB.passo]! + 1;
  const acoes = cmd.acoes[0]!;
  cmd.acoes[0] = 0;
  const moveu = moverJogador(e, dados, cmd);
  cmd.acoes[0] = acoes;
  atualizarPromptDeMover(e, moveu);
  rodarMancha(e, dados);
}

/** 23:00 com o chefe vivo (FM1): `etapa` A_FOME, `fase` 3, `fomePassos` 0 e o evento 47; o combate é cortado. */
export function iniciarFome(e: Estado): void {
  e.fogueiraU8[FOGUEIRA_U8.etapa] = ETAPA.aFome;
  e.jogador4U8[JOGADOR4_U8.fase] = FASE.aFome;
  e.chefeU32[CHEFE_U32.fomePassos] = 0;
  cortarOCombate(e);
  FLOATS_DO_EVENTO[0] = e.jogador[JOGADOR.x]!;
  FLOATS_DO_EVENTO[1] = e.jogador[JOGADOR.y]!;
  FLOATS_DO_EVENTO[2] = 0;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.fomeDesceu, 0, 0, -1, 0, 0, 0, 0);
}

/**
 * Um passo de A Fome (FM2, FM3): o jogador anda; a cada `fomeTick` (10) passos o tick `k` = 0, 1, … fere com bruto
 * `hpMax × (18 + k)/1800` por `danoAoJogador` (origem `fome`: armadura e Brasa Firme valem, esquiva e aparo não). Com `hp ≤ 0`
 * a Vigília termina no mesmo passo (causa a_fome), sem APAGANDO.
 */
export function rodarFome(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): void {
  andarSemAcoes(e, dados, cmd);
  const n = e.chefeU32[CHEFE_U32.fomePassos]! + 1;
  e.chefeU32[CHEFE_U32.fomePassos] = n;
  const c = dados.chefe;
  if (n % c.fomeTick !== 0) return;
  BRUTO[0] = (e.jogador2[JOGADOR2.hpMax]! * (c.fomeBase + n / c.fomeTick - 1)) / c.fomeDivisor;
  danoAoJogador(e, dados, ORIGEM_DO_DANO.fome);
  if (e.jogador[JOGADOR.hp]! <= 0) encerrarVigilia(e, dados, CAUSA_DO_FIM.aFome);
}
