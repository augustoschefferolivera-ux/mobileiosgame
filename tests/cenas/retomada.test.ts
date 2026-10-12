// A retomada do Acender (design/decisoes-F-008.md SV5, SV6): a oferta com o estado carregado, a disposição diferente como
// Recusar sem oferta, a Vigília já encerrada, o save de build mais novo, e Recusar com o meta antes das remoções.
import { describe, expect, it } from 'vitest';
import { CENARIO, FOGUEIRA_U32, PROGRESSAO, criarEstado, hashEstado, type Estado } from '../../src/logica/nucleo/estado';
import { avancar } from '../../src/logica/nucleo/passo';
import { metaPadrao, type Meta } from '../../src/logica/save/meta';
import { hashDosBytes } from '../../src/logica/save/vigilia';
import { ArmazenamentoDoMeta } from '../../src/plataforma/armazenamento';
import { ArmazenamentoDaVigilia, CHAVE_DA_VIGILIA, CHAVE_DO_ANDAMENTO, GravadorDaVigilia, type ArmazenamentoRemovivel } from '../../src/plataforma/vigiliaGuardada';
import { lerOferta, recusarOferta } from '../../src/cenas/retomada';
import { DADOS_DA_CHARNECA as D, DADOS_SEM_OBSTACULOS, PARADO } from '../logica/apoio';

class Falso implements ArmazenamentoRemovivel {
  readonly dados = new Map<string, string>();
  readonly chamadas: string[] = [];
  getItem(chave: string): string | null {
    return this.dados.get(chave) ?? null;
  }
  setItem(chave: string, valor: string): void {
    this.chamadas.push(`set ${chave}`);
    this.dados.set(chave, valor);
  }
  removeItem(chave: string): void {
    this.chamadas.push(`remove ${chave}`);
    this.dados.delete(chave);
  }
}

/** Uma Vigília de id 1 com `vigilia` do passo 500 e `andamento`, guardados num armazenamento falso. */
function guardada(): { f: Falso; vig: ArmazenamentoDaVigilia; armMeta: ArmazenamentoDoMeta; e: Estado } {
  const f = new Falso();
  const vig = new ArmazenamentoDaVigilia(f);
  const e = criarEstado(1, D, { cenario: CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel, almasIniciais: 300 });
  e.fogueiraU32[FOGUEIRA_U32.idVigilia] = 1;
  avancar(e, D, PARADO, 500);
  const g = new GravadorDaVigilia(vig, e, D.combate.autosavePassos);
  g.gravarVigilia(e);
  g.salvarAndamento(e);
  f.chamadas.length = 0;
  return { f, vig, armMeta: new ArmazenamentoDoMeta(f), e };
}

describe('lerOferta (SV5)', () => {
  it('sem save, não há oferta', () => {
    const f = new Falso();
    expect(lerOferta(new ArmazenamentoDaVigilia(f), metaPadrao(), () => D, 1, () => undefined)).toBeNull();
  });

  it('com save válido, devolve o estado carregado (hash igual ao gravado) e o resumo', () => {
    const { vig, e } = guardada();
    const o = lerOferta(vig, metaPadrao(), () => D, 1, () => undefined)!;
    expect(o).not.toBeNull();
    expect(hashDosBytes(o.estado.bytes)).toBe(hashDosBytes(e.bytes));
    expect(hashEstado(o.estado)).toBe(hashEstado(e));
    expect(o.envelope).toMatchObject({ idVigilia: 1, hora: 0, almas: 300 });
    expect(o.andamento?.idVigilia).toBe(1);
  });

  it('a Vigília já encerrada (ultimaEncerrada = id) não é oferecida e os saves saem', () => {
    const { f, vig } = guardada();
    const meta: Meta = { ...metaPadrao(), ultimaEncerrada: 1 };
    expect(lerOferta(vig, meta, () => D, 1, () => undefined)).toBeNull();
    expect(f.dados.has(CHAVE_DA_VIGILIA)).toBe(false);
  });

  it('disposição diferente (SV6): sem oferta; o meta leva as Almas × 0,5, ultimaEncerrada = id, e só então os saves saem', () => {
    const { f, vig } = guardada();
    const gravados: Meta[] = [];
    const o = lerOferta(vig, metaPadrao(), () => DADOS_SEM_OBSTACULOS, 1, (m) => {
      expect(f.dados.has(CHAVE_DA_VIGILIA), 'o meta vai antes da remoção').toBe(true);
      gravados.push(m);
    });
    expect(o).toBeNull();
    expect(gravados).toHaveLength(1);
    expect(gravados[0]).toMatchObject({ almas: 150, ultimaEncerrada: 1, vigiliasConcluidas: 1 });
    expect(f.dados.has(CHAVE_DA_VIGILIA)).toBe(false);
    expect(f.dados.has(CHAVE_DO_ANDAMENTO)).toBe(false);
  });
});

describe('Recusar com o meta que não foi gravado (cota)', () => {
  it('recusarOferta: o vigilia e o andamento ficam; a disposição diferente com gravarMeta false também mantém os saves', () => {
    const a = guardada();
    const sem = new ArmazenamentoDoMeta({ getItem: () => null, setItem: () => { throw new Error('cota'); } });
    const o = lerOferta(a.vig, metaPadrao(), () => D, 1, () => undefined)!;
    const novo = recusarOferta(o, D, metaPadrao(), sem, a.vig);
    expect(novo).toMatchObject({ almas: 150, ultimaEncerrada: 1 });
    expect(a.f.dados.has(CHAVE_DA_VIGILIA)).toBe(true);
    expect(a.f.dados.has(CHAVE_DO_ANDAMENTO)).toBe(true);
    const b = guardada();
    expect(lerOferta(b.vig, metaPadrao(), () => DADOS_SEM_OBSTACULOS, 1, () => false)).toBeNull();
    expect(b.f.dados.has(CHAVE_DA_VIGILIA)).toBe(true);
  });
});

describe('recusarOferta (PE4, SV4, Q-03)', () => {
  it('Abandonar no estado carregado: metade das Almas, ultimaEncerrada = id, meta gravado antes de remover', () => {
    const { f, vig, armMeta } = guardada();
    const meta = metaPadrao();
    const o = lerOferta(vig, meta, () => D, 1, () => undefined)!;
    const novo = recusarOferta(o, D, meta, armMeta, vig);
    expect(novo).toMatchObject({ almas: 150, ultimaEncerrada: 1 });
    expect(o.estado.progresso[PROGRESSAO.almas]).toBe(300);
    expect(f.chamadas.slice(0, 3)).toEqual(['set vdc.meta', `remove ${CHAVE_DA_VIGILIA}`, `remove ${CHAVE_DO_ANDAMENTO}`]);
  });
});
