// Tela de Resultado, parte pura (design/decisoes-F-007.md RS1 a RS7, RS9): as linhas com rótulo e valor, o tempo em
// m:ss, a Hora em algarismos romanos, o título por causa e a posição da mancha no mapa pequeno. Sem Phaser.
import { CAUSA_DO_FIM } from '../logica/nucleo/estado';
import type { ResultadoDaVigilia } from '../logica/mundo/vigilia';
import { HORA_A_FOME } from '../logica/mundo/mancha';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA } from '../logica/mundo/toro';

/** Segundos em `m:ss`, truncados (RS2): 754 → "12:34". */
export function tempoEmTexto(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos - 60 * m;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const ROMANOS = ['', 'I', 'II', 'III', 'IV'] as const;

/** A Hora da mancha em romanos (1 a 4); A Fome (5) tem texto próprio. */
export function horaEmRomano(hora: number): string {
  return ROMANOS[hora] ?? '';
}

/** Id do título (AG5, RS9): "Você se apaga." no Apagar e em A Fome; "Abandonar Vigília" no Abandonar; Amanhecer tem o seu. */
export function tituloDoResultado(causa: number): string {
  if (causa === CAUSA_DO_FIM.abandonar) return 'A6.PAUSA.ABANDONAR';
  if (causa === CAUSA_DO_FIM.amanhecer) return 'A4.AMANHECER.01';
  return 'A4.APAGAR.01';
}

export interface LinhaDoResultado {
  /** Id do rótulo (A7.RESULTADO.*). */
  readonly rotulo: string;
  readonly valor: string;
}

/** As cinco linhas (RS1), sem "Chefe mais longe" nem "Brasas" (F-009): tempo, nível, mortes, dano e Almas ao Santuário (RS5). */
export function linhasDoResultado(r: ResultadoDaVigilia): LinhaDoResultado[] {
  return [
    { rotulo: 'A7.RESULTADO.TEMPO', valor: tempoEmTexto(r.segundos) },
    { rotulo: 'A7.RESULTADO.NIVEL', valor: String(r.nivel) },
    { rotulo: 'A7.RESULTADO.MORTES', valor: String(r.mortes) },
    { rotulo: 'A7.RESULTADO.DANO', valor: String(r.danoRecebido) },
    { rotulo: 'A7.RESULTADO.ALMAS', valor: String(r.almasAoSantuario) },
  ];
}

/** A linha da mancha (RS1, MC5): o id e os parâmetros, ou null se o Resultado não deixou mancha. */
export function linhaDaMancha(r: ResultadoDaVigilia): { id: string; params: { almas: number; hora?: string } } | null {
  if (r.mancha === null) return null;
  if (r.mancha.hora === HORA_A_FOME) return { id: 'A7.RESULTADO.MANCHA_A_FOME', params: { almas: r.mancha.almas } };
  return { id: 'A7.RESULTADO.MANCHA', params: { almas: r.mancha.almas, hora: horaEmRomano(r.mancha.hora) } };
}

/** Lado maior do mapa pequeno (RS7), em pt; o menor segue a proporção do mapa. */
export const MAPA_PEQUENO_PT = 120;

/** Posição do ponto da mancha no mapa pequeno: [0, largura] × [0, altura] do desenho, na proporção do mapa. */
export function pontoNoMapaPequeno(x: number, y: number): { largura: number; altura: number; px: number; py: number } {
  const altura = MAPA_PEQUENO_PT;
  const largura = (MAPA_PEQUENO_PT * LARGURA_DO_MAPA) / ALTURA_DO_MAPA;
  return { largura, altura, px: (x / LARGURA_DO_MAPA) * largura, py: (y / ALTURA_DO_MAPA) * altura };
}
