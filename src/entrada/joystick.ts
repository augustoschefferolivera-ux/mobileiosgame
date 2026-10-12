// Joystick flutuante (B §3.5; design/decisoes-F-002.md §4): base fixa onde o
// polegar tocou, raio de 60 pt e zona morta radial de 0,15. Depois da zona
// morta, a curva é linear: m = mín(1, máx(0, (d/60 − 0,15)/0,85)). Passou do
// raio, o vetor satura e o pino fica preso na borda. Tudo em pt lógicos.

export const RAIO_DO_JOYSTICK_PT = 60;
export const ZONA_MORTA = 0.15;
/**
 * Suavização da direção (decisão do usuário, 2026-10-12; divergência da D2 §4):
 * perto da zona morta um desvio pequeno do dedo gira muito o ângulo do vetor, e
 * a direção mudava num único quadro. O tradutor limita o giro da direção a
 * este valor por segundo de tempo real do quadro; o módulo não muda.
 */
export const GIRO_MAX_GRAUS_S = 540;
/**
 * Giro maior que isto vale de imediato (reversão para esquivar ou reagir):
 * uma virada de quase 180° não é "um desvio do dedo", é uma intenção; esperar
 * 1/3 s para voltar atrás custaria uma esquiva.
 */
export const REVERSAO_IMEDIATA_GRAUS = 150;
/** Raio do pino desenhado (só visual, §4). */
export const RAIO_DO_PINO_PT = 24;

export interface Vetor {
  x: number;
  y: number;
}

/** Vetor de movimento (|v| ≤ 1) do deslocamento (dx, dy) do dedo em relação à base. */
export function vetorDoJoystick(dx: number, dy: number, out: Vetor): Vetor {
  const d = Math.sqrt(dx * dx + dy * dy);
  const m = d > 0 ? Math.min(1, Math.max(0, (d / RAIO_DO_JOYSTICK_PT - ZONA_MORTA) / (1 - ZONA_MORTA))) : 0;
  out.x = m > 0 ? (dx / d) * m : 0;
  out.y = m > 0 ? (dy / d) * m : 0;
  return out;
}

/** Posição do pino em relação à base: o próprio deslocamento, preso no raio. */
export function pinoDoJoystick(dx: number, dy: number, out: Vetor): Vetor {
  const d = Math.sqrt(dx * dx + dy * dy);
  const k = d > RAIO_DO_JOYSTICK_PT ? RAIO_DO_JOYSTICK_PT / d : 1;
  out.x = dx * k;
  out.y = dy * k;
  return out;
}
