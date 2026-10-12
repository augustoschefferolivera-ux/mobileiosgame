// Aparo bem-sucedido, Postura Quebrada e o armar do Contra-ataque
// (design/decisoes-F-006.md AP6, PQ1 a PQ3, CA1, CA5). Chamado pela fase 6
// (ataques.ts): `aparar` para cada ataque aparável resolvido contra a janela; e,
// depois do laço, `concluirAparos`. Regra do laço quente (ET11, AP15): o delta
// toroidal e `(64 + r)²` vão em linha; as posições entram por FLOATS_DO_EVENTO;
// nenhum double atravessa chamada.
import { SEM_APARADO } from '../armas/acerto';
import { CAB, CAPACIDADE_DE_INIMIGOS, JOGADOR, JOGADOR3, JOGADOR3_U16, JOGADOR3_U8, JOGADOR4_U32, PROMPT, VAGAS_DE_ARMA, type Estado } from '../nucleo/estado';
import { EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import type { DadosDaVigilia } from './dados';
import { FASE_DO_ATAQUE } from './tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from './toro';

/** Atacantes aparados no passo (slots), para a Postura Quebrada no atacante mesmo fora do raio (PQ1). */
const ATACANTES = new Int32Array(CAPACIDADE_DE_INIMIGOS);
let nAtacantes = 0;

/**
 * Cancela o ataque do inimigo `s` e põe a máquina no início (PQ3, OG10): o Oco Grande volta a
 * "livre"; a Noviça fica na espera cheia (o intervalo de 180), que recomeça a cada passo enquanto
 * ele estiver atordoado. O projétil já lançado não é tocado.
 */
export function cancelarAtaque(e: Estado, dados: DadosDaVigilia, s: number, tipo: number): void {
  const c = dados.combate;
  if (c.alcanceDoArco[tipo]! > 0) {
    e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.livre;
    e.inimigos.ataqueTimer[s] = 0;
    e.inimigos.ataqueId[s] = 0;
  } else if (c.intervaloPassos[tipo]! > 0) {
    e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.recuperacao;
    e.inimigos.ataqueTimer[s] = c.intervaloPassos[tipo]!;
  }
}

/**
 * Um ataque aparável resolvido contra a janela ativa (AP6). `aparadosAntes` é quantos já
 * foram aparados neste passo: os efeitos de 1ª ocorrência (+30 com teto, evento 15, congelamento)
 * só valem na primeira. FLOATS_DO_EVENTO[0] e [1] trazem x e y do atacante; `slot` é o dono vivo
 * (−1 = projétil sem dono vivo) e `tipo` o tipo do atacante. `alvoAparado` é o menor slot.
 */
export function aparar(e: Estado, dados: DadosDaVigilia, aparadosAntes: number, slot: number, tipo: number): void {
  const c = dados.combate;
  const u16 = e.jogador3U16;
  if (aparadosAntes === 0) {
    const j3 = e.jogador3;
    const stamina = j3[JOGADOR3.stamina]! + c.devolucaoDoAparo;
    j3[JOGADOR3.stamina] = stamina < c.staminaMax ? stamina : c.staminaMax;
    FLOATS_DO_EVENTO[2] = j3[JOGADOR3.stamina]!;
    FLOATS_DO_EVENTO[3] = 0;
    e.jogador4U32[JOGADOR4_U32.aparos] = e.jogador4U32[JOGADOR4_U32.aparos]! + 1;
    gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.aparo, 0, 0, slot, slot < 0 ? 0 : e.pool.geracao[slot]!, tipo, 0, 0);
    e.jogador3U8[JOGADOR3_U8.congelamento] = c.congelamento;
    // O aparo bem-sucedido cumpre o prompt (TU2); o vazio e o falho não chegam aqui.
    if (e.jogador3U8[JOGADOR3_U8.promptAparo] === PROMPT.visivel) e.jogador3U8[JOGADOR3_U8.promptAparo] = PROMPT.cumprido;
    u16[JOGADOR3_U16.alvoAparadoSlot] = SEM_APARADO;
    u16[JOGADOR3_U16.alvoAparadoGeracao] = 0;
  }
  if (slot >= 0) {
    ATACANTES[nAtacantes++] = slot;
    if (slot < u16[JOGADOR3_U16.alvoAparadoSlot]!) {
      u16[JOGADOR3_U16.alvoAparadoSlot] = slot;
      u16[JOGADOR3_U16.alvoAparadoGeracao] = e.pool.geracao[slot]!;
    }
  }
}

/** Marca a Postura Quebrada no inimigo `s` (PQ2): grava duração + 1, cancela o ataque e emite o evento 17 uma vez. */
function aplicarPostura(e: Estado, dados: DadosDaVigilia, s: number): void {
  const c = dados.combate;
  const ini = e.inimigos;
  const tipo = ini.tipo[s]!;
  if (c.posturaQuebrada[tipo] !== 1) return;
  const ja = ini.quebradaPassos[s] === c.posturaPassos + 1;
  ini.quebradaPassos[s] = c.posturaPassos + 1;
  cancelarAtaque(e, dados, s, tipo);
  if (ja) return;
  FLOATS_DO_EVENTO[0] = ini.x[s]!;
  FLOATS_DO_EVENTO[1] = ini.y[s]!;
  FLOATS_DO_EVENTO[2] = c.posturaPassos;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.posturaQuebrada, 0, 0, s, e.pool.geracao[s]!, tipo, 0, 0);
}

/**
 * Depois do laço da fase 6, em ordem (AP6): zera a janela; arma o Contra-ataque em toda vaga
 * ocupada (CA1) com o evento 18; aplica a Postura Quebrada em área centrada no jogador, de raio
 * 64 + r do alvo (PQ1), e em todo atacante aparado, mesmo fora do raio.
 */
export function concluirAparos(e: Estado, dados: DadosDaVigilia): void {
  const c = dados.combate;
  e.jogador3U8[JOGADOR3_U8.aparoJanela] = 0;
  const b = e.build;
  let vagas = 0;
  for (let v = 0; v < VAGAS_DE_ARMA; v++) {
    if (b.codigo[v] === 0) continue;
    b.caSeq[v] = 1;
    b.caEspera[v] = 0;
    vagas++;
  }
  const j = e.jogador;
  const jx = j[JOGADOR.x]!;
  const jy = j[JOGADOR.y]!;
  const alvo = e.jogador3U16[JOGADOR3_U16.alvoAparadoSlot]!;
  FLOATS_DO_EVENTO[0] = jx;
  FLOATS_DO_EVENTO[1] = jy;
  FLOATS_DO_EVENTO[2] = alvo === SEM_APARADO ? -1 : alvo;
  FLOATS_DO_EVENTO[3] = vagas;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.contraAtaque, 0, 0, alvo === SEM_APARADO ? -1 : alvo, alvo === SEM_APARADO ? 0 : e.jogador3U16[JOGADOR3_U16.alvoAparadoGeracao]!, 0, 0, 0);
  const ini = e.inimigos;
  const pos = e.pool.posicao;
  const raios = dados.tipos.raio;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    if (pos[s]! < 0) continue;
    const tipo = ini.tipo[s]!;
    let dx = ini.x[s]! - jx;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = ini.y[s]! - jy;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    const lim = c.posturaRaio + raios[tipo]!;
    if (dx * dx + dy * dy <= lim * lim) aplicarPostura(e, dados, s);
  }
  for (let k = 0; k < nAtacantes; k++) aplicarPostura(e, dados, ATACANTES[k]!);
  nAtacantes = 0;
}
