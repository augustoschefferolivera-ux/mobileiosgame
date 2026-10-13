// Determinismo da luta (F-009.14, ADR-0002 §5): a mesma seed e o mesmo roteiro dão o mesmo hash, e copiar o buffer no meio da luta
// para um estado novo e seguir dá o mesmo hash (nada do chefe fica fora do buffer).
import { describe, expect, it } from 'vitest';
import { fonteDoRoteiro, type AcaoDeRoteiro } from '../../../src/logica/nucleo/comandos';
import { CAB, CHEFE_F32, CHEFE_U16, CHEFE_U8, hashEstado, hashPorSecao, sincronizarDerivados, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { ACAO, ARMA, D, estadoDoChefe } from './apoio';

const ARMAS = [{ codigo: ARMA.espada_longa_do_juramento, nivel: 8 }, { codigo: ARMA.facas_de_sal, nivel: 8 }, { codigo: ARMA.circulo_de_sal, nivel: 8 }];

function roteiro(): ReturnType<typeof fonteDoRoteiro> {
  const acoes: AcaoDeRoteiro[] = [];
  for (let p = 40; p < 4000; p += 53) acoes.push(p % 2 === 0 ? { passo: p, acoes: ACAO.aparo } : { passo: p, acoes: ACAO.esquiva, mira: [Math.cos(p), Math.sin(p)] });
  return fonteDoRoteiro([{ passo: 0, mx: 0.5, my: 0 }, { passo: 500, mx: 0, my: 0.5 }, { passo: 1000, mx: -0.5, my: 0 }, { passo: 1500, mx: 0, my: -0.5 }, { passo: 2000, mx: 0, my: 0 }], undefined, acoes);
}

function lutar(): Estado {
  const e = estadoDoChefe({ cenario: 8 | 2 | 1, armas: ARMAS }, D, 29);
  const fonte = roteiro();
  avancar(e, D, fonte, 1500);
  // Perto do limiar da fase 2, para o roteiro cruzar uma transição.
  const s = e.chefeU16[CHEFE_U16.slot]!;
  e.inimigos.hp[s] = Math.min(e.inimigos.hp[s]!, e.chefeF32[CHEFE_F32.hpMax]! * 0.62);
  avancar(e, D, fonte, 2500);
  return e;
}

describe('determinismo da luta (F-009.14)', () => {
  it('a mesma seed e o mesmo roteiro dão o mesmo hash, e a luta mexeu na Postura, na fase e nas seções do hash', () => {
    const a = lutar();
    const b = lutar();
    expect(hashEstado(a)).toBe(hashEstado(b));
    expect(hashPorSecao(a)).toEqual(hashPorSecao(b));
    expect(a.chefeU8[CHEFE_U8.faseMax]).toBeGreaterThanOrEqual(2);
    expect(a.cab[CAB.passo]).toBeGreaterThan(3500);
  });

  it('copiar o buffer no passo 1.500 para um estado novo e seguir dá o mesmo hash (nada fica fora do buffer)', () => {
    const fonte = roteiro();
    const a = estadoDoChefe({ cenario: 8 | 2 | 1, armas: ARMAS }, D, 29);
    avancar(a, D, fonte, 1500);
    const b = estadoDoChefe({ cenario: 8 | 2 | 1, armas: ARMAS }, D, 29);
    b.bytes.set(a.bytes);
    sincronizarDerivados(b, D);
    avancar(a, D, fonte, 1500);
    avancar(b, D, fonte, 1500);
    expect(hashEstado(b)).toBe(hashEstado(a));
  });
});
