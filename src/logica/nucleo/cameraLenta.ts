// Câmera lenta leve do tutorial da esquiva (decisoes-F-006 FB5, TU8): fator 0,5
// sobre o deltaMs do driver durante 500 ms de tempo real, uma vez por Vigília,
// a partir do quadro em que o prompt de esquiva fica visível. Fora do estado,
// do hash e do replay; o teto de 5 passos e `passosPerdidos` não mudam.

export const FATOR_DA_CAMERA_LENTA = 0.5;
export const DURACAO_DA_CAMERA_LENTA_MS = 500;

export interface CameraLenta {
  /** Tempo real que ainda falta em câmera lenta, em ms. */
  restanteMs: number;
  /** Já disparou nesta Vigília: não dispara de novo. */
  usada: boolean;
}

export function criarCameraLenta(): CameraLenta {
  return { restanteMs: 0, usada: false };
}

/** Liga a câmera lenta, se ainda não foi usada. Devolve true quando ligou. */
export function dispararCameraLenta(c: CameraLenta): boolean {
  if (c.usada) return false;
  c.usada = true;
  c.restanteMs = DURACAO_DA_CAMERA_LENTA_MS;
  return true;
}

/** Fator vigente (1 fora da câmera lenta), para o debug e o painel. */
export function escalaDeTempo(c: CameraLenta): number {
  return c.restanteMs > 0 ? FATOR_DA_CAMERA_LENTA : 1;
}

/** O delta do quadro com a parte que cai na câmera lenta multiplicada pelo fator; consome o tempo real. */
export function escalarDelta(c: CameraLenta, deltaMs: number): number {
  if (!(c.restanteMs > 0) || !(deltaMs > 0)) return deltaMs;
  const lento = deltaMs < c.restanteMs ? deltaMs : c.restanteMs;
  c.restanteMs -= lento;
  return lento * FATOR_DA_CAMERA_LENTA + (deltaMs - lento);
}
