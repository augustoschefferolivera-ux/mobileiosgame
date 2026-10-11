// Cálculo do desenho da horda, sem Phaser (design/decisoes-F-003.md §7): um
// só cálculo para os dois modos de render, que só escrevem o resultado. Para
// cada slot vivo: posição interpolada pelo delta toroidal (ADR-0002 §3),
// arredondada para o pixel do canvas como o jogador e a câmera, e na cópia mais
// próxima da câmera (ADR-0002 §11); o slot livre sai invisível. Nada é alocado
// por frame.
import { CAPACIDADE_DE_INIMIGOS, type Estado } from '../../logica/nucleo/estado';
import { IDS_DE_TIPO } from '../../logica/mundo/tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, copiaMaisProxima, interpolarNoToro } from '../../logica/mundo/toro';
import { COR_DO_INIMIGO } from '../estilo';
import { escalaPara, type NomeDaMoldura } from './atlas';
import { arredondarParaOPixel } from './camera';

/** Como desenhar um tipo: moldura do atlas, escala e cor (tint). */
export interface DesenhoDoTipo {
  readonly moldura: NomeDaMoldura;
  readonly escala: number;
  readonly cor: number;
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
    tabela[codigo] = { moldura, escala: escalaPara(moldura, i.tamanho_px), cor };
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

export function prepararHorda(e: Estado, alfa: number, camX: number, camY: number, out: SaidaDaHorda): void {
  const ini = e.inimigos;
  const pos = e.pool.posicao;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
    if (pos[s]! < 0) {
      out.tipo[s] = 0;
      continue;
    }
    out.tipo[s] = ini.tipo[s]!;
    const x = arredondarParaOPixel(interpolarNoToro(ini.xAnt[s]!, ini.x[s]!, alfa, LARGURA_DO_MAPA));
    const y = arredondarParaOPixel(interpolarNoToro(ini.yAnt[s]!, ini.y[s]!, alfa, ALTURA_DO_MAPA));
    out.x[s] = copiaMaisProxima(x, camX, LARGURA_DO_MAPA);
    out.y[s] = copiaMaisProxima(y, camY, ALTURA_DO_MAPA);
  }
}
