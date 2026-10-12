// Render das armas (design/decisoes-F-004.md §6): consumidor do anel
// (agregação, pool cheio, opção de números, independência do fps), dígitos,
// animação dos números e das mortes, posição na costura e o escritor GPU das
// camadas novas sobre o SpriteGPULayer real (offsets 8, 36 e 37; limpeza).
import { criarCena } from './phaserFalso';
import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import inimigos from '../../src/dados/inimigos.json';
import { COR_DO_CRITICO, DIGITOS_POR_NUMERO, MEMBROS_DAS_ARMAS, prepararArmas, prepararMortes, prepararNumeros, prepararStatus } from '../../src/cenas/render/armas';
import { FONTE_DOS_DIGITOS, MOLDURA } from '../../src/cenas/render/atlas';
import { CamadaPorGPU, OFFSET_DA_ORIGEM, criarSaidaDeSprites, indiceDaMoldura } from '../../src/cenas/render/camadas';
import { CAPACIDADE_DE_MORTES, CAPACIDADE_DE_NUMEROS, EfeitosDaVigilia, digitosDe } from '../../src/cenas/render/efeitos';
import { FLOATS_POR_MEMBRO, OFFSET } from '../../src/cenas/render/escritores';
import { criarSaidaDaHorda, criarTabelaDeDesenho, prepararHorda } from '../../src/cenas/render/horda';
import { liberarProjetil, rodarArmas } from '../../src/logica/armas/armas';
import { ARMA } from '../../src/logica/armas/tabela';
import { removerInimigo } from '../../src/logica/mundo/inimigos';
import { J, estadoCom, por } from '../logica/armas/apoio';
import { COR } from '../../src/cenas/paleta';
import { CAB, CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PROJETEIS, criarEstado, type Estado } from '../../src/logica/nucleo/estado';
import { CAUSA, EVENTO, FLAG, FLOATS_DO_EVENTO, FORMA, gravarEvento } from '../../src/logica/nucleo/eventos';
import { avancar } from '../../src/logica/nucleo/passo';
import { TIPO } from '../../src/logica/mundo/tipos';
import { parametrosDoCenario } from '../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA, DADOS_SEM_OBSTACULOS as D, PARADO } from '../logica/apoio';

/** Grava um acerto sintético no passo dado (o cabeçalho é ajustado para o passo). */
function acerto(e: Estado, passo: number, slot: number, geracao: number, valor: number, flags = 0, x = 100, y = 200): void {
  FLOATS_DO_EVENTO[0] = x;
  FLOATS_DO_EVENTO[1] = y;
  FLOATS_DO_EVENTO[2] = valor;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, passo, EVENTO.acerto, 1, FORMA.ida, slot, geracao, TIPO.oco_das_lanternas, flags, 0);
}

function consumirEm(ef: EfeitosDaVigilia, e: Estado, passo: number, ligados = true): void {
  e.cab[CAB.passo] = passo;
  ef.consumir(e, ligados);
}

describe('consumidor do anel', () => {
  it('agregação (N7): acertos no mesmo handle nos passos 100, 105 e 112 dão 1 número com a soma; no 113, número novo; geração nova, número novo', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    acerto(e, 100, 7, 0, 1.5);
    acerto(e, 105, 7, 0, 2);
    acerto(e, 112, 7, 0, 0.5, FLAG.critico);
    consumirEm(ef, e, 112);
    expect(ef.numerosVivos).toBe(1);
    const k = ef.numeros.ativo.indexOf(1);
    expect([ef.numeros.valor[k], ef.numeros.critico[k], ef.numeros.passo[k]]).toEqual([4, 1, 100]);
    acerto(e, 113, 7, 0, 1);
    consumirEm(ef, e, 113);
    expect(ef.numerosVivos).toBe(2);
    acerto(e, 113, 7, 1, 1);
    consumirEm(ef, e, 113);
    expect(ef.numerosVivos).toBe(3);
  });

  it('pool cheio: 97 acertos em 97 inimigos no mesmo passo dão 96 números e 1 recusa; nada é reciclado', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    for (let s = 0; s < CAPACIDADE_DE_NUMEROS + 1; s++) acerto(e, 10, s, 0, 1);
    consumirEm(ef, e, 10);
    expect([ef.numerosVivos, ef.recusados.numeros]).toEqual([96, 1]);
  });

  it('a base do número fica 2 pt acima do topo da hitbox; expira na idade 36', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    acerto(e, 50, 3, 0, 7, 0, 300, 400);
    consumirEm(ef, e, 50);
    const k = ef.numeros.ativo.indexOf(1);
    expect([ef.numeros.x[k], ef.numeros.y[k]]).toEqual([300, 400 - 16 - 2]);
    consumirEm(ef, e, 85);
    expect(ef.numerosVivos).toBe(1);
    consumirEm(ef, e, 86);
    expect(ef.numerosVivos).toBe(0);
  });

  it('opção desligada (N8): apaga os vivos na hora, segue lendo o anel sem criar números; religada, só acertos novos', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    for (let s = 0; s < 10; s++) acerto(e, 20, s, 0, 1);
    consumirEm(ef, e, 20);
    expect(ef.numerosVivos).toBe(10);
    acerto(e, 21, 20, 0, 1);
    consumirEm(ef, e, 21, false);
    expect(ef.numerosVivos).toBe(0);
    consumirEm(ef, e, 22, true);
    expect(ef.numerosVivos).toBe(0);
    acerto(e, 23, 21, 0, 1);
    consumirEm(ef, e, 23, true);
    expect(ef.numerosVivos).toBe(1);
  });

  it('mortes: só a de causa arma cria efeito; o pool de 300 recusa o excedente', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    for (let k = 0; k < CAPACIDADE_DE_MORTES + 2; k++) {
      FLOATS_DO_EVENTO[0] = FLOATS_DO_EVENTO[1] = 10;
      gravarEvento(e.eventos, 5, EVENTO.morte, 0, 0, k % 500, 0, TIPO.oco_das_lanternas, 0, k === 0 ? 0 : CAUSA.arma);
    }
    consumirEm(ef, e, 5);
    expect([ef.mortes.ativo.reduce((a, b) => a + b, 0), ef.recusados.mortes]).toEqual([300, 1]);
  });

  it('o pool num passo não depende do fps: 1 passo por quadro, 5 por quadro e avancar(n) + 1 quadro dão os mesmos números', () => {
    const fotos = [1, 5, 120].map((porQuadro) => {
      const e = criarEstado(1, DADOS_DA_CHARNECA, { ...parametrosDoCenario('tres_armas'), teto: 300 });
      const ef = new EfeitosDaVigilia(DADOS_DA_CHARNECA.tipos);
      avancar(e, DADOS_DA_CHARNECA, PARADO, 240);
      ef.consumir(e, true);
      for (let feitos = 0; feitos < 120; feitos += porQuadro) {
        avancar(e, DADOS_DA_CHARNECA, PARADO, porQuadro);
        ef.consumir(e, true);
      }
      expect(ef.leitor.perdidos).toBe(0);
      const vivos: string[] = [];
      for (let k = 0; k < CAPACIDADE_DE_NUMEROS; k++) {
        if (ef.numeros.ativo[k] === 1) vivos.push(`${ef.numeros.handle[k]}@${ef.numeros.passo[k]}=${ef.numeros.valor[k]!.toFixed(4)} (${ef.numeros.x[k]}, ${ef.numeros.y[k]})`);
      }
      return vivos.sort().join('\n');
    });
    expect(fotos[0]!.length).toBeGreaterThan(0);
    expect(fotos[1]).toBe(fotos[0]);
    expect(fotos[2]).toBe(fotos[0]);
  });
});

describe('números (N2 a N6)', () => {
  it('digitosDe: 6,75 → 7; 0,2 → 1; 0,5 → 1; 1.456 → 1456; 12.345 → 9999', () => {
    const out = new Uint8Array(4);
    const ler = (v: number): string => {
      const n = digitosDe(v, out);
      return [...out.subarray(0, n)].join('');
    };
    expect([ler(6.75), ler(0.2), ler(0.5), ler(1456), ler(12345)]).toEqual(['7', '1', '1', '1456', '9999']);
  });

  it('idade 0 → sem subida e alpha 1; 24 → alpha 1; 30 → 0,5; 36 → removido; crítico em #ffd166 e ×1,5', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    acerto(e, 100, 1, 0, 7, 0, 500, 600);
    acerto(e, 100, 2, 0, 3, FLAG.critico, 700, 600);
    consumirEm(ef, e, 100);
    const s = criarSaidaDeSprites(CAPACIDADE_DE_NUMEROS * DIGITOS_POR_NUMERO);
    const membro = (n: number): number => n * DIGITOS_POR_NUMERO;
    const a = ef.numeros.ativo.indexOf(1);
    const b = ef.numeros.ativo.indexOf(1, a + 1);
    prepararNumeros(ef, e, 1, 585, 1266, s);
    expect([s.visivel[membro(a)], s.y[membro(a)], s.alpha[membro(a)], s.moldura[membro(a)]]).toEqual([1, 600 - 16 - 2, 1, indiceDaMoldura('d7')]);
    expect([s.cor[membro(a)], s.escalaX[membro(a)]]).toEqual([COR.osso, 0.5]);
    expect([s.cor[membro(b)], s.escalaX[membro(b)]]).toEqual([COR_DO_CRITICO, 0.75]);
    expect(s.visivel[membro(a) + 1]).toBe(0);
    for (const [passo, alpha] of [
      [124, 1],
      [130, 0.5],
    ] as const) {
      e.cab[CAB.passo] = passo;
      prepararNumeros(ef, e, 1, 585, 1266, s);
      expect(s.alpha[membro(a)], `idade ${passo - 100}`).toBeCloseTo(alpha, 9);
    }
    // Pausado (o mesmo passo e o mesmo alfa) por 60 quadros, nada muda.
    const antes = Array.from(s.y);
    for (let q = 0; q < 60; q++) prepararNumeros(ef, e, 1, 585, 1266, s);
    expect(Array.from(s.y)).toEqual(antes);
    e.cab[CAB.passo] = 136;
    prepararNumeros(ef, e, 1, 585, 1266, s);
    expect(s.visivel[membro(a)]).toBe(0);
  });

  it('preso ao mundo e na cópia mais próxima da câmera: acerto em x = 5 com a câmera em 1.165 sai em x = 1.175', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    acerto(e, 10, 1, 0, 4, 0, 5, 600);
    consumirEm(ef, e, 10);
    const s = criarSaidaDeSprites(CAPACIDADE_DE_NUMEROS * DIGITOS_POR_NUMERO);
    prepararNumeros(ef, e, 1, 1165, 600, s);
    expect(s.x[ef.numeros.ativo.indexOf(1) * DIGITOS_POR_NUMERO]).toBe(1175);
  });

  it('a fonte pixel tem 10 bitmaps distintos de 5 × 7, e as molduras dos dígitos são pares', () => {
    expect(new Set(FONTE_DOS_DIGITOS.map((d) => d.join(','))).size).toBe(10);
    for (const d of FONTE_DOS_DIGITOS) {
      expect(d).toHaveLength(7);
      for (const linha of d) expect(linha).toBeLessThan(32);
    }
    for (let d = 0; d < 10; d++) {
      const m = MOLDURA[`d${d}` as 'd0'];
      expect([m.largura % 2, m.altura % 2]).toEqual([0, 0]);
    }
  });
});

describe('mortes (V5)', () => {
  it('vira cinza em 3 quadros (F-011): idade 2 no 1º, 6 no 2º, 10 no 3º sumindo (alpha 0,5); idade 12: removido', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    FLOATS_DO_EVENTO[0] = 400;
    FLOATS_DO_EVENTO[1] = 500;
    gravarEvento(e.eventos, 30, EVENTO.morte, 0, 0, 4, 0, TIPO.oco_das_lanternas, 0, CAUSA.arma);
    consumirEm(ef, e, 30);
    const tabela = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
    const s = criarSaidaDeSprites(CAPACIDADE_DE_MORTES);
    const oco = tabela[TIPO.oco_das_lanternas]!;
    const k = ef.mortes.ativo.indexOf(1);
    for (const [passo, quadro, alpha] of [[32, 0, 1], [36, 1, 1], [40, 2, 0.5]] as const) {
      e.cab[CAB.passo] = passo;
      prepararMortes(ef, e, 1, 585, 1266, tabela, s);
      expect([s.visivel[k], s.moldura[k], s.escalaX[k], s.cor[k]]).toEqual([1, oco.cinza[quadro], oco.escala, 0xffffff]);
      expect(s.alpha[k]).toBeCloseTo(alpha, 9);
    }
    e.cab[CAB.passo] = 42;
    prepararMortes(ef, e, 1, 585, 1266, tabela, s);
    expect(s.visivel[k]).toBe(0);
  });
});

describe('desenho das armas (V1 a V4)', () => {
  const ANEL = indiceDaMoldura('anel');
  /** A camada das armas com a câmera e o jogador interpolado no jogador parado em J (alfa 1). */
  function preparar(e: Estado, ef: EfeitosDaVigilia): ReturnType<typeof criarSaidaDeSprites> {
    const out = criarSaidaDeSprites(MEMBROS_DAS_ARMAS);
    prepararArmas(e, D, ef, 1, J.x, J.y, J.x, J.y, out);
    return out;
  }
  /** Um golpe ou pulso sintético no anel, consumido no passo dele. */
  function efeito(e: Estado, ef: EfeitosDaVigilia, passo: number, tipo: number, forma: number, f: [number, number, number, number]): number {
    FLOATS_DO_EVENTO.set(f);
    gravarEvento(e.eventos, passo, tipo, ARMA.espada_longa_do_juramento, forma, -1, 0, 0, 0, 0);
    consumirEm(ef, e, passo);
    return CAPACIDADE_DE_PROJETEIS + 5 + ef.efeitos.ativo.indexOf(1);
  }

  it('anel da aura (V3): só nas vagas de aura, centrado no jogador, com 2R de diâmetro (128 no nv1, 192 no nv8), sal a 60%', () => {
    for (const [nivel, R] of [
      [1, 64],
      [8, 96],
    ] as const) {
      const e = estadoCom([
        [ARMA.espada_longa_do_juramento, 1],
        [ARMA.circulo_de_sal, nivel],
      ]);
      const out = preparar(e, new EfeitosDaVigilia(D.tipos));
      const [espada, aura] = [CAPACIDADE_DE_PROJETEIS, CAPACIDADE_DE_PROJETEIS + 1];
      expect([out.visivel[espada], out.visivel[aura], out.visivel[aura + 1]]).toEqual([0, 1, 0]);
      expect([out.x[aura], out.y[aura], out.moldura[aura], out.cor[aura]]).toEqual([J.x, J.y, ANEL, COR.sal]);
      expect(MOLDURA.anel.largura * out.escalaX[aura]!, `nv${nivel}`).toBeCloseTo(2 * R, 9);
      expect(out.alpha[aura]).toBeCloseTo(0.6, 9);
    }
  });

  it('faca (V2): um membro por projétil vivo, 4 × 16 pt em sal, girada pelo voo (para cima, 0); o slot liberado some', () => {
    const e = estadoCom([[ARMA.facas_de_sal, 1]]);
    por(e, TIPO.oco_das_lanternas, 0, -100);
    rodarArmas(e, D);
    const vivas: number[] = [];
    for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) if (e.poolDeProjeteis.posicao[p]! >= 0) vivas.push(p);
    expect(vivas).toHaveLength(2);
    let out = preparar(e, new EfeitosDaVigilia(D.tipos));
    for (const p of vivas) {
      expect([out.visivel[p], out.moldura[p], out.cor[p]]).toEqual([1, indiceDaMoldura('faca'), COR.sal]);
      expect([MOLDURA.faca.largura * out.escalaX[p]!, MOLDURA.faca.altura * out.escalaY[p]!]).toEqual([4, 16]);
      expect(out.rotacao[p]).toBeCloseTo(0, 9);
      expect([out.x[p], out.y[p]]).toEqual([e.projeteis.x[p], e.projeteis.y[p]]);
    }
    expect(Array.from(out.visivel.subarray(0, CAPACIDADE_DE_PROJETEIS)).filter((v) => v === 1)).toHaveLength(2);
    liberarProjetil(e, vivas[0]!);
    out = preparar(e, new EfeitosDaVigilia(D.tipos));
    expect([out.visivel[vivas[0]!], out.visivel[vivas[1]!]]).toEqual([0, 1]);
  });

  it('golpe (V1): cunha em brasa com raio R e a ponta no jogador, alpha 0,5 → 0,25 na idade 4; some na idade 8', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    const k = efeito(e, ef, 10, EVENTO.golpe, FORMA.ida, [0, -1, 64, 0]);
    let out = preparar(e, ef);
    expect([out.visivel[k], out.moldura[k], out.cor[k], out.x[k], out.y[k]]).toEqual([1, indiceDaMoldura('cunha'), COR.brasa, J.x, J.y]);
    expect([out.origemX[k], out.origemY[k]]).toEqual([0.5, 1]);
    expect(MOLDURA.cunha.altura * out.escalaY[k]!).toBeCloseTo(64, 9);
    expect(out.rotacao[k]).toBeCloseTo(0, 9);
    expect(out.alpha[k]).toBeCloseTo(0.5, 9);
    consumirEm(ef, e, 14);
    out = preparar(e, ef);
    expect(out.alpha[k]).toBeCloseTo(0.25, 9);
    consumirEm(ef, e, 18);
    expect(preparar(e, ef).visivel[k]).toBe(0);
  });

  it('estocada (V1): retângulo de L × 2w a partir do jogador, ao longo da mira (para a direita, girado 90°)', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    const k = efeito(e, ef, 10, EVENTO.golpe, FORMA.estocada, [1, 0, 115.2, 19.2]);
    const out = preparar(e, ef);
    expect([out.visivel[k], out.moldura[k], out.cor[k]]).toEqual([1, indiceDaMoldura('quadrado'), COR.brasa]);
    expect(MOLDURA.quadrado.largura * out.escalaX[k]!).toBeCloseTo(2 * 19.2, 4);
    expect(MOLDURA.quadrado.altura * out.escalaY[k]!).toBeCloseTo(115.2, 4);
    expect(out.rotacao[k]).toBeCloseTo(Math.PI / 2, 9);
  });

  it('pulso (V3): o anel cresce 96 px em 12 passos (na idade 6, raio R + 48 e alpha 0,3) e some na idade 12', () => {
    const e = criarEstado(1, D);
    const ef = new EfeitosDaVigilia(D.tipos);
    const k = efeito(e, ef, 10, EVENTO.pulso, 0, [0, 0, 96, 12]);
    consumirEm(ef, e, 16);
    const out = preparar(e, ef);
    expect([out.visivel[k], out.moldura[k], out.cor[k]]).toEqual([1, ANEL, COR.sal]);
    expect(MOLDURA.anel.largura * out.escalaX[k]!).toBeCloseTo(2 * 144, 9);
    expect(out.alpha[k]).toBeCloseTo(0.3, 9);
    consumirEm(ef, e, 22);
    expect(preparar(e, ef).visivel[k]).toBe(0);
  });

  it('Sal no inimigo (V4): losango de 8 pt em sal na posição da horda, só com salPassos > 0 e só no slot vivo', () => {
    const e = estadoCom([]);
    const s = por(e, TIPO.oco_grande, 0, -100);
    const outro = por(e, TIPO.oco_das_lanternas, 60, 0);
    const horda = criarSaidaDaHorda();
    const out = criarSaidaDeSprites(CAPACIDADE_DE_INIMIGOS);
    prepararHorda(e, 1, J.x, J.y, horda);
    prepararStatus(e, horda, out);
    expect([out.visivel[s], out.visivel[outro]]).toEqual([0, 0]);
    e.inimigos.salPct[s] = 50;
    e.inimigos.salPassos[s] = 10;
    prepararStatus(e, horda, out);
    expect([out.visivel[s], out.visivel[outro], out.moldura[s], out.cor[s]]).toEqual([1, 0, indiceDaMoldura('losango'), COR.sal]);
    expect([out.x[s], out.y[s]]).toEqual([horda.x[s], horda.y[s]]);
    expect(MOLDURA.losango.largura * out.escalaX[s]!).toBe(8);
    // Slot vazio na horda: não desenha, mesmo com um salPassos que sobrasse no slot.
    removerInimigo(e, s);
    e.inimigos.salPassos[s] = 10;
    prepararHorda(e, 1, J.x, J.y, horda);
    prepararStatus(e, horda, out);
    expect(out.visivel[s]).toBe(0);
  });
});

describe('camada GPU das armas (F-003.11 estendido)', () => {
  for (const dinamico of [false, true]) {
    it(`grava rotação (8), origem (36, 37), escala, alpha e tint pelo buffer, e o getMember lê o mesmo; a limpeza esvazia as listas (${dinamico ? 'DYNAMIC' : 'STATIC'})`, () => {
      const { cena, renderer } = criarCena();
      const camada = new CamadaPorGPU(cena, 8, dinamico);
      const s = criarSaidaDeSprites(8);
      s.visivel[2] = 1;
      s.x[2] = 100.5;
      s.y[2] = 50;
      s.rotacao[2] = 1.25;
      s.escalaX[2] = 0.25;
      s.escalaY[2] = 0.75;
      s.alpha[2] = 0.5;
      s.origemX[2] = 0.5;
      s.origemY[2] = 1;
      s.moldura[2] = indiceDaMoldura('quadrado');
      s.cor[2] = COR.brasa;
      camada.escrever(s);
      const layer = camada.layer;
      const m = layer.getMember(2) as unknown as Record<string, number | string>;
      expect(m).toMatchObject({ x: 100.5, y: 50, rotation: 1.25, scaleX: 0.25, scaleY: 0.75, alpha: 0.5, originX: 0.5, originY: 1, frame: 'quadrado', tintTopLeft: COR.brasa });
      const u32 = layer.getMemberData(2)!;
      const f32 = new Float32Array(u32.buffer, u32.byteOffset, FLOATS_POR_MEMBRO);
      expect([f32[OFFSET.rotacao], f32[OFFSET_DA_ORIGEM.x], f32[OFFSET_DA_ORIGEM.y]]).toEqual([1.25, 0.5, 1]);
      for (const invisivel of [0, 7]) expect(layer.getMember(invisivel)).toMatchObject({ scaleX: 0, scaleY: 0, alpha: 0 });
      const antes = [renderer.glBufferWrappers.length, renderer.glTextureWrappers.length];
      expect(antes).toEqual([2, 1]);
      (layer as Phaser.GameObjects.SpriteGPULayer).destroy = () => undefined as never;
      camada.liberar();
      expect([renderer.glBufferWrappers.length, renderer.glTextureWrappers.length]).toEqual([0, 0]);
    });
  }
});
