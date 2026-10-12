// Contadores da pausa e do Resultado (design/decisoes-F-007.md PE2): dano recebido, aparos e esquivas perfeitas.
import { describe, expect, it } from 'vitest';
import { BRUTO, ORIGEM_DO_DANO, danoAoJogador, resolverAcertoNoJogador } from '../../../src/logica/mundo/contato';
import { resultadoDaVigilia } from '../../../src/logica/mundo/vigilia';
import { CENARIO, JOGADOR, JOGADOR3, JOGADOR3_U8, JOGADOR4, JOGADOR4_U32, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { D_LIVRE_COM_BRASA_FIRME as DREAL, TIPO, aparoEm, criar, fonteDeAcoes } from '../combate/apoio';
import { ELMO } from '../progressao/apoio';

const dano = (e: Estado): number => e.jogador4[JOGADOR4.danoRecebido]!;
const aparos = (e: Estado): number => e.jogador4U32[JOGADOR4_U32.aparos]!;
const perfeitas = (e: Estado): number => e.jogador4U32[JOGADOR4_U32.esquivasPerfeitas]!;

describe('dano recebido (PE2)', () => {
  it('golpe de 30 com A = 20 (Elmo 5) e Brasa Firme soma 12; com HP 5 soma só os 5 que sobravam', () => {
    const e = criar({ passivas: [{ codigo: ELMO, nivel: 5 }] }, DREAL);
    BRUTO[0] = 30;
    danoAoJogador(e, DREAL, ORIGEM_DO_DANO.golpe);
    expect(dano(e)).toBe(12);
    const f = criar({ passivas: [{ codigo: ELMO, nivel: 5 }] }, DREAL);
    f.jogador[JOGADOR.hp] = 5;
    danoAoJogador(f, DREAL, ORIGEM_DO_DANO.golpe);
    expect(dano(f)).toBe(5);
  });

  it('o Resultado arredonda ao mais próximo, não ao piso (A = 4 dá 20/24 do bruto: 12,5 → 13)', () => {
    const e = criar({}, DREAL);
    e.jogador[JOGADOR.hp] = 100;
    e.jogador4[JOGADOR4.danoRecebido] = 12.5;
    expect(resultadoDaVigilia(e, DREAL).danoRecebido).toBe(13);
    e.jogador4[JOGADOR4.danoRecebido] = 12.4;
    expect(resultadoDaVigilia(e, DREAL).danoRecebido).toBe(12);
  });

  it('esquivado, aparado ou o jogador invulnerável do cenário não somam', () => {
    const e = criar({ cenario: CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel }, DREAL);
    BRUTO[0] = 30;
    danoAoJogador(e, DREAL, ORIGEM_DO_DANO.golpe);
    expect(dano(e)).toBe(0);
  });
});

describe('aparos e esquivas perfeitas (PE2)', () => {
  const ATQ = CENARIO.diretorDesligado | CENARIO.ataques;
  const GRANDE = [{ codigo: TIPO.oco_grande, dx: 0, dy: -70 }];

  it('só o aparo bem-sucedido soma (toque em c = 30, golpe em h = 37); sem toque o golpe fere e aparos fica 0', () => {
    const e = criar({ cenario: ATQ, inimigos: GRANDE }, DREAL);
    avancar(e, DREAL, fonteDeAcoes([aparoEm(29)]), 60);
    expect(aparos(e)).toBe(1);
    const f = criar({ cenario: ATQ, inimigos: GRANDE }, DREAL);
    avancar(f, DREAL, fonteDeAcoes([]), 60);
    expect(aparos(f)).toBe(0);
  });

  it('1 esquiva perfeita por esquiva: o 2º acerto evitado da mesma esquiva não soma', () => {
    const e = criar({}, DREAL);
    e.jogador3U8[JOGADOR3_U8.esquivaPasso] = 5;
    e.jogador3U8[JOGADOR3_U8.esquivaPerfeitaDada] = 0;
    resolverAcertoNoJogador(e, DREAL, ORIGEM_DO_DANO.golpe, -1);
    resolverAcertoNoJogador(e, DREAL, ORIGEM_DO_DANO.golpe, -1);
    expect(perfeitas(e)).toBe(1);
    expect(e.jogador3[JOGADOR3.stamina]).toBeGreaterThan(0);
  });
});
