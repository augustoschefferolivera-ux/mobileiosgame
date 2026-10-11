// O mínimo de DOM para importar o bundle do Phaser no Node (Vitest sem jsdom):
// importado antes de qualquer módulo que importe 'phaser'. Nada aqui desenha.
const g = globalThis as Record<string, unknown>;
const contexto2d = new Proxy({ getImageData: () => ({ data: [0, 0, 0, 0] }) } as Record<string, unknown>, {
  get: (t, k: string) => (k in t ? t[k] : () => ({})),
  set: () => true,
});
g['window'] ??= globalThis;
g['Image'] ??= function Image() {};
g['HTMLCanvasElement'] ??= function HTMLCanvasElement() {};
g['HTMLImageElement'] ??= function HTMLImageElement() {};
g['document'] ??= {
  createElement: () => ({ getContext: () => contexto2d, style: {} }),
  documentElement: {},
  addEventListener() {},
};
if (!('navigator' in globalThis)) Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node' }, configurable: true });
