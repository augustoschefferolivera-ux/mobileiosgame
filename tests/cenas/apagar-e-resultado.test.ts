// Apagar e Resultado fora do Phaser (design/decisoes-F-007.md AG2, AG5, RS1 a RS7, RS9, MC9): a câmera lenta do Apagar, as linhas
// do Resultado, o título por causa, a Hora em romanos, o mapa pequeno, o marcador e a seta da mancha.
import { describe, expect, it } from 'vitest';
import { linhaDaMancha, linhasDoResultado, pontoNoMapaPequeno, MAPA_PEQUENO_PT, tempoEmTexto, tituloDoResultado, horaEmRomano } from '../../src/cenas/linhasDoResultado';
import { RAIO_DO_ANEL_DA_MANCHA, criarMarcador, marcadorDaMancha, MARGEM_DA_SETA } from '../../src/cenas/render/mancha';
import { t } from '../../src/cenas/textos';
import { criarCameraLenta, dispararCameraLenta, escalaDeTempo, escalarDelta, escalarDeltaDoApagar } from '../../src/logica/nucleo/cameraLenta';
import { CAUSA_DO_FIM } from '../../src/logica/nucleo/estado';
import type { ResultadoDaVigilia } from '../../src/logica/mundo/vigilia';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA } from '../../src/logica/mundo/toro';
import { D_LIVRE } from '../logica/combate/apoio';

const R: ResultadoDaVigilia = {
  causa: CAUSA_DO_FIM.apagar,
  segundos: 754,
  nivel: 7,
  mortes: 340,
  danoRecebido: 412,
  aparos: 3,
  almas: 1000,
  almasAoSantuario: 700,
  mancha: { x: 585, y: 1266, hora: 4, rotulo: null, almas: 300 },
  recuperouMancha: false,
};

describe('câmera lenta do Apagar (AG2)', () => {
  it('30 passos de 16,67 ms a fator 0,5 somam 1.000 ms de tempo real, a 60 ou a 30 fps', () => {
    const apagar = D_LIVRE.combate;
    expect([apagar.apagarPassos, apagar.apagarFator]).toEqual([30, 0.5]);
    for (const quadroMs of [1000 / 60, 1000 / 30]) {
      let real = 0;
      let jogo = 0;
      while (jogo < 30 * (1000 / 60) - 1e-9) {
        jogo += escalarDeltaDoApagar(quadroMs, apagar.apagarFator);
        real += quadroMs;
      }
      expect(real).toBeGreaterThanOrEqual(1000 - 1e-6);
      expect(real).toBeLessThan(1000 + quadroMs + 1e-6);
    }
  });

  it('passa por cima da do tutorial: não consome o restante nem a flag usada, e o fator customizado vale', () => {
    const c = criarCameraLenta();
    expect(dispararCameraLenta(c)).toBe(true);
    const antes = { ...c };
    for (let k = 0; k < 10; k++) escalarDeltaDoApagar(16.67, 0.5);
    expect(c).toEqual(antes);
    const d = criarCameraLenta();
    dispararCameraLenta(d, 100, 0.25);
    expect([escalaDeTempo(d), escalarDelta(d, 40), d.restanteMs]).toEqual([0.25, 10, 60]);
    expect(escalarDeltaDoApagar(0, 0.5)).toBe(0);
  });
});

describe('Resultado (RS1 a RS7, RS9)', () => {
  it('o tempo em m:ss truncado: 0, 59, 60, 754, 3.599', () => {
    expect([0, 59, 60, 754, 3599].map(tempoEmTexto)).toEqual(['0:00', '0:59', '1:00', '12:34', '59:59']);
  });

  it('cinco linhas: tempo, nível, mortes, dano e Almas ao Santuário; sem Chefe nem Brasas (F-009) e sem Reviver', () => {
    const l = linhasDoResultado(R);
    expect(l.map((x) => x.rotulo)).toEqual(['A7.RESULTADO.TEMPO', 'A7.RESULTADO.NIVEL', 'A7.RESULTADO.MORTES', 'A7.RESULTADO.DANO', 'A7.RESULTADO.ALMAS']);
    expect(l.map((x) => x.valor)).toEqual(['12:34', '7', '340', '412', '700']);
    expect(l.some((x) => /CHEFE|BRASAS|REVIVER/.test(x.rotulo))).toBe(false);
  });

  it('a linha da mancha: Hora em romanos nas Horas I a IV, A Fome na 5; sem mancha, nada', () => {
    expect(t(linhaDaMancha(R)!.id, linhaDaMancha(R)!.params)).toBe('300 Almas ficaram na Hora IV');
    const fome = { ...R, mancha: { ...R.mancha!, hora: 5 } };
    expect(t(linhaDaMancha(fome)!.id, linhaDaMancha(fome)!.params)).toBe('300 Almas ficaram em A Fome');
    expect(linhaDaMancha({ ...R, mancha: null })).toBeNull();
    expect([1, 2, 3, 4].map(horaEmRomano)).toEqual(['I', 'II', 'III', 'IV']);
  });

  it('o título: "Você se apaga." no Apagar, o do Abandonar da pausa (RS9) e o do Amanhecer', () => {
    expect(t(tituloDoResultado(CAUSA_DO_FIM.apagar))).toBe('Você se apaga.');
    expect(tituloDoResultado(CAUSA_DO_FIM.abandonar)).toBe('A6.PAUSA.ABANDONAR');
    expect(tituloDoResultado(CAUSA_DO_FIM.amanhecer)).toBe('A4.AMANHECER.01');
  });

  it('o mapa pequeno tem 120 pt de altura na proporção do mapa e o ponto cai no canto certo', () => {
    const p = pontoNoMapaPequeno(0, 0);
    expect([p.altura, p.largura]).toEqual([MAPA_PEQUENO_PT, (MAPA_PEQUENO_PT * LARGURA_DO_MAPA) / ALTURA_DO_MAPA]);
    const q = pontoNoMapaPequeno(LARGURA_DO_MAPA / 2, ALTURA_DO_MAPA / 4);
    expect([q.px, q.py]).toEqual([p.largura / 2, MAPA_PEQUENO_PT / 4]);
  });

  it('os botões e os rótulos saem de ids (Voltar e Repetir, RS6)', () => {
    expect([t('A7.RESULTADO.VOLTAR'), t('A7.RESULTADO.REPETIR')]).toEqual(['Voltar ao Santuário', 'Repetir Vigília']);
  });
});

describe('marcador e seta da mancha (MC9)', () => {
  it('dentro da vista: sem seta, o anel na cópia mais próxima; fora: o ângulo vem do delta toroidal', () => {
    const m = marcadorDaMancha(600, 1300, 585, 1266, criarMarcador());
    expect([m.dentro, m.x, m.y]).toEqual([true, 600, 1300]);
    // Mancha à direita e abaixo, fora da vista: a seta aponta para o delta e fica na margem do retângulo.
    const f = marcadorDaMancha(585 + 400, 1266 + 400, 585, 1266, criarMarcador());
    expect(f.dentro).toBe(false);
    expect(f.angulo).toBeCloseTo(Math.atan2(400, 400), 12);
    expect(Math.abs(f.setaX - 585)).toBeLessThanOrEqual(195 - MARGEM_DA_SETA + 1e-9);
    expect(Math.abs(f.setaY - 1266)).toBeLessThanOrEqual(422 - MARGEM_DA_SETA + 1e-9);
  });

  it('o delta é pelo menor caminho no toro: a mancha na costura de x fica à esquerda da câmera', () => {
    const m = marcadorDaMancha(LARGURA_DO_MAPA - 100, 1266, 50, 1266, criarMarcador());
    expect(m.x).toBe(50 - 150);
    expect(Math.abs(Math.abs(m.angulo) - Math.PI)).toBeLessThan(1e-12);
    expect(m.dentro).toBe(true);
  });

  it('a borda da vista conta o raio do anel; um pixel além, fora', () => {
    const limite = 195 + RAIO_DO_ANEL_DA_MANCHA;
    expect(marcadorDaMancha(585 + limite, 1266, 585, 1266, criarMarcador()).dentro).toBe(true);
    expect(marcadorDaMancha(585 + limite + 1, 1266, 585, 1266, criarMarcador()).dentro).toBe(false);
  });
});
