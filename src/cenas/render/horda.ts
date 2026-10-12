// Cálculo do desenho da horda, sem Phaser (design/decisoes-F-003.md §7): um
// só cálculo para os dois modos de render, que só escrevem o resultado. Para
// cada slot vivo: posição interpolada pelo delta toroidal (ADR-0002 §3),
// arredondada para o pixel do canvas como o jogador e a câmera, e na cópia mais
// próxima da câmera (ADR-0002 §11); o slot livre sai invisível. Nada é alocado
// por frame.
import { CAPACIDADE_DE_INIMIGOS, type Estado } from '../../logica/nucleo/estado';
import { IDS_DE_TIPO } from '../../logica/mundo/tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../../logica/mundo/toro';
import { ESCALA_DO_CANVAS } from '../escala';
import { COR_DO_INIMIGO } from '../paleta';
import { escalaPara, type NomeDaMoldura } from './atlas';

/** Como desenhar um tipo: moldura do atlas, escala, cor e o tint já empacotado (calculado uma vez, fora do laço). */
export interface DesenhoDoTipo {
  readonly moldura: NomeDaMoldura;
  readonly escala: number;
  readonly cor: number;
  readonly tint: number;
}

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
 * círculo (massa) e quadrado (médios) de B §2, no tamanho de B §3.2. Um tipo que
 * nasce sem forma, tamanho ou cor é erro alto aqui, nunca um NaN na tela.
 */
export function criarTabelaDeDesenho(inimigos: readonly FormaDoJson[], existe: Uint8Array): (DesenhoDoTipo | null)[] {
  const tabela: (DesenhoDoTipo | null)[] = IDS_DE_TIPO.map(() => null);
  for (let codigo = 1; codigo < IDS_DE_TIPO.length; codigo++) {
    if (existe[codigo] !== 1) continue;
    const id = IDS_DE_TIPO[codigo]!;
    const i = inimigos.find((x) => x.id === id);
    const cor = COR_DO_INIMIGO[id];
    if (!i || i.tamanho_px === null || cor === undefined) throw new Error(`desenho: ${id} nasce sem tamanho ou sem cor`);
    const moldura: NomeDaMoldura = i.forma === 'circulo' ? 'massa' : i.forma === 'quadrado' ? 'quadrado' : falha(id, i.forma);
    tabela[codigo] = { moldura, escala: escalaPara(moldura, i.tamanho_px), cor, tint: tintOpaco(cor) };
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
}

export function criarSaidaDaHorda(): SaidaDaHorda {
  return {
    tipo: new Uint8Array(CAPACIDADE_DE_INIMIGOS),
    x: new Float64Array(CAPACIDADE_DE_INIMIGOS),
    y: new Float64Array(CAPACIDADE_DE_INIMIGOS),
  };
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
