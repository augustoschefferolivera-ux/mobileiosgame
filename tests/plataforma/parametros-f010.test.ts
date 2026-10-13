// ?santuario=1 (SN4) e ?fundacao=a,f,c,b,m (FD12) em lerParametros, o destino da Tela de Acender e os parâmetros de debug da Fundação.
import { describe, expect, it } from 'vitest';
import { acenderVaiDiretoAVigilia } from '../../src/cenas/modeloDoSantuario';
import { criarEstado } from '../../src/logica/nucleo/estado';
import { NO, parametrosDaFundacao, parametrosDaFundacaoDeDebug } from '../../src/logica/progressao/fundacao';
import { metaPadrao } from '../../src/logica/save/meta';
import { lerParametros } from '../../src/plataforma/parametros';
import { DADOS_SEM_OBSTACULOS as D } from '../logica/apoio';

describe('?santuario e ?fundacao', () => {
  it('?santuario=1 vale só no build de debug', () => {
    expect(lerParametros('?santuario=1', true).santuario).toBe(true);
    expect(lerParametros('?santuario=0', true).santuario).toBe(false);
    expect(lerParametros('?santuario=1&fundacao=1,1,1,1,1', false)).toMatchObject({ santuario: false, fundacao: null });
  });

  it('?fundacao lê cinco ranks de 0 ao máximo do nó; qualquer outra forma é ignorada', () => {
    expect(lerParametros('?fundacao=5,5,3,3,3', true).fundacao).toEqual([5, 5, 3, 3, 3]);
    expect(lerParametros('?fundacao=0,0,0,0,0', true).fundacao).toEqual([0, 0, 0, 0, 0]);
    for (const ruim of ['', '1,2,3', '1,2,3,4', '6,0,0,0,0', '0,0,4,0,0', '0,0,0,0,4', 'a,b,c,d,e', '1,2,3,4,5,6', '-1,0,0,0,0']) {
      expect(lerParametros(`?fundacao=${ruim}`, true).fundacao, ruim).toBeNull();
    }
    expect(lerParametros('', true).fundacao).toBeNull();
  });
});

describe('destino da Tela de Acender (SN2, SN3, SN4)', () => {
  it('Acender vai ao Santuário; ?cenario ou ?inicio vão direto, a menos que ?santuario=1; Continuar vai sempre direto', () => {
    expect(acenderVaiDiretoAVigilia('acender', false, null, null)).toBe(false);
    expect(acenderVaiDiretoAVigilia('acender', false, 'tres_armas', null)).toBe(true);
    expect(acenderVaiDiretoAVigilia('acender', false, null, 68_400)).toBe(true);
    expect(acenderVaiDiretoAVigilia('acender', true, null, 68_400)).toBe(false);
    expect(acenderVaiDiretoAVigilia('acender', true, 'tres_armas', 0)).toBe(false);
    expect(acenderVaiDiretoAVigilia('continuar', false, null, null)).toBe(true);
    expect(acenderVaiDiretoAVigilia('continuar', true, null, null)).toBe(true);
  });
});

describe('parâmetros da Fundação de debug (FD12)', () => {
  it('Pele, Fôlego, Casco, Bigorna e Mãos: os mesmos parâmetros que o meta com esses ranks daria, sem gravar nada', () => {
    const m = metaPadrao();
    const ranks = [...m.fundacao.ranks];
    [ranks[NO.pele], ranks[NO.folego], ranks[NO.casco], ranks[NO.bigorna], ranks[NO.maos]] = [5, 5, 3, 3, 2];
    expect(parametrosDaFundacaoDeDebug([5, 5, 3, 3, 2])).toEqual(parametrosDaFundacao({ ...m, fundacao: { ranks, gasto: 1 } }));
    expect(m.fundacao.ranks.every((r) => r === 0)).toBe(true);
  });

  it('entra no estado e no hash: os ranks 0 dão os bytes de sempre e 5, 5, 3, 3, 0 mudam o estado', () => {
    const zero = criarEstado(1, D, parametrosDaFundacaoDeDebug([0, 0, 0, 0, 0]));
    const base = criarEstado(1, D, {});
    expect(Buffer.from(zero.bytes).equals(Buffer.from(base.bytes))).toBe(true);
    const cheio = criarEstado(1, D, parametrosDaFundacaoDeDebug([5, 5, 3, 3, 0]));
    expect(Buffer.from(cheio.bytes).equals(Buffer.from(base.bytes))).toBe(false);
  });
});
