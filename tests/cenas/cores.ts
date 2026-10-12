// Medidas de cor dos testes de render (V1, V6, D6 §8): contraste WCAG, CIEDE2000 (sRGB, D65) e simulação de
// daltonismo. Sem Phaser.
export const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const rgb = (cor: number): number[] => [(cor >> 16) & 255, (cor >> 8) & 255, cor & 255].map((c) => lin(c / 255));
export const luminancia = (cor: number): number => {
  const [r, g, b] = rgb(cor) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contraste = (a: number, b: number): number => {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
export function lab(linear: number[]): [number, number, number] {
  const [r, g, b] = linear as [number, number, number];
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const fx = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047);
  const fy = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b);
  const fz = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
export function de2000(p: number[], q: number[]): number {
  const [L1, a1, b1] = lab(p);
  const [L2, a2, b2] = lab(q);
  const rad = Math.PI / 180;
  const cm = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(cm ** 7 / (cm ** 7 + 25 ** 7)));
  const [a1p, a2p] = [(1 + G) * a1, (1 + G) * a2];
  const [c1, c2] = [Math.hypot(a1p, b1), Math.hypot(a2p, b2)];
  const ang = (x: number, y: number): number => (x === 0 && y === 0 ? 0 : (Math.atan2(y, x) / rad + 360) % 360);
  const [h1, h2] = [ang(a1p, b1), ang(a2p, b2)];
  let dh = 0;
  if (c1 * c2 !== 0) dh = h2 - h1 > 180 ? h2 - h1 - 360 : h2 - h1 < -180 ? h2 - h1 + 360 : h2 - h1;
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin((dh * rad) / 2);
  const lm = (L1 + L2) / 2;
  const cmp = (c1 + c2) / 2;
  let hm = h1 + h2;
  if (c1 * c2 !== 0) hm = Math.abs(h1 - h2) > 180 ? (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2 : (h1 + h2) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const rc = 2 * Math.sqrt(cmp ** 7 / (cmp ** 7 + 25 ** 7));
  const sl = 1 + (0.015 * (lm - 50) ** 2) / Math.sqrt(20 + (lm - 50) ** 2);
  const [sc, sh] = [1 + 0.045 * cmp, 1 + 0.015 * cmp * T];
  const rt = -Math.sin(2 * 30 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad) * rc;
  const [x, y, z] = [(L2 - L1) / sl, (c2 - c1) / sc, dH / sh];
  return Math.sqrt(x * x + y * y + z * z + rt * y * z);
}
export const DEUTERANOPIA = [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]];
export const PROTANOPIA = [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]];
export const simular = (cor: number, m: number[][]): number[] => {
  const c = rgb(cor);
  return m.map((l) => Math.min(1, Math.max(0, l[0]! * c[0]! + l[1]! * c[1]! + l[2]! * c[2]!)));
};

