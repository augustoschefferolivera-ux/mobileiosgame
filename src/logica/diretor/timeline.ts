// Timeline do diretor compilada (B §3.7; ADR-0002 §8 e Apêndice A;
// design/decisoes-F-003.md §1 e §4): uma linha por minuto, montada uma vez a
// partir do JSON da região, em arrays tipados. As linhas de marco (5, 10 e 15:
// intervalo null e roster vazio) usam o roster e o intervalo da linha anterior
// e o mínimo da própria linha (Q-01; o "idem" do doc 07 §3.2 lido pela Q-00).
import { segundosEmPassos } from '../nucleo/passos';
import { codigoDoTipo } from '../mundo/tipos';

/** O que se lê de cada linha do JSON da região (regiao.schema.json). */
export interface LinhaDoJson {
  readonly minuto: number;
  readonly roster: readonly { readonly inimigo: string; readonly peso: number }[];
  readonly min_na_tela: number;
  readonly intervalo_s: number | null;
  readonly garantidos?: readonly { readonly inimigo: string; readonly quantidade: number }[];
  readonly marco?: unknown;
}

export interface Timeline {
  readonly linhas: number;
  /** Mínimo na tela de cada linha (min_na_tela). */
  readonly minimo: Uint16Array;
  /** Intervalo de reposição em passos com I = 1,0: round(intervalo_s × 60); nas linhas de marco, o da anterior. */
  readonly passosBase: Uint16Array;
  /** 1 nas linhas com `marco` (têm a janela de 30 s antes). */
  readonly marco: Uint8Array;
  /** Roster de cada linha: [inicioDoRoster[m], inicioDoRoster[m + 1]) em rosterTipo e rosterAcumulado. */
  readonly inicioDoRoster: Int32Array;
  readonly rosterTipo: Uint8Array;
  /** Pesos acumulados (inteiros), na ordem do JSON. */
  readonly rosterAcumulado: Uint32Array;
  /** Garantidos de cada linha: [inicioDosGarantidos[m], inicioDosGarantidos[m + 1]), um por inimigo. */
  readonly inicioDosGarantidos: Int32Array;
  readonly garantidoTipo: Uint8Array;
  /** Passos sem spawn antes de um marco (B §3.7: 30 s). */
  readonly janelaAntesDoMarco: number;
}

/** Passos por minuto de relógio. */
export const PASSOS_POR_MINUTO = segundosEmPassos(60);

export function compilarTimeline(linhas: readonly LinhaDoJson[], semSpawnAntesDoMarcoS: number): Timeline {
  const n = linhas.length;
  if (n > 32) throw new Error('timeline: garantidosEntregues tem 32 bits, uma linha por bit');
  const minimo = new Uint16Array(n);
  const passosBase = new Uint16Array(n);
  const marco = new Uint8Array(n);
  const inicioDoRoster = new Int32Array(n + 1);
  const inicioDosGarantidos = new Int32Array(n + 1);
  const tipos: number[] = [];
  const acumulados: number[] = [];
  const garantidos: number[] = [];
  for (let m = 0; m < n; m++) {
    const l = linhas[m]!;
    if (l.minuto !== m) throw new Error(`timeline: a linha ${m} diz minuto ${l.minuto}`);
    const ehMarco = l.marco !== undefined && l.marco !== null;
    const fonte = ehMarco ? linhas[m - 1] : l;
    if (!fonte || fonte.intervalo_s === null || fonte.roster.length === 0) {
      throw new Error(`timeline: a linha ${m} não tem roster nem intervalo de onde tirar`);
    }
    const p = fonte.intervalo_s * 60;
    if (Math.abs(p - Math.round(p)) > 1e-9) throw new Error(`timeline: intervalo da linha ${m} não dá passos inteiros`);
    minimo[m] = l.min_na_tela;
    passosBase[m] = Math.round(p);
    marco[m] = ehMarco ? 1 : 0;
    inicioDoRoster[m] = tipos.length;
    let soma = 0;
    for (const r of fonte.roster) {
      if (!Number.isInteger(r.peso) || r.peso < 1) throw new Error(`timeline: peso não inteiro na linha ${m}`);
      soma += r.peso;
      tipos.push(codigoDoTipo(r.inimigo));
      acumulados.push(soma);
    }
    inicioDosGarantidos[m] = garantidos.length;
    for (const g of l.garantidos ?? []) for (let q = 0; q < g.quantidade; q++) garantidos.push(codigoDoTipo(g.inimigo));
  }
  inicioDoRoster[n] = tipos.length;
  inicioDosGarantidos[n] = garantidos.length;
  return {
    linhas: n,
    minimo,
    passosBase,
    marco,
    inicioDoRoster,
    rosterTipo: Uint8Array.from(tipos),
    rosterAcumulado: Uint32Array.from(acumulados),
    inicioDosGarantidos,
    garantidoTipo: Uint8Array.from(garantidos),
    janelaAntesDoMarco: segundosEmPassos(semSpawnAntesDoMarcoS),
  };
}
