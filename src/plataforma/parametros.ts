// Parâmetros de URL (ADR-0002 §14): só valem no build de debug; o build de
// produção ignora todos. Existem ?seed=N (F-001), ?tutorial=0 (F-002) e, desde
// a F-003 (design/decisoes-F-003.md §5, §7 e §8), ?teto=300|500,
// ?render=gpu|image, ?buffer=dinamico, ?cenario=<id> e ?debug=1, e desde a
// F-004 (design/decisoes-F-004.md §5) ?sonda=0; na F-006, ?flash=segurar (RE3); ?inicio entra com a F-006.

import { LIMITE_DE_ALMAS, TUTORIAL } from '../logica/nucleo/estado';

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
  /** ?almas=N (só no build de debug): Almas dadas no início da Vigília, sem gravar no meta (decisoes-F-007 MC12); null sem o parâmetro e na produção. */
  almas: number | null;
  /** ?santuario=1 (só no build de debug): `?cenario` e `?inicio` passam a levar da Tela de Acender ao Santuário (D10 SN4). */
  santuario: boolean;
  /** ?fundacao=a,f,c,b,m (só no build de debug; D10 FD12): ranks de Pele, Fôlego, Casco, Bigorna e Mãos, cada um de 0 ao máximo do nó; null sem o parâmetro ou se algum valor não vale. Não grava no meta. */
  fundacao: readonly number[] | null;
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
  almas: null,
  santuario: false,
  fundacao: null,
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
    almas: lerAlmas(p.get('almas')),
    santuario: p.get('santuario') === '1',
    fundacao: lerFundacao(p.get('fundacao')),
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

/** Inteiro de 0 a 2^30 − 1; formato inválido é ignorado, como ?seed. */
function lerAlmas(texto: string | null): number | null {
  if (texto === null || !/^\d{1,10}$/.test(texto)) return null;
  const n = Number(texto);
  return n < LIMITE_DE_ALMAS ? n : null;
}

/** Máximo de cada rank do `?fundacao`, na ordem Pele, Fôlego, Casco, Bigorna e Mãos (a mesma de `arvore.json`). */
const MAXIMO_DA_FUNDACAO_DE_DEBUG = [5, 5, 3, 3, 3] as const;

/** Cinco inteiros separados por vírgula, cada um de 0 ao máximo do nó; qualquer outra coisa é ignorada, como ?seed. */
function lerFundacao(texto: string | null): readonly number[] | null {
  if (texto === null) return null;
  const partes = texto.split(',');
  if (partes.length !== MAXIMO_DA_FUNDACAO_DE_DEBUG.length || !partes.every((x) => /^\d$/.test(x))) return null;
  const ranks = partes.map(Number);
  return ranks.every((r, i) => r <= MAXIMO_DA_FUNDACAO_DE_DEBUG[i]!) ? ranks : null;
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
