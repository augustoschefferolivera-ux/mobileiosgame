// Frasco de Brasa (design/decisoes-F-007.md FR1 a FR7, FR9, DM3): iniciar, curar, interromper, cancelar, regeneração e
// relógio do passo. O comando entra no passo `p` da fonte (a cura 1 é nesse passo) e `avancar(n)` roda n passos.
import { describe, expect, it } from 'vitest';
import { BRUTO, ORIGEM_DO_DANO, danoAoJogador } from '../../../src/logica/mundo/contato';
import { ACAO, type AcaoDeRoteiro } from '../../../src/logica/nucleo/comandos';
import { CAB, FASE, JOGADOR, JOGADOR2, JOGADOR3, JOGADOR3_U16, JOGADOR3_U8, JOGADOR4, JOGADOR4_U32, JOGADOR4_U8, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { ELMO } from '../progressao/apoio';
import { D_LIVRE as D, D_LIVRE_COM_BRASA_FIRME as DREAL, aparoEm, criar, esquivaEm, eventosDe, fonteDeAcoes } from './apoio';

const frascoEm = (passo: number): AcaoDeRoteiro => ({ passo, acoes: ACAO.frasco });
/** A ação `base` no passo 0 e o Frasco no passo `p` (no passo 0 viram um comando só, com os dois bits). */
const baseEFrasco = (base: AcaoDeRoteiro, p: number): AcaoDeRoteiro[] => (p === base.passo ? [{ ...base, acoes: base.acoes | ACAO.frasco }] : [base, frascoEm(p)]);
const cancelarEm = (passo: number): AcaoDeRoteiro => ({ passo, acoes: ACAO.frascoCancelar });
const hp = (e: Estado): number => e.jogador[JOGADOR.hp]!;
const cargas = (e: Estado): number => e.jogador4U8[JOGADOR4_U8.frascoCargas]!;
const curaPasso = (e: Estado): number => e.jogador4U8[JOGADOR4_U8.frascoPasso]!;
const espera = (e: Estado): number => e.jogador3U8[JOGADOR3_U8.esperaRegen]!;

/** Vigília sem horda, com HP dado. */
function com(hpInicial: number, params = {}, dados = D): Estado {
  const e = criar(params, dados);
  e.jogador[JOGADOR.hp] = hpInicial;
  return e;
}

/** Dano bruto direto pelo único caminho (a Brasa Firme está desligada em D). */
function golpe(e: Estado, bruto: number, dados = D): void {
  BRUTO[0] = bruto;
  danoAoJogador(e, dados, ORIGEM_DO_DANO.golpe);
}

describe('iniciar e curar (FR1, FR2)', () => {
  it('HP 30/150: a carga sai no toque, a cura é 0,5 por passo (Float32 exato) e, no passo 120, o HP é 90', () => {
    const e = com(30);
    const fonte = fonteDeAcoes([frascoEm(0)]);
    avancar(e, D, fonte, 1);
    expect([hp(e), cargas(e), curaPasso(e), e.jogador4U32[JOGADOR4_U32.frascosUsados]]).toEqual([30.5, 2, 2, 1]);
    expect([e.jogador4[JOGADOR4.frascoPorPasso], e.jogador4[JOGADOR4.frascoRestante]]).toEqual([0.5, 59.5]);
    for (let k = 2; k <= 119; k++) {
      avancar(e, D, fonte, 1);
      expect(hp(e)).toBe(30 + 0.5 * k);
    }
    expect(curaPasso(e)).toBe(120);
    avancar(e, D, fonte, 1);
    expect([hp(e), curaPasso(e), e.jogador4[JOGADOR4.frascoRestante]]).toEqual([90, 0, 0]);
    avancar(e, D, fonte, 60);
    expect(hp(e)).toBe(90);
  });

  it('o evento frascoIniciado leva x, y, o HP antes e o hpMax', () => {
    const e = com(30);
    avancar(e, D, fonteDeAcoes([frascoEm(0)]), 1);
    const ev = eventosDe(e, EVENTO.frascoIniciado);
    expect(ev).toHaveLength(1);
    expect([ev[0]!.passo, ev[0]!.a, ev[0]!.b]).toEqual([1, 30, 150]);
  });

  it('HP 140: sobe 0,5 por passo e para no máximo (150) no passo 20, sem passar', () => {
    const e = com(140);
    const fonte = fonteDeAcoes([frascoEm(0)]);
    avancar(e, D, fonte, 19);
    expect(hp(e)).toBe(149.5);
    avancar(e, D, fonte, 1);
    expect(hp(e)).toBe(150);
    avancar(e, D, fonte, 101);
    expect(hp(e)).toBe(150);
  });

  it('o toque fica negado, sem mudar estado nem a espera da regeneração, com HP cheio ou sem cargas', () => {
    for (const preparar of [(e: Estado) => (e.jogador[JOGADOR.hp] = 150), (e: Estado) => (e.jogador4U8[JOGADOR4_U8.frascoCargas] = 0)]) {
      const e = com(30);
      preparar(e);
      const antes = [hp(e), cargas(e), curaPasso(e), espera(e), e.jogador4U32[JOGADOR4_U32.frascosUsados], e.jogador4[JOGADOR4.frascoPorPasso]];
      avancar(e, D, fonteDeAcoes([frascoEm(0)]), 1);
      expect([hp(e), cargas(e), curaPasso(e), espera(e), e.jogador4U32[JOGADOR4_U32.frascosUsados], e.jogador4[JOGADOR4.frascoPorPasso]]).toEqual(antes);
      expect(eventosDe(e, EVENTO.frascoIniciado)).toHaveLength(0);
    }
  });

  it('em curso, um novo toque não inicia outra cura nem gasta carga', () => {
    const e = com(30);
    avancar(e, D, fonteDeAcoes([frascoEm(0), frascoEm(10)]), 11);
    expect(cargas(e)).toBe(2);
    expect(eventosDe(e, EVENTO.frascoIniciado)).toHaveLength(1);
  });

  it('só com a fase VIVA: em APAGANDO o toque é recusado', () => {
    const e = com(30);
    e.jogador4U8[JOGADOR4_U8.fase] = FASE.apagando;
    avancar(e, D, fonteDeAcoes([frascoEm(0)]), 1);
    expect([cargas(e), curaPasso(e)]).toEqual([3, 0]);
  });
});

describe('janelas em que o bit é ignorado (FR1)', () => {
  /** Esquiva no passo 0 e o Frasco no passo `p`: `esquivaPasso` vale p + 1 na leitura (1, 13 e 21 nos três casos). */
  it('esquivaPasso em 1, 13 e 21: sem efeito e carga intacta; em 22 (a esquiva acabou) inicia', () => {
    for (const [p, inicia] of [[0, false], [12, false], [20, false], [21, true]] as const) {
      const e = com(30);
      avancar(e, D, fonteDeAcoes(baseEFrasco(esquivaEm(0, [1, 0]), p)), p + 1);
      expect([p, curaPasso(e) > 0, cargas(e)]).toEqual(inicia ? [p, true, 2] : [p, false, 3]);
    }
  });

  it('na janela do aparo (passos 0 a 11) o bit é ignorado; no passo 12, com ameaça (aparo falho), inicia', () => {
    for (const [p, inicia] of [[0, false], [11, false], [12, true]] as const) {
      const e = com(30);
      e.jogador3U16[JOGADOR3_U16.ameacasAparaveis] = 1;
      avancar(e, D, fonteDeAcoes(baseEFrasco(aparoEm(0), p)), p + 1);
      expect([p, curaPasso(e) > 0]).toEqual([p, inicia]);
    }
  });

  it('aparo e Frasco no mesmo passo: vale o aparo; esquiva e Frasco: vale a esquiva', () => {
    const a = com(30);
    avancar(a, D, fonteDeAcoes([{ passo: 0, acoes: ACAO.aparo | ACAO.frasco }]), 1);
    expect([a.jogador3U8[JOGADOR3_U8.aparoJanela]! > 0, curaPasso(a), cargas(a)]).toEqual([true, 0, 3]);
    const b = com(30);
    avancar(b, D, fonteDeAcoes([{ passo: 0, acoes: ACAO.esquiva | ACAO.frasco, mira: [1, 0] }]), 1);
    expect([b.jogador3U8[JOGADOR3_U8.esquivaPasso], curaPasso(b), cargas(b)]).toEqual([1, 0, 3]);
  });
});

describe('o hpMax do início e o dano no meio da cura (FR2)', () => {
  it('uma carta +HP% no meio da cura muda o hpMax mas não a cura por passo nem o resto: HP 30 → 90', () => {
    const e = com(30);
    const fonte = fonteDeAcoes([frascoEm(0)]);
    avancar(e, D, fonte, 50);
    e.jogador2[JOGADOR2.hpMax] = 180;
    avancar(e, D, fonte, 70);
    expect([e.jogador4[JOGADOR4.frascoPorPasso], hp(e)]).toEqual([0.5, 90]);
  });

  it('HP 30 e golpe de 10 no passo 100 (não interrompe): 90 − 10 = 80 no passo 120, e não 90', () => {
    const e = com(30);
    const fonte = fonteDeAcoes([frascoEm(0)]);
    avancar(e, D, fonte, 100);
    golpe(e, 10);
    expect(curaPasso(e)).toBe(101);
    avancar(e, D, fonte, 20);
    expect(hp(e)).toBe(80);
  });
});

describe('interrupção (FR3, DM3): líquido estrito acima de hpMax × 15/100 = 22,5', () => {
  function interromper(bruto: number, params = {}, dados = D): { e: Estado; interrompeu: boolean } {
    const e = com(30, params, dados);
    const fonte = fonteDeAcoes([frascoEm(0)]);
    avancar(e, dados, fonte, 60);
    golpe(e, bruto, dados);
    return { e, interrompeu: curaPasso(e) === 0 };
  }

  it('sem Brasa Firme: 22 e 22,5 não interrompem; 23 e o vizinho Float32 acima de 22,5 interrompem', () => {
    const acima = new Float32Array([22.5]);
    acima[0] = acima[0]! + 2 ** -19;
    expect(acima[0]).toBeGreaterThan(22.5);
    expect(interromper(22).interrompeu).toBe(false);
    expect(interromper(22.5).interrompeu).toBe(false);
    expect(interromper(acima[0]!).interrompeu).toBe(true);
    expect(interromper(23).interrompeu).toBe(true);
  });

  it('com Brasa Firme (stamina cheia): 28 → 22,4 não; 29 → 23,2 sim; 39 → 31,2 sim', () => {
    expect(interromper(28, {}, DREAL).interrompeu).toBe(false);
    expect(interromper(29, {}, DREAL).interrompeu).toBe(true);
    expect(interromper(39, {}, DREAL).interrompeu).toBe(true);
  });

  it('com A = 20 (Elmo 5) e sem Brasa Firme, 39 bruto vira 19,5 e não interrompe', () => {
    expect(interromper(39, { passivas: [{ codigo: ELMO, nivel: 5 }] }).interrompeu).toBe(false);
  });

  it('golpe de 29 bruto no passo 60: perde 60 × 0,5 = 30 de cura, a carga não volta, o evento leva o líquido e os passos feitos', () => {
    const { e } = interromper(29);
    expect([hp(e), cargas(e), e.jogador4[JOGADOR4.frascoRestante]]).toEqual([30 + 30 - 29, 2, 0]);
    avancar(e, D, fonteDeAcoes([]), 70);
    expect(hp(e)).toBe(31);
    const ev = eventosDe(e, EVENTO.frascoInterrompido);
    expect(ev).toHaveLength(1);
    expect([ev[0]!.a, ev[0]!.b]).toEqual([29, 60]);
  });

  it('duas interrupções não somam: o dano sem cura em curso não emite evento nem mexe na carga', () => {
    const { e } = interromper(30);
    golpe(e, 30);
    expect(eventosDe(e, EVENTO.frascoInterrompido)).toHaveLength(1);
    expect(cargas(e)).toBe(2);
  });

  it('a interrupção não congela nem zera a espera da regeneração restante', () => {
    const e = com(30);
    e.jogador3[JOGADOR3.stamina] = 50;
    const fonte = fonteDeAcoes([frascoEm(0)]);
    avancar(e, D, fonte, 60);
    const antes = espera(e);
    golpe(e, 30);
    expect(espera(e)).toBe(antes);
    const passo = e.cab[CAB.passo]!;
    avancar(e, D, fonte, 1);
    expect(e.cab[CAB.passo]).toBe(passo + 1);
  });
});

describe('cancelar ao segurar (FR6) e ações durante a cura (FR4)', () => {
  it('o bit 8 com a cura em curso: a carga fica gasta, a cura feita fica, evento com os passos feitos', () => {
    const e = com(30);
    const fonte = fonteDeAcoes([frascoEm(0), cancelarEm(30)]);
    avancar(e, D, fonte, 31);
    expect([hp(e), curaPasso(e), cargas(e), e.jogador4[JOGADOR4.frascoRestante]]).toEqual([45, 0, 2, 0]);
    const ev = eventosDe(e, EVENTO.frascoCancelado);
    expect(ev).toHaveLength(1);
    expect(ev[0]!.a).toBe(30);
    avancar(e, D, fonte, 120);
    expect(hp(e)).toBe(45);
  });

  it('o bit 8 sem cura em curso é ignorado, sem evento; o 8 vence o 4 no mesmo passo', () => {
    const e = com(30);
    avancar(e, D, fonteDeAcoes([cancelarEm(0), { passo: 1, acoes: ACAO.frasco | ACAO.frascoCancelar }]), 2);
    expect([curaPasso(e), cargas(e)]).toEqual([0, 3]);
    expect(eventosDe(e, EVENTO.frascoCancelado)).toHaveLength(0);
    const f = com(30);
    avancar(f, D, fonteDeAcoes([frascoEm(0), { passo: 10, acoes: ACAO.frasco | ACAO.frascoCancelar }]), 11);
    expect([curaPasso(f), cargas(f), eventosDe(f, EVENTO.frascoCancelado).length]).toEqual([0, 2, 1]);
  });

  it('Frasco + esquiva no passo 40: a cura segue até 120 (esquiva e aparo não cancelam)', () => {
    const e = com(30);
    avancar(e, D, fonteDeAcoes([frascoEm(0), esquivaEm(40, [1, 0])]), 120);
    expect([hp(e), curaPasso(e)]).toEqual([90, 0]);
    expect(e.jogador3[JOGADOR3.stamina]).toBeLessThan(100);
  });

  it('mover é livre durante a cura: a velocidade é a normal', () => {
    const e = com(30);
    const x0 = e.jogador[JOGADOR.x]!;
    const fonte = fonteDeAcoes([frascoEm(0)], { mx: 1, my: 0 });
    avancar(e, D, fonte, 10);
    expect(e.jogador[JOGADOR.x]! - x0).toBeCloseTo(10 * D.velocidadePorPasso, 3);
  });
});

describe('regeneração de stamina (FR5)', () => {
  it('sem gasto: parada nos passos 1 a 120 da cura e volta no 121', () => {
    const e = com(30);
    e.jogador3[JOGADOR3.stamina] = 50;
    const fonte = fonteDeAcoes([frascoEm(0)]);
    avancar(e, D, fonte, 120);
    expect(e.jogador3[JOGADOR3.stamina]).toBe(50);
    expect(espera(e)).toBe(0);
    avancar(e, D, fonte, 1);
    expect(e.jogador3[JOGADOR3.stamina]).toBe(50 + D.combate.regeneracaoPorPasso);
  });

  it('um gasto no passo 100 põe 30 e max(20, 30) = 30: a regeneração volta 30 passos depois, no 131, depois do fim da cura', () => {
    const e = com(30);
    e.jogador3[JOGADOR3.stamina] = 50;
    const fonte = fonteDeAcoes([frascoEm(0), esquivaEm(99, [1, 0])]);
    avancar(e, D, fonte, 100);
    expect(espera(e)).toBe(30);
    avancar(e, D, fonte, 30);
    expect(e.jogador3[JOGADOR3.stamina]).toBe(25);
    avancar(e, D, fonte, 1);
    expect(e.jogador3[JOGADOR3.stamina]).toBe(25 + D.combate.regeneracaoPorPasso);
  });

  it('o toque eleva a espera a 120 (max com o que havia)', () => {
    const e = com(30);
    e.jogador3U8[JOGADOR3_U8.esperaRegen] = 200;
    avancar(e, D, fonteDeAcoes([frascoEm(0)]), 1);
    expect(espera(e)).toBe(199);
    const f = com(30);
    avancar(f, D, fonteDeAcoes([frascoEm(0)]), 1);
    expect(espera(f)).toBe(119);
  });
});

describe('relógio do passo (FR7)', () => {
  it('a cura só anda quando o passo roda: o passo congelado não a avança', () => {
    const e = com(30);
    const fonte = fonteDeAcoes([frascoEm(0)]);
    avancar(e, D, fonte, 10);
    const antes = [hp(e), curaPasso(e)];
    e.jogador3U8[JOGADOR3_U8.congelamento] = 5;
    avancar(e, D, fonte, 5);
    expect([hp(e), curaPasso(e)]).toEqual(antes);
    avancar(e, D, fonte, 1);
    expect(curaPasso(e)).toBe(antes[1]! + 1);
  });

  it('o bit 4 do passo congelado é lido no primeiro passo vivo, sem buffer perdido nem duplicado', () => {
    const e = com(30);
    e.jogador3U8[JOGADOR3_U8.congelamento] = 3;
    const fonte = fonteDeAcoes([frascoEm(0)]);
    avancar(e, D, fonte, 3);
    expect([curaPasso(e), cargas(e)]).toEqual([0, 3]);
    avancar(e, D, fonte, 1);
    expect([curaPasso(e), cargas(e)]).toEqual([2, 2]);
  });

  it('a cura é replay-determinística: o mesmo roteiro com os bits 4 e 8 dá o mesmo hash', () => {
    const rodar = (): string => {
      const e = com(30);
      avancar(e, D, fonteDeAcoes([frascoEm(0), cancelarEm(30), frascoEm(60), esquivaEm(80, [0, 1])]), 200);
      return Array.from(e.bytes.slice(0, 1000)).join(',') + hp(e) + e.jogador4[JOGADOR4.frascoRestante];
    };
    expect(rodar()).toBe(rodar());
  });
});
