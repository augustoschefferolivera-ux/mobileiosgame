// Jogador (B §3.3; design/decisoes-F-002.md §3, §5, §6 e §7): anda pela
// intenção dos ComandosDoPasso a 144 px/s × |v|, sem inércia, é bloqueado pelos
// inimigos (design/decisoes-F-003.md §2, S4: não aumenta a sobreposição que
// tinha com cada um no início do passo, e nunca é empurrado por eles), colide
// com os obstáculos como um círculo de 16 px e guarda a última direção não
// nula para o desenho. Também cuida do prompt "Deslize para mover", cujo
// gatilho é a intenção, e não o deslocamento: um obstáculo não segura o prompt.
import type { ComandosDoPasso } from '../nucleo/comandos';
import { CAB, CAPACIDADE_DE_INIMIGOS, JOGADOR, JOGADOR_U8, PROMPT, type Estado } from '../nucleo/estado';
import { segundosEmPassos } from '../nucleo/passos';
import type { DadosDaVigilia } from './dados';
import { colidirComObstaculos, type Ponto } from './obstaculos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, deltaNoToro, normalizarNoToro } from './toro';

/** Hitbox do jogador: círculo de 16 px de raio, centrado no incentro do triângulo (§3). */
export const RAIO_DO_JOGADOR = 16;
/** O prompt de mover aparece aos 0:10 de relógio (doc 11 §4): 600 passos. */
export const PASSO_DO_PROMPT_DE_MOVER = segundosEmPassos(10);

const ponto: Ponto = { x: 0, y: 0 };

/**
 * Move o jogador um passo e devolve se havia intenção de movimento. A
 * intenção acima de |v| = 1 é reduzida ao círculo; NaN e infinito contam como
 * parada. Ordem (§3), em todo passo, mesmo parado: guarda a posição anterior,
 * soma o deslocamento, colide e normaliza no toro em Float32.
 */
export function moverJogador(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): boolean {
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
    dx = mx * dados.velocidadePorPasso;
    dy = my * dados.velocidadePorPasso;
  }
  ponto.x = x + dx;
  ponto.y = y + dy;
  bloquearPelosInimigos(e, dados, x, y, ponto);
  colidirComObstaculos(dados.obstaculos, ponto.x, ponto.y, RAIO_DO_JOGADOR, dx, dy, false, ponto);
  j[JOGADOR.x] = normalizarNoToro(ponto.x, LARGURA_DO_MAPA);
  j[JOGADOR.y] = normalizarNoToro(ponto.y, ALTURA_DO_MAPA);
  return temIntencao;
}

/** Passadas do bloqueio pelos inimigos, como as dos obstáculos (decisoes-F-002 §3). */
const PASSADAS_DO_BLOQUEIO = 2;

/**
 * Bloqueio pelos inimigos (decisoes-F-003 §2, S4), com cada inimigo parado na
 * posição do fim do passo anterior, em ordem de slot, 2 passadas e sem
 * desempate: o jogador é empurrado ao longo da normal só pelo que aumentaria a
 * sobreposição que tinha no início do passo (em (x0, y0)). Centros coincidentes
 * levam o jogador para −x.
 */
function bloquearPelosInimigos(e: Estado, dados: DadosDaVigilia, x0: number, y0: number, p: Ponto): void {
  const ini = e.inimigos;
  const pos = e.pool.posicao;
  const raio = dados.tipos.raio;
  for (let it = 0; it < PASSADAS_DO_BLOQUEIO; it++) {
    for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
      if (pos[s]! < 0) continue;
      const ex = ini.x[s]!;
      const ey = ini.y[s]!;
      const soma = raio[ini.tipo[s]!]! + RAIO_DO_JOGADOR;
      const dx = deltaNoToro(ex, p.x, LARGURA_DO_MAPA);
      const dy = deltaNoToro(ey, p.y, ALTURA_DO_MAPA);
      const d2 = dx * dx + dy * dy;
      if (d2 >= soma * soma) continue;
      const ix = deltaNoToro(ex, x0, LARGURA_DO_MAPA);
      const iy = deltaNoToro(ey, y0, ALTURA_DO_MAPA);
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
        p.x += nx * empurrao;
        p.y += ny * empurrao;
      }
    }
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
