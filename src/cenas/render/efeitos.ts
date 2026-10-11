// Consumidor do anel de eventos no render (design/decisoes-F-004.md §6): lê
// todos os eventos novos em ordem, a cada quadro, e mantém os pools do render:
// números de dano (96, com agregação por handle em 12 passos), efeitos de golpe
// e de pulso (16) e mortes (300). Antes de cada evento, expira o que já passou
// da vida no passo dele; assim, os vivos num passo dependem só da sequência de
// eventos, e não do fps. Pool cheio = recusa, nada é reciclado (ADR-0002 §4).
// Sem Phaser e sem alocar por quadro.
import { CAPACIDADE_DE_INIMIGOS, CAB, type Estado } from '../../logica/nucleo/estado';
import { CAUSA, EV, EVENTO, FLAG, FORMA, LeitorDeEventos, inicioDoEvento } from '../../logica/nucleo/eventos';
import type { TiposDeInimigo } from '../../logica/mundo/tipos';

/** Capacidades (ADR-0002 §4 e §15 item 2; V5). */
export const CAPACIDADE_DE_NUMEROS = 96;
export const CAPACIDADE_DE_MORTES = 300;
export const CAPACIDADE_DE_EFEITOS = 16;

/** Vidas, em passos (N6, V1, V3, V5). */
export const VIDA = { numero: 36, golpe: 8, pulso: 12, morte: 12 } as const;
/** Um acerto no mesmo inimigo soma no número vivo dele se esse número tem até 12 passos (N7). */
export const JANELA_DE_AGREGACAO = 12;
/** A base do número fica 2 pt acima do topo da hitbox (N5). */
const ACIMA_DA_HITBOX_PT = 2;

/** Tipo de efeito do pool de efeitos. */
export const EFEITO = { golpe: 1, pulso: 2 } as const;

export interface PoolDeNumeros {
  readonly ativo: Uint8Array;
  readonly valor: Float64Array;
  readonly x: Float64Array;
  /** Base do número: y do alvo − raio − 2 pt. */
  readonly y: Float64Array;
  /** Passo do evento que criou o número (a idade conta dele). */
  readonly passo: Float64Array;
  readonly handle: Float64Array;
  readonly critico: Uint8Array;
}

export interface PoolDeMortes {
  readonly ativo: Uint8Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly tipo: Uint8Array;
  readonly passo: Float64Array;
}

export interface PoolDeEfeitos {
  readonly ativo: Uint8Array;
  readonly tipo: Uint8Array;
  readonly forma: Uint8Array;
  readonly passo: Float64Array;
  /** golpe: direção, alcance e meia-largura; pulso: 0, 0, R e o empurrão máximo. */
  readonly a: Float64Array;
  readonly b: Float64Array;
  readonly c: Float64Array;
  readonly d: Float64Array;
}

export class EfeitosDaVigilia {
  readonly numeros: PoolDeNumeros = {
    ativo: new Uint8Array(CAPACIDADE_DE_NUMEROS),
    valor: new Float64Array(CAPACIDADE_DE_NUMEROS),
    x: new Float64Array(CAPACIDADE_DE_NUMEROS),
    y: new Float64Array(CAPACIDADE_DE_NUMEROS),
    passo: new Float64Array(CAPACIDADE_DE_NUMEROS),
    handle: new Float64Array(CAPACIDADE_DE_NUMEROS),
    critico: new Uint8Array(CAPACIDADE_DE_NUMEROS),
  };
  readonly mortes: PoolDeMortes = {
    ativo: new Uint8Array(CAPACIDADE_DE_MORTES),
    x: new Float64Array(CAPACIDADE_DE_MORTES),
    y: new Float64Array(CAPACIDADE_DE_MORTES),
    tipo: new Uint8Array(CAPACIDADE_DE_MORTES),
    passo: new Float64Array(CAPACIDADE_DE_MORTES),
  };
  readonly efeitos: PoolDeEfeitos = {
    ativo: new Uint8Array(CAPACIDADE_DE_EFEITOS),
    tipo: new Uint8Array(CAPACIDADE_DE_EFEITOS),
    forma: new Uint8Array(CAPACIDADE_DE_EFEITOS),
    passo: new Float64Array(CAPACIDADE_DE_EFEITOS),
    a: new Float64Array(CAPACIDADE_DE_EFEITOS),
    b: new Float64Array(CAPACIDADE_DE_EFEITOS),
    c: new Float64Array(CAPACIDADE_DE_EFEITOS),
    d: new Float64Array(CAPACIDADE_DE_EFEITOS),
  };
  /** O número mais novo de cada slot de inimigo (−1 = nenhum), para a agregação (N7). */
  private readonly numeroDoSlot = new Int16Array(CAPACIDADE_DE_INIMIGOS).fill(-1);
  readonly leitor = new LeitorDeEventos();
  /** Recusas por pool cheio, desde reiniciar(). */
  readonly recusados = { numeros: 0, mortes: 0, efeitos: 0 };
  numerosVivos = 0;
  private numerosLigados = true;

  constructor(private readonly tipos: TiposDeInimigo) {}

  reiniciar(): void {
    this.numeros.ativo.fill(0);
    this.mortes.ativo.fill(0);
    this.efeitos.ativo.fill(0);
    this.numeroDoSlot.fill(-1);
    this.leitor.reiniciar();
    this.recusados.numeros = this.recusados.mortes = this.recusados.efeitos = 0;
    this.numerosVivos = 0;
    this.numerosLigados = true;
  }

  /**
   * Lê os eventos novos do anel, em ordem, e expira o que passou da vida no
   * passo corrente. `numerosLigados` é a opção da pausa (N8): desligada, os
   * números vivos somem e os acertos não criam número, mas o anel continua
   * sendo lido.
   */
  consumir(e: Estado, numerosLigados: boolean): void {
    if (!numerosLigados && this.numerosLigados) this.apagarNumeros();
    this.numerosLigados = numerosLigados;
    const anel = e.eventos;
    const n = this.leitor.pendentes(anel);
    const u32 = anel.u32;
    // Os métodos leem o evento do anel pelo índice: nenhum double nem handle (≥ 2³⁰) atravessa a chamada.
    for (let k = 0; k < n; k++) {
      const i = inicioDoEvento(this.leitor.proximo + k);
      this.expirar(u32[i + EV.passo]!);
      const tipo = u32[i + EV.tipoArmaForma]! & 0xff;
      if (tipo === EVENTO.acerto) {
        if (this.numerosLigados) this.somarAcerto(e, i);
      } else if (tipo === EVENTO.morte) {
        if (((u32[i + EV.inimigoFlagsCausa]! >>> 16) & 0xff) === CAUSA.arma) this.criarMorte(e, i);
      } else if (tipo === EVENTO.golpe || tipo === EVENTO.pulso) {
        this.criarEfeito(e, i, tipo === EVENTO.golpe ? EFEITO.golpe : EFEITO.pulso);
      }
    }
    this.leitor.proximo += n;
    this.expirar(e.cab[CAB.passo]!);
  }

  /** Apaga os números vivos (a opção desligada). */
  apagarNumeros(): void {
    this.numeros.ativo.fill(0);
    this.numeroDoSlot.fill(-1);
    this.numerosVivos = 0;
  }

  private expirar(passo: number): void {
    const nu = this.numeros;
    for (let k = 0; k < CAPACIDADE_DE_NUMEROS; k++) {
      if (nu.ativo[k] === 1 && passo - nu.passo[k]! >= VIDA.numero) {
        nu.ativo[k] = 0;
        this.numerosVivos--;
      }
    }
    const m = this.mortes;
    for (let k = 0; k < CAPACIDADE_DE_MORTES; k++) if (m.ativo[k] === 1 && passo - m.passo[k]! >= VIDA.morte) m.ativo[k] = 0;
    const ef = this.efeitos;
    for (let k = 0; k < CAPACIDADE_DE_EFEITOS; k++) {
      if (ef.ativo[k] === 1 && passo - ef.passo[k]! >= (ef.tipo[k] === EFEITO.golpe ? VIDA.golpe : VIDA.pulso)) ef.ativo[k] = 0;
    }
  }

  /** Agregação (N7): soma no número vivo do mesmo handle com até 12 passos; senão, nasce um número (ou é recusado). */
  private somarAcerto(e: Estado, i: number): void {
    const u32 = e.eventos.u32;
    const f32 = e.eventos.f32;
    const passo = u32[i + EV.passo]!;
    const handle = u32[i + EV.alvo]!;
    const ifc = u32[i + EV.inimigoFlagsCausa]!;
    const valor = f32[i + EV.floats + 2]!;
    const nu = this.numeros;
    const slot = handle & 0xffff;
    const critico = ((ifc >>> 8) & FLAG.critico) !== 0 ? 1 : 0;
    const j = slot < CAPACIDADE_DE_INIMIGOS ? this.numeroDoSlot[slot]! : -1;
    if (j >= 0 && nu.ativo[j] === 1 && nu.handle[j] === handle && passo - nu.passo[j]! <= JANELA_DE_AGREGACAO) {
      nu.valor[j] = nu.valor[j]! + valor;
      if (critico === 1) nu.critico[j] = 1;
      return;
    }
    let k = 0;
    while (k < CAPACIDADE_DE_NUMEROS && nu.ativo[k] === 1) k++;
    if (k === CAPACIDADE_DE_NUMEROS) {
      this.recusados.numeros++;
      return;
    }
    nu.ativo[k] = 1;
    nu.valor[k] = valor;
    nu.x[k] = f32[i + EV.floats]!;
    nu.y[k] = f32[i + EV.floats + 1]! - this.tipos.raio[ifc & 0xff]! - ACIMA_DA_HITBOX_PT;
    nu.passo[k] = passo;
    nu.handle[k] = handle;
    nu.critico[k] = critico;
    if (slot < CAPACIDADE_DE_INIMIGOS) this.numeroDoSlot[slot] = k;
    this.numerosVivos++;
  }

  private criarMorte(e: Estado, i: number): void {
    const m = this.mortes;
    let k = 0;
    while (k < CAPACIDADE_DE_MORTES && m.ativo[k] === 1) k++;
    if (k === CAPACIDADE_DE_MORTES) {
      this.recusados.mortes++;
      return;
    }
    const u32 = e.eventos.u32;
    const f32 = e.eventos.f32;
    m.ativo[k] = 1;
    m.x[k] = f32[i + EV.floats]!;
    m.y[k] = f32[i + EV.floats + 1]!;
    m.tipo[k] = u32[i + EV.inimigoFlagsCausa]! & 0xff;
    m.passo[k] = u32[i + EV.passo]!;
  }

  private criarEfeito(e: Estado, i: number, tipo: number): void {
    const ef = this.efeitos;
    let k = 0;
    while (k < CAPACIDADE_DE_EFEITOS && ef.ativo[k] === 1) k++;
    if (k === CAPACIDADE_DE_EFEITOS) {
      this.recusados.efeitos++;
      return;
    }
    const u32 = e.eventos.u32;
    const f32 = e.eventos.f32;
    ef.ativo[k] = 1;
    ef.tipo[k] = tipo;
    ef.forma[k] = (u32[i + EV.tipoArmaForma]! >>> 16) & 0xff;
    ef.passo[k] = u32[i + EV.passo]!;
    ef.a[k] = f32[i + EV.floats]!;
    ef.b[k] = f32[i + EV.floats + 1]!;
    ef.c[k] = f32[i + EV.floats + 2]!;
    ef.d[k] = f32[i + EV.floats + 3]!;
  }
}

/** Idade de um item do render: o instante desenhado é passo − 1 + alfa (N6); com alfa = 1, passo − passoDoEvento. */
export function idade(passoAtual: number, alfa: number, passoDoEvento: number): number {
  const v = passoAtual - 1 + alfa - passoDoEvento;
  return v > 0 ? v : 0;
}

/** Estocada e golpes do arco (para quem desenha o efeito). */
export const FORMAS_DE_GOLPE = { ida: FORMA.ida, volta: FORMA.volta, estocada: FORMA.estocada } as const;

/**
 * Os dígitos de um valor de dano (N2): Math.round (meio para cima), mínimo 1
 * com dano > 0, no máximo 4 dígitos (≥ 10.000 vira 9999), por divisão
 * inteira, sem string. Escreve do mais significativo ao menos em `out` e
 * devolve quantos.
 */
export function digitosDe(valor: number, out: Uint8Array): number {
  let v = Math.round(valor);
  if (v < 1) v = valor > 0 ? 1 : 0;
  if (v > 9999) v = 9999;
  const n = v >= 1000 ? 4 : v >= 100 ? 3 : v >= 10 ? 2 : 1;
  for (let k = n - 1; k >= 0; k--) {
    out[k] = v % 10;
    v = Math.floor(v / 10);
  }
  return n;
}
