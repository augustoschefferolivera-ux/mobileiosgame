// Consumidor do anel de eventos no render (design/decisoes-F-004.md §6): lê
// todos os eventos novos em ordem, a cada quadro, e mantém os pools do render:
// números de dano (96, com agregação por handle em 12 passos), efeitos de golpe
// e de pulso (16) e mortes (300). Antes de cada evento, expira o que já passou
// da vida no passo dele; assim, os vivos num passo dependem só da sequência de
// eventos, e não do fps. Pool cheio = recusa, nada é reciclado (ADR-0002 §4).
// Sem Phaser e sem alocar por quadro.
import { COR_DA_CHAVE } from '../../arte/paleta';
import { ARMA } from '../../logica/armas/tabela';
import { CAPACIDADE_DE_INIMIGOS, CAB, FASE, JOGADOR, JOGADOR4_U8, type Estado } from '../../logica/nucleo/estado';
import { CAUSA, EV, EVENTO, FLAG, FORMA, LeitorDeEventos, inicioDoEvento } from '../../logica/nucleo/eventos';
import type { TiposDeInimigo } from '../../logica/mundo/tipos';
import { POOL_DE_MORTES_DEGRADADO } from '../../plataforma/degradacao';

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

/** As partículas do acerto nascem a 8 pt do ponto do inimigo, na direção em que saltam (F-011). */
const AFASTAMENTO_DO_ACERTO = 8;

/** Partículas do render (F-011, style card §6): faíscas, lascas de sal, cinza e brasas. */
export const CAPACIDADE_DE_PARTICULAS = 256;

export interface PoolDeParticulas {
  readonly ativo: Uint8Array;
  /** Posição e velocidade no passo de nascer, em pt e pt por passo; a gravidade em pt por passo². */
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly vx: Float64Array;
  readonly vy: Float64Array;
  readonly gravidade: Float64Array;
  readonly passo: Float64Array;
  readonly vida: Uint8Array;
  /** Cor da paleta (o ponto branco tingido sai na cor exata). */
  readonly cor: Uint32Array;
  /** 1 = ponto de 2 pt; 0 = de 1 pt. */
  readonly grande: Uint8Array;
}

const Y = COR_DA_CHAVE.Y!;
const A = COR_DA_CHAVE.A!;
const BRASA_CLARA = COR_DA_CHAVE.a!;
const SAL = COR_DA_CHAVE.S!;
const BRILHO = COR_DA_CHAVE.H!;
const CINZA_CLARA = COR_DA_CHAVE.L!;
const CINZA = COR_DA_CHAVE.M!;
const DOIS_PI_POR_1024 = (2 * Math.PI) / 1024;

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
  /** Código da arma do evento (a Lâmina do Juramento Eterno desenha o arco forte, F-011). */
  readonly arma: Uint8Array;
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
    arma: new Uint8Array(CAPACIDADE_DE_EFEITOS),
    passo: new Float64Array(CAPACIDADE_DE_EFEITOS),
    a: new Float64Array(CAPACIDADE_DE_EFEITOS),
    b: new Float64Array(CAPACIDADE_DE_EFEITOS),
    c: new Float64Array(CAPACIDADE_DE_EFEITOS),
    d: new Float64Array(CAPACIDADE_DE_EFEITOS),
  };
  readonly particulas: PoolDeParticulas = {
    ativo: new Uint8Array(CAPACIDADE_DE_PARTICULAS),
    x: new Float64Array(CAPACIDADE_DE_PARTICULAS),
    y: new Float64Array(CAPACIDADE_DE_PARTICULAS),
    vx: new Float64Array(CAPACIDADE_DE_PARTICULAS),
    vy: new Float64Array(CAPACIDADE_DE_PARTICULAS),
    gravidade: new Float64Array(CAPACIDADE_DE_PARTICULAS),
    passo: new Float64Array(CAPACIDADE_DE_PARTICULAS),
    vida: new Uint8Array(CAPACIDADE_DE_PARTICULAS),
    cor: new Uint32Array(CAPACIDADE_DE_PARTICULAS),
    grande: new Uint8Array(CAPACIDADE_DE_PARTICULAS),
  };
  /** Partículas recusadas por pool cheio desde reiniciar() (nada é reciclado, ADR-0002 §4). */
  particulasRecusadas = 0;
  /** Último passo em que as brasas do Frasco e do Apagar nasceram (uma vez por passo, não por quadro). */
  private passoDasBrasas = -1;
  /** Passo do último acerto em cada slot de inimigo (o quadro de acerto da F-011); −1e9 = nenhum. */
  readonly acertos = new Float64Array(CAPACIDADE_DE_INIMIGOS).fill(-1e9);
  /** O número mais novo de cada slot de inimigo (−1 = nenhum), para a agregação (N7). */
  private readonly numeroDoSlot = new Int16Array(CAPACIDADE_DE_INIMIGOS).fill(-1);
  readonly leitor = new LeitorDeEventos();
  /** Recusas por pool cheio, desde reiniciar(). `telegrafos` e `projeteisInimigos` são os excedentes não desenhados no último quadro (RE5). */
  readonly recusados = { numeros: 0, mortes: 0, efeitos: 0, telegrafos: 0, projeteisInimigos: 0 };
  /** Eventos de feedback da interface lidos do anel desde reiniciar(): o flash, os sons e o pulso da stamina os consomem (FB2, FB4, RE1). */
  readonly feedback = { aparo: 0, esquivaPerfeita: 0, acaoNegada: 0, danoRecebido: 0 };
  numerosVivos = 0;
  private numerosLigados = true;
  /** Até onde o nascimento procura vaga (F-010 DG2): o nível 1 da degradação reduz o pool de mortes a 150 e o anel de partículas à metade; as vagas acima do limite só terminam de vida. */
  private limiteDeMortes = CAPACIDADE_DE_MORTES;
  private limiteDeParticulas = CAPACIDADE_DE_PARTICULAS;

  constructor(private readonly tipos: TiposDeInimigo) {}

  /** Nível de degradação 0 a 3 (DG2): a partir do 1, pool de mortes de 150 e anel de partículas pela metade. Só o render muda; fora do hash. */
  limitarPorDegradacao(nivel: number): void {
    this.limiteDeMortes = nivel >= 1 ? POOL_DE_MORTES_DEGRADADO : CAPACIDADE_DE_MORTES;
    this.limiteDeParticulas = nivel >= 1 ? CAPACIDADE_DE_PARTICULAS >> 1 : CAPACIDADE_DE_PARTICULAS;
  }

  /** Os limites vigentes, para o debug e os testes. */
  get limites(): { mortes: number; particulas: number } {
    return { mortes: this.limiteDeMortes, particulas: this.limiteDeParticulas };
  }

  reiniciar(): void {
    this.numeros.ativo.fill(0);
    this.mortes.ativo.fill(0);
    this.efeitos.ativo.fill(0);
    this.numeroDoSlot.fill(-1);
    this.acertos.fill(-1e9);
    this.particulas.ativo.fill(0);
    this.particulasRecusadas = 0;
    this.passoDasBrasas = -1;
    this.leitor.reiniciar();
    this.recusados.numeros = this.recusados.mortes = this.recusados.efeitos = this.recusados.telegrafos = this.recusados.projeteisInimigos = 0;
    this.feedback.aparo = this.feedback.esquivaPerfeita = this.feedback.acaoNegada = this.feedback.danoRecebido = 0;
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
    const f32 = anel.f32;
    // Os métodos leem o evento do anel pelo índice: nenhum double nem handle (≥ 2³⁰) atravessa a chamada.
    for (let k = 0; k < n; k++) {
      const i = inicioDoEvento(this.leitor.proximo + k);
      this.expirar(u32[i + EV.passo]!);
      const tipo = u32[i + EV.tipoArmaForma]! & 0xff;
      // Partículas do evento (F-011), em linha pelo mesmo motivo: quantas, a velocidade, a vida, a gravidade e as
      // cores; a direção sai de um hash inteiro do passo, do alvo e da partícula (a imagem não depende do fps).
      let quantas = 0;
      let vel = 0;
      let vida = 0;
      let grav = 0;
      let cor0 = 0;
      let cor1 = 0;
      let grande = 0;
      let px = 0;
      let py = 0;
      // Distância do ponto do evento em que a partícula nasce, na direção em que salta.
      let afasta = 0;
      if (tipo === EVENTO.acerto) {
        const slot = u32[i + EV.alvo]! & 0xffff;
        if (slot < CAPACIDADE_DE_INIMIGOS) this.acertos[slot] = u32[i + EV.passo]!;
        if (this.numerosLigados) this.somarAcerto(e, i);
        const arma = (u32[i + EV.tipoArmaForma]! >>> 8) & 0xff;
        px = f32[i + EV.floats]!;
        py = f32[i + EV.floats + 1]!;
        // As faíscas e lascas saltam da superfície do corpo, não do miolo (o miolo fica para o telegrafo, RE4).
        afasta = AFASTAMENTO_DO_ACERTO;
        if (arma === ARMA.facas_de_sal) {
          quantas = 2;
          vel = 1.6;
          vida = 10;
          grav = 0.08;
          cor0 = SAL;
          cor1 = BRILHO;
        } else if (arma === ARMA.circulo_de_sal) {
          quantas = 1;
          vel = 0.9;
          vida = 8;
          cor0 = SAL;
          cor1 = SAL;
        } else {
          quantas = 3;
          vel = 1.8;
          vida = 12;
          grav = 0.05;
          cor0 = Y;
          cor1 = A;
        }
      } else if (tipo === EVENTO.morte) {
        // A morte e os efeitos são criados aqui, em linha: são raros por quadro, e numa função à parte ficariam no
        // interpretador do V8, que guarda cada double lido como objeto (E6).
        if (((u32[i + EV.inimigoFlagsCausa]! >>> 16) & 0xff) !== CAUSA.arma) continue;
        const m = this.mortes;
        let j = 0;
        while (j < this.limiteDeMortes && m.ativo[j] === 1) j++;
        if (j === this.limiteDeMortes) {
          this.recusados.mortes++;
          continue;
        }
        m.ativo[j] = 1;
        m.x[j] = f32[i + EV.floats]!;
        m.y[j] = f32[i + EV.floats + 1]!;
        m.tipo[j] = u32[i + EV.inimigoFlagsCausa]! & 0xff;
        m.passo[j] = u32[i + EV.passo]!;
        // A cinza do corpo: 4 grãos que sobem um pouco e caem.
        quantas = 4;
        vel = 0.6;
        vida = 18;
        grav = 0.06;
        cor0 = CINZA_CLARA;
        cor1 = CINZA;
        grande = 1;
        px = m.x[j]!;
        py = m.y[j]!;
      } else if (tipo === EVENTO.aparo) {
        this.feedback.aparo++;
        // O anel de faíscas do aparo, em volta do jogador.
        quantas = 10;
        vel = 2.6;
        vida = 12;
        cor0 = Y;
        cor1 = BRASA_CLARA;
        px = e.jogador[JOGADOR.x]!;
        py = e.jogador[JOGADOR.y]!;
      } else if (tipo === EVENTO.esquivaPerfeita) {
        this.feedback.esquivaPerfeita++;
      } else if (tipo === EVENTO.acaoNegada) {
        this.feedback.acaoNegada++;
      } else if (tipo === EVENTO.danoAoJogador) {
        // O sinal de acerto só acende com dano líquido ≥ 0,0001 (HB2); esquivado, aparado e invulnerável não emitem o evento.
        if (f32[i + EV.floats + 2]! >= 0.0001) this.feedback.danoRecebido++;
      } else if (tipo === EVENTO.golpe || tipo === EVENTO.pulso) {
        const ef = this.efeitos;
        let j = 0;
        while (j < CAPACIDADE_DE_EFEITOS && ef.ativo[j] === 1) j++;
        if (j === CAPACIDADE_DE_EFEITOS) {
          this.recusados.efeitos++;
          continue;
        }
        ef.ativo[j] = 1;
        ef.tipo[j] = tipo === EVENTO.golpe ? EFEITO.golpe : EFEITO.pulso;
        ef.forma[j] = (u32[i + EV.tipoArmaForma]! >>> 16) & 0xff;
        ef.arma[j] = (u32[i + EV.tipoArmaForma]! >>> 8) & 0xff;
        ef.passo[j] = u32[i + EV.passo]!;
        ef.a[j] = f32[i + EV.floats]!;
        ef.b[j] = f32[i + EV.floats + 1]!;
        ef.c[j] = f32[i + EV.floats + 2]!;
        ef.d[j] = f32[i + EV.floats + 3]!;
      }
      const pa = this.particulas;
      const alvo = u32[i + EV.alvo]!;
      const passoDoEvento = u32[i + EV.passo]!;
      let livre = 0;
      for (let q = 0; q < quantas; q++) {
        while (livre < this.limiteDeParticulas && pa.ativo[livre] === 1) livre++;
        if (livre === this.limiteDeParticulas) {
          this.particulasRecusadas += quantas - q;
          break;
        }
        let h = Math.imul(passoDoEvento * 31 + q, 0x9e3779b1) ^ Math.imul(alvo, 0x85ebca6b);
        h ^= h >>> 13;
        h = Math.imul(h, 0xc2b2ae35);
        h ^= h >>> 16;
        // No aparo, os 10 em anel regular; nos outros, direção e força sorteadas pelo hash.
        const ang = tipo === EVENTO.aparo ? (q * 2 * Math.PI) / quantas : (h & 1023) * DOIS_PI_POR_1024;
        const forca = vel * (tipo === EVENTO.aparo ? 1 : 0.6 + ((h >>> 10) & 7) * 0.08);
        const cos = Math.cos(ang);
        const sen = Math.sin(ang);
        pa.ativo[livre] = 1;
        pa.x[livre] = px + cos * afasta;
        pa.y[livre] = py + sen * afasta;
        pa.vx[livre] = cos * forca;
        // A cinza sobe antes de cair; as faíscas saem para todo lado.
        pa.vy[livre] = sen * forca - (grande === 1 ? 0.5 : 0);
        pa.gravidade[livre] = grav;
        pa.passo[livre] = passoDoEvento;
        pa.vida[livre] = vida + ((h >>> 13) & 3);
        pa.cor[livre] = (h >>> 15) & 1 ? cor1 : cor0;
        pa.grande[livre] = grande;
      }
    }
    this.leitor.proximo += n;
    this.expirar(e.cab[CAB.passo]!);
    // Brasas do Frasco (a cada 5 passos) e do Apagar (a cada 2), uma vez por passo, subindo do jogador.
    const passo = e.cab[CAB.passo]!;
    if (passo !== this.passoDasBrasas) {
      this.passoDasBrasas = passo;
      const u4 = e.jogador4U8;
      const apagando = u4[JOGADOR4_U8.fase] === FASE.apagando;
      if (apagando ? passo % 2 === 0 : u4[JOGADOR4_U8.frascoPasso]! > 0 && passo % 5 === 0) {
        const pa = this.particulas;
        let k = 0;
        while (k < this.limiteDeParticulas && pa.ativo[k] === 1) k++;
        if (k === this.limiteDeParticulas) this.particulasRecusadas++;
        else {
          let h = Math.imul(passo ^ 0x5bd1e995, 0x27d4eb2d);
          h ^= h >>> 15;
          pa.ativo[k] = 1;
          pa.x[k] = e.jogador[JOGADOR.x]! + ((h & 31) - 16) * 0.6;
          pa.y[k] = e.jogador[JOGADOR.y]! + 6;
          pa.vx[k] = (((h >>> 5) & 15) - 7.5) * 0.02;
          pa.vy[k] = -0.55;
          pa.gravidade[k] = 0;
          pa.passo[k] = passo;
          pa.vida[k] = 36;
          pa.cor[k] = (h >>> 9) & 1 ? Y : BRASA_CLARA;
          pa.grande[k] = apagando ? 1 : 0;
        }
      }
    }
  }

  /** Apaga os números vivos (a opção desligada). */
  apagarNumeros(): void {
    this.numeros.ativo.fill(0);
    this.numeroDoSlot.fill(-1);
    this.numerosVivos = 0;
  }

  private expirar(passo: number): void {
    const pa = this.particulas;
    for (let k = 0; k < CAPACIDADE_DE_PARTICULAS; k++) if (pa.ativo[k] === 1 && passo - pa.passo[k]! >= pa.vida[k]!) pa.ativo[k] = 0;
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
