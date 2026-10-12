// Codificador PNG mínimo (RGBA de 8 bits, sem filtro) com o zlib do Node:
// as amostras e as folhas da arte saem sem dependência nova.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import type { Imagem } from '../../src/arte/imagem';

const TABELA_CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(dados: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of dados) c = TABELA_CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloco(tipo: string, dados: Uint8Array): Uint8Array {
  const saida = new Uint8Array(12 + dados.length);
  const v = new DataView(saida.buffer);
  v.setUint32(0, dados.length);
  for (let i = 0; i < 4; i++) saida[4 + i] = tipo.charCodeAt(i);
  saida.set(dados, 8);
  v.setUint32(8 + dados.length, crc32(saida.subarray(4, 8 + dados.length)));
  return saida;
}

export function codificarPng(img: Imagem): Uint8Array {
  const cab = new Uint8Array(13);
  const v = new DataView(cab.buffer);
  v.setUint32(0, img.largura);
  v.setUint32(4, img.altura);
  cab[8] = 8;
  cab[9] = 6;
  const cru = new Uint8Array(img.altura * (img.largura * 4 + 1));
  for (let y = 0; y < img.altura; y++) {
    cru.set(img.px.subarray(y * img.largura * 4, (y + 1) * img.largura * 4), y * (img.largura * 4 + 1) + 1);
  }
  const partes = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', cab),
    bloco('IDAT', deflateSync(cru, { level: 9 })),
    bloco('IEND', new Uint8Array(0)),
  ];
  const total = new Uint8Array(partes.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of partes) {
    total.set(p, o);
    o += p.length;
  }
  return total;
}

export function salvarPng(caminho: string, img: Imagem): void {
  writeFileSync(caminho, codificarPng(img));
}
