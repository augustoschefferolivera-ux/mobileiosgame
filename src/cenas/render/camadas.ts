// Camadas de sprites das armas (design/decisoes-F-004.md §6, "Camadas"): uma
// saída genérica por membro (visível, posição, rotação, escala, alpha, origem,
// moldura e cor), calculada sem Phaser, e os dois escritores: um
// SpriteGPULayer com a configuração da horda (o mesmo programa que o
// aquecimento da Tela de Acender compila) e o plano B, um pool de Image numa
// layer (?render=image e a queda automática). Nada é alocado por frame.
import Phaser from 'phaser';
import { CHAVE_DO_ATLAS, NOMES_DAS_MOLDURAS, indiceDaMoldura, type NomeDaMoldura } from './atlas';
import { FLOATS_POR_MEMBRO, OFFSET, criarLayerDaHorda, liberarLayer } from './escritores';
import { tintOpaco } from './horda';

export { NOMES_DAS_MOLDURAS, indiceDaMoldura };

/** Offsets da origem do membro no SpriteGPULayer do Phaser 4.2.1 (getMemberData: 36 originX, 37 originY). */
export const OFFSET_DA_ORIGEM = { x: 36, y: 37 } as const;

export interface SaidaDeSprites {
  readonly capacidade: number;
  readonly visivel: Uint8Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly rotacao: Float64Array;
  readonly escalaX: Float64Array;
  readonly escalaY: Float64Array;
  readonly alpha: Float64Array;
  readonly origemX: Float64Array;
  readonly origemY: Float64Array;
  /** Índice em NOMES_DAS_MOLDURAS. */
  readonly moldura: Uint8Array;
  /** Cor rgb (o tint). */
  readonly cor: Uint32Array;
  /**
   * `tintBlend` do membro (o shader faz mix(branco, cor, tintBlend)): 1 = a cor; 0 = branco puro. Só o telegrafo
   * no corpo dos médios o baixa (RE4); `tintMode` fica em 0.
   */
  readonly blend: Float64Array;
}

export function criarSaidaDeSprites(capacidade: number): SaidaDeSprites {
  return {
    capacidade,
    visivel: new Uint8Array(capacidade),
    x: new Float64Array(capacidade),
    y: new Float64Array(capacidade),
    rotacao: new Float64Array(capacidade),
    escalaX: new Float64Array(capacidade),
    escalaY: new Float64Array(capacidade),
    alpha: new Float64Array(capacidade),
    origemX: new Float64Array(capacidade).fill(0.5),
    origemY: new Float64Array(capacidade).fill(0.5),
    moldura: new Uint8Array(capacidade),
    cor: new Uint32Array(capacidade),
    blend: new Float64Array(capacidade).fill(1),
  };
}

export interface EscritorDeSprites {
  readonly modo: 'gpu' | 'image';
  escrever(s: SaidaDeSprites): void;
  liberar(): void;
}

/** O caminho principal: um SpriteGPULayer com um membro por posição da saída. */
export class CamadaPorGPU implements EscritorDeSprites {
  readonly modo = 'gpu';
  readonly layer: Phaser.GameObjects.SpriteGPULayer;
  private readonly f32: Float32Array;
  private readonly u32: Uint32Array;
  /** Índice da moldura no frameDataTexture, por índice de NOMES_DAS_MOLDURAS. */
  private readonly indiceNaTextura: Float64Array;

  constructor(cena: Phaser.Scene, readonly capacidade: number, dinamico: boolean) {
    this.layer = criarLayerDaHorda(cena, capacidade, dinamico);
    const buffer = this.layer.submitterNode.instanceBufferLayout.buffer;
    if (!buffer.viewF32 || !buffer.viewU32) throw new Error('SpriteGPULayer: buffer de instâncias sem views');
    this.f32 = buffer.viewF32;
    this.u32 = buffer.viewU32;
    const indices = this.layer.frameDataIndices as Record<string, number>;
    this.indiceNaTextura = Float64Array.from(NOMES_DAS_MOLDURAS, (n) => indices[n] ?? 0);
  }

  escrever(s: SaidaDeSprites): void {
    const f32 = this.f32;
    const u32 = this.u32;
    for (let k = 0; k < this.capacidade; k++) {
      const base = k * FLOATS_POR_MEMBRO;
      if (s.visivel[k] !== 1) {
        f32[base + OFFSET.escalaX] = 0;
        f32[base + OFFSET.escalaY] = 0;
        f32[base + OFFSET.alpha] = 0;
        continue;
      }
      f32[base + OFFSET.x] = s.x[k]!;
      f32[base + OFFSET.y] = s.y[k]!;
      f32[base + OFFSET.rotacao] = s.rotacao[k]!;
      f32[base + OFFSET.escalaX] = s.escalaX[k]!;
      f32[base + OFFSET.escalaY] = s.escalaY[k]!;
      f32[base + OFFSET.alpha] = s.alpha[k]!;
      f32[base + OFFSET.moldura] = this.indiceNaTextura[s.moldura[k]!]!;
      f32[base + OFFSET_DA_ORIGEM.x] = s.origemX[k]!;
      f32[base + OFFSET_DA_ORIGEM.y] = s.origemY[k]!;
      f32[base + OFFSET.tintBlend] = s.blend[k]!;
      const tint = (0xff000000 | s.cor[k]!) >>> 0;
      u32[base + OFFSET.tint] = tint;
      u32[base + OFFSET.tint + 1] = tint;
      u32[base + OFFSET.tint + 2] = tint;
      u32[base + OFFSET.tint + 3] = tint;
    }
    this.layer.setAllSegmentsNeedUpdate();
  }

  liberar(): void {
    liberarLayer(this.layer);
  }
}

/**
 * O tint do plano B para o `tintBlend`: mix(branco, cor, blend) por canal, em inteiros (RE4). Em linha nos laços
 * quentes seria o mesmo; aqui é um caminho de `?render=image`.
 */
export function tintDoBlend(cor: number, blend: number): number {
  if (blend >= 1) return cor;
  const r = Math.round(255 + (((cor >>> 16) & 0xff) - 255) * blend);
  const g = Math.round(255 + (((cor >>> 8) & 0xff) - 255) * blend);
  const b = Math.round(255 + ((cor & 0xff) - 255) * blend);
  return (r << 16) | (g << 8) | b;
}

/** O plano B: um Image por posição, numa layer; só muda o que mudou. */
export class CamadaPorImagem implements EscritorDeSprites {
  readonly modo = 'image';
  private readonly imagens: Phaser.GameObjects.Image[] = [];
  private readonly molduraDesenhada: Int16Array;
  private readonly corDesenhada: Float64Array;

  constructor(cena: Phaser.Scene, readonly capacidade: number) {
    const camada = cena.add.layer();
    for (let i = 0; i < capacidade; i++) {
      const img = cena.add.image(0, 0, CHAVE_DO_ATLAS, 'massa' satisfies NomeDaMoldura).setVisible(false);
      camada.add(img);
      this.imagens.push(img);
    }
    this.molduraDesenhada = new Int16Array(capacidade).fill(-1);
    this.corDesenhada = new Float64Array(capacidade).fill(-1);
  }

  escrever(s: SaidaDeSprites): void {
    for (let k = 0; k < this.capacidade; k++) {
      const img = this.imagens[k]!;
      if (s.visivel[k] !== 1) {
        if (img.visible) img.setVisible(false);
        continue;
      }
      const m = s.moldura[k]!;
      if (this.molduraDesenhada[k] !== m) {
        this.molduraDesenhada[k] = m;
        img.setFrame(NOMES_DAS_MOLDURAS[m]!);
      }
      const cor = tintDoBlend(s.cor[k]!, s.blend[k]!);
      if (this.corDesenhada[k] !== cor) {
        this.corDesenhada[k] = cor;
        img.setTint(cor);
      }
      if (!img.visible) img.setVisible(true);
      img.setOrigin(s.origemX[k]!, s.origemY[k]!);
      img.setPosition(s.x[k]!, s.y[k]!);
      img.setRotation(s.rotacao[k]!);
      img.setScale(s.escalaX[k]!, s.escalaY[k]!);
      img.setAlpha(s.alpha[k]!);
    }
  }

  liberar(): void {
    // As Image são objetos comuns da cena: o Phaser as destrói no shutdown.
  }
}

/** Cria o escritor no modo da Vigília (um modo para todas as camadas, `render.modo`). */
export function criarCamada(cena: Phaser.Scene, modo: 'gpu' | 'image', capacidade: number, dinamico: boolean): EscritorDeSprites {
  return modo === 'gpu' ? new CamadaPorGPU(cena, capacidade, dinamico) : new CamadaPorImagem(cena, capacidade);
}

export { tintOpaco };
