// Setup do Vitest para rodar o Phaser 4 em modo HEADLESS dentro do jsdom (Node, sem navegador).
// Adaptado da estratégia que o próprio Phaser usa em node_modules/phaser/tests/setup.js (MIT):
// o jsdom não decodifica imagens nem cria contexto de canvas, então o TextureManager nunca
// emitiria READY e o Game não terminaria o boot. Aqui: Image dispara onload e getContext devolve stubs.
// Use só para testar lógica que precisa de objetos Phaser reais (Scene, Group, Tween, Arcade);
// nada de pixels: screenshot é trabalho do Playwright (scripts/playtest.mjs).

type StubImage = {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  complete: boolean;
  crossOrigin: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: () => void;
};

function criarImagemStub(): StubImage {
  let src = '';
  const img: StubImage = {
    width: 32,
    height: 32,
    naturalWidth: 32,
    naturalHeight: 32,
    complete: false,
    crossOrigin: '',
    onload: null,
    onerror: null,
    get src() {
      return src;
    },
    set src(valor: string) {
      src = valor;
      img.complete = true;
      setTimeout(() => img.onload?.(), 1);
    },
    addEventListener(type, fn) {
      if (type === 'load') img.onload = fn;
    },
    removeEventListener() {
      /* stub */
    },
  };
  return img;
}

const noop = (): void => {
  /* stub */
};

function contexto2dStub(canvas: HTMLCanvasElement): Record<string, unknown> {
  return {
    canvas,
    fillRect: noop, clearRect: noop, putImageData: noop, setTransform: noop, resetTransform: noop,
    drawImage: noop, save: noop, restore: noop, fillText: noop, strokeText: noop, beginPath: noop,
    moveTo: noop, lineTo: noop, closePath: noop, stroke: noop, fill: noop, translate: noop, scale: noop,
    rotate: noop, arc: noop, arcTo: noop, rect: noop, clip: noop, quadraticCurveTo: noop,
    bezierCurveTo: noop, ellipse: noop, transform: noop, setLineDash: noop,
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    measureText: (texto: string) => ({ width: texto.length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    isPointInPath: () => false,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => ({}),
    getLineDash: () => [],
    globalAlpha: 1, globalCompositeOperation: 'source-over', fillStyle: '#000000', strokeStyle: '#000000',
    lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', font: '10px sans-serif', textAlign: 'start',
    textBaseline: 'alphabetic', imageSmoothingEnabled: true,
  };
}

// Carregado por vitest.config.ts (setupFiles) ANTES de qualquer import de 'phaser': o módulo do Phaser
// já chama canvas.getContext('2d') ao ser importado (checkInverseAlpha). Em ambiente node (sem window)
// este arquivo não faz nada.
const g = globalThis as unknown as Record<string, unknown>;
if (typeof window !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
if (typeof g.self === 'undefined') g.self = globalThis;
if (typeof g.screen === 'undefined') g.screen = { width: 390, height: 844, orientation: { type: 'portrait-primary' } };
window.focus = noop;
g.Image = function Image() {
  return criarImagemStub();
} as unknown as typeof Image;

HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, tipo: string) {
  if (tipo === '2d') return contexto2dStub(this) as unknown as CanvasRenderingContext2D;
  return null; // HEADLESS não cria WebGL
} as typeof HTMLCanvasElement.prototype.getContext;

// Silencia o "Not implemented" do jsdom (window.focus, scrollTo etc.).
const consoleErrorOriginal = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Not implemented')) return;
  consoleErrorOriginal(...args);
};
}
