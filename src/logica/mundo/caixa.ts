// A caixa do Lanterneiro (design/decisoes-F-009.md LN1, GE): um retângulo alinhado aos eixos de 96 × 128 px. Aqui moram
// os testes de contato das formas das armas contra ela. Regra da D9 (GE): setor, retângulo e segmento pedem que ALGUM dos 6
// pontos da caixa (o mais próximo da origem, o centro e os 4 cantos) esteja dentro da forma; círculo e tick pedem a distância
// da origem à caixa ≤ raio. Regra do laço quente: nenhum double atravessa chamada; quem chama escreve em GEO, em coordenadas
// da caixa (a origem menos o centro dela, já com o delta toroidal), e lê um boolean.

/** Meias dimensões da caixa: o chefe as grava ao surgir (`surgirChefe`); começam nos números da D9. */
export const CAIXA = new Float64Array([48, 64]);

/**
 * Rascunho das formas: [0] e [1] a origem relativa ao centro da caixa; [2] e [3] a direção unitária; [4] o alcance (raio do
 * círculo ou do setor, ou o comprimento do retângulo); [5] a meia-largura do retângulo ou o cosseno do meio ângulo do setor;
 * [6] o início do retângulo ao longo da direção (0 na estocada, −meia na onda).
 */
export const GEO = new Float64Array(8);

/** Cosseno de meio arco de 120° da Espada: a mesma constante literal de armas.ts. */
export const COSSENO_DO_SETOR = 0.5;

/** A distância da origem (GEO[0], GEO[1]) à caixa é ≤ GEO[4] (o círculo da Faca, o tick do Círculo). */
export function circuloToca(): boolean {
  const hx = CAIXA[0]!;
  const hy = CAIXA[1]!;
  let dx = Math.abs(GEO[0]!) - hx;
  let dy = Math.abs(GEO[1]!) - hy;
  if (dx < 0) dx = 0;
  if (dy < 0) dy = 0;
  const r = GEO[4]!;
  return dx * dx + dy * dy <= r * r;
}

/** Algum dos 6 pontos da caixa cai dentro do setor de raio GEO[4] e cosseno GEO[5], com a origem em GEO[0..1] e a mira em GEO[2..3]. */
export function setorToca(): boolean {
  const ox = GEO[0]!;
  const oy = GEO[1]!;
  const ux = GEO[2]!;
  const uy = GEO[3]!;
  const R = GEO[4]!;
  const cos = GEO[5]!;
  for (let k = 0; k < 6; k++) {
    ponto(k);
    const vx = PT[0]! - ox;
    const vy = PT[1]! - oy;
    const d2 = vx * vx + vy * vy;
    if (d2 > R * R) continue;
    if (d2 === 0 || vx * ux + vy * uy >= cos * Math.sqrt(d2)) return true;
  }
  return false;
}

/** Algum dos 6 pontos cai no retângulo: ao longo da mira em [GEO[6], GEO[6] + GEO[4]] e a ≤ GEO[5] de lado. */
export function retanguloToca(): boolean {
  const ox = GEO[0]!;
  const oy = GEO[1]!;
  const ux = GEO[2]!;
  const uy = GEO[3]!;
  const a0 = GEO[6]!;
  const a1 = a0 + GEO[4]!;
  const w = GEO[5]!;
  for (let k = 0; k < 6; k++) {
    ponto(k);
    const vx = PT[0]! - ox;
    const vy = PT[1]! - oy;
    const a = vx * ux + vy * uy;
    const b = vx * -uy + vy * ux;
    if (a >= a0 && a <= a1 && b >= -w && b <= w) return true;
  }
  return false;
}

/** O ponto em construção de `ponto`: x e y, em coordenadas da caixa. */
const PT = new Float64Array(2);

/** O k-ésimo ponto em PT: 0 o mais próximo da origem (o clamp dela à caixa), 1 o centro, 2 a 5 os cantos. */
function ponto(k: number): void {
  const hx = CAIXA[0]!;
  const hy = CAIXA[1]!;
  if (k === 0) {
    const ox = GEO[0]!;
    const oy = GEO[1]!;
    PT[0] = ox < -hx ? -hx : ox > hx ? hx : ox;
    PT[1] = oy < -hy ? -hy : oy > hy ? hy : oy;
  } else if (k === 1) {
    PT[0] = 0;
    PT[1] = 0;
  } else {
    PT[0] = k & 1 ? hx : -hx;
    PT[1] = k & 2 ? hy : -hy;
  }
}

/**
 * Distância com sinal do ponto (GEO[0], GEO[1]), relativo ao centro da caixa, até a caixa: GEO[2] = distância (negativa
 * dentro: a profundidade até a face mais próxima), GEO[3] e GEO[4] = a normal que sai da caixa por esse ponto (dentro, o eixo da
 * face mais próxima; no centro exato, +x). É o S4 do jogador, a separação dos convocados e o alcance do Agarrar.
 */
export function distanciaComSinal(): void {
  const hx = CAIXA[0]!;
  const hy = CAIXA[1]!;
  const dx = GEO[0]!;
  const dy = GEO[1]!;
  const qx = dx < -hx ? -hx : dx > hx ? hx : dx;
  const qy = dy < -hy ? -hy : dy > hy ? hy : dy;
  const vx = dx - qx;
  const vy = dy - qy;
  const d2 = vx * vx + vy * vy;
  if (d2 > 0) {
    const d = Math.sqrt(d2);
    GEO[2] = d;
    GEO[3] = vx / d;
    GEO[4] = vy / d;
    return;
  }
  const ex = hx - Math.abs(dx);
  const ey = hy - Math.abs(dy);
  if (ex <= ey) {
    GEO[2] = -ex;
    GEO[3] = dx >= 0 ? 1 : -1;
    GEO[4] = 0;
  } else {
    GEO[2] = -ey;
    GEO[3] = 0;
    GEO[4] = dy >= 0 ? 1 : -1;
  }
}
