// Mãos de aprendiz (design/decisoes-F-010.md FD7; F-010.8; Q-18): a Espada Longa começa no nível 1 + rank (máx. 4) pela lista
// `armas` dos parâmetros; rank 0 deixa `armas` nulo (o hash de sempre); a União não muda.
import { describe, expect, it } from 'vitest';
import { ARMA } from '../../../src/logica/armas/tabela';
import { TIPO_DE_CARTA, criarEstado, hashEstado } from '../../../src/logica/nucleo/estado';
import { parametrosDaFundacao, NO } from '../../../src/logica/progressao/fundacao';
import { completaUniao } from '../../../src/logica/progressao/oferta';
import { metaPadrao, type Meta } from '../../../src/logica/save/meta';
import { D, ELMO, ESPADA, LAMINA, estadoDe } from '../progressao/apoio';

function metaComMaos(r: number): Meta {
  const m = metaPadrao();
  const ranks = [...m.fundacao.ranks];
  ranks[NO.maos] = r;
  return { ...m, fundacao: { ...m.fundacao, ranks } };
}

describe('Mãos de aprendiz pelos parâmetros (FD7)', () => {
  it('r = 0: armas nulo e o mesmo hash dos parâmetros sem Fundação; r = 1, 2, 3: Espada nv 2, 3, 4 na vaga 0', () => {
    expect(parametrosDaFundacao(metaComMaos(0)).armas).toBeNull();
    expect(hashEstado(criarEstado(1, D, { ...parametrosDaFundacao(metaComMaos(0)) }))).toBe(hashEstado(criarEstado(1, D, {})));
    for (const [r, nivel] of [[1, 2], [2, 3], [3, 4]] as const) {
      const p = parametrosDaFundacao(metaComMaos(r));
      expect(p.armas).toEqual([{ codigo: ARMA.espada_longa_do_juramento, nivel }]);
      const e = criarEstado(1, D, { ...p });
      expect([e.build.codigo[0], e.build.nivel[0]]).toEqual([ESPADA, nivel]);
    }
  });

  it('r = 3 não passa do nível 4 e rank de meta acima do máximo não passa do nível 4', () => {
    expect(parametrosDaFundacao(metaComMaos(3)).armas![0]!.nivel).toBe(4);
    expect(parametrosDaFundacao(metaComMaos(9)).armas![0]!.nivel).toBe(4);
  });

  it('os ranks de Pele, Fôlego, Casco e Bigorna saem na ordem do estado', () => {
    const m = metaPadrao();
    const ranks = [...m.fundacao.ranks];
    ranks[NO.pele] = 2;
    ranks[NO.folego] = 3;
    ranks[NO.casco] = 1;
    ranks[NO.bigorna] = 3;
    expect(parametrosDaFundacao({ ...m, fundacao: { ...m.fundacao, ranks } }).fundacao).toEqual({ pele: 2, folego: 3, casco: 1, bigorna: 3 });
  });

  it('a União não é afetada: com Espada nv 4 o Elmo novo não completa; com nv 8 completa, como com r = 0', () => {
    const com4 = estadoDe([[ESPADA, 4]]);
    expect(completaUniao(com4, D, TIPO_DE_CARTA.passivaNova, ELMO)).toBe(0);
    const com8 = estadoDe([[ESPADA, 8]]);
    expect(completaUniao(com8, D, TIPO_DE_CARTA.passivaNova, ELMO)).toBe(LAMINA);
    const comMelhoria = estadoDe([[ESPADA, 7]], [[ELMO, 1]]);
    expect(completaUniao(comMelhoria, D, TIPO_DE_CARTA.melhoriaDeArma, ESPADA)).toBe(LAMINA);
    expect(completaUniao(estadoDe([[ESPADA, 4]], [[ELMO, 1]]), D, TIPO_DE_CARTA.melhoriaDeArma, ESPADA)).toBe(0);
  });
});

describe('marcos e convite no meta (MT1, PW3)', () => {
  it('comMarco soma bits sem repetir e só avança o seq quando muda; comConviteRecusado guarda as Vigílias concluídas', async () => {
    const { MARCO, comConviteRecusado, comMarco } = await import('../../../src/logica/save/meta');
    const m = metaPadrao();
    const a = comMarco(m, MARCO.iselda);
    expect([a.marcos, a.seq]).toEqual([2, 1]);
    expect(comMarco(a, MARCO.iselda)).toBe(a);
    expect(comMarco(a, MARCO.balaoCinzas).marcos).toBe(3);
    const c = comConviteRecusado({ ...a, vigiliasConcluidas: 4 });
    expect([c.conviteRecusadoEm, c.seq]).toEqual([4, 2]);
  });
});
