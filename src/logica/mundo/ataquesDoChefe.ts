// A máquina do Lanterneiro por passo (design/decisoes-F-009.md §2, §3; FS1 a FS4, AT1 a AT6, PO2, PO3, FU1): os relógios, a escolha
// e a resolução dos ataques, a cegueira, o Agarrar, as zonas de Lanterna, a Fúria e o início e o fim das fases. Chamada por
// `rodarAtaques` (com o bit `ataques`) depois do laço dos médios e antes da contagem de ameaças aparáveis. Sem RNG: o ciclo de cada
// fase é uma tabela. Regra do laço quente: nenhum double atravessa chamada, nem nas funções frias (rascunhos: V, BRUTO,
// FLOATS_DO_EVENTO); o dano do chefe passa por BRUTO[0], multiplicado pela Fúria antes de `danoAoJogador`.
import { CAB, CHEFE_F32, CHEFE_U16, CHEFE_U32, CHEFE_U8, JOGADOR, JOGADOR2, SEM_CHEFE, type Estado } from '../nucleo/estado';
import { EVENTO, FLOATS_DO_EVENTO, FORMA, gravarEvento } from '../nucleo/eventos';
import { aparar } from './aparo';
import { GEO, distanciaComSinal } from './caixa';
import { ZONA_PENDENTE, cancelarAtaqueDoChefe, quebrarPeloAgarrar } from './chefe';
import { BRUTO, DESFECHO, ORIGEM_DO_DANO, resolverAcertoNoJogador } from './contato';
import { ATAQUE_DO_CHEFE, type DadosDaVigilia } from './dados';
import { convocar } from './etapas';
import { RAIO_DO_JOGADOR } from './jogador';
import { FASE_DO_ATAQUE, TIPO } from './tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from './toro';

const A = ATAQUE_DO_CHEFE;
/** Desfecho do evento `golpeInimigo` de um golpe que não pegou o jogador (o mesmo `errou` de ataques.ts). */
const ERROU = 4;
/** Cosseno de meio cone de 60° (AT3): o literal da D9, que aceita 30° e recusa 31°. */
const COSSENO_DO_CONE = 0.866;
/**
 * Os ciclos fixos por fase (FS2), em ordem: V Vara, B Bater, L Luz Cega, A Lanterna, G Agarrar. Cada fase herda os ataques das
 * anteriores: fase 1 `V B V L`; fase 2 `V A B A V L`; fase 3 `V G B A V L G B`.
 */
const CICLOS: readonly (readonly number[])[] = [
  [A.vara, A.bater, A.vara, A.luzCega],
  [A.vara, A.lanterna, A.bater, A.lanterna, A.vara, A.luzCega],
  [A.vara, A.agarrar, A.bater, A.lanterna, A.vara, A.luzCega, A.agarrar, A.bater],
];
/** Forma do evento de telegrafo e de golpe, por ataque (AT1). */
const FORMA_DO_ATAQUE = [0, FORMA.varaArco, FORMA.varaLinha, FORMA.luzCega, FORMA.lanternaZona, FORMA.explosaoAnel, FORMA.agarrar] as const;

/** Entrada e saída de `rodarChefe` com `rodarAtaques`: [0] ameaças aparáveis, [1] aparos já feitos no passo, [2] 1 se a janela do aparo está ativa. */
export const RESUMO = new Int32Array(3);
/** Vetor do chefe ao jogador no passo: [0] dx, [1] dy, [2] a distância centro a centro. */
const V = new Float64Array(4);

/**
 * Um passo do Lanterneiro (OP da D9): compensa o relógio parado na transição, anda os relógios (transição, Quebra, Postura,
 * esperas), a máquina de ataques (fora da Quebra e da transição), as zonas, a cegueira e o Agarrar, e emite a Fúria.
 * Chamada só com o chefe vivo.
 */
export function rodarChefe(e: Estado, dados: DadosDaVigilia): void {
  const u16 = e.chefeU16;
  const s = u16[CHEFE_U16.slot]!;
  if (s === SEM_CHEFE) return;
  const u8 = e.chefeU8;
  const preso = u8[CHEFE_U8.presoPassos]!;
  let parado = false;
  // O relógio da Vigília não anda na transição (FS1): `passoVivo` o somou e aqui se desfaz (nada leu o relógio no meio).
  if (u16[CHEFE_U16.transicaoPassos]! > 0) {
    parado = true;
    e.cab[CAB.relogio] = e.cab[CAB.relogio]! - 1;
    const t = u16[CHEFE_U16.transicaoPassos]! - 1;
    u16[CHEFE_U16.transicaoPassos] = t;
    if (t === 0) terminarTransicao(e, dados, s);
  }
  // A Quebra (PO2) pára o chefe nos 180 passos seguintes à abertura; a Postura (em 100 desde então) zera no passo depois do último.
  const quebra = u16[CHEFE_U16.quebraPassos]!;
  if (quebra > 0) {
    parado = true;
    if (u8[CHEFE_U8.quebraNova] === 0) u16[CHEFE_U16.quebraPassos] = quebra - 1;
  } else if (e.chefeF32[CHEFE_F32.postura]! >= dados.chefe.posturaMax) terminarQuebra(e, dados, s);
  if (!parado) {
    relogiosDoChefe(e, dados);
    rodarMaquina(e, dados, s);
  }
  rodarZonas(e, dados, s);
  rodarCegueira(e, dados, s);
  // Preso (AT6): os 60 passos contam dos seguintes ao golpe; o do golpe não desconta.
  if (preso > 0) u8[CHEFE_U8.presoPassos] = preso - 1;
  u8[CHEFE_U8.quebraNova] = 0;
  emitirFuria(e, dados, s);
}

/** A Quebra acabou (PO2): Postura em 0, evento 42, o chefe volta livre depois de 30 passos de espera. */
function terminarQuebra(e: Estado, dados: DadosDaVigilia, s: number): void {
  const ini = e.inimigos;
  e.chefeF32[CHEFE_F32.postura] = 0;
  e.chefeU16[CHEFE_U16.posturaOciosa] = 0;
  ini.ataqueFase[s] = FASE_DO_ATAQUE.recuperacao;
  ini.ataqueTimer[s] = dados.chefe.esperaPosQuebra;
  ini.ataqueId[s] = 0;
  FLOATS_DO_EVENTO[0] = ini.x[s]!;
  FLOATS_DO_EVENTO[1] = ini.y[s]!;
  FLOATS_DO_EVENTO[2] = 0;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.quebraAcabou, 0, 0, s, e.pool.geracao[s]!, TIPO.o_lanterneiro, 0, 0);
}

/** A transição acabou (FS1): a fase seguinte vale, com as esperas dela; evento 40 (forma 2). */
function terminarTransicao(e: Estado, dados: DadosDaVigilia, s: number): void {
  const c = dados.chefe;
  const u8 = e.chefeU8;
  const u16 = e.chefeU16;
  const fase = u8[CHEFE_U8.fase]! + 1;
  u8[CHEFE_U8.fase] = fase;
  if (fase === 2) u16[CHEFE_U16.convocaEspera] = c.convocaPrimeira;
  else if (fase === 3) u16[CHEFE_U16.explosaoEspera] = c.explosaoPrimeira;
  const ini = e.inimigos;
  ini.ataqueFase[s] = FASE_DO_ATAQUE.livre;
  ini.ataqueTimer[s] = 0;
  FLOATS_DO_EVENTO[0] = ini.x[s]!;
  FLOATS_DO_EVENTO[1] = ini.y[s]!;
  FLOATS_DO_EVENTO[2] = fase;
  FLOATS_DO_EVENTO[3] = ini.hp[s]!;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.chefeFase, 0, 2, s, e.pool.geracao[s]!, TIPO.o_lanterneiro, 0, 0);
}

/**
 * Início da transição (FS1), no fim do passo (`rodarEtapa`): com a fase < 3 e o HP no limiar da próxima, o chefe fica 90 passos
 * sem agir nem levar dano, a Postura e a Quebra vão a 0, o ataque é cancelado e a fase máxima sobe; evento 40 (forma 1).
 */
export function verificarFaseDoChefe(e: Estado, dados: DadosDaVigilia): void {
  const u16 = e.chefeU16;
  const s = u16[CHEFE_U16.slot]!;
  if (s === SEM_CHEFE || u16[CHEFE_U16.transicaoPassos]! > 0) return;
  const u8 = e.chefeU8;
  const fase = u8[CHEFE_U8.fase]!;
  if (fase >= 3) return;
  const c = dados.chefe;
  const limiar = Math.fround((e.chefeF32[CHEFE_F32.hpMax]! * c.limiarPct[fase - 1]!) / 100);
  const ini = e.inimigos;
  if (ini.hp[s]! > limiar) return;
  u16[CHEFE_U16.transicaoPassos] = c.transicaoPassos;
  u16[CHEFE_U16.quebraPassos] = 0;
  e.chefeF32[CHEFE_F32.postura] = 0;
  u16[CHEFE_U16.posturaOciosa] = 0;
  cancelarAtaqueDoChefe(e);
  u8[CHEFE_U8.faseMax] = fase + 1;
  FLOATS_DO_EVENTO[0] = ini.x[s]!;
  FLOATS_DO_EVENTO[1] = ini.y[s]!;
  FLOATS_DO_EVENTO[2] = fase + 1;
  FLOATS_DO_EVENTO[3] = ini.hp[s]!;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.chefeFase, 0, 1, s, e.pool.geracao[s]!, TIPO.o_lanterneiro, 0, 0);
}

/** Espera da regeneração da Postura (PO3) e as esperas do Convocar e da Explosão (FS3, FS4); só andam fora da Quebra e da transição. */
function relogiosDoChefe(e: Estado, dados: DadosDaVigilia): void {
  const u16 = e.chefeU16;
  const c = dados.chefe;
  const ociosa = u16[CHEFE_U16.posturaOciosa]!;
  if (ociosa < c.regenEspera) u16[CHEFE_U16.posturaOciosa] = ociosa + 1;
  const postura = e.chefeF32[CHEFE_F32.postura]!;
  if (u16[CHEFE_U16.posturaOciosa]! >= c.regenEspera && postura > 0) {
    e.chefeF32[CHEFE_F32.postura] = Math.fround(Math.max(0, postura - c.regenPorPasso));
  }
  const fase = e.chefeU8[CHEFE_U8.fase]!;
  const cv = u16[CHEFE_U16.convocaEspera]!;
  if (fase >= 2 && cv > 0) u16[CHEFE_U16.convocaEspera] = cv - 1;
  const ex = u16[CHEFE_U16.explosaoEspera]!;
  if (fase >= 3 && ex > 0) u16[CHEFE_U16.explosaoEspera] = ex - 1;
}

/** O vetor chefe → jogador em V (dx, dy no toro; d). */
function vetorAoJogador(e: Estado, s: number): void {
  const ini = e.inimigos;
  let dx = e.jogador[JOGADOR.x]! - ini.x[s]!;
  if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
  if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
  let dy = e.jogador[JOGADOR.y]! - ini.y[s]!;
  if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
  if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
  V[0] = dx;
  V[1] = dy;
  V[2] = Math.sqrt(dx * dx + dy * dy);
}

/** O jogador está dentro da forma do ataque `id`, com a mira fixada (AT1, §3)? Usa V. */
function pegaOJogador(e: Estado, dados: DadosDaVigilia, s: number, id: number): boolean {
  const ini = e.inimigos;
  const dx = V[0]!;
  const dy = V[1]!;
  const d = V[2]!;
  const mx = ini.miraX[s]!;
  const my = ini.miraY[s]!;
  const folga = RAIO_DO_JOGADOR;
  if (id === A.vara) return d <= 128 + folga && dx * mx + dy * my >= 0;
  if (id === A.bater) {
    const a = dx * mx + dy * my;
    const b = dx * -my + dy * mx;
    return a >= 0 && a <= 192 + folga && b >= -(24 + folga) && b <= 24 + folga;
  }
  if (id === A.luzCega) return d <= 192 + folga && dx * mx + dy * my >= COSSENO_DO_CONE * d;
  if (id === A.agarrar) {
    GEO[0] = dx;
    GEO[1] = dy;
    distanciaComSinal();
    return GEO[2]! <= dados.chefe.agarrarAlcance + folga;
  }
  return false;
}

/** Quantas zonas de Lanterna estão ocupadas (ativas ou com o telegrafo em curso). */
function zonasOcupadas(e: Estado): number {
  let n = 0;
  for (let z = 0; z < 3; z++) if (e.chefeU16[CHEFE_U16.zonaTimer0 + z] !== 0) n++;
  return n;
}

/** A máquina (AT1): relógios do ataque em curso, resolução ao fim do telegrafo, escolha do seguinte com o chefe livre. */
function rodarMaquina(e: Estado, dados: DadosDaVigilia, s: number): void {
  const c = dados.chefe;
  const ini = e.inimigos;
  let fase = ini.ataqueFase[s]!;
  let timer = ini.ataqueTimer[s]!;
  vetorAoJogador(e, s);
  if (fase === FASE_DO_ATAQUE.telegrafo) {
    timer--;
    const id = ini.ataqueId[s]!;
    if (id === A.explosao) varrerAnel(e, dados, s, timer);
    if (timer === 0) {
      resolver(e, dados, s, id);
      fase = FASE_DO_ATAQUE.recuperacao;
      timer = id === A.convocar ? c.convocaRecuperacao : c.recuperacao[id]!;
    }
  } else if (fase === FASE_DO_ATAQUE.recuperacao) {
    timer--;
    if (timer === 0) fase = FASE_DO_ATAQUE.livre;
  }
  ini.ataqueFase[s] = fase;
  ini.ataqueTimer[s] = timer;
  if (fase === FASE_DO_ATAQUE.livre) iniciarAtaque(e, dados, s);
  // Ameaça aparável: telegrafo branco com o jogador dentro da forma (AP5, FS2).
  const id = ini.ataqueId[s]!;
  if (ini.ataqueFase[s] === FASE_DO_ATAQUE.telegrafo && id !== A.convocar && c.aparavel[id] === 1 && pegaOJogador(e, dados, s, id)) RESUMO[0] = RESUMO[0]! + 1;
}

/** Escolhe o ataque da vez (Explosão > Convocar > ciclo) e o telegrafa (FS2); o do ciclo só começa com o jogador no gatilho. */
function iniciarAtaque(e: Estado, dados: DadosDaVigilia, s: number): void {
  const c = dados.chefe;
  const u16 = e.chefeU16;
  const faseDoChefe = e.chefeU8[CHEFE_U8.fase]!;
  let id: number;
  if (faseDoChefe >= 3 && u16[CHEFE_U16.explosaoEspera] === 0) {
    id = A.explosao;
    u16[CHEFE_U16.explosaoEspera] = c.explosaoIntervalo;
    e.chefeU8[CHEFE_U8.explosaoAcertou] = 0;
  } else if (faseDoChefe >= 2 && u16[CHEFE_U16.convocaEspera] === 0) {
    id = A.convocar;
    u16[CHEFE_U16.convocaEspera] = c.convocaIntervalo;
  } else {
    const ciclo = CICLOS[faseDoChefe - 1]!;
    const u32 = e.chefeU32;
    // Com as 3 zonas ocupadas, a Lanterna é pulada (FS2): a sequência anda uma posição.
    let seq = u32[CHEFE_U32.ataqueSeq]!;
    for (let k = 0; k < ciclo.length && ciclo[seq % ciclo.length] === A.lanterna && zonasOcupadas(e) >= c.zonasMaximas; k++) seq++;
    u32[CHEFE_U32.ataqueSeq] = seq;
    id = ciclo[seq % ciclo.length]!;
    if (V[2]! > c.gatilho[id]!) return;
  }
  const ini = e.inimigos;
  const d = V[2]!;
  let mx: number;
  let my: number;
  if (d > 0) {
    mx = V[0]! / d;
    my = V[1]! / d;
  } else {
    mx = e.jogador[JOGADOR.dirX]!;
    my = e.jogador[JOGADOR.dirY]!;
  }
  ini.miraX[s] = mx;
  ini.miraY[s] = my;
  e.chefeF32[CHEFE_F32.miraX] = mx;
  e.chefeF32[CHEFE_F32.miraY] = my;
  ini.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
  ini.ataqueId[s] = id;
  ini.ataqueTimer[s] = id === A.convocar ? c.convocaCast : c.telegrafo[id]!;
  if (id === A.lanterna) fixarZona(e);
  if (id === A.convocar) return;
  FLOATS_DO_EVENTO[0] = ini.x[s]!;
  FLOATS_DO_EVENTO[1] = ini.y[s]!;
  FLOATS_DO_EVENTO[2] = ini.ataqueTimer[s]!;
  FLOATS_DO_EVENTO[3] = id === A.vara ? 128 + RAIO_DO_JOGADOR : id === A.bater || id === A.luzCega ? 192 + RAIO_DO_JOGADOR : id === A.explosao ? c.explosaoRaioFim : c.zonaRaio;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.telegrafo, 0, FORMA_DO_ATAQUE[id]!, s, e.pool.geracao[s]!, TIPO.o_lanterneiro, 0, 0);
}

/** A zona de Lanterna fica no ponto do jogador no início do telegrafo (AT5), na 1ª zona livre; marcada pendente até o fim dele. */
function fixarZona(e: Estado): void {
  const u16 = e.chefeU16;
  for (let z = 0; z < 3; z++) {
    if (u16[CHEFE_U16.zonaTimer0 + z] !== 0) continue;
    e.chefeF32[CHEFE_F32.zonaX0 + z] = e.jogador[JOGADOR.x]!;
    e.chefeF32[CHEFE_F32.zonaY0 + z] = e.jogador[JOGADOR.y]!;
    u16[CHEFE_U16.zonaTimer0 + z] = ZONA_PENDENTE;
    return;
  }
}

/** O dano bruto de um golpe do chefe com a Fúria (FU1) em BRUTO[0]: `dano × (100 + 5n)/100`, em Float32. */
function bruto(e: Estado, dados: DadosDaVigilia, dano: number): void {
  const c = dados.chefe;
  const relogio = e.cab[CAB.relogio]!;
  if (relogio < c.furiaInicio) {
    BRUTO[0] = dano;
    return;
  }
  const n = Math.floor((relogio - c.furiaInicio) / c.furiaIntervalo) + 1;
  BRUTO[0] = Math.fround((dano * (100 + c.furiaPct * n)) / 100);
}

/** O golpe do chefe pelo caminho único (EP1): o aparo antes da esquiva e do dano, só nos brancos; devolve o desfecho. */
function golpear(e: Estado, dados: DadosDaVigilia, s: number, id: number): number {
  const c = dados.chefe;
  const ini = e.inimigos;
  if (RESUMO[2] === 1 && c.aparavel[id] === 1) {
    FLOATS_DO_EVENTO[0] = ini.x[s]!;
    FLOATS_DO_EVENTO[1] = ini.y[s]!;
    aparar(e, dados, RESUMO[1]!, s, TIPO.o_lanterneiro);
    RESUMO[1] = RESUMO[1]! + 1;
    return DESFECHO.aparado;
  }
  return resolverAcertoNoJogador(e, dados, ORIGEM_DO_DANO.golpe, s);
}

/** Grava o `golpeInimigo` do chefe: x, y, dano bruto (0 se evitado) e o desfecho. */
function eventoDoGolpe(e: Estado, s: number, id: number, desfecho: number): void {
  const ini = e.inimigos;
  FLOATS_DO_EVENTO[0] = ini.x[s]!;
  FLOATS_DO_EVENTO[1] = ini.y[s]!;
  FLOATS_DO_EVENTO[2] = desfecho === DESFECHO.acertou ? BRUTO[0]! : 0;
  FLOATS_DO_EVENTO[3] = desfecho;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.golpeInimigo, 0, FORMA_DO_ATAQUE[id]!, s, e.pool.geracao[s]!, TIPO.o_lanterneiro, 0, 0);
}

/** O fim do telegrafo do ataque `id`: o golpe, ou o Convocar. O ciclo anda (FS2); os periódicos não. */
function resolver(e: Estado, dados: DadosDaVigilia, s: number, id: number): void {
  const c = dados.chefe;
  if (id === A.convocar) {
    convocar(e, dados, s, TIPO.o_lanterneiro);
    return;
  }
  if (id !== A.explosao) e.chefeU32[CHEFE_U32.ataqueSeq] = e.chefeU32[CHEFE_U32.ataqueSeq]! + 1;
  if (id === A.explosao) return;
  if (id === A.lanterna) {
    // Libera a zona pendente: ativa por 360 passos depois do telegrafo (AT5).
    for (let z = 0; z < 3; z++) if (e.chefeU16[CHEFE_U16.zonaTimer0 + z] === ZONA_PENDENTE) e.chefeU16[CHEFE_U16.zonaTimer0 + z] = c.zonaPassos;
    FLOATS_DO_EVENTO[0] = e.chefeF32[CHEFE_F32.zonaX0]!;
    FLOATS_DO_EVENTO[1] = e.chefeF32[CHEFE_F32.zonaY0]!;
    FLOATS_DO_EVENTO[2] = 0;
    FLOATS_DO_EVENTO[3] = ERROU;
    gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.golpeInimigo, 0, FORMA.lanternaZona, s, e.pool.geracao[s]!, TIPO.o_lanterneiro, 0, 0);
    return;
  }
  let desfecho = ERROU;
  if (pegaOJogador(e, dados, s, id)) {
    if (id === A.agarrar) bruto(e, dados, (e.jogador2[JOGADOR2.hpMax]! * c.agarrarPct) / 100);
    else bruto(e, dados, c.dano[id]!);
    desfecho = golpear(e, dados, s, id);
    if (desfecho === DESFECHO.aparado && id === A.agarrar) quebrarPeloAgarrar(e, dados);
    else if (desfecho === DESFECHO.acertou) {
      if (id === A.luzCega) {
        e.chefeU16[CHEFE_U16.cegoPassos] = c.cegoPassos;
        efeitoNoJogador(e, s, 1, c.cegoPassos);
      } else if (id === A.agarrar) {
        e.chefeU8[CHEFE_U8.presoPassos] = c.presoPassos;
        efeitoNoJogador(e, s, 2, c.presoPassos);
      }
    }
  }
  eventoDoGolpe(e, s, id, desfecho);
}

/** Evento 43: o efeito que o jogador sofre (1 cego, 2 preso, 3 queimando) e por quantos passos. */
function efeitoNoJogador(e: Estado, s: number, forma: number, passos: number): void {
  FLOATS_DO_EVENTO[0] = e.jogador[JOGADOR.x]!;
  FLOATS_DO_EVENTO[1] = e.jogador[JOGADOR.y]!;
  FLOATS_DO_EVENTO[2] = passos;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.efeitoNoJogador, 0, forma, s, e.pool.geracao[s]!, TIPO.o_lanterneiro, 0, 0);
}

/**
 * O anel da Explosão (AT5): no passo `t` do telegrafo o raio vai de 32 a 192 em 60 passos; o jogador cuja hitbox toca a faixa
 * (|d − r| ≤ meia-espessura + 16) leva o golpe uma só vez por anel; se os i-frames cobrem o primeiro contato, o acerto está consumido.
 */
function varrerAnel(e: Estado, dados: DadosDaVigilia, s: number, restante: number): void {
  if (e.chefeU8[CHEFE_U8.explosaoAcertou] === 1) return;
  const c = dados.chefe;
  const total = c.telegrafo[A.explosao]!;
  const r = c.explosaoRaioIni + ((c.explosaoRaioFim - c.explosaoRaioIni) * (total - restante)) / total;
  const lim = c.explosaoMeiaEspessura + RAIO_DO_JOGADOR;
  const dif = V[2]! - r;
  if (dif > lim || dif < -lim) return;
  e.chefeU8[CHEFE_U8.explosaoAcertou] = 1;
  bruto(e, dados, c.dano[A.explosao]!);
  const desfecho = resolverAcertoNoJogador(e, dados, ORIGEM_DO_DANO.golpe, s);
  eventoDoGolpe(e, s, A.explosao, desfecho);
}

/** Os ticks das zonas de Lanterna (AT5): 1,0 a cada 10 passos, com o jogador a ≤ 64 + 16 do ponto. */
function rodarZonas(e: Estado, dados: DadosDaVigilia, s: number): void {
  const u16 = e.chefeU16;
  const c = dados.chefe;
  for (let z = 0; z < 3; z++) {
    const t = u16[CHEFE_U16.zonaTimer0 + z]!;
    if (t === 0 || t === ZONA_PENDENTE) continue;
    const novo = t - 1;
    u16[CHEFE_U16.zonaTimer0 + z] = novo;
    if (novo % c.tickPassos !== 0) continue;
    let dx = e.jogador[JOGADOR.x]! - e.chefeF32[CHEFE_F32.zonaX0 + z]!;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = e.jogador[JOGADOR.y]! - e.chefeF32[CHEFE_F32.zonaY0 + z]!;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    const lim = c.zonaRaio + RAIO_DO_JOGADOR;
    if (dx * dx + dy * dy > lim * lim) continue;
    tickNoJogador(e, dados, s, c.tickZona, 3);
  }
}

/** Os ticks da cegueira (AT3): 8/6 a cada 10 passos nos 120 seguintes ao golpe. */
function rodarCegueira(e: Estado, dados: DadosDaVigilia, s: number): void {
  const t = e.chefeU16[CHEFE_U16.cegoPassos]!;
  if (t === 0) return;
  const novo = t - 1;
  e.chefeU16[CHEFE_U16.cegoPassos] = novo;
  if (novo % dados.chefe.tickPassos === 0) tickNoJogador(e, dados, s, dados.chefe.tickCego, 0);
}

/** Um tick de efeito (AT4): origem `efeito`, os i-frames o evitam, sem esquiva perfeita; o evento 43 só nos ticks de zona (forma 3). */
function tickNoJogador(e: Estado, dados: DadosDaVigilia, s: number, dano: number, forma: number): void {
  bruto(e, dados, dano);
  const desfecho = resolverAcertoNoJogador(e, dados, ORIGEM_DO_DANO.efeito, s);
  if (desfecho === DESFECHO.acertou && forma !== 0) efeitoNoJogador(e, s, forma, 0);
}

/** A Fúria (FU1): o evento 44 no passo em que `n` muda (relógio = início + k × 600); sem estado. */
function emitirFuria(e: Estado, dados: DadosDaVigilia, s: number): void {
  const c = dados.chefe;
  const relogio = e.cab[CAB.relogio]!;
  if (relogio < c.furiaInicio || (relogio - c.furiaInicio) % c.furiaIntervalo !== 0 || e.chefeU16[CHEFE_U16.transicaoPassos]! > 0) return;
  const n = (relogio - c.furiaInicio) / c.furiaIntervalo + 1;
  FLOATS_DO_EVENTO[0] = e.inimigos.x[s]!;
  FLOATS_DO_EVENTO[1] = e.inimigos.y[s]!;
  FLOATS_DO_EVENTO[2] = n;
  FLOATS_DO_EVENTO[3] = Math.fround((100 + c.furiaPct * n) / 100);
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.furia, 0, 0, s, e.pool.geracao[s]!, TIPO.o_lanterneiro, 0, 0);
}
