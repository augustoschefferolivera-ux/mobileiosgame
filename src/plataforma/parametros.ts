// Parâmetros de URL (ADR-0002 §14): só valem no build de debug; o build de
// produção ignora todos. Existem ?seed=N (F-001), ?tutorial=0 (F-002) e, desde
// a F-003 (design/decisoes-F-003.md §5, §7 e §8), ?teto=300|500,
// ?render=gpu|image, ?buffer=dinamico, ?cenario=<id> e ?debug=1, e desde a
// F-004 (design/decisoes-F-004.md §5) ?sonda=0; na F-006, ?flash=segurar (RE3); ?inicio entra com a F-006.

import { TUTORIAL } from '../logica/nucleo/estado';

export type ModoDeRender = 'gpu' | 'image';

export interface Parametros {
  /** Seed pedida, ou null para sortear. */
  seed: number | null;
  /** ?tutorial=0: a Vigília começa com todos os tutoriais vistos (ADR-0002 §3). */
  pularTutoriais: boolean;
  /** ?teto=300|500: override do TETO (ADR-0002 §13); outro valor é ignorado. */
  teto: 300 | 500 | null;
  /** ?render=image troca a horda pelo pool de Image; qualquer outro valor vale gpu. */
  render: ModoDeRender;
  /** ?buffer=dinamico: o buffer de instâncias da horda com DYNAMIC_DRAW (ADR-0002 §11). */
  bufferDinamico: boolean;
  /** ?cenario=<id>: receita de src/dados/cenarios/<id>.json; um id desconhecido é erro no boot. */
  cenario: string | null;
  /** ?debug=1: o painel do debug e a verificação de NaN (ADR-0002 §5 e §14). */
  debug: boolean;
  /** ?sonda=0 desliga a sonda do TETO (os testes não dependem da máquina); no build de produção, sempre ligada. */
  sonda: boolean;
  /** ?flash=segurar: o Hud não decrementa o contador do flash, para o alfa 0,35 ficar na captura (decisoes-F-006 RE3). */
  flashSegurar: boolean;
  /** ?inicio=MM:SS (00:00 a 22:59): relógio inicial em passos, com a linha livre (TU7); null sem o parâmetro e na produção. */
  inicio: number | null;
  /** ?visto=mover,esquiva: bits de TUTORIAL marcados como vistos (TU6); null sem o parâmetro e na produção; ?tutorial=0 vence. */
  vistos: number | null;
}

const PRODUCAO: Parametros = {
  seed: null,
  pularTutoriais: false,
  teto: null,
  render: 'gpu',
  bufferDinamico: false,
  cenario: null,
  debug: false,
  sonda: true,
  flashSegurar: false,
  inicio: null,
  vistos: null,
};

export function lerParametros(busca: string, ehBuildDeDebug: boolean): Parametros {
  if (!ehBuildDeDebug) return { ...PRODUCAO };
  const p = new URLSearchParams(busca);
  const textoSeed = p.get('seed');
  const n = textoSeed === null || textoSeed.trim() === '' ? Number.NaN : Number(textoSeed);
  const seed = Number.isInteger(n) && n >= 0 && n <= 0xffffffff ? n : null;
  const teto = p.get('teto');
  const cenario = p.get('cenario');
  return {
    seed,
    pularTutoriais: p.get('tutorial') === '0',
    teto: teto === '300' ? 300 : teto === '500' ? 500 : null,
    render: p.get('render') === 'image' ? 'image' : 'gpu',
    bufferDinamico: p.get('buffer') === 'dinamico',
    cenario: cenario === null || cenario === '' ? null : cenario,
    debug: p.get('debug') === '1',
    sonda: p.get('sonda') !== '0',
    flashSegurar: p.get('flash') === 'segurar',
    inicio: lerInicio(p.get('inicio')),
    vistos: lerVistos(p.get('visto')),
  };
}

/** `MM:SS` de 00:00 a 22:59 em passos de 1/60 s; formato inválido é ignorado, como ?seed. */
function lerInicio(texto: string | null): number | null {
  const m = texto === null ? null : /^(\d{2}):(\d{2})$/.exec(texto);
  if (m === null) return null;
  const minutos = Number(m[1]);
  const segundos = Number(m[2]);
  if (minutos > 22 || segundos > 59) return null;
  return (60 * minutos + segundos) * 60;
}

/** Bits dos nomes de TUTORIAL listados (valor desconhecido é ignorado); null sem o parâmetro. */
function lerVistos(texto: string | null): number | null {
  if (texto === null) return null;
  let bits = 0;
  for (const nome of texto.split(',')) if (Object.prototype.hasOwnProperty.call(TUTORIAL, nome)) bits |= TUTORIAL[nome as keyof typeof TUTORIAL];
  return bits;
}

/** Seed de 32 bits sorteada fora da simulação (a simulação só recebe o número). */
export function sortearSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}
