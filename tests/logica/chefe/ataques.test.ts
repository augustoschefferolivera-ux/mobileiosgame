// Os ataques do Lanterneiro, um caso por linha da §3 da D9 (F-009.12): gatilhos, formas, desfechos e efeitos.
import { describe, expect, it } from 'vitest';
import { FORMA } from '../../../src/logica/nucleo/eventos';
import { CAB, CENARIO, CHEFE_F32, CHEFE_U16, CHEFE_U8, FOGUEIRA_F32, JOGADOR, JOGADOR2, JOGADOR3_U16, JOGADOR3_U8, TODOS_OS_TUTORIAIS } from '../../../src/logica/nucleo/estado';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { CAPACIDADE_DE_INIMIGOS } from '../../../src/logica/nucleo/estado';
import { DADOS_BRUTOS, PARADO } from '../apoio';
import { eventosDe } from '../combate/apoio';
import { ACAO, ATQ, EVENTO, aparoNosPassos, chefeEm, comChefe, contar, desfechoDoGolpe, fixarCiclo, prepararAtaque, vivos } from './apoio';

const B = DADOS_BRUTOS;
const INVULNERAVEL = CENARIO.ataques | CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel;
const MORTAL = CENARIO.ataques | CENARIO.diretorDesligado;
/** O chefe 100 px à esquerda do centro da arena (585, 1266): o jogador a até ~ 208 do centro cabe dos dois lados. */
const CX = 485;
const CY = 1266;
const CENTRO_X = 585;

/** O chefe parado em (CX, CY), o jogador a (dx, dy) dele e o ataque `id` a `timer` passos de resolver, com a mira dada. */
function cena(id: number, dx: number, dy: number, mira: readonly [number, number] = [1, 0], cenario = INVULNERAVEL) {
  const { e, s } = comChefe({ cenario }, B);
  chefeEm(e, s, CX, CY);
  e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = CX + dx;
  e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = CY + dy;
  prepararAtaque(e, s, id, 1, mira);
  return { e, s };
}

/** Roda o passo da resolução e devolve o desfecho do golpe da forma dada. */
function golpe(id: number, dx: number, dy: number, forma: number, mira: readonly [number, number] = [1, 0]): number {
  const { e } = cena(id, dx, dy, mira);
  avancar(e, B, PARADO, 1);
  return desfechoDoGolpe(e, forma);
}

describe('Vara Horizontal (semicírculo de 128 + 16)', () => {
  it('acerta a 144 px de frente e nos lados; não a 144,1 nem de costas', () => {
    expect(golpe(ATQ.vara, 144, 0, FORMA.varaArco)).toBe(1);
    expect(golpe(ATQ.vara, 144.1, 0, FORMA.varaArco)).toBe(4);
    expect(golpe(ATQ.vara, 0, 100, FORMA.varaArco)).toBe(1);
    expect(golpe(ATQ.vara, -100, 0, FORMA.varaArco)).toBe(4);
  });
  it('55 de dano bruto, sem escala por minuto, e aparável', () => {
    const { e } = cena(ATQ.vara, 100, 0, [1, 0], MORTAL);
    const hp = e.jogador[JOGADOR.hp]!;
    avancar(e, B, PARADO, 1);
    expect(hp - e.jogador[JOGADOR.hp]!).toBe(55);
  });
});

describe('Bater a Vara (retângulo de 192 + 16 × ± 40)', () => {
  it('acerta até 208 de comprimento e ± 40 de largura; não além', () => {
    expect(golpe(ATQ.bater, 208, 0, FORMA.varaLinha)).toBe(1);
    expect(golpe(ATQ.bater, 208.1, 0, FORMA.varaLinha)).toBe(4);
    expect(golpe(ATQ.bater, 100, 40, FORMA.varaLinha)).toBe(1);
    expect(golpe(ATQ.bater, 100, 40.1, FORMA.varaLinha)).toBe(4);
    expect(golpe(ATQ.bater, 100, -40, FORMA.varaLinha)).toBe(1);
    expect(golpe(ATQ.bater, -10, 0, FORMA.varaLinha)).toBe(4);
  });
});

describe('Luz Cega (cone de 60°, vermelho)', () => {
  const polar = (graus: number, r = 150): [number, number] => [r * Math.cos((graus * Math.PI) / 180), r * Math.sin((graus * Math.PI) / 180)];
  it('acerta a 30° e não a 31°; alcance 208', () => {
    expect(golpe(ATQ.luzCega, ...polar(30), FORMA.luzCega)).toBe(1);
    expect(golpe(ATQ.luzCega, ...polar(31), FORMA.luzCega)).toBe(4);
    expect(golpe(ATQ.luzCega, 208, 0, FORMA.luzCega)).toBe(1);
    expect(golpe(ATQ.luzCega, 208.1, 0, FORMA.luzCega)).toBe(4);
  });
  it('sem dano de acerto: põe 120 passos de cegueira e 12 ticks de 8/6 (16 no total), sem esquiva perfeita', () => {
    const { e } = cena(ATQ.luzCega, 100, 0, [1, 0], MORTAL);
    const hp = e.jogador[JOGADOR.hp]!;
    avancar(e, B, PARADO, 1);
    expect(e.jogador[JOGADOR.hp]).toBe(hp);
    expect(e.chefeU16[CHEFE_U16.cegoPassos]).toBeGreaterThan(110);
    avancar(e, B, PARADO, 130);
    expect(e.chefeU16[CHEFE_U16.cegoPassos]).toBe(0);
    const ticks = eventosDe(e, EVENTO.danoAoJogador).filter((x) => x.forma === 4);
    expect(ticks).toHaveLength(12);
    expect(ticks.reduce((t, x) => t + x.a, 0)).toBeCloseTo(16, 3);
    expect(contar(e, EVENTO.efeitoNoJogador)).toBe(1);
  });
});

describe('Lanterna Arremessada (zona de 64 px, 360 passos, tick 1,0 a cada 10)', () => {
  it('a zona fica onde o jogador estava no início do telegrafo; dentro, 12 ticks em 120 passos; fora, nenhum', () => {
    const { e, s } = comChefe({ cenario: MORTAL }, B);
    chefeEm(e, s, CENTRO_X, CY);
    fixarCiclo(e, 2, 1);
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = CENTRO_X - 200;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = CY;
    avancar(e, B, PARADO, 1);
    expect([e.inimigos.ataqueFase[s], e.inimigos.ataqueId[s], e.inimigos.ataqueTimer[s]]).toEqual([1, ATQ.lanterna, 60]);
    expect([e.chefeF32[CHEFE_F32.zonaX0], e.chefeF32[CHEFE_F32.zonaY0]]).toEqual([CENTRO_X - 200, CY]);
    avancar(e, B, PARADO, 60);
    expect(e.chefeU16[CHEFE_U16.zonaTimer0]).toBe(359);
    const hp0 = e.jogador[JOGADOR.hp]!;
    avancar(e, B, PARADO, 120);
    const ticks = eventosDe(e, EVENTO.danoAoJogador).filter((x) => x.forma === 4);
    expect(ticks).toHaveLength(12);
    expect(ticks.reduce((t, x) => t + x.a, 0)).toBeCloseTo(12, 3);
    expect(hp0).toBeGreaterThan(e.jogador[JOGADOR.hp]!);
    // Fora da zona, nenhum tick.
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = CENTRO_X - 200 + 81;
    const antes = eventosDe(e, EVENTO.danoAoJogador).length;
    avancar(e, B, PARADO, 100);
    expect(eventosDe(e, EVENTO.danoAoJogador)).toHaveLength(antes);
  });
  it('com as 3 zonas ocupadas a Lanterna é pulada e a sequência anda', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL }, B);
    chefeEm(e, s, CENTRO_X, CY);
    fixarCiclo(e, 2, 1);
    e.chefeU16[CHEFE_U16.zonaTimer0] = e.chefeU16[CHEFE_U16.zonaTimer0 + 1] = e.chefeU16[CHEFE_U16.zonaTimer0 + 2] = 300;
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = CENTRO_X - 100;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = CY;
    avancar(e, B, PARADO, 1);
    // A posição 1 (Lanterna) foi pulada: o Bater (posição 2) começou.
    expect(e.inimigos.ataqueId[s]).toBe(ATQ.bater);
  });
});

describe('Explosão de Luz (anel de 32 a 192 em 60 passos, 75)', () => {
  it('o anel acerta uma só vez, com 75 de dano bruto', () => {
    const { e, s } = comChefe({ cenario: MORTAL }, B);
    chefeEm(e, s, CENTRO_X, CY);
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = CENTRO_X - 100;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = CY;
    e.chefeU8[CHEFE_U8.fase] = 3;
    e.chefeU16[CHEFE_U16.explosaoEspera] = 0;
    e.chefeU16[CHEFE_U16.convocaEspera] = 600;
    const hp = e.jogador[JOGADOR.hp]!;
    avancar(e, B, PARADO, 70);
    expect(hp - e.jogador[JOGADOR.hp]!).toBeCloseTo(75, 3);
    expect(eventosDe(e, EVENTO.golpeInimigo).filter((x) => x.forma === FORMA.explosaoAnel)).toHaveLength(1);
  });
  it('a esquiva que cobre o primeiro contato consome o acerto (esquivado, uma só vez)', () => {
    const { e, s } = comChefe({ cenario: MORTAL }, B);
    chefeEm(e, s, CENTRO_X, CY);
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = CENTRO_X - 100;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = CY;
    e.chefeU8[CHEFE_U8.fase] = 3;
    e.chefeU16[CHEFE_U16.explosaoEspera] = 0;
    e.chefeU16[CHEFE_U16.convocaEspera] = 600;
    const hp = e.jogador[JOGADOR.hp]!;
    // O anel toca o jogador a 100 px no passo 15 do telegrafo (|d − r| ≤ 28 com r = 32 + 160·t/60); a esquiva do passo 8 tem i-frames de 10 a 21.
    const fonte = fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }], undefined, [{ passo: e.cab[CAB.passo]! + 8, acoes: ACAO.esquiva, mira: [0, 1] }]);
    avancar(e, B, fonte, 80);
    const golpes = eventosDe(e, EVENTO.golpeInimigo).filter((x) => x.forma === FORMA.explosaoAnel);
    expect(golpes).toHaveLength(1);
    expect(golpes[0]!.b).toBe(2);
    expect(e.jogador[JOGADOR.hp]).toBe(hp);
  });
});

describe('Agarrar (20% do HP máximo, preso 60 passos)', () => {
  it('pega a ≤ 64 + 16 da caixa: dano de 20% de hpMax pela armadura e o jogador preso, sem mover nem esquivar', () => {
    // A caixa tem meia-largura 48: o centro do jogador a 48 + 80 = 128 do centro do chefe, de frente.
    const { e } = cena(ATQ.agarrar, 128, 0, [1, 0], MORTAL);
    const hp = e.jogador[JOGADOR.hp]!;
    const hpMax = e.jogador2[JOGADOR2.hpMax]!;
    avancar(e, B, PARADO, 1);
    expect(desfechoDoGolpe(e, FORMA.agarrar)).toBe(1);
    expect(hp - e.jogador[JOGADOR.hp]!).toBeCloseTo((hpMax * 20) / 100, 3);
    expect(e.chefeU8[CHEFE_U8.presoPassos]).toBe(60);
    // 60 passos presos: nenhum deslocamento e a esquiva é negada.
    const x0 = e.jogador[JOGADOR.x]!;
    const fonte = fonteDoRoteiro([{ passo: 0, mx: 1, my: 0 }], undefined, [{ passo: e.cab[CAB.passo]! + 5, acoes: ACAO.esquiva, mira: [1, 0] }]);
    avancar(e, B, fonte, 60);
    expect(e.jogador[JOGADOR.x]).toBe(x0);
    expect(e.jogador3U8[JOGADOR3_U8.esquivaPasso]).toBe(0);
    expect(e.chefeU8[CHEFE_U8.presoPassos]).toBe(0);
    avancar(e, B, fonte, 3);
    expect(e.jogador[JOGADOR.x]).toBeGreaterThan(x0);
  });
  it('não pega a 128,1; aparado vai direto à Quebra (Postura 100, 180 passos, sem os +25)', () => {
    expect(golpe(ATQ.agarrar, 128.1, 0, FORMA.agarrar)).toBe(4);
    const { e, s } = cena(ATQ.agarrar, 100, 0, [1, 0], MORTAL);
    prepararAtaque(e, s, ATQ.agarrar, 6, [1, 0]);
    const fonte = aparoNosPassos([e.cab[CAB.passo]!]);
    avancar(e, B, fonte, 12);
    expect(desfechoDoGolpe(e, FORMA.agarrar)).toBe(3);
    expect(e.chefeF32[CHEFE_F32.postura]).toBe(100);
    expect(e.chefeU16[CHEFE_U16.quebraPassos]).toBeGreaterThan(0);
    expect(contar(e, EVENTO.quebraDoChefe)).toBe(1);
    expect(eventosDe(e, EVENTO.quebraDoChefe)[0]!.forma).toBe(2);
  });
});

describe('Convocar (10 Ocos a 112 px, TETO 300)', () => {
  const preparar = (extras: number) => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL, teto: 300 }, B);
    const f = e.fogueiraF32;
    chefeEm(e, s, f[FOGUEIRA_F32.arenaX]!, f[FOGUEIRA_F32.arenaY]!);
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = f[FOGUEIRA_F32.arenaX]! + 150;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = f[FOGUEIRA_F32.arenaY]!;
    e.chefeU8[CHEFE_U8.fase] = 2;
    e.chefeU16[CHEFE_U16.convocaEspera] = 0;
    for (let i = 0; i < extras; i++) nascerInimigo(e, B, TIPO.oco_das_lanternas, 10 + 30 * (i % 30), 10 + 40 * Math.floor(i / 30), false);
    return { e, s };
  };
  it('com o pool vazio põe 10 a 112 ± 0,01 px do centro do chefe, depois de 60 passos de cast parado', () => {
    const { e, s } = preparar(0);
    avancar(e, B, PARADO, 1);
    expect([e.inimigos.ataqueFase[s], e.inimigos.ataqueId[s]]).toEqual([1, ATQ.convocar]);
    expect(vivos(e)).toBe(1);
    avancar(e, B, PARADO, 60);
    expect(vivos(e)).toBe(11);
    let n = 0;
    for (let q = 0; q < CAPACIDADE_DE_INIMIGOS; q++) {
      if (e.pool.posicao[q]! < 0 || q === s) continue;
      expect(Math.abs(Math.hypot(e.inimigos.x[q]! - e.inimigos.x[s]!, e.inimigos.y[q]! - e.inimigos.y[s]!) - 112)).toBeLessThan(0.01);
      n++;
    }
    expect(n).toBe(10);
    expect(e.chefeU16[CHEFE_U16.convocaEspera]).toBeGreaterThan(530);
  });
  it('com 295 vivos (o chefe entre eles) entram só 5: o TETO é 300', () => {
    const { e } = preparar(294);
    expect(vivos(e)).toBe(295);
    avancar(e, B, PARADO, 61);
    expect(vivos(e)).toBe(300);
  });
});

describe('prompts e ameaças', () => {
  it('o telegrafo branco com o jogador na forma conta como ameaça aparável; o vermelho não', () => {
    const { e, s } = comChefe({ cenario: INVULNERAVEL, tutoriaisVistos: TODOS_OS_TUTORIAIS }, B);
    chefeEm(e, s, CENTRO_X, CY);
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = CENTRO_X - 100;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = CY;
    fixarCiclo(e, 1, 0);
    avancar(e, B, PARADO, 2);
    expect(e.inimigos.ataqueId[s]).toBe(ATQ.vara);
    expect(e.jogador3U16[JOGADOR3_U16.ameacasAparaveis]).toBe(1);
  });
});
