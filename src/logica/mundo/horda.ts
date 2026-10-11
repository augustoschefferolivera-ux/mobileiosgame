// Física da horda num passo (design/decisoes-F-003.md §2), depois do jogador:
//  3. cada inimigo, em ordem de slot: xAnt; deslocamento de comportamento em
//     direção ao jogador já movido; normaliza;
//  4. grade (counting sort, slots crescentes);
//  5. separação: ½ da penetração de cada par sobreposto para cada lado,
//     acumulada (Jacobi) e limitada, por corpo, à velocidade base do tipo;
//  6. cada inimigo: soma a separação; não aumenta a sobreposição com o jogador
//     (regra simétrica); obstáculos da célula, com desempate; normaliza.
// Os rascunhos (grade, somas da separação) ficam fora do estado e são refeitos
// a cada passo; nada é alocado por passo. Nos laços por inimigo, nenhuma
// chamada recebe ou devolve double: no V8, cada uma alocaria um HeapNumber
// (≈ 48 KB por passo com 300 vivos, medido). O delta toroidal, a
// normalização no toro, o passo de comportamento e o intervalo de células vão
// em linha, como em consultarGrade, e a colisão lê e escreve COLISAO.
import { CAPACIDADE_DE_INIMIGOS, JOGADOR, type Estado } from '../nucleo/estado';
import type { DadosDaVigilia } from './dados';
import { COLUNAS, LADO_DA_CELULA, LINHAS, criarGrade, reconstruirGrade } from './grade';
import { RAIO_DO_JOGADOR } from './jogador';
import { COLISAO, ES, colidirNaCelula } from './obstaculos';
import { COMPORTAMENTO } from './tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from './toro';

const N = CAPACIDADE_DE_INIMIGOS;

/** Rascunhos do passo, alocados uma vez. */
const grade = criarGrade(N);
const vivos = new Int32Array(N);
const sepX = new Float64Array(N);
const sepY = new Float64Array(N);
/** Deslocamento de comportamento do passo, que vai ao desempate dos obstáculos. */
const movX = new Float64Array(N);
const movY = new Float64Array(N);

/** Instrumentação para os testes: o maior empurrão (ao quadrado) do último passo, de cada fonte. */
export const EMPURRAO = { separacao2: 0, jogador2: 1, obstaculo2: 2, total2: 3 } as const;
export const empurroesDoPasso = new Float64Array(4);

/** Lista os slots vivos em ordem crescente em `vivos` e devolve quantos. */
function listarVivos(e: Estado): number {
  let n = 0;
  const pos = e.pool.posicao;
  for (let s = 0; s < N; s++) if (pos[s]! >= 0) vivos[n++] = s;
  return n;
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
    // As células que cobrem o disco de raio ra + R_MAX (o intervaloDeCelulas da grade, em linha),
    // com os pares (a, b) de b > a sobrepostos.
    const r = ra + rMax;
    const c0 = colunaNoToro(ax - r);
    const nc = 2 * r >= LARGURA_DO_MAPA - LADO_DA_CELULA ? COLUNAS : ((colunaNoToro(ax + r) - c0 + COLUNAS) % COLUNAS) + 1;
    let l = linhaNoToro(ay - r);
    const nl = 2 * r >= ALTURA_DO_MAPA - LADO_DA_CELULA ? LINHAS : ((linhaNoToro(ay + r) - l + LINHAS) % LINHAS) + 1;
    for (let i = 0; i < nl; i++) {
      let c = c0;
      for (let q = 0; q < nc; q++) {
        const cel = l * COLUNAS + c;
        const fim = inicio[cel + 1]!;
        for (let p = inicio[cel]!; p < fim; p++) {
          const b = indices[p]!;
          if (b <= a) continue;
          const soma = ra + t.raio[ini.tipo[b]!]!;
          let dx = ini.x[b]! - ax;
          if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
          if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
          let dy = ini.y[b]! - ay;
          if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
          if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
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

/** Coluna e linha da grade de um valor qualquer levado ao toro (o coluna(voltaNoToro(v)) da grade); devolvem inteiros. */
function colunaNoToro(v: number): number {
  let m = v % LARGURA_DO_MAPA;
  if (m < 0) m += LARGURA_DO_MAPA;
  return Math.floor(m / LADO_DA_CELULA);
}

function linhaNoToro(v: number): number {
  let m = v % ALTURA_DO_MAPA;
  if (m < 0) m += ALTURA_DO_MAPA;
  return Math.floor(m / LADO_DA_CELULA);
}

export function moverHorda(e: Estado, dados: DadosDaVigilia): void {
  const ini = e.inimigos;
  const t = dados.tipos;
  const j = e.jogador;
  const jx = j[JOGADOR.x]!;
  const jy = j[JOGADOR.y]!;
  const n = listarVivos(e);

  // 3. Comportamento: passo com sinal (negativo = recua) ao longo da direção do jogador, sem passar do alvo.
  // Medido na linha 19: com o recuo da Noviça, a horda assenta em ≈ 2 min; sem ele, a Noviça parada é
  // arrastada pelos que passam e a horda nunca assenta (decisoes-F-003 §2).
  for (let k = 0; k < n; k++) {
    const s = vivos[k]!;
    const x = ini.x[s]!;
    const y = ini.y[s]!;
    ini.xAnt[s] = x;
    ini.yAnt[s] = y;
    const tipo = ini.tipo[s]!;
    let dx = jx - x;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = jy - y;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    const d = Math.sqrt(dx * dx + dy * dy);
    let mx = 0;
    let my = 0;
    if (d > 0) {
      const v = t.velocidade[tipo]!;
      const comportamento = t.comportamento[tipo]!;
      const p =
        comportamento === COMPORTAMENTO.perseguir
          ? Math.min(v, d)
          : comportamento === COMPORTAMENTO.pararADistancia
            ? Math.min(v, Math.max(0, d - t.distancia[tipo]!))
            : Math.min(v, Math.max(-v, d - t.distancia[tipo]!));
      mx = (dx / d) * p;
      my = (dy / d) * p;
    }
    movX[s] = mx;
    movY[s] = my;
    // A normalização de normalizarNoToro, em linha.
    let nx = Math.fround(x + mx);
    if (nx < 0) nx = Math.fround(nx + LARGURA_DO_MAPA);
    if (nx >= LARGURA_DO_MAPA) nx = Math.fround(nx - LARGURA_DO_MAPA);
    let ny = Math.fround(y + my);
    if (ny < 0) ny = Math.fround(ny + ALTURA_DO_MAPA);
    if (ny >= ALTURA_DO_MAPA) ny = Math.fround(ny - ALTURA_DO_MAPA);
    ini.x[s] = nx;
    ini.y[s] = ny;
  }

  // 4 e 5. Grade e separação, com as posições depois do comportamento.
  separarHorda(e, dados, vivos, n, sepX, sepY);

  // 6. Separação, bloqueio pelo jogador e obstáculos.
  const jxAnt = j[JOGADOR.xAnt]!;
  const jyAnt = j[JOGADOR.yAnt]!;
  let separacao2 = 0;
  let jogador2 = 0;
  let obstaculo2 = 0;
  let total2 = 0;
  for (let k = 0; k < n; k++) {
    const s = vivos[k]!;
    const tipo = ini.tipo[s]!;
    const sx = sepX[s]!;
    const sy = sepY[s]!;
    separacao2 = Math.max(separacao2, sx * sx + sy * sy);
    const x0 = ini.xAnt[s]!;
    const y0 = ini.yAnt[s]!;
    let px = ini.x[s]! + sx;
    let py = ini.y[s]! + sy;

    // Regra simétrica (S4): o inimigo não aumenta a sobreposição que tinha com o jogador no início do passo.
    const soma = t.raio[tipo]! + RAIO_DO_JOGADOR;
    let dxi = x0 - jxAnt;
    if (dxi > MEIA_LARGURA_DO_MAPA) dxi -= LARGURA_DO_MAPA;
    if (dxi < -MEIA_LARGURA_DO_MAPA) dxi += LARGURA_DO_MAPA;
    let dyi = y0 - jyAnt;
    if (dyi > MEIA_ALTURA_DO_MAPA) dyi -= ALTURA_DO_MAPA;
    if (dyi < -MEIA_ALTURA_DO_MAPA) dyi += ALTURA_DO_MAPA;
    const penInicio = Math.max(0, soma - Math.sqrt(dxi * dxi + dyi * dyi));
    let dx = px - jx;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = py - jy;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
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
        jogador2 = Math.max(jogador2, empurrao * empurrao);
      }
    }

    // Obstáculos por último: nenhum corpo termina o passo dentro de um.
    COLISAO[ES.x] = px;
    COLISAO[ES.y] = py;
    COLISAO[ES.raio] = t.raio[tipo]!;
    COLISAO[ES.movX] = movX[s]!;
    COLISAO[ES.movY] = movY[s]!;
    colidirNaCelula(dados.obstaculos, dados.obstaculosPorCelula, true);
    const cx = COLISAO[ES.x]!;
    const cy = COLISAO[ES.y]!;
    const ox = cx - px;
    const oy = cy - py;
    obstaculo2 = Math.max(obstaculo2, ox * ox + oy * oy);
    let nx = Math.fround(cx);
    if (nx < 0) nx = Math.fround(nx + LARGURA_DO_MAPA);
    if (nx >= LARGURA_DO_MAPA) nx = Math.fround(nx - LARGURA_DO_MAPA);
    let ny = Math.fround(cy);
    if (ny < 0) ny = Math.fround(ny + ALTURA_DO_MAPA);
    if (ny >= ALTURA_DO_MAPA) ny = Math.fround(ny - ALTURA_DO_MAPA);
    ini.x[s] = nx;
    ini.y[s] = ny;
    let tx = nx - x0;
    if (tx > MEIA_LARGURA_DO_MAPA) tx -= LARGURA_DO_MAPA;
    if (tx < -MEIA_LARGURA_DO_MAPA) tx += LARGURA_DO_MAPA;
    let ty = ny - y0;
    if (ty > MEIA_ALTURA_DO_MAPA) ty -= ALTURA_DO_MAPA;
    if (ty < -MEIA_ALTURA_DO_MAPA) ty += ALTURA_DO_MAPA;
    total2 = Math.max(total2, tx * tx + ty * ty);
  }
  empurroesDoPasso[EMPURRAO.separacao2] = separacao2;
  empurroesDoPasso[EMPURRAO.jogador2] = jogador2;
  empurroesDoPasso[EMPURRAO.obstaculo2] = obstaculo2;
  empurroesDoPasso[EMPURRAO.total2] = total2;
}
