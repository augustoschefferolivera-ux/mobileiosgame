// Render da horda (design/decisoes-F-003.md §7): prepararHorda igual às funções
// do toro e da câmera, tabela de desenho, cores (V1) e o F-003.11 com o
// SpriteGPULayer real do Phaser 4.2.1 sobre um gl falso: stride de 168 B, os
// offsets que o escritor usa lidos pelo getMember do próprio Phaser, o caminho
// DYNAMIC_DRAW e a limpeza do que o preDestroy não libera.
import { criarCena } from './phaserFalso';
import { beforeAll, describe, expect, it } from 'vitest';
import Phaser from 'phaser';
import inimigos from '../../src/dados/inimigos.json';
import { COR, COR_DO_INIMIGO } from '../../src/cenas/estilo';
import { arredondarParaOPixel } from '../../src/cenas/render/camera';
import { FLOATS_POR_MEMBRO, HordaPorGPU, OFFSET, tintOpaco } from '../../src/cenas/render/escritores';
import { criarSaidaDaHorda, criarTabelaDeDesenho, prepararHorda } from '../../src/cenas/render/horda';
import { escalaPara } from '../../src/cenas/render/atlas';
import { COR_DO_CRITICO } from '../../src/cenas/render/armas';
import { criarEstado } from '../../src/logica/nucleo/estado';
import { semear, proximoUnitario } from '../../src/logica/nucleo/rng';
import { nascerInimigo, removerInimigo } from '../../src/logica/mundo/inimigos';
import { TIPO } from '../../src/logica/mundo/tipos';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, copiaMaisProxima, interpolarNoToro } from '../../src/logica/mundo/toro';
import { DADOS_SEM_OBSTACULOS as D } from '../logica/apoio';

describe('prepararHorda', () => {
  it('em 2.000 slots aleatórios (inclusive na costura), igual a interpolar, arredondar e levar à cópia mais próxima', () => {
    const rng = new Uint32Array(4);
    semear(rng, 0, 11, 'diretor');
    const u = (): number => proximoUnitario(rng, 0);
    const saida = criarSaidaDaHorda();
    for (let rodada = 0; rodada < 4; rodada++) {
      const e = criarEstado(1, D);
      for (let k = 0; k < 500; k++) {
        const s = nascerInimigo(e, D, TIPO.oco_das_lanternas, u() * W, u() * H, false);
        // Metade perto da costura: xAnt e x em lados opostos.
        e.inimigos.xAnt[s] = k % 2 === 0 ? (e.inimigos.x[s]! + 1168 + u() * 4) % W : e.inimigos.x[s]! - u() * 2;
        e.inimigos.yAnt[s] = k % 3 === 0 ? (e.inimigos.y[s]! + 2530 + u() * 4) % H : e.inimigos.y[s]! + u() * 2;
      }
      const [alfa, camX, camY] = [u(), u() * W, u() * H];
      prepararHorda(e, alfa, camX, camY, saida);
      for (let s = 0; s < 500; s++) {
        const x = arredondarParaOPixel(interpolarNoToro(e.inimigos.xAnt[s]!, e.inimigos.x[s]!, alfa, W));
        const y = arredondarParaOPixel(interpolarNoToro(e.inimigos.yAnt[s]!, e.inimigos.y[s]!, alfa, H));
        expect(saida.x[s]).toBe(copiaMaisProxima(x, camX, W));
        expect(saida.y[s]).toBe(copiaMaisProxima(y, camY, H));
        expect(Math.abs(saida.x[s]! - camX)).toBeLessThanOrEqual(W / 2);
      }
    }
  });

  it('o slot livre sai invisível (tipo 0) e o vivo sai com o seu tipo', () => {
    const e = criarEstado(1, D);
    const a = nascerInimigo(e, D, TIPO.oco_grande, 100, 100, false);
    const b = nascerInimigo(e, D, TIPO.novica_de_sal, 200, 200, false);
    removerInimigo(e, a);
    const saida = criarSaidaDaHorda();
    saida.tipo.fill(9);
    prepararHorda(e, 1, 585, 1266, saida);
    expect([saida.tipo[a], saida.tipo[b], saida.tipo[499]]).toEqual([0, TIPO.novica_de_sal, 0]);
  });
});

describe('tabela de desenho', () => {
  it('massa em círculo de 32 pt e médios em quadrado de 48 pt, com as cores de estilo.ts; o resto fica null', () => {
    const tabela = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
    expect(tabela[TIPO.oco_das_lanternas]).toEqual({
      moldura: 'massa',
      escala: escalaPara('massa', 32),
      cor: COR_DO_INIMIGO['oco_das_lanternas'],
      tint: tintOpaco(COR_DO_INIMIGO['oco_das_lanternas']!),
    });
    expect(tabela[TIPO.oco_grande]).toEqual({
      moldura: 'quadrado',
      escala: escalaPara('quadrado', 48),
      cor: COR_DO_INIMIGO['oco_grande'],
      tint: tintOpaco(COR_DO_INIMIGO['oco_grande']!),
    });
    expect(tabela[TIPO.novica_de_sal]).toMatchObject({ moldura: 'quadrado', cor: COR_DO_INIMIGO['novica_de_sal'] });
    expect([tabela[TIPO.vazio], tabela[TIPO.oco_grande_coroado], tabela[TIPO.o_lanterneiro]]).toEqual([null, null, null]);
    expect(escalaPara('massa', 32)).toBe(0.5);
  });

  it('um tipo que nasce sem tamanho ou sem cor é erro na montagem', () => {
    const existe = Uint8Array.from(D.tipos.existe);
    existe[TIPO.oco_grande_coroado] = 1;
    expect(() => criarTabelaDeDesenho(inimigos.inimigos, existe)).toThrow(/oco_grande_coroado/);
  });
});

import { contraste, de2000, DEUTERANOPIA, luminancia, PROTANOPIA, rgb, simular } from './cores';

describe('cores dos inimigos (V1)', () => {
  const cores = Object.values(COR_DO_INIMIGO);
  /** Reservadas: a paleta da cena e as do doc 13 §1.3 (vermelhos de dano e telegrafo, branco, as 3 Cinzas e o crítico). */
  const RESERVADAS = [COR.fundo, COR.cinzaFrio, COR.pedra, COR.brasa, COR.laranjaQueimado, 0x7a1f1f, 0xff2a2a, COR.osso, COR.sal, 0xffffff, 0x5aa9e6, 0x6cc57c, 0xc8324b, 0xffd166];

  it('os três tipos que a F-003 desenha têm cor', () => {
    expect(Object.keys(COR_DO_INIMIGO).sort()).toEqual(['novica_de_sal', 'oco_das_lanternas', 'oco_grande']);
  });

  it('contraste ≥ 3:1 contra o fundo e contra os obstáculos, e luminância abaixo da brasa', () => {
    for (const c of cores) {
      expect(contraste(c, COR.fundo)).toBeGreaterThanOrEqual(3);
      expect(contraste(c, COR.cinzaFrio)).toBeGreaterThanOrEqual(3);
      expect(luminancia(c)).toBeLessThan(luminancia(COR.brasa));
    }
  });

  it('ΔE2000 ≥ 14 contra as reservadas e ≥ 18 entre si; ≥ 17,5 entre si com deuteranopia e protanopia', () => {
    for (const c of cores) for (const r of RESERVADAS) expect(de2000(rgb(c), rgb(r)), `${c.toString(16)} × ${r.toString(16)}`).toBeGreaterThanOrEqual(14);
    for (let i = 0; i < cores.length; i++) {
      for (let j = i + 1; j < cores.length; j++) {
        const [a, b] = [cores[i]!, cores[j]!];
        expect(de2000(rgb(a), rgb(b))).toBeGreaterThanOrEqual(18);
        for (const m of [DEUTERANOPIA, PROTANOPIA]) expect(de2000(simular(a, m), simular(b, m))).toBeGreaterThanOrEqual(17.5);
      }
    }
  });
});

describe('cores das Cinzas e dos baús (R3, design/decisoes-F-005.md)', () => {
  const CINZAS = { azul: COR.cinzaAzul, verde: COR.cinzaVerde, vermelha: COR.cinzaVermelha };
  const BAUS = { comum: COR.bauBronze, dourado: COR.bauOuro };
  const INIMIGOS = COR_DO_INIMIGO;
  /** As reservadas sem as próprias Cinzas e baús: contra as Cinzas entram as outras cores do doc 13 §1.3. */
  const RESERVADAS = [COR.fundo, COR.cinzaFrio, COR.pedra, COR.brasa, COR.laranjaQueimado, 0x7a1f1f, 0xff2a2a, COR.osso, COR.sal, 0xffffff, 0xffd166];
  const nomeDe = (c: number): string => c.toString(16).padStart(6, '0');
  /** Bronze × ouro escuro (ΔE ≈ 8,5) não entra na regra: o dourado tem o contorno escuro como 2º canal. */
  const contraBaus: number[] = Object.values(BAUS);
  const cinzas = Object.values(CINZAS);
  const todas = [...cinzas, ...contraBaus];

  it('as Cinzas são as da Q-27 e os baús, bronze #b08d57 e ouro escuro #a8841f', () => {
    expect([CINZAS.azul, CINZAS.verde, CINZAS.vermelha, BAUS.comum, BAUS.dourado]).toEqual([0x5aa9e6, 0x6cc57c, 0xc8324b, 0xb08d57, 0xa8841f]);
  });

  it('ΔE2000 ≥ 14 de cada Cinza e baú contra as reservadas e os inimigos, e de cada baú contra as Cinzas', () => {
    for (const c of todas) {
      for (const r of [...RESERVADAS, ...Object.values(INIMIGOS), ...(contraBaus.includes(c) ? cinzas : [])]) {
        expect(de2000(rgb(c), rgb(r)), `${nomeDe(c)} × ${nomeDe(r)}`).toBeGreaterThanOrEqual(14);
      }
    }
  });

  it('as Cinzas: ΔE2000 ≥ 18 entre si e ≥ 17,5 em deuteranopia e protanopia', () => {
    for (let i = 0; i < cinzas.length; i++) {
      for (let j = i + 1; j < cinzas.length; j++) {
        const [a, b] = [cinzas[i]!, cinzas[j]!];
        expect(de2000(rgb(a), rgb(b)), `${nomeDe(a)} × ${nomeDe(b)}`).toBeGreaterThanOrEqual(18);
        for (const m of [DEUTERANOPIA, PROTANOPIA]) expect(de2000(simular(a, m), simular(b, m))).toBeGreaterThanOrEqual(17.5);
      }
    }
  });

  it('contraste ≥ 3:1 contra o fundo #1a1f2b e contra os obstáculos #2b3340, com a vermelha × obstáculo aceita', () => {
    for (const c of todas) {
      expect(contraste(c, COR.fundo), `${nomeDe(c)} × fundo`).toBeGreaterThanOrEqual(3);
      if (c === CINZAS.vermelha) continue;
      expect(contraste(c, COR.cinzaFrio), `${nomeDe(c)} × obstáculo`).toBeGreaterThanOrEqual(3);
    }
  });

  /** Pares aceitos fora da regra (R3): a forma e o tamanho são o 2º canal. */
  const ACEITOS = [
    {
      par: 'Cinza vermelha × obstáculo (contraste)',
      medida: () => contraste(CINZAS.vermelha, COR.cinzaFrio),
      valor: 2.43,
      limite: 3,
      motivo: 'contra o fundo o contraste é 3,15:1; a Cinza é pequena, fica acima do obstáculo plano, e #c8324b é da Q-27',
    },
    {
      par: 'deuteranopia: Cinza vermelha × Oco (ΔE)',
      medida: () => de2000(simular(CINZAS.vermelha, DEUTERANOPIA), simular(INIMIGOS['oco_das_lanternas']!, DEUTERANOPIA)),
      valor: 3.7,
      limite: 14,
      motivo: 'a Cinza é um losango de 12 × 16 pt e o Oco, um círculo de 32 pt: a forma e o tamanho distinguem',
    },
    {
      par: 'deuteranopia: Cinza verde × Oco (ΔE)',
      medida: () => de2000(simular(CINZAS.verde, DEUTERANOPIA), simular(INIMIGOS['oco_das_lanternas']!, DEUTERANOPIA)),
      valor: 14.8,
      limite: 17.5,
      motivo: 'losango pequeno contra círculo de 32 pt',
    },
    {
      par: 'deuteranopia: Cinza verde × Oco Grande (ΔE)',
      medida: () => de2000(simular(CINZAS.verde, DEUTERANOPIA), simular(INIMIGOS['oco_grande']!, DEUTERANOPIA)),
      valor: 13.5,
      limite: 14,
      motivo: 'losango pequeno contra quadrado de 48 pt',
    },
  ];
  it.each(ACEITOS)('$par ≈ $valor, aceito porque $motivo', ({ medida, valor, limite }) => {
    const m = medida();
    expect(m).toBeLessThan(limite);
    expect(Math.abs(m - valor)).toBeLessThan(0.05);
  });
});

describe('pares de cor aceitos abaixo de 14 (V6, design/decisoes-F-004.md §6)', () => {
  /** Cada par com o ΔE2000 medido e o motivo de ficar abaixo do mínimo da V1 da F-003. */
  const ACEITOS = [
    {
      par: 'sal × branco',
      a: COR.sal,
      b: 0xffffff,
      de: 6.5,
      motivo: 'as armas são de sal (doc 13 §1.3); nenhum efeito de arma usa branco e nenhuma área em sal é preenchida',
    },
    {
      par: 'crítico × brasa',
      a: COR_DO_CRITICO,
      b: COR.brasa,
      de: 9.8,
      motivo: 'o número crítico tem contorno escuro, é 1,5× maior e fica numa camada acima da cunha em brasa',
    },
  ];
  it.each(ACEITOS)('$par: ΔE2000 ≈ $de, aceito porque $motivo', ({ a, b, de }) => {
    const medido = de2000(rgb(a), rgb(b));
    expect(medido).toBeLessThan(14);
    expect(Math.abs(medido - de)).toBeLessThan(0.05);
  });
});

// F-003.11: o SpriteGPULayer real sobre um gl e um renderer falsos (phaserFalso.ts).
type Membro = { x: number; y: number; scaleX: number; scaleY: number; alpha: number; frame: string; tintTopLeft: number; alphaTopLeft: number };

describe('SpriteGPULayer do Phaser 4.2.1 (F-003.11)', () => {
  let tabela: ReturnType<typeof criarTabelaDeDesenho>;
  beforeAll(() => {
    tabela = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
  });

  it('stride de 168 B (42 floats) e os offsets do escritor batem com os campos que o addMember grava', () => {
    const { cena } = criarCena();
    const layer = (cena.add as unknown as { spriteGPULayer: (c: string, n: number) => Phaser.GameObjects.SpriteGPULayer }).spriteGPULayer('atlas', 4);
    expect(layer.getDataByteSize()).toBe(168);
    expect(FLOATS_POR_MEMBRO).toBe(42);
    layer.addMember({ frame: 'quadrado', x: 10.5, y: 20.25, rotation: 0.75, scaleX: 0.5, scaleY: 0.375, alpha: 0.625, tintBlend: 0.125, tintMode: 2, tintTopLeft: 0x9fa39a } as never);
    const u32 = layer.getMemberData(0)!;
    const f32 = new Float32Array(u32.buffer, u32.byteOffset, FLOATS_POR_MEMBRO);
    expect([f32[OFFSET.x], f32[OFFSET.y], f32[OFFSET.rotacao], f32[OFFSET.escalaX], f32[OFFSET.escalaY], f32[OFFSET.alpha], f32[OFFSET.tintBlend]]).toEqual([
      10.5, 20.25, 0.75, 0.5, 0.375, 0.625, 0.125,
    ]);
    expect(f32[OFFSET.moldura]).toBe((layer.frameDataIndices as Record<string, number>)['quadrado']);
    expect(f32[OFFSET.tintMode]).toBe(2);
    // Os 4 tints: 32 é o de baixo à esquerda, 33 o de cima à esquerda (o que o addMember recebeu aqui).
    expect(u32[OFFSET.tint + 1]).toBe(tintOpaco(0x9fa39a));
  });

  for (const dinamico of [false, true]) {
    it(`o escritor grava pelo buffer e o getMember do Phaser lê o mesmo (${dinamico ? 'DYNAMIC_DRAW' : 'STATIC_DRAW'})`, () => {
      const { cena, renderer } = criarCena();
      const horda = new HordaPorGPU(cena, dinamico);
      expect(horda.bufferDinamico).toBe(dinamico);
      const layer = (horda as unknown as { layer: Phaser.GameObjects.SpriteGPULayer }).layer;
      expect(layer.memberCount).toBe(500);
      const saida = criarSaidaDaHorda();
      saida.tipo[3] = TIPO.oco_das_lanternas;
      saida.x[3] = 100.5;
      saida.y[3] = -12;
      saida.tipo[7] = TIPO.novica_de_sal;
      saida.x[7] = 1200;
      saida.y[7] = 2600.5;
      horda.escrever(saida, tabela);
      const vivo = layer.getMember(3) as unknown as Membro;
      expect(vivo).toMatchObject({ x: 100.5, y: -12, scaleX: 0.5, scaleY: 0.5, alpha: 1, frame: 'massa' });
      expect([vivo.tintTopLeft, vivo.alphaTopLeft]).toEqual([COR_DO_INIMIGO['oco_das_lanternas'], 1]);
      // Os médios saem desta camada (RE8): têm a 2ª camada, acima da massa; aqui o slot dele é invisível.
      expect(layer.getMember(7)).toMatchObject({ scaleX: 0, scaleY: 0, alpha: 0 });
      for (const morto of [0, 4, 499]) expect(layer.getMember(morto)).toMatchObject({ scaleX: 0, scaleY: 0, alpha: 0 });
      // O slot que morre volta a ser invisível no frame seguinte.
      saida.tipo[3] = 0;
      horda.escrever(saida, tabela);
      expect(layer.getMember(3)).toMatchObject({ scaleX: 0, scaleY: 0, alpha: 0 });
      // Limpeza: os buffers e a textura de molduras saem das listas do renderer, e o VAO de cada programa é destruído.
      let destruidos = 0;
      const vao = { destroy: () => destruidos++ };
      renderer.glVAOWrappers.push(vao);
      (layer.submitterNode.programManager as unknown as { programs: Record<string, unknown> }).programs = { k: { vao } };
      expect([renderer.glBufferWrappers.length, renderer.glTextureWrappers.length]).toEqual([2, 1]);
      layer.destroy = () => undefined as never;
      horda.liberar();
      expect([renderer.glBufferWrappers.length, renderer.glTextureWrappers.length, renderer.glVAOWrappers.length, destruidos]).toEqual([0, 0, 0, 1]);
    });
  }
});
