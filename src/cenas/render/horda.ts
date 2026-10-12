// Cálculo do desenho da horda, sem Phaser (design/decisoes-F-003.md §7): um
// só cálculo para os dois modos de render, que só escrevem o resultado. Para
// cada slot vivo: posição interpolada pelo delta toroidal (ADR-0002 §3),
// arredondada para o pixel do canvas como o jogador e a câmera, e na cópia mais
// próxima da câmera (ADR-0002 §11); o slot livre sai invisível. Na F-011, cada
// slot também ganha o quadro da arte (andar, acerto) e o espelho pela direção
// em que anda. Nada é alocado por frame.
import { ESCALA_DA_GRADE } from '../../arte/catalogo';
import { CAB, CAPACIDADE_DE_INIMIGOS, JOGADOR, type Estado } from '../../logica/nucleo/estado';
import { IDS_DE_TIPO } from '../../logica/mundo/tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../../logica/mundo/toro';
import { ESCALA_DO_CANVAS } from '../escala';
import { COR_DO_INIMIGO } from '../paleta';
import { indiceDaMoldura } from './atlas';

/**
 * Como desenhar um tipo (calculado uma vez, fora do laço): as molduras da arte (índices em NOMES_DAS_MOLDURAS), a
 * escala de 2 pt por px de arte, a cor de identidade (o bloco do centro do sprite, COR_DO_INIMIGO) e o tint branco
 * opaco (a arte não é tingida).
 */
export interface DesenhoDoTipo {
  readonly id: string;
  /** Médio (Oco Grande, Noviça): vai na 2ª camada, acima da massa (RE8). */
  readonly medio: boolean;
  readonly escala: number;
  readonly cor: number;
  readonly tint: number;
  readonly andar: readonly [number, number];
  readonly acerto: number;
  /** Telegrafo ("inspirar") e ataque; na massa, o 1º quadro de andar. */
  readonly telegrafo: number;
  readonly ataque: number;
  /** Silhueta branca do telegrafo, por cima do corpo com alfa 1 − blend (RE4); na massa, −1. */
  readonly branco: number;
  /** A morte que vira cinza em 3 quadros (doc 13 §1.5). */
  readonly cinza: readonly [number, number, number];
}

/** Passos que o quadro de acerto fica na tela depois do golpe (≈ 50 ms; style card §6). */
export const PASSOS_DO_ACERTO = 3;

/** Tint como o Phaser grava (Utils.getTintAppendFloatAlpha com alpha 1). */
export function tintOpaco(cor: number): number {
  return (0xff000000 | cor) >>> 0;
}

/** O que se lê de cada inimigo de inimigos.json para desenhar. */
export interface FormaDoJson {
  readonly id: string;
  readonly forma: string;
  readonly tamanho_px: number | null;
}

/**
 * Tabela de desenho por código de tipo, só com os tipos que nascem (`existe`):
 * círculo (massa) e quadrado (médios) de B §2, no tamanho de B §3.2, agora com
 * as molduras da arte do tipo. Um tipo que nasce sem forma, tamanho, cor ou
 * arte é erro alto aqui, nunca um NaN na tela.
 */
export function criarTabelaDeDesenho(inimigos: readonly FormaDoJson[], existe: Uint8Array): (DesenhoDoTipo | null)[] {
  const tabela: (DesenhoDoTipo | null)[] = IDS_DE_TIPO.map(() => null);
  for (let codigo = 1; codigo < IDS_DE_TIPO.length; codigo++) {
    if (existe[codigo] !== 1) continue;
    const id = IDS_DE_TIPO[codigo]!;
    const i = inimigos.find((x) => x.id === id);
    const cor = COR_DO_INIMIGO[id];
    if (!i || i.tamanho_px === null || cor === undefined) throw new Error(`desenho: ${id} nasce sem tamanho ou sem cor`);
    const medio = i.forma === 'circulo' ? false : i.forma === 'quadrado' ? true : falha(id, i.forma);
    const andar = indiceDaMoldura(id);
    tabela[codigo] = {
      id,
      medio,
      escala: ESCALA_DA_GRADE.arte,
      cor,
      tint: tintOpaco(0xffffff),
      andar: [andar, indiceDaMoldura(`${id}_2`)],
      acerto: indiceDaMoldura(`${id}_acerto`),
      telegrafo: medio ? indiceDaMoldura(`${id}_telegrafo`) : andar,
      ataque: medio ? indiceDaMoldura(`${id}_ataque`) : andar,
      branco: medio ? indiceDaMoldura(`${id}_telegrafo_branco`) : -1,
      cinza: [indiceDaMoldura(`${id}_cinza_0`), indiceDaMoldura(`${id}_cinza_1`), indiceDaMoldura(`${id}_cinza_2`)],
    };
  }
  return tabela;
}

function falha(id: string, forma: string): never {
  throw new Error(`desenho: forma ${forma} de ${id} sem moldura`);
}

/** Saída do cálculo, por slot. */
export interface SaidaDaHorda {
  /** Código do tipo a desenhar; 0 = invisível. */
  readonly tipo: Uint8Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
  /** Moldura do quadro (índice em NOMES_DAS_MOLDURAS), escrita por prepararQuadrosDaHorda. */
  readonly quadro: Uint16Array;
  /** 1 = virado para a esquerda (o sprite espelhado): o inimigo olha para o lado do jogador. */
  readonly espelhar: Uint8Array;
}

export function criarSaidaDaHorda(): SaidaDaHorda {
  return {
    tipo: new Uint8Array(CAPACIDADE_DE_INIMIGOS),
    x: new Float64Array(CAPACIDADE_DE_INIMIGOS),
    y: new Float64Array(CAPACIDADE_DE_INIMIGOS),
    quadro: new Uint16Array(CAPACIDADE_DE_INIMIGOS),
    espelhar: new Uint8Array(CAPACIDADE_DE_INIMIGOS),
  };
}

/**
 * O quadro e o espelho de cada slot visível (F-011): o quadro de acerto nos 3 passos depois de um golpe
 * (`acertos[slot]` é o passo do último acerto, mantido pelo consumidor do anel); senão o andar de 2 quadros a
 * 7,5 por segundo, defasado pelo slot para a horda não andar em sincronia. O espelho olha para o lado do
 * jogador (a horda persegue). Tudo pelo estado do passo: a imagem pausada não depende de quantos quadros o
 * render desenhou antes.
 */
export function prepararQuadrosDaHorda(e: Estado, tabela: readonly (DesenhoDoTipo | null)[], acertos: Float64Array, out: SaidaDaHorda): void {
  const ini = e.inimigos;
  const passo = e.cab[CAB.passo]!;
  const jx = e.jogador[JOGADOR.x]!;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    const d = out.tipo[s] === 0 ? null : tabela[out.tipo[s]!];
    if (!d) continue;
    let dx = jx - ini.x[s]!;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    out.espelhar[s] = dx < 0 ? 1 : 0;
    out.quadro[s] = passo - acertos[s]! < PASSOS_DO_ACERTO ? d.acerto : d.andar[((passo + s * 5) >> 3) & 1]!;
  }
}

/**
 * Posição de desenho de cada slot. O laço roda 500 vezes por quadro, então as
 * contas de interpolarNoToro, arredondarParaOPixel e copiaMaisProxima vão em
 * linha: no V8, cada double passado a uma chamada não inlinada alocaria um
 * HeapNumber (design/decisoes-F-003.md §7). Os testes conferem a igualdade com
 * as funções.
 */
export function prepararHorda(e: Estado, alfa: number, camX: number, camY: number, out: SaidaDaHorda): void {
  const ini = e.inimigos;
  const pos = e.pool.posicao;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    if (pos[s]! < 0) {
      out.tipo[s] = 0;
      continue;
    }
    out.tipo[s] = ini.tipo[s]!;
    const xAnt = ini.xAnt[s]!;
    const yAnt = ini.yAnt[s]!;
    let dx = ini.x[s]! - xAnt;
    if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
    if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
    let dy = ini.y[s]! - yAnt;
    if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
    if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
    const x = Math.round((xAnt + dx * alfa) * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
    const y = Math.round((yAnt + dy * alfa) * ESCALA_DO_CANVAS) / ESCALA_DO_CANVAS;
    let mx = (x - camX + MEIA_LARGURA_DO_MAPA) % LARGURA_DO_MAPA;
    if (mx < 0) mx += LARGURA_DO_MAPA;
    let my = (y - camY + MEIA_ALTURA_DO_MAPA) % ALTURA_DO_MAPA;
    if (my < 0) my += ALTURA_DO_MAPA;
    out.x[s] = camX + mx - MEIA_LARGURA_DO_MAPA;
    out.y[s] = camY + my - MEIA_ALTURA_DO_MAPA;
  }
}
