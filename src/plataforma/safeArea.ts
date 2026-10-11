// Safe-area (B §3.14; ADR-0002 §12): insets em px CSS lidos de uma sonda com
// env(safe-area-inset-*) e convertidos em pontos lógicos (390 × 844).
// O canvas não muda; só as âncoras do HUD e dos alvos são recalculadas.

export const LARGURA_LOGICA = 390;
export const ALTURA_LOGICA = 844;

export interface Insets {
  topo: number;
  direita: number;
  baixo: number;
  esquerda: number;
}

export interface Caixa {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function insetsZerados(): Insets {
  return { topo: 0, direita: 0, baixo: 0, esquerda: 0 };
}

/**
 * Converte insets em px CSS para pt lógicos. De cada lado, desconta-se a faixa
 * de letterbox entre a borda do viewport e o canvas, e aplica-se o fator do FIT
 * (ADR-0002 §12: topo = max(0, insetTop − canvasBounds.top) × displayScale.y / 2).
 */
export function insetsEmPontos(css: Insets, canvas: Caixa, larguraViewport: number, alturaViewport: number, out: Insets): Insets {
  if (!(canvas.width > 0 && canvas.height > 0)) {
    out.topo = out.direita = out.baixo = out.esquerda = 0;
    return out;
  }
  const fx = LARGURA_LOGICA / canvas.width;
  const fy = ALTURA_LOGICA / canvas.height;
  const faixaDireita = larguraViewport - (canvas.left + canvas.width);
  const faixaBaixo = alturaViewport - (canvas.top + canvas.height);
  out.topo = Math.max(0, css.topo - canvas.top) * fy;
  out.baixo = Math.max(0, css.baixo - faixaBaixo) * fy;
  out.esquerda = Math.max(0, css.esquerda - canvas.left) * fx;
  out.direita = Math.max(0, css.direita - faixaDireita) * fx;
  return out;
}

/**
 * Mede os insets em pt: lê a sonda e desconta o letterbox do canvas dentro do
 * container (#jogo, que ocupa o viewport inteiro).
 */
export function medirSafeArea(sonda: HTMLElement, canvas: HTMLElement, container: HTMLElement, out: Insets): Insets {
  const css = lerInsetsCss(sonda, insetsZerados());
  const c = canvas.getBoundingClientRect();
  const v = container.getBoundingClientRect();
  const caixa = { left: c.left - v.left, top: c.top - v.top, width: c.width, height: c.height };
  return insetsEmPontos(css, caixa, v.width, v.height, out);
}

/** Lê os insets em px CSS do elemento sonda (padding = env(safe-area-inset-*)). */
export function lerInsetsCss(sonda: HTMLElement, out: Insets): Insets {
  const estilo = getComputedStyle(sonda);
  out.topo = parseFloat(estilo.paddingTop) || 0;
  out.direita = parseFloat(estilo.paddingRight) || 0;
  out.baixo = parseFloat(estilo.paddingBottom) || 0;
  out.esquerda = parseFloat(estilo.paddingLeft) || 0;
  return out;
}
