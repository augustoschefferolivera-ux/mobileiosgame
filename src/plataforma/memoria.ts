// Memória estimada do backbuffer WebGL (ADR-0002 §14: performance.memory não
// existe no Safari). Conta o drawing buffer e a cópia exibida (4 bytes por
// pixel cada), depth/stencil (4 bytes) e, com MSAA, as versões multiamostradas.

export interface AtributosDoContexto {
  antialias: boolean;
  depth: boolean;
  stencil: boolean;
  /** gl.SAMPLES do framebuffer padrão (0 sem MSAA). */
  amostras: number;
}

export function bytesDoBackbuffer(largura: number, altura: number, a: AtributosDoContexto): number {
  const px = largura * altura;
  const comProfundidade = a.depth || a.stencil;
  let bytes = px * 4 * 2;
  if (a.antialias && a.amostras > 1) {
    bytes += px * 4 * a.amostras;
    if (comProfundidade) bytes += px * 4 * a.amostras;
  } else if (comProfundidade) {
    bytes += px * 4;
  }
  return bytes;
}

/** Lê os atributos reais de um contexto WebGL. */
export function atributosDe(gl: WebGLRenderingContext): AtributosDoContexto {
  const c = gl.getContextAttributes();
  return {
    antialias: c?.antialias ?? false,
    depth: c?.depth ?? false,
    stencil: c?.stencil ?? false,
    amostras: Number(gl.getParameter(gl.SAMPLES)) || 0,
  };
}
