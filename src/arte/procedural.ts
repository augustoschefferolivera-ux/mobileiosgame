// Arte procedural dentro da paleta (style card §5 e §6): o contorno
// automático, as formas que dependem de ângulo ou de raio (faca, cristal,
// rocha) e os efeitos (brilho da brasa, arco do golpe, faíscas). Tudo
// determinístico: a mesma entrada dá os mesmos pixels, no jogo e nas amostras.
import { lerPixel, novaImagem, pintar, type Imagem } from './imagem';
import { COR_DA_CHAVE } from './paleta';

const cor = (chave: string): number => COR_DA_CHAVE[chave]!;

/** Hash inteiro de 32 bits (determinístico, sem Math.random): ruído das rochas e do chão. */
export function hash(a: number, b: number, c = 0): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Bayer 4 × 4 (0 a 15): o único padrão de dither da arte (style card §6). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x: number, y: number): number {
  return BAYER[(y & 3) * 4 + (x & 3)]!;
}

/** Contorno de 1 px em K: todo pixel vazio vizinho (4-conexo) de um cheio vira K. */
export function contornar(img: Imagem, chave = 'K'): Imagem {
  const saida = novaImagem(img.largura, img.altura);
  saida.px.set(img.px);
  const k = cor(chave);
  for (let y = 0; y < img.altura; y++) {
    for (let x = 0; x < img.largura; x++) {
      if (lerPixel(img, x, y).alfa !== 0) continue;
      const vizinho = (dx: number, dy: number): boolean => {
        const nx = x + dx;
        const ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < img.largura && ny < img.altura && lerPixel(img, nx, ny).alfa !== 0;
      };
      if (vizinho(1, 0) || vizinho(-1, 0) || vizinho(0, 1) || vizinho(0, -1)) pintar(saida, x, y, k);
    }
  }
  return saida;
}

/**
 * Faca de Sal apontando para `graus` (0 = para cima, sentido horário), 13 × 13 px:
 * cabo de couro, guarda de bronze, lâmina de sal de 2 px afinando na ponta
 * clara, com o contorno automático. O jogo desenha 0°, 22,5°, 45° e 67,5° e
 * gira só em múltiplos de 90° (style card §6).
 */
export function faca(graus: number): Imagem {
  const img = novaImagem(13, 13);
  const rad = (graus * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  for (let y = 0; y < 13; y++) {
    for (let x = 0; x < 13; x++) {
      const px = x + 0.5 - 6.5;
      const py = y + 0.5 - 6.5;
      const t = px * dx + py * dy;
      const d = Math.abs(px * dy - py * dx);
      let chave = '';
      if (t >= -4.6 && t < -2.4 && d <= 0.55) chave = 'G';
      else if (t >= -2.4 && t < -1.4 && d <= 1.55) chave = 'Z';
      else if (t >= -1.4 && t <= 4.4 && d <= 1.0 - Math.max(0, t - 1.6) * 0.17) chave = t > 3 ? 'H' : d > 0.35 && px * dy - py * dx > 0 ? 's' : 'S';
      if (chave) pintar(img, x, y, cor(chave));
    }
  }
  return contornar(img);
}

/** Cristal das Cinzas: losango de meia largura `a` e meia altura `b`, na cor `chave`, com brilho em cima à esquerda. */
export function cristal(a: number, b: number, chave: string, brilhando = false): Imagem {
  const w = 2 * a + 3;
  const h = 2 * b + 3;
  const img = novaImagem(w, h);
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5 - cx) / (a + 0.5);
      const v = (y + 0.5 - cy) / (b + 0.5);
      if (Math.abs(u) + Math.abs(v) > 1) continue;
      // Faceta de cima à esquerda clara; a de baixo à direita, escura.
      const chaveDoPixel = u < 0 && v < 0 && Math.abs(u) + Math.abs(v) > 0.45 ? 'H' : u > 0 && v > 0.15 ? 'D' : chave;
      pintar(img, x, y, cor(chaveDoPixel === 'H' && (x + y) % 2 === 1 && !brilhando ? chave : chaveDoPixel));
    }
  }
  return contornar(img);
}

/**
 * Rocha da Charneca de raio `r` px de arte, em vista de 3/4: tampo de ferro com
 * a borda de cima clara, face da frente escura, borda irregular, rachaduras no
 * tampo em D e uma capa de musgo na borda de cima em uma de cada três (luz de
 * cima, style card §3 e §5).
 */
export function rocha(r: number, semente: number): Imagem {
  const lado = 2 * r + 3;
  const img = novaImagem(lado, lado);
  const c = lado / 2;
  const dentro = (px: number, py: number): boolean => {
    const ang = Math.atan2(py, px);
    const borda = r - 0.8 * ((hash(Math.round(ang * 2.5), semente) % 100) / 100);
    return px * px + py * py <= borda * borda;
  };
  // Musgo (uma rocha em cada três): uma capa de 3 a 4 px na borda de cima, à esquerda.
  const comMusgo = semente % 3 === 0;
  const musgoDe = -r * (0.75 + 0.15 * ((hash(semente, 5) % 100) / 100));
  const musgoAte = -r * (0.05 + 0.2 * ((hash(semente, 6) % 100) / 100));
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const px = x + 0.5 - c;
      const py = y + 0.5 - c;
      if (!dentro(px, py)) continue;
      // O tampo é uma elipse: a fronteira com a face da frente desce no meio e sobe nas bordas.
      const u = Math.min(1, Math.abs(px) / r);
      const corte = r * (0.05 + 0.4 * Math.sqrt(1 - u * u)) + (bayer(x, y) / 16 - 0.5) * 1.2;
      let chave = py < corte ? 'M' : 'D';
      if (py < corte && !dentro(px, py - 1.5)) chave = 'L';
      if (comMusgo && chave !== 'D' && px > musgoDe && px < musgoAte) {
        const altura = 3 + (hash(x, semente, 7) % 2);
        // A capa é a faixa de `altura` px sob a borda; a última linha dela é a sombra (e).
        if (!dentro(px, py - altura)) chave = dentro(px, py + 1 - altura) ? 'e' : 'E';
      }
      pintar(img, x, y, cor(chave));
    }
  }
  // Rachaduras: 2 traços quebrados no tampo, no tom escuro da pedra (D), por fora do musgo.
  const M = cor('M');
  const L = cor('L');
  for (let k = 0; k < 2; k++) {
    let x = Math.round(c + (((hash(k, semente, 11) % 100) / 100) - 0.5) * r);
    let y = Math.round(c - r * 0.1 - ((hash(k, semente, 12) % 100) / 100) * r * 0.4);
    const passos = Math.round(r / 3) + (hash(k, semente, 13) % Math.max(2, Math.round(r / 4)));
    for (let p = 0; p < passos; p++) {
      if (lerPixel(img, x, y).alfa === 0 || lerPixel(img, x, y + 1).alfa === 0) break;
      const aqui = lerPixel(img, x, y).cor;
      if (aqui === M || aqui === L) pintar(img, x, y, cor('D'));
      x += hash(p, k, semente) % 2 === 0 ? 1 : -1;
      y += hash(p, k, semente + 7) % 3 === 0 ? 0 : 1;
    }
  }
  return contornar(img);
}

/** Ladrilho do chão de 16 × 16 px: fundo com pedriscos e tufos esparsos, sem emenda. */
export function chao(semente: number): Imagem {
  const img = novaImagem(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) pintar(img, x, y, cor('F'));
  for (let k = 0; k < 7; k++) {
    const h = hash(k, semente, 7);
    const x = h % 16;
    const y = (h >>> 8) % 16;
    if (k < 4) {
      pintar(img, x, y, cor('D'));
      if (k % 2 === 0) pintar(img, (x + 1) % 16, y, cor('D'));
    } else {
      pintar(img, x, y, cor('e'));
      pintar(img, x, (y + 15) % 16, cor('e'));
    }
  }
  return img;
}

/**
 * Brilho da brasa: disco de raio `r` px em 4 faixas quantizadas (A e B), com
 * dither de Bayer na fronteira de cada faixa. Alfa baixo, para o modo aditivo.
 */
export function brilho(r: number): Imagem {
  const lado = 2 * r;
  const img = novaImagem(lado, lado);
  const faixas = [
    { ate: 0.3, chave: 'A', alfa: 110 },
    { ate: 0.55, chave: 'A', alfa: 72 },
    { ate: 0.8, chave: 'B', alfa: 40 },
    { ate: 1, chave: 'B', alfa: 18 },
  ];
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const d = Math.sqrt((x + 0.5 - r) ** 2 + (y + 0.5 - r) ** 2) / r;
      if (d >= 1) continue;
      const desvio = (bayer(x, y) / 16 - 0.5) * 0.08;
      const f = faixas.find((fx) => d + desvio < fx.ate) ?? faixas[faixas.length - 1]!;
      pintar(img, x, y, cor(f.chave), f.alfa);
    }
  }
  return img;
}

/**
 * Arco do golpe da espada: setor de 120° com raio externo `r` px (grade fina),
 * apontando para cima, no quadro `q` de 0 a 2. A borda externa é Y, depois a,
 * A, B e C para dentro; o rastro esfria do fim do arco (sentido horário) para
 * o começo, e o último quadro só guarda a borda (style card §6).
 */
export function arcoDoGolpe(r: number, q: number): Imagem {
  const lado = 2 * r + 2;
  const img = novaImagem(lado, r + 2);
  const espessura = Math.round(r * (q === 0 ? 0.32 : q === 1 ? 0.28 : 0.14));
  const varredura = q === 0 ? 0.55 : 1;
  for (let y = 0; y < r + 2; y++) {
    for (let x = 0; x < lado; x++) {
      const px = x + 0.5 - (r + 1);
      const py = y + 0.5 - (r + 1);
      const d = Math.sqrt(px * px + py * py);
      const ang = Math.atan2(px, -py) * (180 / Math.PI); // 0 em cima, positivo à direita
      if (ang < -60 || ang > 60 || d > r || d < r - espessura) continue;
      const t = (ang + 60) / 120; // 0 no começo do arco, 1 no fim
      if (t > varredura) continue;
      const fundo = (r - d) / espessura; // 0 na borda externa
      const calor = fundo + (1 - t / varredura) * 0.9 + (bayer(x, y) / 16) * 0.25;
      const chave = calor < 0.18 ? 'Y' : calor < 0.45 ? 'a' : calor < 0.75 ? 'A' : calor < 1.05 ? 'B' : 'C';
      if (calor > 1.35) continue;
      pintar(img, x, y, cor(q === 2 && fundo > 0.4 ? 'C' : chave));
    }
  }
  return img;
}

/** Disco cheio de raio `r` px numa cor (projétil e telegrafo inimigos: W, sem contorno). */
export function disco(r: number, chave: string, alfa = 255): Imagem {
  const lado = 2 * r;
  const img = novaImagem(lado, lado);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      if ((x + 0.5 - r) ** 2 + (y + 0.5 - r) ** 2 <= r * r) pintar(img, x, y, cor(chave), alfa);
    }
  }
  return img;
}

/** Anel de raio externo `r` e espessura `e` px. */
export function anel(r: number, e: number, chave: string, alfa = 255): Imagem {
  const lado = 2 * r;
  const img = novaImagem(lado, lado);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const d2 = (x + 0.5 - r) ** 2 + (y + 0.5 - r) ** 2;
      if (d2 <= r * r && d2 > (r - e) ** 2) pintar(img, x, y, cor(chave), alfa);
    }
  }
  return img;
}

/** Setor (telegrafo do braço do Oco Grande): ângulo total `graus`, apontando para cima, preenchido em W com alfa. */
export function setor(r: number, graus: number, chave: string, alfa: number): Imagem {
  const img = novaImagem(2 * r, r);
  for (let y = 0; y < r; y++) {
    for (let x = 0; x < 2 * r; x++) {
      const px = x + 0.5 - r;
      const py = y + 0.5 - r;
      const ang = Math.abs(Math.atan2(px, -py) * (180 / Math.PI));
      const d2 = px * px + py * py;
      if (ang > graus / 2 || d2 > r * r) continue;
      const borda = d2 > (r - 1.5) ** 2 || ang > graus / 2 - 1.5;
      pintar(img, x, y, cor(chave), borda ? 255 : alfa);
    }
  }
  return img;
}

/** Tons de cinza da morte (doc 13 §1.5): o valor de cada pixel escolhe K, D, M ou L. */
function tomDeCinza(corRgb: number): string {
  const l = 0.3 * ((corRgb >> 16) & 0xff) + 0.59 * ((corRgb >> 8) & 0xff) + 0.11 * (corRgb & 0xff);
  return l < 30 ? 'K' : l < 80 ? 'D' : l < 140 ? 'M' : 'L';
}

/**
 * Morte que vira cinza, em 3 quadros, para qualquer sprite (doc 13 §1.5): 0 é
 * o corpo em cinza; 1 perde um terço dos pixels e afunda 1 px; 2 sobra só um
 * punhado de cinza no chão.
 */
export function virarCinza(img: Imagem, q: number): Imagem {
  const saida = novaImagem(img.largura, img.altura);
  for (let y = 0; y < img.altura; y++) {
    for (let x = 0; x < img.largura; x++) {
      const p = lerPixel(img, x, y);
      if (p.alfa === 0) continue;
      const h = hash(x, y, 91) % 100;
      if (q === 0) pintar(saida, x, y, cor(tomDeCinza(p.cor)));
      else if (q === 1 && h > 33) pintar(saida, x, Math.min(img.altura - 1, y + 1), cor(tomDeCinza(p.cor)));
      else if (q === 2 && h > 80 && y > img.altura * 0.5) pintar(saida, x, Math.min(img.altura - 1, y + 2), cor(h > 92 ? 'L' : 'M'));
    }
  }
  return saida;
}

/** Quadro de acerto: o miolo vira H e o contorno fica (nunca W, que é dos ataques; style card §6). */
export function clarear(img: Imagem): Imagem {
  const saida = novaImagem(img.largura, img.altura);
  const k = cor('K');
  for (let y = 0; y < img.altura; y++) {
    for (let x = 0; x < img.largura; x++) {
      const p = lerPixel(img, x, y);
      if (p.alfa !== 0) pintar(saida, x, y, p.cor === k ? k : cor('H'));
    }
  }
  return saida;
}

/** Silhueta de uma cor só (o brilho do telegrafo nos médios, RE4: o corpo termina em branco puro). */
export function silhueta(img: Imagem, chave: string): Imagem {
  const saida = novaImagem(img.largura, img.altura);
  for (let y = 0; y < img.altura; y++) for (let x = 0; x < img.largura; x++) if (lerPixel(img, x, y).alfa !== 0) pintar(saida, x, y, cor(chave));
  return saida;
}
