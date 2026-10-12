// Fim da Vigília (design/decisoes-F-007.md §5, §8 e §10): morte e APAGANDO, os passos de câmera lenta até
// FIM, Abandonar, a divisão das Almas, a mancha das Cinzas Perdidas e o `ResultadoDaVigilia`. O estado só
// guarda a fase e a causa; o resultado é calculado dele (as Almas, o relógio e a posição ficam congelados
// em FIM). Regra do laço quente: o que roda por passo (morte, APAGANDO, mancha) não passa double.
import { CAB, CAPACIDADE_DE_PROJETEIS, CAUSA_DO_FIM, FASE, JOGADOR, JOGADOR3_U8, JOGADOR4, JOGADOR4_U32, JOGADOR4_U8, MUNDO, PROGRESSAO, type Estado } from '../nucleo/estado';
import { EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import { liberarProjetil } from '../armas/projeteis';
import { limparOferta } from '../progressao/oferta';
import { creditarAlmas } from '../progressao/pickups';
import type { DadosDaVigilia } from './dados';
import { zerarFrasco } from './frasco';
import { moverHorda } from './horda';
import { almasAoSantuario, almasNaMancha, horaDoRelogio, pontoLivreMaisProximo } from './mancha';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from './toro';

/**
 * Fase em que as armas, os ataques, o diretor e os pickups não rodam (AG3): APAGANDO e FIM. A F-009 reaproveita
 * a mesma função para A_FOME (D4 §9), em vez de um `if` em APAGANDO.
 */
export function faseSemArmas(fase: number): boolean {
  return fase !== FASE.viva;
}

/**
 * Morte (AG1, LY2): no fim do passo, depois de todo o dano e da cura, `hp ≤ 0` → APAGANDO. Descarta os
 * níveis pendentes, os baús por fechar e a oferta, zera o Frasco sem evento e as travas do combate; emite
 * `apagou`. O `passo` só a chama com `hp ≤ 0` (a checagem fica em linha, no laço quente); devolve true quando
 * morreu (o `passo` então não roda o resto).
 */
export function verificarMorte(e: Estado): boolean {
  const j = e.jogador;
  if (j[JOGADOR.hp]! > 0) return false;
  const u8 = e.jogador4U8;
  u8[JOGADOR4_U8.fase] = FASE.apagando;
  u8[JOGADOR4_U8.apagandoPassos] = 0;
  j[JOGADOR.hp] = 0;
  zerarFrasco(e);
  const pr = e.progresso;
  pr[PROGRESSAO.niveisPendentes] = 0;
  pr[PROGRESSAO.bausPorFechar] = 0;
  e.filaDeBaus.fill(0);
  limparOferta(e);
  const j3 = e.jogador3U8;
  j3[JOGADOR3_U8.congelamento] = 0;
  j3[JOGADOR3_U8.esquivaPasso] = 0;
  j3[JOGADOR3_U8.aparoJanela] = 0;
  j3[JOGADOR3_U8.aparoFalho] = 0;
  FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
  FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
  FLOATS_DO_EVENTO[2] = pr[PROGRESSAO.almas]!;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.apagou, 0, 0, -1, 0, 0, 0, 0);
  return true;
}

/**
 * Um passo de APAGANDO (AG3): os inimigos andam; o `hp` fica em 0, o contato não fere; comandos, armas,
 * ataques, diretor, pickups, regeneração e Poder não rodam; os projéteis somem no 1º passo; o relógio da
 * Vigília para (`CAB.passo` anda, para os eventos). No passo `apagar.duracao_passos` vira FIM.
 */
export function rodarApagando(e: Estado, dados: DadosDaVigilia): void {
  e.cab[CAB.passo] = e.cab[CAB.passo]! + 1;
  const u8 = e.jogador4U8;
  const n = u8[JOGADOR4_U8.apagandoPassos]!;
  if (n === 0) {
    const pos = e.poolDeProjeteis.posicao;
    for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) if (pos[p]! >= 0) liberarProjetil(e, p);
  }
  const j = e.jogador;
  j[JOGADOR.xAnt] = j[JOGADOR.x]!;
  j[JOGADOR.yAnt] = j[JOGADOR.y]!;
  moverHorda(e, dados);
  u8[JOGADOR4_U8.apagandoPassos] = n + 1;
  if (n + 1 >= dados.combate.apagarPassos) encerrarVigilia(e, dados, CAUSA_DO_FIM.apagar);
}

/**
 * Encerra a Vigília (AG6, PE5): fase FIM, causa, Frasco zerado sem evento e o evento `fimDaVigilia` (Almas na
 * mancha e Almas ao Santuário nos floats; a causa na forma). Aceita as 4 causas; A Fome divide como o Apagar
 * e Amanhecer leva tudo. Em FIM não faz nada (crédito uma vez).
 */
export function encerrarVigilia(e: Estado, dados: DadosDaVigilia, causa: number): void {
  const u8 = e.jogador4U8;
  if (u8[JOGADOR4_U8.fase] === FASE.fim) return;
  zerarFrasco(e);
  u8[JOGADOR4_U8.fase] = FASE.fim;
  u8[JOGADOR4_U8.causaDoFim] = causa;
  const almas = e.progresso[PROGRESSAO.almas]!;
  const naMancha = almasNaMancha(causa, almas, dados.combate.manchaPct);
  const j = e.jogador;
  FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
  FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
  FLOATS_DO_EVENTO[2] = naMancha;
  FLOATS_DO_EVENTO[3] = almasAoSantuario(causa, almas, naMancha);
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.fimDaVigilia, 0, causa, -1, 0, 0, 0, 0);
}

/**
 * Encostar na mancha (MC7): a distância toroidal ≤ `mancha.raio_px` (sem Ímã) devolve as Almas uma vez;
 * `manchaAtiva` vai a 0 e `manchaAlmas` fica (ele diz que a mancha foi recuperada). Não usa RNG.
 */
export function rodarMancha(e: Estado, dados: DadosDaVigilia): void {
  const u8 = e.jogador4U8;
  if (u8[JOGADOR4_U8.manchaAtiva] === 0) return;
  const j = e.jogador;
  const j4 = e.jogador4;
  let dx = j4[JOGADOR4.manchaX]! - j[JOGADOR.x]!;
  if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
  if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
  let dy = j4[JOGADOR4.manchaY]! - j[JOGADOR.y]!;
  if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
  if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
  const raio = dados.combate.manchaRaio;
  if (dx * dx + dy * dy > raio * raio) return;
  u8[JOGADOR4_U8.manchaAtiva] = 0;
  const valor = e.jogador4U32[JOGADOR4_U32.manchaAlmas]!;
  creditarAlmas(e, valor);
  FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
  FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
  FLOATS_DO_EVENTO[2] = valor;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.manchaRecuperada, 0, 0, -1, 0, 0, 0, 0);
}

/** A mancha que o Apagar deixa (SV3): posição no ponto livre, Hora (1 a 5), rótulo da capela (null no MVP) e Almas. */
export interface ManchaDoResultado {
  readonly x: number;
  readonly y: number;
  readonly hora: number;
  readonly rotulo: null;
  readonly almas: number;
}

/** O que a Vigília rendeu (RS1, SV7): calculado uma vez do estado em FIM e entregue a `aplicarFimDeVigilia`. */
export interface ResultadoDaVigilia {
  readonly causa: number;
  /** Segundos do relógio, truncados (RS2). */
  readonly segundos: number;
  readonly nivel: number;
  readonly mortes: number;
  /** HP efetivamente perdido, arredondado ao mais próximo (PE2). */
  readonly danoRecebido: number;
  readonly aparos: number;
  /** Todas as Almas do contador no fim (inclui as recuperadas e as Bolsas; as do chão se perdem, MC2). */
  readonly almas: number;
  readonly almasAoSantuario: number;
  /** A mancha nova (Apagar com N ≥ 2), ou null. */
  readonly mancha: ManchaDoResultado | null;
  /** A mancha do meta foi recuperada nesta Vigília (MC8). */
  readonly recuperouMancha: boolean;
}

const PONTO_LIVRE = { x: 0, y: 0 };

/** Função pura do estado (qualquer fase; o crédito só se faz em FIM, uma vez: SV7). */
export function resultadoDaVigilia(e: Estado, dados: DadosDaVigilia): ResultadoDaVigilia {
  const causa = e.jogador4U8[JOGADOR4_U8.causaDoFim]!;
  const almas = e.progresso[PROGRESSAO.almas]!;
  const naMancha = almasNaMancha(causa, almas, dados.combate.manchaPct);
  let mancha: ManchaDoResultado | null = null;
  if (naMancha >= 1) {
    pontoLivreMaisProximo(dados.obstaculos, e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!, dados.combate.manchaMargem, PONTO_LIVRE);
    mancha = { x: PONTO_LIVRE.x, y: PONTO_LIVRE.y, hora: horaDoRelogio(e.cab[CAB.relogio]!), rotulo: null, almas: naMancha };
  }
  return {
    causa,
    segundos: Math.floor(e.cab[CAB.relogio]! / 60),
    nivel: e.progresso[PROGRESSAO.nivel]!,
    mortes: e.mundo[MUNDO.mortes]!,
    danoRecebido: Math.round(e.jogador4[JOGADOR4.danoRecebido]!),
    aparos: e.jogador4U32[JOGADOR4_U32.aparos]!,
    almas,
    almasAoSantuario: almasAoSantuario(causa, almas, naMancha),
    mancha,
    recuperouMancha: e.jogador4U8[JOGADOR4_U8.manchaAtiva] === 0 && e.jogador4U32[JOGADOR4_U32.manchaAlmas]! > 0,
  };
}
