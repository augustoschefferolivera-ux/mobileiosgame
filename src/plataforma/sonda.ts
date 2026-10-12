// Sonda do TETO (ADR-0002 §13; design/decisoes-F-004.md §5): mede a
// simulação real com a carga do TETO 500 (montarEstadoDaSonda) na Tela de
// Acender, com o relógio injetado. 120 passos de aquecimento e 8 lotes de 30,
// uma etapa por quadro; mediana ≤ 2 ms por passo → 500, senão 300; se a soma
// passar de 800 ms, para e dá 300. O cache `vdc.teto` guarda o resultado por
// build, versão do Safari e classe de tela (exceto com o rAF a 30 fps).
import { criarComandos, fonteConstante } from '../logica/nucleo/comandos';
import type { Estado } from '../logica/nucleo/estado';
import { avancar } from '../logica/nucleo/passo';
import type { DadosDaVigilia } from '../logica/mundo/dados';
import type { Tela, ValorDoTeto } from './teto';

/** Números da sonda [proposta do ADR-0002 §13; calibrar na F-010 com iPhone 12 e 14]. */
export const SONDA = { aquecimento: 120, lotes: 8, passosPorLote: 30, limiteMsPorPasso: 2, orcamentoMs: 800 } as const;

export interface ResultadoDaSonda {
  readonly valor: ValorDoTeto;
  /** Mediana dos lotes medidos, em ms por passo (com o orçamento estourado antes de algum lote, o aquecimento ÷ 120). */
  readonly ms: number;
}

const PARADO = fonteConstante(criarComandos());

function mediana(v: Float64Array, n: number): number {
  const ordenados = Array.from(v.subarray(0, n)).sort((a, b) => a - b);
  return n % 2 === 1 ? ordenados[(n - 1) / 2]! : (ordenados[n / 2 - 1]! + ordenados[n / 2]!) / 2;
}

/** A sonda em etapas: a 1ª chamada de `etapa` roda o aquecimento; cada chamada seguinte, um lote. */
export class SondaDoTeto {
  private etapas = 0;
  private gastoMs = 0;
  private readonly lotes = new Float64Array(SONDA.lotes);
  private aquecimentoMs = 0;
  resultado: ResultadoDaSonda | null = null;

  constructor(
    private readonly estado: Estado,
    private readonly dados: DadosDaVigilia,
    private readonly agora: () => number,
  ) {}

  /** Roda a próxima etapa e devolve o resultado quando a sonda termina (null antes). */
  etapa(): ResultadoDaSonda | null {
    if (this.resultado) return this.resultado;
    const t0 = this.agora();
    avancar(this.estado, this.dados, PARADO, this.etapas === 0 ? SONDA.aquecimento : SONDA.passosPorLote);
    const dt = this.agora() - t0;
    this.gastoMs += dt;
    if (this.etapas === 0) this.aquecimentoMs = dt;
    else this.lotes[this.etapas - 1] = dt / SONDA.passosPorLote;
    this.etapas++;
    const medidos = this.etapas - 1;
    if (this.gastoMs > SONDA.orcamentoMs) {
      this.resultado = { valor: 300, ms: medidos > 0 ? mediana(this.lotes, medidos) : this.aquecimentoMs / SONDA.aquecimento };
    } else if (medidos === SONDA.lotes) {
      const ms = mediana(this.lotes, medidos);
      this.resultado = { valor: ms <= SONDA.limiteMsPorPasso ? 500 : 300, ms };
    }
    return this.resultado;
  }
}

/** A sonda inteira de uma vez (testes). */
export function medirSonda(estado: Estado, dados: DadosDaVigilia, agora: () => number): ResultadoDaSonda {
  const sonda = new SondaDoTeto(estado, dados, agora);
  let r = sonda.etapa();
  while (r === null) r = sonda.etapa();
  return r;
}

// ——— Cache vdc.teto ———

export const CHAVE_DO_CACHE = 'vdc.teto';

/** O que identifica o resultado da sonda: o build, o token `Version/` do Safari (o "OS xx" está congelado no Safari 26) e a classe de tela. */
export interface IdentidadeDoCache {
  readonly build: string;
  readonly versaoDoSafari: string | null;
  readonly tela: string;
}

/** Token `Version/x.y` do user agent (Safari), ou null. */
export function versaoDoSafari(ua: string): string | null {
  const m = /Version\/([\d.]+)/.exec(ua);
  return m ? m[1]! : null;
}

/** Classe de tela da chave: DPR e as dimensões em pt, em retrato. */
export function classeDaTela(t: Tela): string {
  return `${t.dpr}x${Math.min(t.largura, t.altura)}x${Math.max(t.largura, t.altura)}`;
}

/** Armazenamento mínimo (localStorage); pode lançar erro (modo privado, cota). */
export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

/** O localStorage do navegador, ou null onde ele lança erro (modo privado, cookies bloqueados). */
export function armazenamentoLocal(): Armazenamento | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** O TETO do cache, se a identidade bate; qualquer erro ou formato estranho vale null. */
export function lerCacheDoTeto(a: Armazenamento | null, id: IdentidadeDoCache): ValorDoTeto | null {
  try {
    const bruto = a?.getItem(CHAVE_DO_CACHE);
    if (!bruto) return null;
    const c = JSON.parse(bruto) as Partial<IdentidadeDoCache & { valor: number }>;
    if (c.build !== id.build || c.versaoDoSafari !== id.versaoDoSafari || c.tela !== id.tela) return null;
    return c.valor === 300 || c.valor === 500 ? c.valor : null;
  } catch {
    return null;
  }
}

export function gravarCacheDoTeto(a: Armazenamento | null, id: IdentidadeDoCache, valor: ValorDoTeto): void {
  try {
    a?.setItem(CHAVE_DO_CACHE, JSON.stringify({ ...id, valor }));
  } catch {
    // Sem armazenamento (modo privado): a sonda roda de novo na próxima sessão.
  }
}

/** Com o rAF a 30 fps (Low Power Mode), a CPU está limitada e a medida não vale para as próximas sessões. */
export const FPS_MINIMO_PARA_O_CACHE = 45;
