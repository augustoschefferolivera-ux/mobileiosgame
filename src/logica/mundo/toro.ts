// Toro do mapa de 3 × 3 telas (B §3.2; ADR-0002 §3, §4, §6 e §11): posição
// normalizada em Float32, delta toroidal, interpolação na costura e cópia mais
// próxima da câmera. Funções puras, sem alocar. A simulação e o render usam as
// mesmas funções (a F-003 reaproveita a cópia mais próxima para a horda).

/** Uma tela, em px lógicos (B §3.2: 390 × 844). */
export const LARGURA_DA_TELA = 390;
export const ALTURA_DA_TELA = 844;
/** O mapa tem 3 × 3 telas: o toro W × H = 1.170 × 2.532 (B §3.2; ADR-0002 §4). */
export const TELAS_POR_LADO = 3;
export const LARGURA_DO_MAPA = LARGURA_DA_TELA * TELAS_POR_LADO;
export const ALTURA_DO_MAPA = ALTURA_DA_TELA * TELAS_POR_LADO;
/**
 * Meias dimensões, para os laços por inimigo que escrevem o delta e a
 * normalização em linha: no V8, uma chamada não inlinada que recebe ou devolve
 * double aloca um HeapNumber (design/decisoes-F-003.md §2, laço quente).
 */
export const MEIA_LARGURA_DO_MAPA = LARGURA_DO_MAPA / 2;
export const MEIA_ALTURA_DO_MAPA = ALTURA_DO_MAPA / 2;

/**
 * Normaliza uma coordenada para [0, L) em Float32 (decisoes-F-002 §3, passo 4):
 * `fround`; se < 0, soma L; se ≥ L, subtrai L, nessa ordem, para que a segunda
 * checagem pegue o caso em que `v + L` arredonda para L. Vale para v em
 * [−L, 1,5 L]; o invariante de no máximo 32 px por passo mantém v em [−32, L + 32).
 */
export function normalizarNoToro(v: number, L: number): number {
  let x = Math.fround(v);
  if (x < 0) x = Math.fround(x + L);
  if (x >= L) x = Math.fround(x - L);
  return x;
}

/** Delta toroidal `para − de`, no intervalo [−L/2, L/2] (ADR-0002 §6). */
export function deltaNoToro(de: number, para: number, L: number): number {
  let d = para - de;
  if (d > L / 2) d -= L;
  if (d < -L / 2) d += L;
  return d;
}

/**
 * Posição entre `ant` e `atual` pelo delta toroidal (ADR-0002 §3): sem ele,
 * ant = 1.168 e atual = 2 com alfa = 0,5 dariam 585. O resultado pode sair de
 * [0, L) na costura; quem desenha aplica depois a cópia mais próxima.
 */
export function interpolarNoToro(ant: number, atual: number, alfa: number, L: number): number {
  return ant + deltaNoToro(ant, atual, L) * alfa;
}

/**
 * Cópia de `v` mais próxima da câmera `cam` (ADR-0002 §11):
 * v' = cam + m − L/2, com m = (v − cam + L/2) % L e, se m < 0, m += L.
 * O % do JS preserva o sinal do dividendo; sem a correção, cam = 1.100 e
 * v = 50 dariam 50, fora da vista, em vez de 1.220.
 */
export function copiaMaisProxima(v: number, cam: number, L: number): number {
  let m = (v - cam + L / 2) % L;
  if (m < 0) m += L;
  return cam + m - L / 2;
}
