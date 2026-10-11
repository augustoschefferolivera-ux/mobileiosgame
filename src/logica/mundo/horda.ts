// Física da horda num passo (design/decisoes-F-003.md §2), depois do jogador:
//  3. cada inimigo, em ordem de slot: xAnt; deslocamento de comportamento em
//     direção ao jogador já movido; normaliza;
//  4. grade (counting sort, slots crescentes);
//  5. separação: ½ da penetração de cada par sobreposto para cada lado,
//     acumulada (Jacobi) e limitada, por corpo, à velocidade base do tipo;
//  6. cada inimigo: soma a separação; não aumenta a sobreposição com o jogador
//     (regra simétrica); obstáculos da célula, com desempate; normaliza.
// Os rascunhos (grade, somas da separação) ficam fora do estado e são refeitos
// a cada passo; nada é alocado por passo.
import { CAPACIDADE_DE_INIMIGOS, JOGADOR, type Estado } from '../nucleo/estado';
import type { DadosDaVigilia } from './dados';
import { COLUNAS, LINHAS, criarGrade, intervaloDeCelulas, reconstruirGrade } from './grade';
import { RAIO_DO_JOGADOR } from './jogador';
import { colidirComObstaculosDaCelula, type Ponto } from './obstaculos';
import { COMPORTAMENTO } from './tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, deltaNoToro, normalizarNoToro } from './toro';

const N = CAPACIDADE_DE_INIMIGOS;

/** Rascunhos do passo, alocados uma vez. */
const grade = criarGrade(N);
const vivos = new Int32Array(N);
const intervalo = new Int32Array(4);
const sepX = new Float64Array(N);
const sepY = new Float64Array(N);
/** Deslocamento de comportamento do passo, que vai ao desempate dos obstáculos. */
const movX = new Float64Array(N);
const movY = new Float64Array(N);
const ponto: Ponto = { x: 0, y: 0 };
/** Referência local: no laço quente, a chamada direta é mais barata que pelo módulo. */
const delta = deltaNoToro;

/** Instrumentação para os testes: o maior empurrão (ao quadrado) do último passo, de cada fonte. */
export const empurroesDoPasso = { separacao2: 0, jogador2: 0, obstaculo2: 0, total2: 0 };

/** Lista os slots vivos em ordem crescente em `vivos` e devolve quantos. */
function listarVivos(e: Estado): number {
  let n = 0;
  const pos = e.pool.posicao;
  for (let s = 0; s < N; s++) if (pos[s]! >= 0) vivos[n++] = s;
  return n;
}

/**
 * Passo de comportamento ao longo da direção do jogador, com sinal (negativo =
 * recua), sem passar do alvo. Medido na linha 19: com o recuo da Noviça, a horda
 * assenta em ≈ 2 min; sem ele, a Noviça parada é arrastada pelos que passam e a
 * horda nunca assenta (decisoes-F-003 §2).
 */
function passoDeComportamento(comportamento: number, v: number, d: number, distancia: number): number {
  if (comportamento === COMPORTAMENTO.perseguir) return Math.min(v, d);
  if (comportamento === COMPORTAMENTO.pararADistancia) return Math.min(v, Math.max(0, d - distancia));
  return Math.min(v, Math.max(-v, d - distancia));
}

/**
 * Separação (S1): monta a grade com as posições atuais e escreve em outX/outY
 * a soma dos empurrões de cada slot vivo, ½ da penetração de cada par
 * sobreposto para cada lado, com as posições congeladas (Jacobi). A soma de
 * cada corpo é limitada à velocidade base do tipo por passo. `ids` são os
 * slots vivos em ordem crescente.
 */
export function separarHorda(
  e: Estado,
  dados: DadosDaVigilia,
  ids: Int32Array,
  n: number,
  outX: Float64Array,
  outY: Float64Array,
): void {
  const ini = e.inimigos;
  const t = dados.tipos;
  reconstruirGrade(grade, ini.x, ini.y, ids, n);
  for (let k = 0; k < n; k++) {
    const s = ids[k]!;
    outX[s] = 0;
    outY[s] = 0;
  }
  const rMax = t.raioMaximo;
  const { inicio, indices } = grade;
  for (let k = 0; k < n; k++) {
    const a = ids[k]!;
    const ra = t.raio[ini.tipo[a]!]!;
    const ax = ini.x[a]!;
    const ay = ini.y[a]!;
    // As células que cobrem o disco de raio ra + R_MAX, com os pares (a, b) de b > a sobrepostos.
    intervaloDeCelulas(ax, ay, ra + rMax, intervalo);
    const nc = intervalo[1]!;
    const nl = intervalo[3]!;
    let l = intervalo[2]!;
    for (let i = 0; i < nl; i++) {
      let c = intervalo[0]!;
      for (let q = 0; q < nc; q++) {
        const cel = l * COLUNAS + c;
        const fim = inicio[cel + 1]!;
        for (let p = inicio[cel]!; p < fim; p++) {
          const b = indices[p]!;
          if (b <= a) continue;
          const soma = ra + t.raio[ini.tipo[b]!]!;
          const dx = delta(ax, ini.x[b]!, LARGURA_DO_MAPA);
          const dy = delta(ay, ini.y[b]!, ALTURA_DO_MAPA);
          const d2 = dx * dx + dy * dy;
          if (d2 >= soma * soma) continue;
          let nx = 1;
          let ny = 0;
          let d = 0;
          if (d2 > 0) {
            d = Math.sqrt(d2);
            nx = dx / d;
            ny = dy / d;
          }
          const meia = (soma - d) / 2;
          outX[a] = outX[a]! - nx * meia;
          outY[a] = outY[a]! - ny * meia;
          outX[b] = outX[b]! + nx * meia;
          outY[b] = outY[b]! + ny * meia;
        }
        if (++c === COLUNAS) c = 0;
      }
      if (++l === LINHAS) l = 0;
    }
  }
  // O limite: a velocidade base do tipo, que é o que deixa a separação anular a perseguição e a horda parar.
  for (let k = 0; k < n; k++) {
    const s = ids[k]!;
    const v = t.velocidade[ini.tipo[s]!]!;
    const sx = outX[s]!;
    const sy = outY[s]!;
    const s2 = sx * sx + sy * sy;
    if (s2 > v * v) {
      const fator = v / Math.sqrt(s2);
      outX[s] = sx * fator;
      outY[s] = sy * fator;
    }
  }
}

export function moverHorda(e: Estado, dados: DadosDaVigilia): void {
  const ini = e.inimigos;
  const t = dados.tipos;
  const j = e.jogador;
  const jx = j[JOGADOR.x]!;
  const jy = j[JOGADOR.y]!;
  const n = listarVivos(e);
  empurroesDoPasso.separacao2 = empurroesDoPasso.jogador2 = empurroesDoPasso.obstaculo2 = empurroesDoPasso.total2 = 0;

  // 3. Comportamento.
  for (let k = 0; k < n; k++) {
    const s = vivos[k]!;
    const x = ini.x[s]!;
    const y = ini.y[s]!;
    ini.xAnt[s] = x;
    ini.yAnt[s] = y;
    const tipo = ini.tipo[s]!;
    const dx = delta(x, jx, LARGURA_DO_MAPA);
    const dy = delta(y, jy, ALTURA_DO_MAPA);
    const d = Math.sqrt(dx * dx + dy * dy);
    let mx = 0;
    let my = 0;
    if (d > 0) {
      const p = passoDeComportamento(t.comportamento[tipo]!, t.velocidade[tipo]!, d, t.distancia[tipo]!);
      mx = (dx / d) * p;
      my = (dy / d) * p;
    }
    movX[s] = mx;
    movY[s] = my;
    ini.x[s] = normalizarNoToro(x + mx, LARGURA_DO_MAPA);
    ini.y[s] = normalizarNoToro(y + my, ALTURA_DO_MAPA);
  }

  // 4 e 5. Grade e separação, com as posições depois do comportamento.
  separarHorda(e, dados, vivos, n, sepX, sepY);

  // 6. Separação, bloqueio pelo jogador e obstáculos.
  const jxAnt = j[JOGADOR.xAnt]!;
  const jyAnt = j[JOGADOR.yAnt]!;
  for (let k = 0; k < n; k++) {
    const s = vivos[k]!;
    const tipo = ini.tipo[s]!;
    const sx = sepX[s]!;
    const sy = sepY[s]!;
    empurroesDoPasso.separacao2 = Math.max(empurroesDoPasso.separacao2, sx * sx + sy * sy);
    const x0 = ini.xAnt[s]!;
    const y0 = ini.yAnt[s]!;
    let px = ini.x[s]! + sx;
    let py = ini.y[s]! + sy;

    // Regra simétrica (S4): o inimigo não aumenta a sobreposição que tinha com o jogador no início do passo.
    const soma = t.raio[tipo]! + RAIO_DO_JOGADOR;
    const dxi = delta(jxAnt, x0, LARGURA_DO_MAPA);
    const dyi = delta(jyAnt, y0, ALTURA_DO_MAPA);
    const penInicio = Math.max(0, soma - Math.sqrt(dxi * dxi + dyi * dyi));
    const dx = delta(jx, px, LARGURA_DO_MAPA);
    const dy = delta(jy, py, ALTURA_DO_MAPA);
    const d2 = dx * dx + dy * dy;
    if (d2 < soma * soma) {
      let nx = 1;
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
        empurroesDoPasso.jogador2 = Math.max(empurroesDoPasso.jogador2, empurrao * empurrao);
      }
    }

    // Obstáculos por último: nenhum corpo termina o passo dentro de um.
    colidirComObstaculosDaCelula(dados.obstaculos, dados.obstaculosPorCelula, px, py, t.raio[tipo]!, movX[s]!, movY[s]!, true, ponto);
    const ox = ponto.x - px;
    const oy = ponto.y - py;
    empurroesDoPasso.obstaculo2 = Math.max(empurroesDoPasso.obstaculo2, ox * ox + oy * oy);
    ini.x[s] = normalizarNoToro(ponto.x, LARGURA_DO_MAPA);
    ini.y[s] = normalizarNoToro(ponto.y, ALTURA_DO_MAPA);
    const tx = delta(x0, ini.x[s]!, LARGURA_DO_MAPA);
    const ty = delta(y0, ini.y[s]!, ALTURA_DO_MAPA);
    empurroesDoPasso.total2 = Math.max(empurroesDoPasso.total2, tx * tx + ty * ty);
  }
}
