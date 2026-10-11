// Os dois escritores da horda (ADR-0002 §11 e §15 item 3; design/decisoes-F-003.md §7):
// - HordaPorGPU, o caminho principal: um SpriteGPULayer de capacidade 500, um
//   membro por slot, com escrita direta no buffer de instâncias a cada frame
//   (offsets do getMemberData do Phaser 4.2.1, conferidos pelo F-003.11);
// - HordaPorImagem, o plano B (?render=image): 500 Image numa layer.
// Os dois só escrevem o que prepararHorda calculou. Nada é alocado por frame.
import Phaser from 'phaser';
import { CAPACIDADE_DE_INIMIGOS } from '../../logica/nucleo/estado';
import { CHAVE_DO_ATLAS, type NomeDaMoldura } from './atlas';
import type { DesenhoDoTipo, SaidaDaHorda } from './horda';

export { tintOpaco } from './horda';

/** Floats por membro do SpriteGPULayer no Phaser 4.2.1 (168 bytes). */
export const FLOATS_POR_MEMBRO = 42;
/** Offsets, em floats, dos campos que o sincronizador escreve (JSDoc de getMemberData). */
export const OFFSET = {
  x: 0,
  y: 4,
  rotacao: 8,
  escalaX: 12,
  escalaY: 16,
  alpha: 20,
  moldura: 24,
  tintBlend: 28,
  /** Os 4 tints (Uint32: alpha nos 8 bits altos e a cor rgb), de 32 a 35. */
  tint: 32,
  /** Modo do tint (não escrito na F-003; conferido para o telegrafo da F-006). */
  tintMode: 38,
} as const;

export interface EscritorDaHorda {
  readonly modo: 'gpu' | 'image';
  escrever(saida: SaidaDaHorda, tabela: readonly (DesenhoDoTipo | null)[]): void;
  /** Libera o que o Phaser não libera sozinho; chamado no SHUTDOWN da cena. */
  liberar(): void;
}


/** Cria o SpriteGPULayer da horda (ou o de aquecimento), com os membros invisíveis. */
export function criarLayerDaHorda(cena: Phaser.Scene, capacidade: number, dinamico: boolean): Phaser.GameObjects.SpriteGPULayer {
  const layer = cena.add.spriteGPULayer(CHAVE_DO_ATLAS, capacidade);
  if (dinamico) {
    // 1º recurso do ADR-0002 §11, por fora da API: refaz o gl.bufferData com DYNAMIC_DRAW.
    const gl = (cena.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
    layer.submitterNode.instanceBufferLayout.buffer.bufferUsage = gl.DYNAMIC_DRAW;
    layer.resize(capacidade);
  }
  const vazio = { frame: 'massa', scaleX: 0, scaleY: 0, alpha: 0 };
  for (let i = 0; i < capacidade; i++) layer.addMember(vazio);
  return layer;
}

/**
 * Libera os buffers, os VAOs e a textura de molduras do layer, que o preDestroy
 * do Phaser 4.2.1 não libera (um "TODO" no SpriteGPULayer), e destrói o layer.
 * O programa fica no cache compartilhado do renderer.
 */
export function liberarLayer(layer: Phaser.GameObjects.SpriteGPULayer): void {
  const renderer = layer.scene?.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer | undefined;
  if (renderer) {
    const sub = layer.submitterNode;
    renderer.deleteBuffer(sub.instanceBufferLayout.buffer);
    renderer.deleteBuffer(sub.vertexBufferLayout.buffer);
    const programas = (sub.programManager as unknown as { programs: Record<string, { vao: { destroy(): void } }> }).programs;
    const vaos = (renderer as unknown as { glVAOWrappers: unknown[] }).glVAOWrappers;
    for (const chave of Object.keys(programas)) {
      const vao = programas[chave]!.vao;
      const i = vaos.indexOf(vao);
      if (i >= 0) vaos.splice(i, 1);
      vao.destroy();
    }
    renderer.deleteTexture(layer.frameDataTexture);
  }
  layer.destroy();
}

export class HordaPorGPU implements EscritorDaHorda {
  readonly modo = 'gpu';
  private readonly layer: Phaser.GameObjects.SpriteGPULayer;
  private readonly f32: Float32Array;
  private readonly u32: Uint32Array;
  /** Índice da moldura no frameDataTexture, por nome (lido do layer, nunca literal). */
  private readonly indiceDaMoldura: Readonly<Record<string, number>>;

  constructor(cena: Phaser.Scene, dinamico: boolean) {
    this.layer = criarLayerDaHorda(cena, CAPACIDADE_DE_INIMIGOS, dinamico);
    const stride = this.layer.getDataByteSize() / 4;
    if (stride !== FLOATS_POR_MEMBRO) throw new Error(`SpriteGPULayer: stride ${stride}, esperado ${FLOATS_POR_MEMBRO}`);
    // As views só valem depois do resize do caminho dinâmico.
    const buffer = this.layer.submitterNode.instanceBufferLayout.buffer;
    if (!buffer.viewF32 || !buffer.viewU32) throw new Error('SpriteGPULayer: buffer de instâncias sem views');
    this.f32 = buffer.viewF32;
    this.u32 = buffer.viewU32;
    this.indiceDaMoldura = this.layer.frameDataIndices as Record<string, number>;
  }

  get bufferDinamico(): boolean {
    const gl = (this.layer.scene.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
    return this.layer.submitterNode.instanceBufferLayout.buffer.bufferUsage === gl.DYNAMIC_DRAW;
  }

  escrever(saida: SaidaDaHorda, tabela: readonly (DesenhoDoTipo | null)[]): void {
    const f32 = this.f32;
    const u32 = this.u32;
    for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
      const base = s * FLOATS_POR_MEMBRO;
      const d = tabela[saida.tipo[s]!];
      if (!d) {
        f32[base + OFFSET.escalaX] = 0;
        f32[base + OFFSET.escalaY] = 0;
        f32[base + OFFSET.alpha] = 0;
        continue;
      }
      f32[base + OFFSET.x] = saida.x[s]!;
      f32[base + OFFSET.y] = saida.y[s]!;
      f32[base + OFFSET.escalaX] = d.escala;
      f32[base + OFFSET.escalaY] = d.escala;
      f32[base + OFFSET.alpha] = 1;
      f32[base + OFFSET.moldura] = this.indiceDaMoldura[d.moldura]!;
      const tint = d.tint;
      u32[base + OFFSET.tint] = tint;
      u32[base + OFFSET.tint + 1] = tint;
      u32[base + OFFSET.tint + 2] = tint;
      u32[base + OFFSET.tint + 3] = tint;
    }
    // O buffer inteiro sobe sem alocar; a atualização por segmento alocaria um subarray por segmento.
    this.layer.setAllSegmentsNeedUpdate();
  }

  liberar(): void {
    liberarLayer(this.layer);
  }
}

export class HordaPorImagem implements EscritorDaHorda {
  readonly modo = 'image';
  private readonly imagens: Phaser.GameObjects.Image[] = [];
  /** Tipo desenhado por slot: moldura, escala e tint só mudam quando ele muda. */
  private readonly tipoDesenhado = new Uint8Array(CAPACIDADE_DE_INIMIGOS);

  constructor(cena: Phaser.Scene) {
    const camada = cena.add.layer();
    for (let i = 0; i < CAPACIDADE_DE_INIMIGOS; i++) {
      const img = cena.add.image(0, 0, CHAVE_DO_ATLAS, 'massa' satisfies NomeDaMoldura).setVisible(false);
      camada.add(img);
      this.imagens.push(img);
    }
  }

  escrever(saida: SaidaDaHorda, tabela: readonly (DesenhoDoTipo | null)[]): void {
    for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
      const img = this.imagens[s]!;
      const tipo = saida.tipo[s]!;
      const d = tabela[tipo];
      if (!d) {
        if (img.visible) img.setVisible(false);
        continue;
      }
      if (this.tipoDesenhado[s] !== tipo) {
        this.tipoDesenhado[s] = tipo;
        img.setFrame(d.moldura).setScale(d.escala).setTint(d.cor);
      }
      if (!img.visible) img.setVisible(true);
      img.setPosition(saida.x[s]!, saida.y[s]!);
    }
  }

  liberar(): void {
    // As Image são objetos comuns da cena: o Phaser as destrói no shutdown.
  }
}
