// Medida da CPU do frame (ADR-0002 §14; design/decisoes-F-003.md §8, E1): de
// PRE_STEP a POST_RENDER, com o tempo da simulação e os passos de cada quadro.
// cpuFrameMs é o p50/p95 dos últimos 60 quadros; o anel de 2.048 quadros
// (quadro inteiro, até PRE_RENDER, simulação e passos) serve ao F-003.4 e só é
// exposto no build de debug. Nada é alocado por frame; ordenar só na leitura.

const JANELA = 60;
export const QUADROS_GUARDADOS = 2048;

export interface Quadro {
  total: number;
  ateRender: number;
  simulacao: number;
  passos: number;
}

export class MedidorDeQuadros {
  private readonly totais = new Float64Array(QUADROS_GUARDADOS);
  private readonly ateRender = new Float64Array(QUADROS_GUARDADOS);
  private readonly simulacao = new Float64Array(QUADROS_GUARDADOS);
  private readonly passos = new Uint8Array(QUADROS_GUARDADOS);
  private n = 0;
  private t0 = -1;
  private tRender = -1;
  private sim = 0;
  private nPassos = 0;

  inicio(t: number): void {
    this.t0 = t;
    this.tRender = -1;
    this.sim = 0;
    this.nPassos = 0;
  }

  simulou(ms: number, passos: number): void {
    this.sim += ms;
    this.nPassos += passos;
  }

  antesDoRender(t: number): void {
    this.tRender = t;
  }

  fim(t: number): void {
    if (this.t0 < 0 || this.tRender < 0) return;
    const i = this.n % QUADROS_GUARDADOS;
    this.totais[i] = t - this.t0;
    this.ateRender[i] = this.tRender - this.t0;
    this.simulacao[i] = this.sim;
    this.passos[i] = Math.min(this.nPassos, 255);
    this.n++;
    this.t0 = -1;
  }

  /** p50 e p95 do quadro inteiro nos últimos 60 quadros (ADR-0002 §14). */
  cpuFrameMs(): { p50: number; p95: number } {
    const k = Math.min(this.n, JANELA);
    const v: number[] = [];
    for (let j = 1; j <= k; j++) v.push(this.totais[(this.n - j) % QUADROS_GUARDADOS]!);
    return { p50: percentil(v, 0.5), p95: percentil(v, 0.95) };
  }

  /** Cópia dos últimos quadros, do mais antigo ao mais novo (build de debug). */
  quadros(): Quadro[] {
    const k = Math.min(this.n, QUADROS_GUARDADOS);
    const out: Quadro[] = [];
    for (let j = k; j >= 1; j--) {
      const i = (this.n - j) % QUADROS_GUARDADOS;
      out.push({ total: this.totais[i]!, ateRender: this.ateRender[i]!, simulacao: this.simulacao[i]!, passos: this.passos[i]! });
    }
    return out;
  }

  get contados(): number {
    return this.n;
  }
}

/** Percentil por posição na lista ordenada (0 sem amostras). */
export function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const v = [...valores].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.floor(p * v.length))]!;
}
