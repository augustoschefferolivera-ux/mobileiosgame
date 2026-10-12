// A Fogueira (design/decisoes-F-008.md FG1 a FG8, FG9): entrar no raio abre a etapa FOGUEIRA, em que o tempo da Vigília
// para (relógio, horda, ataques, contato, diretor e armas) e o jogador age: Descansar, Forjar União e Partir. Sair do
// raio equivale a Partir. Este módulo tem o passo da etapa (`passoFogueira`), a entrada e a saída do raio, as três ações
// e a cópia-sombra (FG9). Sem RNG. Regra do laço quente: nenhum double atravessa chamada, nem nas funções frias
// (rascunho: FLOATS_DO_EVENTO).
import { liberarProjetil } from '../armas/projeteis';
import {
  CAB,
  CAPACIDADE_DE_INIMIGOS,
  CAPACIDADE_DE_PROJETEIS,
  ETAPA,
  FOGUEIRA_F32,
  FOGUEIRA_U8,
  JOGADOR,
  JOGADOR2,
  JOGADOR3_U8,
  JOGADOR4_U8,
  MUNDO,
  PROGRESSAO,
  TIPO_DE_PROJETIL,
  type Estado,
} from '../nucleo/estado';
import { ACAO, type ComandosDoPasso } from '../nucleo/comandos';
import { EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import { aplicarUniao, uniaoForjavel } from '../progressao/bau';
import { modalAberto } from '../progressao/modal';
import { rodarPickups } from '../progressao/pickups';
import type { DadosDaVigilia } from './dados';
import { rodarFrasco, zerarFrasco } from './frasco';
import { atualizarPromptDeMover, moverJogador } from './jogador';
import { rodarMancha } from './vigilia';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from './toro';

/** Bits de `fogueiraAcoes`: o que já foi usado nesta Fogueira (uma vez cada, FG4 e FG5). */
export const ACAO_DA_FOGUEIRA = { descansou: 1, forjou: 2 } as const;
/** Forma do evento `fogueiraPartiu`: 1 = o bit Partir, 2 = saiu do raio (FG2, FG6). */
export const FORMA_DO_PARTIR = { bit: 1, saiu: 2 } as const;
/** Valor de `intensidade10` depois de Descansar (FG4, FG7): `I` = 1,1. */
const INTENSIDADE_DEPOIS_DE_DESCANSAR = 11;

/**
 * O único teste de "armas ativas" (FG3): fora da Fogueira as armas, a horda, os ataques, o contato e o diretor rodam como
 * sempre; em FOGUEIRA nenhum deles roda (o passo da etapa não os chama), então nada causa dano nem knockback e os timers
 * das armas, as ondas, as facas em voo e o Poder ficam congelados.
 */
export function armasAtivas(e: Estado): boolean {
  return e.fogueiraU8[FOGUEIRA_U8.etapa] !== ETAPA.fogueira;
}

/** Apaga a Fogueira acesa (evento 37). */
export function apagarFogueira(e: Estado): void {
  const u8 = e.fogueiraU8;
  const f = e.fogueiraF32;
  u8[FOGUEIRA_U8.fogueiraAcesa] = 0;
  FLOATS_DO_EVENTO[0] = f[FOGUEIRA_F32.fogueiraX]!;
  FLOATS_DO_EVENTO[1] = f[FOGUEIRA_F32.fogueiraY]!;
  FLOATS_DO_EVENTO[2] = u8[FOGUEIRA_U8.fogueiraHora]!;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.fogueiraApagada, 0, 0, -1, 0, 0, 0, 0);
}

// ——— Cópia-sombra (FG9) ———

const SOMBRAS = new WeakMap<Estado, Uint8Array>();
/** O resumo (nível, Almas, cargas do Frasco) do mesmo passo da sombra, para o envelope do `vigilia` não divergir do buffer. */
const RESUMOS = new WeakMap<Estado, Uint32Array>();

/**
 * Guarda o buffer inteiro na sombra do estado: o último passo dentro do raio, que o save do Partir e da saída grava
 * (ADR-0002 §10). Aloca uma vez por Vigília, na 1ª vez; depois só copia (≈ 10 µs, sem alocação).
 */
export function guardarSombra(e: Estado): void {
  let s = SOMBRAS.get(e);
  if (s === undefined || s.length !== e.bytes.length) {
    s = new Uint8Array(e.bytes.length);
    SOMBRAS.set(e, s);
  }
  s.set(e.bytes);
  let r = RESUMOS.get(e);
  if (r === undefined) {
    r = new Uint32Array(3);
    RESUMOS.set(e, r);
  }
  r[0] = e.progresso[PROGRESSAO.nivel]!;
  r[1] = e.progresso[PROGRESSAO.almas]!;
  r[2] = e.jogador4U8[JOGADOR4_U8.frascoCargas]!;
}

/** O resumo [nível, Almas, cargas] do passo da sombra, ou undefined antes da 1ª Fogueira. */
export function resumoDaSombra(e: Estado): Uint32Array | undefined {
  return RESUMOS.get(e);
}

/** A sombra guardada, ou undefined antes da 1ª Fogueira. */
export function sombraDaFogueira(e: Estado): Uint8Array | undefined {
  return SOMBRAS.get(e);
}

// ——— Entrar e sair ———

/** Distância ao quadrado, no toro, do jogador à Fogueira (FG2: o raio é centro a centro). */
function distanciaAoQuadrado(e: Estado): number {
  const j = e.jogador;
  const f = e.fogueiraF32;
  let dx = f[FOGUEIRA_F32.fogueiraX]! - j[JOGADOR.x]!;
  if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
  if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
  let dy = f[FOGUEIRA_F32.fogueiraY]! - j[JOGADOR.y]!;
  if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
  if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
  return dx * dx + dy * dy;
}

/**
 * Entrar e sair do raio (FG2), no fim do passo da fase VIVA. Em HORA com a Fogueira acesa e o jogador a `d² ≤ 4.096`:
 * abre (etapa FOGUEIRA). Em FOGUEIRA com `d² > 4.096`: é Partir. Sem histerese. Chamada por `rodarEtapa` (entrada) e
 * por `passoFogueira` (saída).
 */
export function verificarRaio(e: Estado, dados: DadosDaVigilia): void {
  const u8 = e.fogueiraU8;
  const etapa = u8[FOGUEIRA_U8.etapa]!;
  const raio = dados.combate.fogueiraRaio;
  if (etapa === ETAPA.hora) {
    if (u8[FOGUEIRA_U8.fogueiraAcesa] === 1 && distanciaAoQuadrado(e) <= raio * raio) abrirFogueira(e);
  } else if (etapa === ETAPA.fogueira && distanciaAoQuadrado(e) > raio * raio) partir(e, FORMA_DO_PARTIR.saiu);
}

/**
 * Ao entrar (FG3): os telegrafos em curso são cancelados (`ataqueFase` e `ataqueTimer` em 0), os projéteis de Sal
 * inimigos são liberados; as facas e as ondas das armas ficam congeladas no lugar. Evento 33 e a sombra.
 */
function abrirFogueira(e: Estado): void {
  const ini = e.inimigos;
  const pos = e.pool.posicao;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    if (pos[s]! < 0) continue;
    ini.ataqueFase[s] = 0;
    ini.ataqueTimer[s] = 0;
  }
  const pr = e.projeteis;
  const posP = e.poolDeProjeteis.posicao;
  for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) if (posP[p]! >= 0 && pr.tipo[p] === TIPO_DE_PROJETIL.sal) liberarProjetil(e, p);
  const u8 = e.fogueiraU8;
  u8[FOGUEIRA_U8.etapa] = ETAPA.fogueira;
  const f = e.fogueiraF32;
  FLOATS_DO_EVENTO[0] = f[FOGUEIRA_F32.fogueiraX]!;
  FLOATS_DO_EVENTO[1] = f[FOGUEIRA_F32.fogueiraY]!;
  FLOATS_DO_EVENTO[2] = u8[FOGUEIRA_U8.fogueiraHora]!;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.fogueiraAberta, 0, 0, -1, 0, 0, 0, 0);
  guardarSombra(e);
}

/**
 * Partir (FG6): a Fogueira se apaga (evento 37) e a etapa volta a HORA. Evento 36 (x, y, hora, bits de ações usadas) com a
 * forma 1 (bit) ou 2 (saiu do raio). O save é o da sombra (FG9), que a cena grava ao ver o evento.
 */
export function partir(e: Estado, forma: number): void {
  const u8 = e.fogueiraU8;
  const f = e.fogueiraF32;
  FLOATS_DO_EVENTO[0] = f[FOGUEIRA_F32.fogueiraX]!;
  FLOATS_DO_EVENTO[1] = f[FOGUEIRA_F32.fogueiraY]!;
  FLOATS_DO_EVENTO[2] = u8[FOGUEIRA_U8.fogueiraHora]!;
  FLOATS_DO_EVENTO[3] = u8[FOGUEIRA_U8.fogueiraAcoes]!;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.fogueiraPartiu, 0, forma, -1, 0, 0, 0, 0);
  apagarFogueira(e);
  u8[FOGUEIRA_U8.etapa] = ETAPA.hora;
}

// ——— Ações ———

/** Ação negada (já usada, sem condição ou sem Almas): evento 19 com x, y, Almas e custo, e a ação na forma. */
function negar(e: Estado, acao: number, custo: number): void {
  const j = e.jogador;
  FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
  FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
  FLOATS_DO_EVENTO[2] = e.progresso[PROGRESSAO.almas]!;
  FLOATS_DO_EVENTO[3] = custo;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.acaoNegada, 0, acao, -1, 0, 0, 0, 0);
}

/**
 * Descansar (FG4): `hp = hpMax`, as cargas do Frasco voltam ao total do Vigilante, a cura em curso se zera (sem evento e
 * sem devolver carga) e `I` passa a 1,1 até a próxima Fogueira acender (FG7). Uma vez por Fogueira. Evento 34.
 */
function descansar(e: Estado, dados: DadosDaVigilia): void {
  const u8 = e.fogueiraU8;
  if ((u8[FOGUEIRA_U8.fogueiraAcoes]! & ACAO_DA_FOGUEIRA.descansou) !== 0) {
    negar(e, ACAO.descansar, 0);
    return;
  }
  u8[FOGUEIRA_U8.fogueiraAcoes] = u8[FOGUEIRA_U8.fogueiraAcoes]! | ACAO_DA_FOGUEIRA.descansou;
  const hpMax = e.jogador2[JOGADOR2.hpMax]!;
  e.jogador[JOGADOR.hp] = hpMax;
  e.jogador4U8[JOGADOR4_U8.frascoCargas] = dados.combate.frascoCargas;
  zerarFrasco(e);
  e.mundo[MUNDO.intensidade10] = INTENSIDADE_DEPOIS_DE_DESCANSAR;
  const f = e.fogueiraF32;
  FLOATS_DO_EVENTO[0] = f[FOGUEIRA_F32.fogueiraX]!;
  FLOATS_DO_EVENTO[1] = f[FOGUEIRA_F32.fogueiraY]!;
  FLOATS_DO_EVENTO[2] = hpMax;
  FLOATS_DO_EVENTO[3] = u8[FOGUEIRA_U8.fogueiraHora]!;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.descansou, 0, 0, -1, 0, 0, 0, 0);
}

/**
 * Forjar União (FG5): a União que o baú daria sem o gate de relógio (`uniaoForjavel`), pelo custo da hora da Fogueira.
 * Sem União possível, sem Almas ou já forjada: negada. Débito, `aplicarUniao` (evento 18), bit 2 e evento 35 (a arma
 * resultado no campo da arma; custo e hora nos floats). Uma vez por Fogueira, sem modal.
 */
function forjar(e: Estado, dados: DadosDaVigilia): void {
  const u8 = e.fogueiraU8;
  const t = dados.progressao;
  const custo = t.forjaCusto[u8[FOGUEIRA_U8.fogueiraHora]!]!;
  const u = (u8[FOGUEIRA_U8.fogueiraAcoes]! & ACAO_DA_FOGUEIRA.forjou) !== 0 ? -1 : uniaoForjavel(e, dados);
  const pr = e.progresso;
  if (u < 0 || pr[PROGRESSAO.almas]! < custo) {
    negar(e, ACAO.forjar, custo);
    return;
  }
  pr[PROGRESSAO.almas] = pr[PROGRESSAO.almas]! - custo;
  aplicarUniao(e, dados, u);
  u8[FOGUEIRA_U8.fogueiraAcoes] = u8[FOGUEIRA_U8.fogueiraAcoes]! | ACAO_DA_FOGUEIRA.forjou;
  const f = e.fogueiraF32;
  FLOATS_DO_EVENTO[0] = f[FOGUEIRA_F32.fogueiraX]!;
  FLOATS_DO_EVENTO[1] = f[FOGUEIRA_F32.fogueiraY]!;
  FLOATS_DO_EVENTO[2] = custo;
  FLOATS_DO_EVENTO[3] = u8[FOGUEIRA_U8.fogueiraHora]!;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.forjou, t.uniaoResultado[u]!, 0, -1, 0, 0, 0, 0);
}

// ——— O passo ———

/**
 * Um passo da etapa FOGUEIRA (design/decisoes-F-008.md §4). Congelamento da fase 0 como no passo vivo; com o modal
 * fechado, as ações na ordem Descansar, Forjar, Partir (o passo do Partir só muda a etapa e anda `passo`). Depois:
 * `passo` + 1 (o `relogio` não anda); jogador (a esquiva e o aparo são zerados, sem custo); Frasco; pickups (um level up
 * abre o modal); a mancha; a saída do raio. Não rodam: horda, armas, Poder, ataques, contato, Postura, rotação, diretor.
 */
export function passoFogueira(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): void {
  const congelamento = e.jogador3U8[JOGADOR3_U8.congelamento]!;
  if (congelamento > 0) {
    e.jogador3U8[JOGADOR3_U8.congelamento] = congelamento - 1;
    return;
  }
  const acoes = cmd.acoes[0]!;
  if ((acoes & (ACAO.descansar | ACAO.forjar | ACAO.partir)) !== 0 && !modalAberto(e)) {
    if ((acoes & ACAO.descansar) !== 0) descansar(e, dados);
    if ((acoes & ACAO.forjar) !== 0) forjar(e, dados);
    if ((acoes & ACAO.partir) !== 0) {
      // A sombra é o último estado dentro do raio, com o Descansar e o Forjar deste mesmo passo.
      guardarSombra(e);
      e.cab[CAB.passo] = e.cab[CAB.passo]! + 1;
      partir(e, FORMA_DO_PARTIR.bit);
      return;
    }
  }
  e.cab[CAB.passo] = e.cab[CAB.passo]! + 1;
  // Esquiva e aparo não valem aqui (FG3); o Frasco e o cancelamento seguem. O bit é restituído para a fonte não perdê-lo.
  cmd.acoes[0] = acoes & (ACAO.frasco | ACAO.frascoCancelar);
  const moveu = moverJogador(e, dados, cmd);
  cmd.acoes[0] = acoes;
  atualizarPromptDeMover(e, moveu);
  rodarFrasco(e, dados);
  rodarPickups(e, dados);
  if (e.jogador4U8[JOGADOR4_U8.manchaAtiva] !== 0) rodarMancha(e, dados);
  verificarRaio(e, dados);
  if (e.fogueiraU8[FOGUEIRA_U8.etapa] === ETAPA.fogueira) guardarSombra(e);
}
