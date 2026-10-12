// Jogador (B §3.3; design/decisoes-F-002.md §3, §5, §6 e §7): anda pela
// intenção dos ComandosDoPasso a 144 px/s × |v|, sem inércia, é bloqueado pelos
// inimigos (design/decisoes-F-003.md §2, S4: não aumenta a sobreposição que
// tinha com cada um no início do passo, e nunca é empurrado por eles), colide
// com os obstáculos como um círculo de 16 px e guarda a última direção não
// nula para o desenho. Na F-006 (decisoes-F-006 §2): a stamina e a esquiva
// (timers, comandos, regeneração e deslocamento de 80/21 px por passo pela
// mesma colisão, sem o bloqueio dos inimigos nos i-frames). Também cuida do prompt "Deslize para mover", cujo
// gatilho é a intenção, e não o deslocamento: um obstáculo não segura o prompt.
import { ACAO, type ComandosDoPasso } from '../nucleo/comandos';
import { CAB, CAPACIDADE_DE_INIMIGOS, FOGUEIRA_F32, FOGUEIRA_U8, JOGADOR, JOGADOR3, JOGADOR3_U16, JOGADOR3_U8, JOGADOR_U8, PROMPT, type Estado } from '../nucleo/estado';
import { EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import { segundosEmPassos } from '../nucleo/passos';
import type { DadosDaVigilia } from './dados';
import { limitarPelaArena } from './borda';
import { GEO, distanciaComSinal } from './caixa';
import { comandosDoFrasco } from './frasco';
import { COLISAO, ES, colidirComTodos } from './obstaculos';
import { TIPO } from './tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from './toro';

/** Hitbox do jogador: círculo de 16 px de raio, centrado no incentro do triângulo (§3). */
export const RAIO_DO_JOGADOR = 16;
/** O prompt de mover aparece aos 0:10 de relógio (doc 11 §4): 600 passos. */
export const PASSO_DO_PROMPT_DE_MOVER = segundosEmPassos(10);

/**
 * Timers, comandos e regeneração do jogador (fase 2a a 2c da ordem do passo, ET4):
 * a esquiva sobe de 1 (passo do comando) a 21 e volta a 0; esquiva e aparo só
 * são aceitos fora das três travas, sem buffer; o aparo vence a esquiva no mesmo
 * passo; o fim da janela decide o aparo falho ou vazio (AP7); sem stamina para o custo, a ação
 * é negada sem mexer em nada (ST3); o passo do gasto não regenera nem decrementa
 * o atraso (ST2). Só mexe em inteiros e grava os floats em rascunhos.
 */
function rodarTimersEComandos(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): void {
  const u8 = e.jogador3U8;
  const c = dados.combate;
  // (a) timers
  // O passo que decide o desfecho do aparo (c + 12, ou c + 18 na janela estendida) lê o contador de ameaças
  // do passo anterior (AP5, AP7) e, se for falho, grava o atraso: não regenera nem o decrementa (ST2).
  let decidiuFalho = 0;
  const falho = u8[JOGADOR3_U8.aparoFalho]!;
  if (falho > 0) u8[JOGADOR3_U8.aparoFalho] = falho - 1;
  const janela = u8[JOGADOR3_U8.aparoJanela]!;
  if (janela > 0) {
    u8[JOGADOR3_U8.aparoJanela] = janela - 1;
    if (janela === 1) {
      const j = e.jogador;
      FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
      FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
      FLOATS_DO_EVENTO[2] = e.jogador3[JOGADOR3.stamina]!;
      FLOATS_DO_EVENTO[3] = 0;
      if (e.jogador3U16[JOGADOR3_U16.ameacasAparaveis]! > 0) {
        decidiuFalho = 1;
        u8[JOGADOR3_U8.aparoFalho] = c.aparoFalho;
        if (u8[JOGADOR3_U8.esperaRegen]! < c.aparoFalho) u8[JOGADOR3_U8.esperaRegen] = c.aparoFalho;
        // Com o prompt de aparo na tela, o aparo falho conta para a janela estendida (AP11 (a)).
        if (u8[JOGADOR3_U8.promptAparo] === PROMPT.visivel && u8[JOGADOR3_U8.falhasDeAparo]! < 255) {
          u8[JOGADOR3_U8.falhasDeAparo] = u8[JOGADOR3_U8.falhasDeAparo]! + 1;
        }
        gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.aparoFalho, 0, 0, -1, 0, 0, 0, 0);
      } else {
        gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.aparoVazio, 0, 0, -1, 0, 0, 0, 0);
      }
    }
  }
  let ep = u8[JOGADOR3_U8.esquivaPasso]!;
  if (ep > 0) {
    ep++;
    if (ep > c.esquivaDuracao) ep = 0;
    u8[JOGADOR3_U8.esquivaPasso] = ep;
  }
  // (b) comandos
  let gasto = 0;
  const acoes = cmd.acoes[0]!;
  // Aparo antes da esquiva (ES6); as mesmas travas: fora da esquiva, da janela e do aparo falho (AP8).
  if ((acoes & ACAO.aparo) !== 0 && ep === 0 && u8[JOGADOR3_U8.aparoJanela] === 0 && u8[JOGADOR3_U8.aparoFalho] === 0) {
    const j = e.jogador;
    const j3 = e.jogador3;
    const stamina = j3[JOGADOR3.stamina]!;
    if (stamina < c.custoAparo) {
      FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
      FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
      FLOATS_DO_EVENTO[2] = stamina;
      FLOATS_DO_EVENTO[3] = c.custoAparo;
      gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.acaoNegada, 0, ACAO.aparo, -1, 0, 0, 0, 0);
    } else {
      j3[JOGADOR3.stamina] = stamina - c.custoAparo;
      if (u8[JOGADOR3_U8.esperaRegen]! < c.esperaDoGasto) u8[JOGADOR3_U8.esperaRegen] = c.esperaDoGasto;
      gasto = 1;
      // Janela estendida (AP11): +6 passos com o prompt de aparo na tela e 2 falhas.
      const estendida = u8[JOGADOR3_U8.promptAparo] === PROMPT.visivel && u8[JOGADOR3_U8.falhasDeAparo]! >= 2;
      const limite = estendida ? c.aparoLimiteEstendido : c.aparoLimite;
      u8[JOGADOR3_U8.aparoLimite] = limite;
      u8[JOGADOR3_U8.aparoJanela] = limite + 1;
    }
  }
  if ((acoes & ACAO.esquiva) !== 0 && (acoes & ACAO.aparo) === 0 && ep === 0 && u8[JOGADOR3_U8.aparoJanela] === 0 && u8[JOGADOR3_U8.aparoFalho] === 0) {
    const j = e.jogador;
    const j3 = e.jogador3;
    const stamina = j3[JOGADOR3.stamina]!;
    if (stamina < c.custoEsquiva) {
      FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
      FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
      FLOATS_DO_EVENTO[2] = stamina;
      FLOATS_DO_EVENTO[3] = c.custoEsquiva;
      gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.acaoNegada, 0, ACAO.esquiva, -1, 0, 0, 0, 0);
    } else {
      j3[JOGADOR3.stamina] = stamina - c.custoEsquiva;
      if (u8[JOGADOR3_U8.esperaRegen]! < c.esperaDoGasto) u8[JOGADOR3_U8.esperaRegen] = c.esperaDoGasto;
      gasto = 1;
      // Direção contínua (ES4): a mira normalizada em Float64; nula ou não finita, a última direção do jogador.
      let mx = cmd.mira[0]!;
      let my = cmd.mira[1]!;
      let m2 = mx * mx + my * my;
      if (!(m2 > 0 && m2 < Infinity)) {
        mx = j[JOGADOR.dirX]!;
        my = j[JOGADOR.dirY]!;
        m2 = mx * mx + my * my;
      }
      if (m2 > 0) {
        const m = Math.sqrt(m2);
        mx /= m;
        my /= m;
      } else {
        mx = 0;
        my = -1;
      }
      j3[JOGADOR3.esquivaDirX] = mx;
      j3[JOGADOR3.esquivaDirY] = my;
      u8[JOGADOR3_U8.esquivaPasso] = 1;
      u8[JOGADOR3_U8.esquivaPerfeitaDada] = 0;
      FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
      FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
      FLOATS_DO_EVENTO[2] = j3[JOGADOR3.esquivaDirX]!;
      FLOATS_DO_EVENTO[3] = j3[JOGADOR3.esquivaDirY]!;
      // A esquiva aceita cumpre o prompt (TU1); a negada por stamina não passa por aqui.
      if (u8[JOGADOR3_U8.promptEsquiva] === PROMPT.visivel) u8[JOGADOR3_U8.promptEsquiva] = PROMPT.cumprido;
      gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.esquiva, 0, 0, -1, 0, 0, 0, 0);
    }
  }
  // Frasco (FR1, FR5): depois do aparo e da esquiva (que vencem no mesmo passo) e antes da regeneração, que lê a espera já gravada.
  comandosDoFrasco(e, dados, cmd);
  // (c) regeneração: o passo que gravou o atraso não regenera nem o decrementa.
  if (gasto === 0 && decidiuFalho === 0) {
    const espera = u8[JOGADOR3_U8.esperaRegen]!;
    if (espera > 0) {
      u8[JOGADOR3_U8.esperaRegen] = espera - 1;
    } else {
      const j3 = e.jogador3;
      const stamina = j3[JOGADOR3.stamina]!;
      if (stamina < c.staminaMax) j3[JOGADOR3.stamina] = Math.min(c.staminaMax, stamina + c.regeneracaoPorPasso);
    }
  }
}

/**
 * Move o jogador um passo e devolve se havia intenção de movimento. A
 * intenção acima de |v| = 1 é reduzida ao círculo; NaN e infinito contam como
 * parada. Ordem (§3), em todo passo, mesmo parado: guarda a posição anterior,
 * soma o deslocamento, colide e normaliza no toro em Float32.
 */
export function moverJogador(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): boolean {
  rodarTimersEComandos(e, dados, cmd);
  const j = e.jogador;
  const x = j[JOGADOR.x]!;
  const y = j[JOGADOR.y]!;
  j[JOGADOR.xAnt] = x;
  j[JOGADOR.yAnt] = y;
  let mx = cmd.movimento[0]!;
  let my = cmd.movimento[1]!;
  const m2 = mx * mx + my * my;
  const temIntencao = m2 > 0 && m2 < Infinity;
  let dx = 0;
  let dy = 0;
  if (temIntencao) {
    const m = Math.sqrt(m2);
    j[JOGADOR.dirX] = mx / m;
    j[JOGADOR.dirY] = my / m;
    if (m > 1) {
      mx /= m;
      my /= m;
    }
    // Sal (NV7): só a caminhada, com o salPassos do começo do passo; sem Sal o fator é 1 (exato).
    const fator = e.jogador3U8[JOGADOR3_U8.salPassos]! > 0 ? (100 - e.jogador3U8[JOGADOR3_U8.salPct]!) / 100 : 1;
    dx = mx * dados.velocidadePorPasso * fator;
    dy = my * dados.velocidadePorPasso * fator;
  }
  // Esquiva (ES2, ES5): nos 21 passos o deslocamento dela substitui o da caminhada, na direção fixada.
  const ep = e.jogador3U8[JOGADOR3_U8.esquivaPasso]!;
  if (ep > 0) {
    dx = e.jogador3[JOGADOR3.esquivaDirX]! * dados.combate.esquivaPorPasso;
    dy = e.jogador3[JOGADOR3.esquivaDirY]! * dados.combate.esquivaPorPasso;
  }
  // Empurrão do Grito (CR3): soma ao deslocamento dos 8 passos seguintes ao acerto; os obstáculos e a solidez dos inimigos valem depois.
  const empurrao = e.fogueiraU8[FOGUEIRA_U8.empurraoPassos]!;
  if (empurrao > 0) {
    dx += e.fogueiraF32[FOGUEIRA_F32.empurraoX]!;
    dy += e.fogueiraF32[FOGUEIRA_F32.empurraoY]!;
    e.fogueiraU8[FOGUEIRA_U8.empurraoPassos] = empurrao - 1;
  }
  // A posição vai por COLISAO, sem passar doubles (design/decisoes-F-003.md §2, laço quente).
  COLISAO[ES.x] = x + dx;
  COLISAO[ES.y] = y + dy;
  // Nos i-frames (2 a 13) o jogador ignora os inimigos (ES7); os obstáculos continuam duros.
  if (ep < dados.combate.esquivaIframesDe || ep > dados.combate.esquivaIframesAte) bloquearPelosInimigos(e, dados);
  COLISAO[ES.raio] = RAIO_DO_JOGADOR;
  COLISAO[ES.movX] = dx;
  COLISAO[ES.movY] = dy;
  colidirComTodos(dados.obstaculos, false, e.obstaculoAtivo);
  // A borda da arena (AR2), depois dos obstáculos: a esquiva, o empurrão e o bloqueio dos inimigos passam por ela.
  if (e.fogueiraU8[FOGUEIRA_U8.arenaAtiva] === 1) limitarPelaArena(e, dados, true);
  // A normalização de normalizarNoToro, em linha.
  let nx = Math.fround(COLISAO[ES.x]!);
  if (nx < 0) nx = Math.fround(nx + LARGURA_DO_MAPA);
  if (nx >= LARGURA_DO_MAPA) nx = Math.fround(nx - LARGURA_DO_MAPA);
  let ny = Math.fround(COLISAO[ES.y]!);
  if (ny < 0) ny = Math.fround(ny + ALTURA_DO_MAPA);
  if (ny >= ALTURA_DO_MAPA) ny = Math.fround(ny - ALTURA_DO_MAPA);
  j[JOGADOR.x] = nx;
  j[JOGADOR.y] = ny;
  // O Sal cai uma vez por passo, também na esquiva, logo depois do deslocamento (NV7): ativo em H+1 a H+180.
  const salPassos = e.jogador3U8[JOGADOR3_U8.salPassos]!;
  if (salPassos > 0) {
    e.jogador3U8[JOGADOR3_U8.salPassos] = salPassos - 1;
    if (salPassos === 1) e.jogador3U8[JOGADOR3_U8.salPct] = 0;
  }
  return temIntencao;
}

/** Passadas do bloqueio pelos inimigos, como as dos obstáculos (decisoes-F-002 §3). */
const PASSADAS_DO_BLOQUEIO = 2;

/**
 * Bloqueio pelos inimigos (decisoes-F-003 §2, S4), com cada inimigo parado na
 * posição do fim do passo anterior, em ordem de slot, 2 passadas e sem
 * desempate: o jogador (em COLISAO) é empurrado ao longo da normal só pelo que
 * aumentaria a sobreposição que tinha no início do passo (em xAnt, yAnt).
 * Centros coincidentes levam o jogador para −x. Os deltas de deltaNoToro vão
 * em linha.
 */
function bloquearPelosInimigos(e: Estado, dados: DadosDaVigilia): void {
  const ini = e.inimigos;
  const pos = e.pool.posicao;
  const raio = dados.tipos.raio;
  const x0 = e.jogador[JOGADOR.xAnt]!;
  const y0 = e.jogador[JOGADOR.yAnt]!;
  let px = COLISAO[ES.x]!;
  let py = COLISAO[ES.y]!;
  for (let it = 0; it < PASSADAS_DO_BLOQUEIO; it++) {
    for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
      if (pos[s]! < 0) continue;
      if (ini.tipo[s] === TIPO.o_lanterneiro) {
        // O Lanterneiro é uma caixa (F-009 LN3): a mesma regra, com a distância jogador–caixa no lugar da distância entre centros.
        COLISAO[ES.x] = px;
        COLISAO[ES.y] = py;
        bloquearPelaCaixa(e, s);
        px = COLISAO[ES.x]!;
        py = COLISAO[ES.y]!;
        continue;
      }
      const ex = ini.x[s]!;
      const ey = ini.y[s]!;
      const soma = raio[ini.tipo[s]!]! + RAIO_DO_JOGADOR;
      let dx = px - ex;
      if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
      if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
      let dy = py - ey;
      if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
      if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
      const d2 = dx * dx + dy * dy;
      if (d2 >= soma * soma) continue;
      let ix = x0 - ex;
      if (ix > MEIA_LARGURA_DO_MAPA) ix -= LARGURA_DO_MAPA;
      if (ix < -MEIA_LARGURA_DO_MAPA) ix += LARGURA_DO_MAPA;
      let iy = y0 - ey;
      if (iy > MEIA_ALTURA_DO_MAPA) iy -= ALTURA_DO_MAPA;
      if (iy < -MEIA_ALTURA_DO_MAPA) iy += ALTURA_DO_MAPA;
      const penInicio = Math.max(0, soma - Math.sqrt(ix * ix + iy * iy));
      let nx = -1;
      let ny = 0;
      let d = 0;
      if (d2 > 0) {
        d = Math.sqrt(d2);
        nx = dx / d;
        ny = dy / d;
      }
      const empurrao = soma - d - penInicio;
      if (empurrao > 0) {
        px += nx * empurrao;
        py += ny * empurrao;
      }
    }
  }
  COLISAO[ES.x] = px;
  COLISAO[ES.y] = py;
}

/**
 * S4 contra a caixa do Lanterneiro (F-009 LN3): o jogador (em COLISAO) não aumenta a sobreposição que tinha no início do passo
 * (em xAnt, yAnt) com a caixa, e é empurrado pela normal de saída só no que a aumentaria. Distância com sinal: negativa dentro.
 */
function bloquearPelaCaixa(e: Estado, s: number): void {
  const ini = e.inimigos;
  const ex = ini.x[s]!;
  const ey = ini.y[s]!;
  let ix = e.jogador[JOGADOR.xAnt]! - ex;
  if (ix > MEIA_LARGURA_DO_MAPA) ix -= LARGURA_DO_MAPA;
  if (ix < -MEIA_LARGURA_DO_MAPA) ix += LARGURA_DO_MAPA;
  let iy = e.jogador[JOGADOR.yAnt]! - ey;
  if (iy > MEIA_ALTURA_DO_MAPA) iy -= ALTURA_DO_MAPA;
  if (iy < -MEIA_ALTURA_DO_MAPA) iy += ALTURA_DO_MAPA;
  GEO[0] = ix;
  GEO[1] = iy;
  distanciaComSinal();
  const penInicio = Math.max(0, RAIO_DO_JOGADOR - GEO[2]!);
  let dx = COLISAO[ES.x]! - ex;
  if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
  if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
  let dy = COLISAO[ES.y]! - ey;
  if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
  if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
  GEO[0] = dx;
  GEO[1] = dy;
  distanciaComSinal();
  const empurrao = RAIO_DO_JOGADOR - GEO[2]! - penInicio;
  if (empurrao > 0) {
    COLISAO[ES.x] = COLISAO[ES.x]! + GEO[3]! * empurrao;
    COLISAO[ES.y] = COLISAO[ES.y]! + GEO[4]! * empurrao;
  }
}

/**
 * Prompt de mover (§7): cumprido no 1º passo com intenção, desde 0:00; senão
 * aparece no passo de relógio 600. Roda depois do relógio avançar.
 */
export function atualizarPromptDeMover(e: Estado, moveu: boolean): void {
  const u8 = e.jogadorU8;
  const estado = u8[JOGADOR_U8.promptMover];
  if (estado === PROMPT.cumprido) return;
  if (moveu) u8[JOGADOR_U8.promptMover] = PROMPT.cumprido;
  else if (estado === PROMPT.aguardando && e.cab[CAB.relogio]! >= PASSO_DO_PROMPT_DE_MOVER) u8[JOGADOR_U8.promptMover] = PROMPT.visivel;
}
