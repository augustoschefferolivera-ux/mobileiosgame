// Atlas único gerado no Boot (ADR-0002 §11; design/decisoes-F-002.md §5): um
// CanvasTexture de 512 × 512 com as formas em branco, a 2× (1 pt = 2 px), para
// a cor vir do tint. Tudo no mesmo atlas: no iPhone, autoMobileTextures limita
// o batch a 1 textura. As formas da F-002 são círculo (obstáculos), triângulo
// (jogador), disco e anel (joystick); a F-003 traz a massa e o quadrado, no
// tamanho exato, para a horda não sair serrilhada nem diferir entre os modos de
// render; a F-004 traz a cunha do golpe, a faca, o losango do Sal e os 10
// dígitos da fonte pixel dos números de dano (design/decisoes-F-004.md §6);
// as seguintes entram com as suas features.
import type Phaser from 'phaser';

export const CHAVE_DO_ATLAS = 'atlas';
const LADO_DO_ATLAS = 512;
/** Folga entre molduras, para o filtro linear não misturar vizinhas. */
const FOLGA = 4;

/** Molduras em px do atlas; o tamanho em pt é a metade. */
export const MOLDURA = {
  /** Disco de 120 pt de diâmetro: base do joystick e pino (escalado). */
  disco: { x: 0, y: 0, largura: 240, altura: 240 },
  /** Anel de 120 pt com traço de 2 pt: borda da base do joystick, a aura e o pulso do Círculo. */
  anel: { x: 240 + FOLGA, y: 0, largura: 240, altura: 240 },
  /** Círculo de 96 pt: o maior obstáculo; os menores são escalados. */
  circulo: { x: 0, y: 240 + FOLGA, largura: 192, altura: 192 },
  /** Triângulo isósceles de 48 × 48 pt, ponta para cima: o jogador. */
  triangulo: { x: 192 + FOLGA, y: 240 + FOLGA, largura: 96, altura: 96 },
  /** Círculo de 32 pt no tamanho exato (escala 0,5): a massa (design/decisoes-F-003.md §7). */
  massa: { x: 292 + FOLGA, y: 240 + FOLGA, largura: 64, altura: 64 },
  /** Quadrado de 48 pt no tamanho exato (escala 0,5): os médios e a estocada (escala não uniforme). */
  quadrado: { x: 360 + FOLGA, y: 240 + FOLGA, largura: 96, altura: 96 },
  /** Losango de 4 × 16 pt, ponta para cima: a faca (V2). */
  faca: { x: 364, y: 344, largura: 8, altura: 32 },
  /** Losango de 8 × 8 pt: o marcador do Sal (V4). */
  losango: { x: 376, y: 344, largura: 16, altura: 16 },
  /** Losango de 12 × 16 pt, ponta para cima: a Cinza (R2), em 3 escalas. */
  cinza: { x: 396, y: 344, largura: 24, altura: 32 },
  /** Quadrado de 32 pt com contorno de 2 pt em #0b0e14 já desenhado: o baú dourado (R2). */
  bau_ouro: { x: 424, y: 344, largura: 64, altura: 64 },
  /** Setor de 120° com raio de 46 pt, vértice embaixo no centro e o arco para cima: o golpe (V1). */
  cunha: { x: 200, y: 344, largura: 160, altura: 92 },
  /** Dígitos da fonte pixel 5 × 7 (N4): molduras de 20 × 26 px, a 24 px uma da outra, na faixa y 440. */
  d0: { x: 0, y: 440, largura: 20, altura: 26 },
  d1: { x: 24, y: 440, largura: 20, altura: 26 },
  d2: { x: 48, y: 440, largura: 20, altura: 26 },
  d3: { x: 72, y: 440, largura: 20, altura: 26 },
  d4: { x: 96, y: 440, largura: 20, altura: 26 },
  d5: { x: 120, y: 440, largura: 20, altura: 26 },
  d6: { x: 144, y: 440, largura: 20, altura: 26 },
  d7: { x: 168, y: 440, largura: 20, altura: 26 },
  d8: { x: 192, y: 440, largura: 20, altura: 26 },
  d9: { x: 216, y: 440, largura: 20, altura: 26 },
  /** Estrela de 4 pontas de 12 pt: o marcador do atordoado (RE9). */
  estrela: { x: 0, y: 472, largura: 24, altura: 24 },
  /** Anel de 24 pt com traço de 2 pt: o anel do projétil da Noviça (RE6); o `anel` escalado a 24 pt teria traço de 0,4 pt. */
  anel_pequeno: { x: 240, y: 444, largura: 48, altura: 48 },
} as const;
export type NomeDaMoldura = keyof typeof MOLDURA;

/** Traço do anel: 2 pt = 4 px. */
const TRACO_DO_ANEL_PX = 4;
/** Raio da cunha no atlas: 92 px = 46 pt. */
export const RAIO_DA_CUNHA_PT = 46;

/**
 * Fonte pixel 5 × 7 dos dígitos (N4), escrita como literal: 7 linhas de 5 bits
 * por dígito, o bit 4 à esquerda. Um bitmap literal sai idêntico no Chromium e
 * no Safari; um fillText com fonte do sistema, não.
 */
export const FONTE_DOS_DIGITOS: readonly (readonly number[])[] = [
  [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
];
/** Célula da fonte: 1,5 pt = 3 px; contorno de 1 pt = 2 px em volta de cada célula acesa. */
const CELULA_PX = 3;
const CONTORNO_PX = 2;
/** Cor do contorno dos dígitos (#0b0e14): o tint multiplica o branco e deixa o escuro escuro. */
const COR_DO_CONTORNO = '#0b0e14';

/** Contorno do baú dourado: 2 pt = 4 px. */
const CONTORNO_DO_BAU_PX = 4;

/** Escala de uma moldura para uma largura em pt (a moldura está a 2×). */
export function escalaPara(moldura: NomeDaMoldura, tamanhoPt: number): number {
  return tamanhoPt / MOLDURA[moldura].largura;
}

/** Desenha as formas e registra as molduras; o refresh() sobe o canvas para a GPU (CanvasTexture.js). */
export function gerarAtlas(texturas: Phaser.Textures.TextureManager): void {
  if (texturas.exists(CHAVE_DO_ATLAS)) return;
  const tex = texturas.createCanvas(CHAVE_DO_ATLAS, LADO_DO_ATLAS, LADO_DO_ATLAS);
  if (!tex) throw new Error('atlas: não foi possível criar o CanvasTexture');
  const c = tex.getContext();
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#ffffff';
  const circulo = (m: (typeof MOLDURA)[NomeDaMoldura]): void => {
    c.beginPath();
    c.arc(m.x + m.largura / 2, m.y + m.altura / 2, m.largura / 2, 0, Math.PI * 2);
    c.fill();
  };
  circulo(MOLDURA.disco);
  circulo(MOLDURA.circulo);
  circulo(MOLDURA.massa);
  const q = MOLDURA.quadrado;
  c.fillRect(q.x, q.y, q.largura, q.altura);
  const a = MOLDURA.anel;
  c.lineWidth = TRACO_DO_ANEL_PX;
  c.beginPath();
  c.arc(a.x + a.largura / 2, a.y + a.altura / 2, a.largura / 2 - TRACO_DO_ANEL_PX / 2, 0, Math.PI * 2);
  c.stroke();
  const t = MOLDURA.triangulo;
  c.beginPath();
  c.moveTo(t.x + t.largura / 2, t.y);
  c.lineTo(t.x + t.largura, t.y + t.altura);
  c.lineTo(t.x, t.y + t.altura);
  c.closePath();
  c.fill();
  const losango = (m: (typeof MOLDURA)[NomeDaMoldura]): void => {
    c.beginPath();
    c.moveTo(m.x + m.largura / 2, m.y);
    c.lineTo(m.x + m.largura, m.y + m.altura / 2);
    c.lineTo(m.x + m.largura / 2, m.y + m.altura);
    c.lineTo(m.x, m.y + m.altura / 2);
    c.closePath();
    c.fill();
  };
  losango(MOLDURA.faca);
  losango(MOLDURA.losango);
  losango(MOLDURA.cinza);
  // Baú dourado: o contorno escuro primeiro e o miolo branco (o tint colore só o miolo).
  const b = MOLDURA.bau_ouro;
  c.fillStyle = COR_DO_CONTORNO;
  c.fillRect(b.x, b.y, b.largura, b.altura);
  c.fillStyle = '#ffffff';
  c.fillRect(b.x + CONTORNO_DO_BAU_PX, b.y + CONTORNO_DO_BAU_PX, b.largura - 2 * CONTORNO_DO_BAU_PX, b.altura - 2 * CONTORNO_DO_BAU_PX);
  // Cunha: vértice no meio da borda de baixo, arco de 120° para cima.
  const w = MOLDURA.cunha;
  const vx = w.x + w.largura / 2;
  const vy = w.y + w.altura;
  c.beginPath();
  c.moveTo(vx, vy);
  c.arc(vx, vy, w.altura, -Math.PI / 2 - Math.PI / 3, -Math.PI / 2 + Math.PI / 3);
  c.closePath();
  c.fill();
  // Estrela de 4 pontas: pontas nos 4 lados, cintura a um terço do raio.
  const est = MOLDURA.estrela;
  const ecx = est.x + est.largura / 2;
  const ecy = est.y + est.altura / 2;
  c.beginPath();
  for (let k = 0; k < 8; k++) {
    const raio = k % 2 === 0 ? est.largura / 2 : est.largura / 6;
    const ang = (k * Math.PI) / 4 - Math.PI / 2;
    const px = ecx + raio * Math.cos(ang);
    const py = ecy + raio * Math.sin(ang);
    if (k === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();
  // Anel pequeno: 24 pt de diâmetro, traço de 2 pt (4 px).
  const ap = MOLDURA.anel_pequeno;
  c.lineWidth = TRACO_DO_ANEL_PX;
  c.beginPath();
  c.arc(ap.x + ap.largura / 2, ap.y + ap.altura / 2, ap.largura / 2 - TRACO_DO_ANEL_PX / 2, 0, Math.PI * 2);
  c.stroke();
  // Dígitos: o contorno escuro primeiro, depois as células acesas em branco.
  for (let d = 0; d < 10; d++) {
    const m = MOLDURA[`d${d}` as NomeDaMoldura];
    const bits = FONTE_DOS_DIGITOS[d]!;
    const x0 = m.x + (m.largura - 5 * CELULA_PX) / 2;
    const y0 = m.y + (m.altura - 7 * CELULA_PX) / 2;
    c.fillStyle = COR_DO_CONTORNO;
    for (let l = 0; l < 7; l++) {
      for (let k = 0; k < 5; k++) {
        if ((bits[l]! >> (4 - k)) & 1) c.fillRect(x0 + k * CELULA_PX - CONTORNO_PX, y0 + l * CELULA_PX - CONTORNO_PX, CELULA_PX + 2 * CONTORNO_PX, CELULA_PX + 2 * CONTORNO_PX);
      }
    }
    c.fillStyle = '#ffffff';
    for (let l = 0; l < 7; l++) {
      for (let k = 0; k < 5; k++) if ((bits[l]! >> (4 - k)) & 1) c.fillRect(x0 + k * CELULA_PX, y0 + l * CELULA_PX, CELULA_PX, CELULA_PX);
    }
  }
  for (const nome of Object.keys(MOLDURA) as NomeDaMoldura[]) {
    const m = MOLDURA[nome];
    tex.add(nome, 0, m.x, m.y, m.largura, m.altura);
  }
  tex.refresh();
}
