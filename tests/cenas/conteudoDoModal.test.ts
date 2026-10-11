// Conteúdo do modal (design/decisoes-F-005.md R6, L8 e B4) e a geometria das
// cartas: ids de texto, parâmetros, ícone e "Completa: …" de cada carta; as
// linhas do baú; CARTA_DO_MODAL e as posições dos alvos (342 × 152, 12 entre).
import { describe, expect, it } from 'vitest';
import { conteudoDaCarta, linhasDoBau } from '../../src/cenas/conteudoDoModal';
import { t } from '../../src/cenas/textos';
import textos from '../../src/dados/textos/pt-BR.json';
import { ALVO_MINIMO_PT, CARTA_DO_MODAL, alvosDasCartas } from '../../src/entrada/alvos';
import { BAU, CATEGORIA_DE_ITEM, TIPO_DE_CARTA, type Estado } from '../../src/logica/nucleo/estado';
import { completaUniao } from '../../src/logica/progressao/oferta';
import type { Insets } from '../../src/plataforma/safeArea';
import { insetsZerados } from '../../src/plataforma/safeArea';
import { D, ELMO, ESPADA, FACAS, LUVAS, estadoDe } from '../logica/progressao/apoio';

const IDS = new Set(textos.textos.map((x) => x.id));

/** Põe a carta 0 da oferta. */
function carta(e: Estado, tipo: number, item: number): Estado {
  e.oferta.tipo[0] = tipo;
  e.oferta.item[0] = item;
  return e;
}

describe('conteudoDaCarta', () => {
  it('Elmo novo com a Espada nv8: completa a União (rodapé "Completa: Lâmina…")', () => {
    const e = carta(estadoDe([[ESPADA, 8]]), TIPO_DE_CARTA.passivaNova, ELMO);
    expect(completaUniao(e, D, TIPO_DE_CARTA.passivaNova, ELMO)).not.toBe(0);
    expect(conteudoDaCarta(e, D, 0)).toEqual({
      icone: 'elmo',
      nome: { id: 'F3.ELMO_SEM_ROSTO.NOME' },
      etiqueta: { id: 'A10.LEVELUP.NOVO' },
      funcional: { id: 'F3.ELMO_SEM_ROSTO.EFEITO' },
      rodape: { id: 'A10.LEVELUP.COMPLETA_UNIAO', textosNosParams: { uniao: 'F2.LAMINA_DO_JURAMENTO_ETERNO.NOME' } },
      completaUniao: true,
    });
  });

  it('Elmo novo com a Espada nv7 (ou sem Espada): sem União, rodapé é a lore', () => {
    for (const armas of [[[ESPADA, 7]], [[FACAS, 8]]] as const) {
      const c = conteudoDaCarta(carta(estadoDe(armas), TIPO_DE_CARTA.passivaNova, ELMO), D, 0);
      expect([c.completaUniao, c.rodape]).toEqual([false, { id: 'F3.ELMO_SEM_ROSTO.LORE' }]);
    }
  });

  it('Espada 7→8 com o Elmo: melhoria que completa a União', () => {
    const e = carta(estadoDe([[ESPADA, 7]], [[ELMO, 1]]), TIPO_DE_CARTA.melhoriaDeArma, ESPADA);
    expect(conteudoDaCarta(e, D, 0)).toEqual({
      icone: 'espada',
      nome: { id: 'F1.ESPADA_LONGA_DO_JURAMENTO.NOME' },
      etiqueta: { id: 'A10.LEVELUP.NIVEL', params: { nivel: 8 } },
      funcional: { id: 'F1.ESPADA_LONGA_DO_JURAMENTO.NV8' },
      rodape: { id: 'A10.LEVELUP.COMPLETA_UNIAO', textosNosParams: { uniao: 'F2.LAMINA_DO_JURAMENTO_ETERNO.NOME' } },
      completaUniao: true,
    });
  });

  it('Espada 6→7 com o Elmo, ou 7→8 sem o Elmo: não completa', () => {
    const a = conteudoDaCarta(carta(estadoDe([[ESPADA, 6]], [[ELMO, 1]]), TIPO_DE_CARTA.melhoriaDeArma, ESPADA), D, 0);
    expect([a.completaUniao, a.funcional.id, a.rodape]).toEqual([false, 'F1.ESPADA_LONGA_DO_JURAMENTO.NV7', { id: 'F1.ESPADA_LONGA_DO_JURAMENTO.LORE' }]);
    const b = conteudoDaCarta(carta(estadoDe([[ESPADA, 7]]), TIPO_DE_CARTA.melhoriaDeArma, ESPADA), D, 0);
    expect([b.completaUniao, b.funcional.id]).toEqual([false, 'F1.ESPADA_LONGA_DO_JURAMENTO.NV8']);
  });

  it('Bolsa de Almas: nome e efeito, sem etiqueta nem rodapé', () => {
    expect(conteudoDaCarta(carta(estadoDe([[ESPADA, 1]]), TIPO_DE_CARTA.bolsa, 0), D, 0)).toEqual({
      icone: 'bolsa',
      nome: { id: 'A10.LEVELUP.BOLSA_DE_ALMAS_NOME' },
      etiqueta: null,
      funcional: { id: 'A10.LEVELUP.BOLSA_DE_ALMAS_EFEITO' },
      rodape: null,
      completaUniao: false,
    });
  });

  it('melhoria de passiva: "Nível N" e o efeito; arma nova: "Novo", NV1 e a lore', () => {
    const m = conteudoDaCarta(carta(estadoDe([[ESPADA, 1]], [[LUVAS, 2]]), TIPO_DE_CARTA.melhoriaDePassiva, LUVAS), D, 0);
    expect(m).toEqual({
      icone: 'luvas',
      nome: { id: 'F3.LUVAS_DE_FOLE.NOME' },
      etiqueta: { id: 'A10.LEVELUP.NIVEL', params: { nivel: 3 } },
      funcional: { id: 'F3.LUVAS_DE_FOLE.EFEITO' },
      rodape: { id: 'F3.LUVAS_DE_FOLE.LORE' },
      completaUniao: false,
    });
    const n = conteudoDaCarta(carta(estadoDe([[ESPADA, 1]]), TIPO_DE_CARTA.armaNova, FACAS), D, 0);
    expect(n).toEqual({
      icone: 'facas',
      nome: { id: 'F1.FACAS_DE_SAL.NOME' },
      etiqueta: { id: 'A10.LEVELUP.NOVO' },
      funcional: { id: 'F1.FACAS_DE_SAL.NV1' },
      rodape: { id: 'F1.FACAS_DE_SAL.LORE' },
      completaUniao: false,
    });
  });

  it('melhoria de arma: "Nível N" com o nível alvo e o NV do alvo', () => {
    const c = conteudoDaCarta(carta(estadoDe([[ESPADA, 3]]), TIPO_DE_CARTA.melhoriaDeArma, ESPADA), D, 0);
    expect([c.etiqueta, c.funcional.id]).toEqual([{ id: 'A10.LEVELUP.NIVEL', params: { nivel: 4 } }, 'F1.ESPADA_LONGA_DO_JURAMENTO.NV4']);
  });

  it('todo id de texto devolvido existe no pt-BR.json e o texto resolve', () => {
    const casos: Estado[] = [
      carta(estadoDe([[ESPADA, 8]]), TIPO_DE_CARTA.passivaNova, ELMO),
      carta(estadoDe([[ESPADA, 7]], [[ELMO, 1]]), TIPO_DE_CARTA.melhoriaDeArma, ESPADA),
      carta(estadoDe([[ESPADA, 1]]), TIPO_DE_CARTA.bolsa, 0),
      carta(estadoDe([[ESPADA, 1]]), TIPO_DE_CARTA.armaNova, FACAS),
    ];
    for (const e of casos) {
      const c = conteudoDaCarta(e, D, 0);
      for (const x of [c.nome, c.etiqueta, c.funcional, c.rodape]) {
        if (!x) continue;
        expect(IDS.has(x.id), x.id).toBe(true);
        for (const id of Object.values(x.textosNosParams ?? {})) expect(IDS.has(id), id).toBe(true);
      }
    }
    expect(t('A10.LEVELUP.NIVEL', { nivel: 8 })).toMatch(/8/);
  });
});

describe('completaUniao', () => {
  it('só com a Espada no nível da União e a passiva; o resultado é a Lâmina', () => {
    const lamina = 4;
    const nova = (nivel: number, passivas: [number, number][] = []) => completaUniao(estadoDe([[ESPADA, nivel]], passivas), D, TIPO_DE_CARTA.passivaNova, ELMO);
    expect([nova(8), nova(8, [[LUVAS, 1]])]).toEqual([lamina, lamina]);
    expect([nova(7), nova(1)]).toEqual([0, 0]);
    const melhoria = (nivel: number, passivas: [number, number][]) => completaUniao(estadoDe([[ESPADA, nivel]], passivas), D, TIPO_DE_CARTA.melhoriaDeArma, ESPADA);
    expect([melhoria(7, [[ELMO, 1]]), melhoria(7, []), melhoria(6, [[ELMO, 1]]), melhoria(8, [[ELMO, 1]])]).toEqual([lamina, 0, 0, 0]);
    // Outra passiva ou outra arma não completam.
    expect(completaUniao(estadoDe([[ESPADA, 8]]), D, TIPO_DE_CARTA.passivaNova, LUVAS)).toBe(0);
    expect(completaUniao(estadoDe([[ESPADA, 7]], [[ELMO, 1]]), D, TIPO_DE_CARTA.melhoriaDeArma, FACAS)).toBe(0);
  });
});

describe('linhasDoBau', () => {
  it('baú com a União: uma linha, com o ícone do resultado e o nome da Lâmina; sem nível', () => {
    const e = estadoDe([[ESPADA, 8]], [[ELMO, 1]]);
    e.filaDeBaus[BAU.uniao] = 1;
    expect(linhasDoBau(e, D)).toEqual([
      { icone: 'lamina', nome: { id: 'A10.BAU.UNIAO', textosNosParams: { uniao: 'F2.LAMINA_DO_JURAMENTO_ETERNO.NOME' } }, nivel: null },
    ]);
  });

  it('baú com itens: uma linha por item, na ordem, com o nível; a Bolsa não tem nível', () => {
    const e = estadoDe([[ESPADA, 1]]);
    const f = e.filaDeBaus;
    f[BAU.itens] = 3;
    f[BAU.categoria] = CATEGORIA_DE_ITEM.arma;
    f[BAU.codigo] = FACAS;
    f[BAU.nivel] = 2;
    f[BAU.categoria + 1] = CATEGORIA_DE_ITEM.passiva;
    f[BAU.codigo + 1] = LUVAS;
    f[BAU.nivel + 1] = 3;
    f[BAU.categoria + 2] = CATEGORIA_DE_ITEM.bolsa;
    expect(linhasDoBau(e, D)).toEqual([
      { icone: 'facas', nome: { id: 'F1.FACAS_DE_SAL.NOME' }, nivel: { id: 'A10.LEVELUP.NIVEL', params: { nivel: 2 } } },
      { icone: 'luvas', nome: { id: 'F3.LUVAS_DE_FOLE.NOME' }, nivel: { id: 'A10.LEVELUP.NIVEL', params: { nivel: 3 } } },
      { icone: 'bolsa', nome: { id: 'A10.LEVELUP.BOLSA_DE_ALMAS_NOME' }, nivel: null },
    ]);
  });

  it('baú sem itens nem União: nenhuma linha', () => {
    expect(linhasDoBau(estadoDe([[ESPADA, 1]]), D)).toEqual([]);
  });
});

describe('geometria das cartas (R6)', () => {
  const IPHONE: Insets = { ...insetsZerados(), topo: 59, baixo: 34 };

  it('constantes: 342 × 152, 12 entre, 24 de margem', () => {
    expect(CARTA_DO_MODAL).toEqual({ largura: 342, altura: 152, entre: 12, margemLateral: 24, margemBaixo: 24 });
  });

  it('insets zerados (390 × 844): três cartas empilhadas, a última a 24 pt do fundo', () => {
    const c = alvosDasCartas(insetsZerados(), []);
    expect(c.map((a) => [a.id, a.x, a.y, a.largura, a.altura])).toEqual([
      ['carta0', 24, 340, 342, 152],
      ['carta1', 24, 504, 342, 152],
      ['carta2', 24, 668, 342, 152],
    ]);
  });

  it('insets do iPhone (59 em cima, 34 embaixo): sobem 34 pt, mesmo tamanho e espaçamento', () => {
    const c = alvosDasCartas(IPHONE, []);
    expect(c.map((a) => [a.x, a.y, a.largura, a.altura])).toEqual([
      [24, 306, 342, 152],
      [24, 470, 342, 152],
      [24, 634, 342, 152],
    ]);
    expect(c[2]!.y + c[2]!.altura).toBe(844 - 34 - 24);
  });

  it('largura útil estreita: a carta encolhe (390 − 80 − 48 = 262), com o piso do alvo mínimo, e fica centrada', () => {
    const c = alvosDasCartas({ ...insetsZerados(), esquerda: 40, direita: 40 }, []);
    expect([c[0]!.largura, c[0]!.x]).toEqual([262, 64]);
    const m = alvosDasCartas({ ...insetsZerados(), esquerda: 170, direita: 170 }, []);
    expect(m[0]!.largura).toBe(ALVO_MINIMO_PT);
  });
});
