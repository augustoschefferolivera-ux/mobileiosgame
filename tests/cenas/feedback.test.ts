// Flash, sons e pulso da stamina como a interface os lê do anel (design/decisoes-F-006.md FB2, FB4, RE1, RE3 e
// RE12), sem Phaser. Tudo fora do estado e do hash.
import { describe, expect, it } from 'vitest';
import { FeedbackDaInterface, type ContadoresDeFeedback } from '../../src/cenas/feedback';
import { ControladorDeFlash, FLASH } from '../../src/cenas/flash';
import { PULSO_DA_STAMINA, VINHETA_DO_ACERTO } from '../../src/cenas/layoutDoHud';
import { SFX } from '../../src/plataforma/sfx';

const SOM_E_FLASH = { som: true, flashes: true };
const zero = (): ContadoresDeFeedback => ({ aparo: 0, esquivaPerfeita: 0, acaoNegada: 0, danoRecebido: 0 });

describe('flash (FB2, RE3)', () => {
  it('um pedido dá o alfa 0,35 por 2 quadros e depois 0', () => {
    const f = new ControladorDeFlash();
    expect(f.pedir(0)).toBe(true);
    expect([f.quadros, f.proximoAlfa(true, false), f.proximoAlfa(true, false), f.proximoAlfa(true, false), f.quadros]).toEqual([2, FLASH.alfa, FLASH.alfa, 0, 0]);
    expect(FLASH.alfa).toBe(0.35);
  });

  it('com a opção desligada o alfa é 0, e o contador anda do mesmo jeito', () => {
    const f = new ControladorDeFlash();
    f.pedir(0);
    expect([f.proximoAlfa(false, false), f.quadros, f.proximoAlfa(false, false), f.quadros]).toEqual([0, 1, 0, 0]);
  });

  it('?flash=segurar não decrementa: o alfa 0,35 fica', () => {
    const f = new ControladorDeFlash();
    f.pedir(0);
    for (let q = 0; q < 10; q++) expect(f.proximoAlfa(true, true)).toBe(0.35);
    expect(f.quadros).toBe(2);
  });

  it('4 pedidos em 1 s dão 3 flashes; o 4º só vale 1 s depois do 1º', () => {
    const f = new ControladorDeFlash();
    expect([0, 100, 200, 300].map((t) => f.pedir(t))).toEqual([true, true, true, false]);
    expect(f.pedir(999)).toBe(false);
    expect(f.pedir(1000)).toBe(true);
    // Depois dela, a mais antiga é a de 100 ms.
    expect(f.pedir(1050)).toBe(false);
    expect(f.pedir(1100)).toBe(true);
  });

  it('um pedido recusado não rearma o contador', () => {
    const f = new ControladorDeFlash();
    f.pedir(0);
    f.pedir(10);
    f.pedir(20);
    f.proximoAlfa(true, false);
    f.proximoAlfa(true, false);
    expect(f.pedir(30)).toBe(false);
    expect(f.quadros).toBe(0);
  });
});

describe('consumidor do anel (FB4, RE12)', () => {
  it('um aparo pede 1 flash e toca 1 som; o mesmo contador não repete', () => {
    const fb = new FeedbackDaInterface();
    const tocados: number[] = [];
    const c = zero();
    c.aparo = 1;
    fb.atualizar(c, 1000, SOM_E_FLASH, (s) => tocados.push(s));
    fb.atualizar(c, 1016, SOM_E_FLASH, (s) => tocados.push(s));
    expect(tocados).toEqual([SFX.aparo]);
    expect(fb.flash.quadros).toBe(2);
  });

  it('esquiva perfeita toca o som dela; os dois no mesmo quadro tocam os dois e dão um flash', () => {
    const fb = new FeedbackDaInterface();
    const tocados: number[] = [];
    fb.atualizar({ aparo: 1, esquivaPerfeita: 1, acaoNegada: 0, danoRecebido: 0 }, 0, SOM_E_FLASH, (s) => tocados.push(s));
    expect(tocados).toEqual([SFX.aparo, SFX.esquivaPerfeita]);
    expect(fb.flash.quadros).toBe(2);
  });

  it('o intervalo mínimo de 80 ms por som vale entre eventos seguidos; esquiva comum e ação negada não tocam', () => {
    const fb = new FeedbackDaInterface();
    const tocados: number[] = [];
    fb.atualizar({ aparo: 1, esquivaPerfeita: 0, acaoNegada: 0, danoRecebido: 0 }, 0, SOM_E_FLASH, (s) => tocados.push(s));
    fb.atualizar({ aparo: 2, esquivaPerfeita: 0, acaoNegada: 0, danoRecebido: 0 }, 50, SOM_E_FLASH, (s) => tocados.push(s));
    fb.atualizar({ aparo: 3, esquivaPerfeita: 0, acaoNegada: 1, danoRecebido: 0 }, 120, SOM_E_FLASH, (s) => tocados.push(s));
    expect(tocados).toEqual([SFX.aparo, SFX.aparo]);
  });

  it('som desligado: sem som, e o flash continua; flashes desligado: sem flash, e o som continua', () => {
    const a = new FeedbackDaInterface();
    const tocados: number[] = [];
    a.atualizar({ aparo: 1, esquivaPerfeita: 0, acaoNegada: 0, danoRecebido: 0 }, 0, { som: false, flashes: true }, (s) => tocados.push(s));
    expect([tocados.length, a.flash.quadros]).toEqual([0, 2]);
    const b = new FeedbackDaInterface();
    b.atualizar({ aparo: 1, esquivaPerfeita: 0, acaoNegada: 0, danoRecebido: 0 }, 0, { som: true, flashes: false }, (s) => tocados.push(s));
    expect([tocados, b.flash.quadros]).toEqual([[SFX.aparo], 0]);
  });

  it('ação negada arma o pulso de 12 quadros, sem som e sem flash', () => {
    const fb = new FeedbackDaInterface();
    const tocados: number[] = [];
    fb.atualizar({ aparo: 0, esquivaPerfeita: 0, acaoNegada: 1, danoRecebido: 0 }, 0, SOM_E_FLASH, (s) => tocados.push(s));
    expect([fb.pulsoDaStamina, fb.flash.quadros, tocados.length]).toEqual([PULSO_DA_STAMINA.quadros, 0, 0]);
    expect(PULSO_DA_STAMINA.quadros).toBe(12);
  });

  it('um contador que volta a 0 (Vigília nova) conta de novo', () => {
    const fb = new FeedbackDaInterface();
    const tocados: number[] = [];
    fb.atualizar({ aparo: 5, esquivaPerfeita: 0, acaoNegada: 0, danoRecebido: 0 }, 0, SOM_E_FLASH, (s) => tocados.push(s));
    fb.atualizar({ aparo: 1, esquivaPerfeita: 0, acaoNegada: 0, danoRecebido: 0 }, 1000, SOM_E_FLASH, (s) => tocados.push(s));
    expect(tocados).toHaveLength(2);
  });

  it('sem áudio (tocar nulo) o flash segue', () => {
    const fb = new FeedbackDaInterface();
    fb.atualizar({ aparo: 1, esquivaPerfeita: 0, acaoNegada: 0, danoRecebido: 0 }, 0, SOM_E_FLASH, null);
    expect(fb.flash.quadros).toBe(2);
  });
});

describe('vinheta do acerto (F-007 HB2)', () => {
  const dano = (n: number): ContadoresDeFeedback => ({ aparo: 0, esquivaPerfeita: 0, acaoNegada: 0, danoRecebido: n });

  it('um dano novo pede a vinheta (6 quadros a 0,35), sem som e sem tocar o flash branco', () => {
    const fb = new FeedbackDaInterface();
    const tocados: number[] = [];
    fb.atualizar(dano(1), 0, SOM_E_FLASH, (s) => tocados.push(s));
    expect([fb.vinheta.quadros, fb.flash.quadros, tocados.length]).toEqual([VINHETA_DO_ACERTO.quadros, 0, 0]);
    const alfas: number[] = [];
    for (let q = 0; q < 7; q++) alfas.push(fb.vinheta.proximoAlfa(true, false));
    expect(alfas).toEqual([0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0]);
    expect([VINHETA_DO_ACERTO.alfa, VINHETA_DO_ACERTO.quadros]).toEqual([0.35, 6]);
  });

  it('no máximo 3 por segundo em rajada: o 4º dentro de 1 s é recusado; passado 1 s volta', () => {
    const fb = new FeedbackDaInterface();
    let aceitos = 0;
    for (let k = 1; k <= 6; k++) {
      fb.vinheta.quadros = 0;
      fb.atualizar(dano(k), k * 100, SOM_E_FLASH, null);
      if (fb.vinheta.quadros > 0) aceitos++;
    }
    expect(aceitos).toBe(3);
    fb.vinheta.quadros = 0;
    fb.atualizar(dano(7), 1200, SOM_E_FLASH, null);
    expect(fb.vinheta.quadros).toBe(VINHETA_DO_ACERTO.quadros);
  });

  it('com "Flashes" desligado a vinheta não é pedida; o contador anda e não dispara depois', () => {
    const fb = new FeedbackDaInterface();
    fb.atualizar(dano(1), 0, { som: true, flashes: false }, null);
    expect(fb.vinheta.quadros).toBe(0);
    fb.atualizar(dano(1), 2000, SOM_E_FLASH, null);
    expect(fb.vinheta.quadros).toBe(0);
  });

  it('um contador que volta a 0 (Vigília nova) conta de novo', () => {
    const fb = new FeedbackDaInterface();
    fb.atualizar(dano(5), 0, SOM_E_FLASH, null);
    fb.vinheta.quadros = 0;
    fb.atualizar(dano(1), 5000, SOM_E_FLASH, null);
    expect(fb.vinheta.quadros).toBe(VINHETA_DO_ACERTO.quadros);
  });
});
