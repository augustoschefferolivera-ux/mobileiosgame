// Cena e renderer falsos para o SpriteGPULayer real do Phaser 4.2.1 no Node
// (F-003.11 e o teste de alocação): um gl que só tem as constantes, os wrappers
// reais de buffer e de shader setter e uma textura com as molduras da horda.
// O renderer guarda as listas de buffers, texturas e VAOs, como o WebGLRenderer,
// para o teste de limpeza.
import './ambientePhaser';
import Phaser from 'phaser';

type Lista = unknown[];
export interface RendererFalso {
  gl: Record<string, unknown>;
  glBufferWrappers: Lista;
  glTextureWrappers: Lista;
  glVAOWrappers: Lista;
  [k: string]: unknown;
}

export function criarCena(): { cena: Phaser.Scene; renderer: RendererFalso } {
  const constantes: Record<string, number> = {
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    FLOAT: 5126,
    UNSIGNED_BYTE: 5121,
    UNSIGNED_SHORT: 5123,
    UNSIGNED_INT: 5125,
  };
  const gl = new Proxy(constantes, { get: (t, k: string) => (k in t ? t[k] : () => ({})) });
  const Wrappers = Phaser.Renderer.WebGL.Wrappers as unknown as Record<string, new (...a: unknown[]) => unknown>;
  const renderer: RendererFalso = {
    gl,
    glBufferWrappers: [],
    glTextureWrappers: [],
    glVAOWrappers: [],
    glWrapper: { updateBindingsArrayBuffer() {}, updateBindingsElementArrayBuffer() {} },
    config: { maxLights: 1 },
    createVertexBuffer(this: RendererFalso, data: unknown, usage: unknown) {
      const b = new Wrappers['WebGLBufferWrapper']!(this, data, constantes['ARRAY_BUFFER'], usage);
      this.glBufferWrappers.push(b);
      return b;
    },
    deleteBuffer(this: RendererFalso, b: unknown) {
      this.glBufferWrappers.splice(this.glBufferWrappers.indexOf(b), 1);
    },
    createUint8ArrayTexture(this: RendererFalso, _u8: unknown, width: number, height: number) {
      const t = { width, height, destroy() {} };
      this.glTextureWrappers.push(t);
      return t;
    },
    deleteTexture(this: RendererFalso, t: unknown) {
      this.glTextureWrappers.splice(this.glTextureWrappers.indexOf(t), 1);
    },
  };
  renderer['renderNodes'] = { renderer };
  renderer['shaderSetters'] = new Wrappers['WebGLShaderSetterWrapper']!(renderer);
  const molduras: Record<string, Record<string, unknown>> = {
    __BASE: { name: '__BASE', cutX: 0, cutY: 0, cutWidth: 512, cutHeight: 512 },
    massa: { name: 'massa', cutX: 296, cutY: 244, cutWidth: 64, cutHeight: 64 },
    quadrado: { name: 'quadrado', cutX: 364, cutY: 244, cutWidth: 96, cutHeight: 96 },
  };
  const textura = {
    key: 'atlas',
    frames: molduras,
    manager: {},
    source: [{ glTexture: { width: 512, height: 512 } }],
    get: (n: string) => molduras[n] ?? molduras['__BASE'],
    getFrameNames: (base: boolean) => Object.keys(molduras).filter((k) => base || k !== '__BASE'),
  };
  const cena = {
    renderer,
    game: { config: {} },
    sys: { renderer, textures: { get: () => textura }, queueDepthSort() {}, updateList: { add() {} }, displayList: null, events: { once() {}, on() {} } },
    add: {
      spriteGPULayer: (_chave: string, capacidade: number) => new Phaser.GameObjects.SpriteGPULayer(cena as unknown as Phaser.Scene, textura as never, capacidade),
    },
  };
  return { cena: cena as unknown as Phaser.Scene, renderer };
}
