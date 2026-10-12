// A Vigília guardada (design/decisoes-F-008.md SV2 a SV5, SV9): o armazenamento dos saves `vigilia` e `andamento` em
// `localStorage` (try/catch em tudo, com queda para a memória da sessão), o gravador que os escreve nos momentos certos, a
// leitura do boot (descarta a Vigília já encerrada) e o FIM atômico. A lógica dos saves é de logica/save/vigilia.ts.
import type { ResultadoDaVigilia } from '../logica/mundo/vigilia';
import { sombraDaFogueira } from '../logica/mundo/fogueira';
import { CAB, FASE, FOGUEIRA_U32, JOGADOR4_U8, type Estado } from '../logica/nucleo/estado';
import { EV, EVENTO, eventosEscritos, inicioDoEvento } from '../logica/nucleo/eventos';
import { aplicarFimDeVigilia, type Meta } from '../logica/save/meta';
import {
  hashDosBytes,
  lerAndamento,
  lerVigilia,
  serializarAndamento,
  serializarVigilia,
  type AndamentoDaVigilia,
  type EnvelopeDaVigilia,
  type MotivoDaRecusa,
} from '../logica/save/vigilia';
import type { ArmazenamentoDoMeta } from './armazenamento';
import { armazenamentoLocal, type Armazenamento } from './sonda';

export const CHAVE_DA_VIGILIA = 'vdc.vigilia';
export const CHAVE_DO_ANDAMENTO = 'vdc.andamento';

/** `Armazenamento` com remoção (o `localStorage` tem). */
export interface ArmazenamentoRemovivel extends Armazenamento {
  removeItem(chave: string): void;
}

function localRemovivel(): ArmazenamentoRemovivel | null {
  return armazenamentoLocal() as ArmazenamentoRemovivel | null;
}

/**
 * `vdc.vigilia` e `vdc.andamento` (SV2). Gravar devolve se o `localStorage` aceitou (a mensagem "Vigília guardada" só
 * aparece então, FG8); se falhar (cota, modo privado), o texto fica na memória da sessão. Nunca lança.
 */
export class ArmazenamentoDaVigilia {
  private readonly memoria = new Map<string, string>();

  constructor(private readonly armazenamento: ArmazenamentoRemovivel | null = localRemovivel()) {}

  ler(chave: string): string | null {
    try {
      const t = this.armazenamento?.getItem(chave) ?? null;
      if (t !== null) return t;
    } catch {
      // cai para a memória
    }
    return this.memoria.get(chave) ?? null;
  }

  gravar(chave: string, texto: string): boolean {
    this.memoria.set(chave, texto);
    try {
      if (this.armazenamento === null) return false;
      this.armazenamento.setItem(chave, texto);
      return true;
    } catch {
      return false;
    }
  }

  remover(chave: string): void {
    this.memoria.delete(chave);
    try {
      this.armazenamento?.removeItem(chave);
    } catch {
      // uma falha aqui é coberta pela regra de leitura do SV4
    }
  }

  lerVigilia() {
    return lerVigilia(this.ler(CHAVE_DA_VIGILIA));
  }
  lerAndamento(): AndamentoDaVigilia | null {
    return lerAndamento(this.ler(CHAVE_DO_ANDAMENTO));
  }
  removerTudo(): void {
    this.remover(CHAVE_DA_VIGILIA);
    this.remover(CHAVE_DO_ANDAMENTO);
  }
}

/** O que o boot encontrou para oferecer (SV5). */
export interface RetomadaGuardada {
  readonly envelope: EnvelopeDaVigilia;
  /** O `andamento` do mesmo `idVigilia`, ou null. */
  readonly andamento: AndamentoDaVigilia | null;
}

/**
 * Leitura do boot (SV4, SV6): sem `vigilia`, ou com `idVigilia = ultimaEncerrada` (o FIM gravou o meta e caiu antes de
 * remover), não há oferta e o que sobrou é removido. Um save quebrado ou de soma errada é removido; o de versão maior
 * (build mais novo) fica intacto e sem oferta. O `andamento` de outra Vigília é removido.
 */
export function lerRetomada(arm: ArmazenamentoDaVigilia, meta: Meta): RetomadaGuardada | null {
  const lido = arm.lerVigilia();
  if (!lido.ok) {
    const manter: readonly MotivoDaRecusa[] = ['ausente', 'futuro'];
    if (!manter.includes(lido.motivo)) arm.removerTudo();
    return null;
  }
  if (lido.envelope.idVigilia === meta.ultimaEncerrada) {
    arm.removerTudo();
    return null;
  }
  const andamento = arm.lerAndamento();
  if (andamento !== null && andamento.idVigilia !== lido.envelope.idVigilia) {
    arm.remover(CHAVE_DO_ANDAMENTO);
    return { envelope: lido.envelope, andamento: null };
  }
  return { envelope: lido.envelope, andamento };
}

/**
 * FIM atômico (SV4): o `meta` com o crédito e `ultimaEncerrada = idVigilia` é gravado primeiro; só então se removem o
 * `vigilia` e o `andamento`. Uma Vigília já encerrada (`ultimaEncerrada` igual ao id) não credita de novo. `idVigilia` 0 é
 * uma Vigília sem save (cenário): só credita. Devolve o meta vigente.
 */
export function creditarFim(armMeta: ArmazenamentoDoMeta, arm: ArmazenamentoDaVigilia, meta: Meta, r: ResultadoDaVigilia, idVigilia: number): Meta {
  if (idVigilia > 0 && meta.ultimaEncerrada === idVigilia) {
    arm.removerTudo();
    return meta;
  }
  const credito = aplicarFimDeVigilia(meta, r);
  const novo: Meta = idVigilia > 0 ? { ...credito, ultimaEncerrada: idVigilia } : credito;
  armMeta.gravar(novo);
  if (idVigilia > 0) arm.removerTudo();
  return novo;
}

/** Os eventos que gravam o `vigilia` (SV3): Fogueira aberta, Descansar, Forjar (o estado do passo) e Partir (a sombra). */
const GRAVAM_O_ESTADO: ReadonlySet<number> = new Set([EVENTO.fogueiraAberta, EVENTO.descansou, EVENTO.forjou]);

/**
 * O gravador de uma Vigília (SV3, SV9). `vigilia`: no passo 0 (`gravarInicio`), ao abrir a Fogueira, depois de Descansar e
 * Forjar (estado do passo) e ao Partir ou sair do raio (a sombra, FG9). `andamento`: a cada `autosavePassos` passos
 * (3.600 = 60 s) e em `salvarAndamento` (visibilitychange, pagehide). O buffer só entra no `vigilia`. Lê o anel de
 * eventos com um cursor próprio; no máximo uma gravação por frame (a sombra vence o estado: depois do Partir o estado vivo já
 * não é o da Fogueira).
 */
export class GravadorDaVigilia {
  /** Sequência do último `vigilia` gravado; 0 antes do primeiro. */
  seq = 0;
  /** `{ seq, hash }` do último `vigilia` gravado, ou null (o `__GAME_DEBUG__.save`). */
  ultimo: { seq: number; hash: string } | null = null;
  /** O último `vigilia` entrou no `localStorage`? (FG8: "Vigília guardada" só então.) */
  guardou = false;
  private cursor: number;
  private proximoAndamento: number;

  constructor(
    private readonly arm: ArmazenamentoDaVigilia,
    e: Estado,
    private readonly autosavePassos: number,
    seqInicial = 0,
  ) {
    this.seq = seqInicial;
    this.cursor = eventosEscritos(e.eventos);
    this.proximoAndamento = (Math.floor(e.cab[CAB.passo]! / autosavePassos) + 1) * autosavePassos;
  }

  /** O `idVigilia` do estado. */
  idDe(e: Estado): number {
    return e.fogueiraU32[FOGUEIRA_U32.idVigilia]!;
  }

  /** O `vigilia` do estado como está, ou o buffer dado (a sombra). */
  gravarVigilia(e: Estado, bytes: Uint8Array = e.bytes): boolean {
    this.seq++;
    const ok = this.arm.gravar(CHAVE_DA_VIGILIA, serializarVigilia(e, this.seq, bytes));
    this.guardou = ok;
    this.ultimo = { seq: this.seq, hash: hashDosBytes(bytes) };
    return ok;
  }

  /** O `vigilia` do passo 0 (ponto de retomada da Hora I, Q-03). */
  gravarInicio(e: Estado): boolean {
    return this.gravarVigilia(e);
  }

  /** O `andamento` de agora (só na fase VIVA; depois do FIM não há o que guardar). */
  salvarAndamento(e: Estado): void {
    if (e.jogador4U8[JOGADOR4_U8.fase] !== FASE.viva) return;
    this.arm.gravar(CHAVE_DO_ANDAMENTO, serializarAndamento(e, this.seq));
  }

  /** Depois de cada frame: lê os eventos novos e confere o prazo do `andamento`. */
  depoisDoFrame(e: Estado): void {
    const fim = eventosEscritos(e.eventos);
    const u32 = e.eventos.u32;
    let estado = false;
    let partiu = false;
    for (let k = Math.max(this.cursor, fim - 1024); k < fim; k++) {
      const tipo = u32[inicioDoEvento(k) + EV.tipoArmaForma]! & 0xff;
      if (GRAVAM_O_ESTADO.has(tipo)) estado = true;
      else if (tipo === EVENTO.fogueiraPartiu) partiu = true;
    }
    this.cursor = fim;
    const sombra = partiu ? sombraDaFogueira(e) : undefined;
    if (sombra !== undefined) this.gravarVigilia(e, sombra);
    else if (estado) this.gravarVigilia(e);
    if (e.cab[CAB.passo]! >= this.proximoAndamento) {
      this.salvarAndamento(e);
      this.proximoAndamento = (Math.floor(e.cab[CAB.passo]! / this.autosavePassos) + 1) * this.autosavePassos;
    }
  }
}
