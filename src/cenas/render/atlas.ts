// Atlas único gerado no Boot (ADR-0002 §11; design/decisoes-F-002.md §5): um
// CanvasTexture de 512 × 512 com as formas em branco, a 2× (1 pt = 2 px), para
// a cor vir do tint. Tudo no mesmo atlas: no iPhone, autoMobileTextures limita
// o batch a 1 textura. As formas da F-002 são círculo (obstáculos), triângulo
// (jogador), disco e anel (joystick); as seguintes entram com as suas features.
import type Phaser from 'phaser';

export const CHAVE_DO_ATLAS = 'atlas';
const LADO_DO_ATLAS = 512;
/** Folga entre molduras, para o filtro linear não misturar vizinhas. */
const FOLGA = 4;

/** Molduras em px do atlas; o tamanho em pt é a metade. */
export const MOLDURA = {
  /** Disco de 120 pt de diâmetro: base do joystick e pino (escalado). */
  disco: { x: 0, y: 0, lado: 240 },
  /** Anel de 120 pt com traço de 2 pt: borda da base do joystick. */
  anel: { x: 240 + FOLGA, y: 0, lado: 240 },
  /** Círculo de 96 pt: o maior obstáculo; os menores são escalados. */
  circulo: { x: 0, y: 240 + FOLGA, lado: 192 },
  /** Triângulo isósceles de 48 × 48 pt, ponta para cima: o jogador. */
  triangulo: { x: 192 + FOLGA, y: 240 + FOLGA, lado: 96 },
} as const;
export type NomeDaMoldura = keyof typeof MOLDURA;

/** Traço do anel: 2 pt = 4 px. */
const TRACO_DO_ANEL_PX = 4;

/** Escala de uma moldura para um tamanho em pt (a moldura está a 2×). */
export function escalaPara(moldura: NomeDaMoldura, tamanhoPt: number): number {
  return tamanhoPt / MOLDURA[moldura].lado;
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
    c.arc(m.x + m.lado / 2, m.y + m.lado / 2, m.lado / 2, 0, Math.PI * 2);
    c.fill();
  };
  circulo(MOLDURA.disco);
  circulo(MOLDURA.circulo);
  const a = MOLDURA.anel;
  c.lineWidth = TRACO_DO_ANEL_PX;
  c.beginPath();
  c.arc(a.x + a.lado / 2, a.y + a.lado / 2, a.lado / 2 - TRACO_DO_ANEL_PX / 2, 0, Math.PI * 2);
  c.stroke();
  const t = MOLDURA.triangulo;
  c.beginPath();
  c.moveTo(t.x + t.lado / 2, t.y);
  c.lineTo(t.x + t.lado, t.y + t.lado);
  c.lineTo(t.x, t.y + t.lado);
  c.closePath();
  c.fill();
  for (const nome of Object.keys(MOLDURA) as NomeDaMoldura[]) {
    const m = MOLDURA[nome];
    tex.add(nome, 0, m.x, m.y, m.lado, m.lado);
  }
  tex.refresh();
}
