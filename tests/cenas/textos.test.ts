// t(id, params): a função única de texto visível (ADR-0002 §11).
import { describe, expect, it } from 'vitest';
import tabela from '../../src/dados/textos/pt-BR.json';
import { t } from '../../src/cenas/textos';

describe('t()', () => {
  it('devolve o texto do id', () => {
    expect(t('A1.ACENDER.BOTAO')).toBe('Toque para acender a Chama');
  });

  it('troca {param} pelos parâmetros', () => {
    expect(t('A5.HUD.NIVEL', { nivel: 3 })).toBe('Nv 3');
    expect(t('A7.RESULTADO.MANCHA', { almas: 420, hora: 'III' })).toBe('420 Almas ficaram na Hora III');
  });

  it('id ausente e parâmetro ausente são erro', () => {
    expect(() => t('A1.ACENDER.NAO_EXISTE')).toThrow();
    expect(() => t('A5.HUD.NIVEL')).toThrow();
  });

  it('todo {param} do pt-BR.json é substituível (nenhuma chave escapa da regex)', () => {
    for (const x of tabela.textos) {
      const nomes = [...x.texto.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]!);
      const params = Object.fromEntries(nomes.map((n) => [n, 1]));
      expect(t(x.id, params), x.id).not.toMatch(/[{}]/);
    }
  });
});
