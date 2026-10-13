// Santuário e árvore (design/decisoes-F-010.md SN1, FD1, FD2, FD9, GA2, PW3), sem Phaser: o modelo puro e os alvos.
import { describe, expect, it } from 'vitest';
import { ALVO_MINIMO_PT, alvosDaArvore, alvosDoSantuario, medidasDaArvore, type Alvo } from '../../src/entrada/alvos';
import { abrirArvore, detalheDoNo, entrarNoSantuario, fecharArvore, iseldaApresenta, recusarConvite, tocarNo, tocarReembolsar } from '../../src/cenas/santuario';
import { NO } from '../../src/logica/progressao/fundacao';
import { MARCO, metaPadrao, type Meta } from '../../src/logica/save/meta';
import { ALTURA_LOGICA, insetsZerados } from '../../src/plataforma/safeArea';
import { t } from '../../src/cenas/textos';

const com = (m: Partial<Meta>): Meta => ({ ...metaPadrao(), ...m });
const rico = (almas = 3000) => com({ almas, primeiroApagarFeito: true, vigiliasConcluidas: 1 });

describe('chegada ao Santuário (GA2, PW3)', () => {
  it('sem Vigília nenhuma: árvore fechada, sem Iselda e sem convite', () => {
    const e = entrarNoSantuario(metaPadrao(), false);
    expect([e.arvoreAberta, e.falaDeIselda, e.conviteAberto, e.selecionado]).toEqual([false, false, false, null]);
  });

  it('depois do 1º Apagar: a árvore abre sozinha com Fôlego de forja selecionado e a fala; o convite espera', () => {
    const e = entrarNoSantuario(rico(), false);
    expect([e.arvoreAberta, e.falaDeIselda, e.selecionado, e.conviteAberto]).toEqual([true, true, NO.folego, false]);
    expect(t('A9.SANTUARIO.ISELDA_FALA_01').length).toBeGreaterThan(0);
  });

  it('o Amanhecer (Brasa 1) também apresenta; Abandonar sozinho não', () => {
    expect(iseldaApresenta(com({ brasas: 1, vigiliasConcluidas: 1 }))).toBe(true);
    expect(iseldaApresenta(com({ vigiliasConcluidas: 1 }))).toBe(false);
  });

  it('com o marco de Iselda visto, a chegada mostra o convite (fora do modo instalado) e não a árvore', () => {
    const m = com({ ...rico(), marcos: MARCO.iselda });
    expect(entrarNoSantuario(m, false).conviteAberto).toBe(true);
    expect(entrarNoSantuario(m, true).conviteAberto).toBe(false);
    expect(entrarNoSantuario(m, false).arvoreAberta).toBe(false);
  });

  it('"Agora não" grava conviteRecusadoEm e o convite some', () => {
    const m = com({ ...rico(), marcos: MARCO.iselda });
    const e = entrarNoSantuario(m, false);
    const novo = recusarConvite(m, e);
    expect([e.conviteAberto, novo.conviteRecusadoEm, novo.seq]).toEqual([false, 1, m.seq + 1]);
  });
});

describe('compra em dois toques (FD2) e reembolso em dois toques (FD9)', () => {
  it('o 1º toque seleciona e não muda o meta; o 2º compra (Almas − 300, rank 1, gasto 300, seq + 1) e liga o marco de Iselda', () => {
    const m0 = rico();
    const e = entrarNoSantuario(m0, false);
    const m1 = tocarNo(m0, e, NO.folego);
    expect(m1).toBe(m0);
    const m2 = tocarNo(m1, e, NO.folego);
    expect([m2.almas, m2.fundacao.ranks[NO.folego], m2.fundacao.gasto, m2.seq, m2.marcos & MARCO.iselda]).toEqual([2700, 1, 300, m0.seq + 1, MARCO.iselda]);
    expect(e.falaDeIselda).toBe(false);
  });

  it('tocar noutro nó só troca a seleção', () => {
    const m = rico();
    const e = entrarNoSantuario(com({ ...m, marcos: MARCO.iselda }), false);
    abrirArvore(e);
    tocarNo(m, e, NO.casco);
    expect(e.selecionado).toBe(NO.casco);
    expect(tocarNo(m, e, NO.pele)).toBe(m);
    expect(e.selecionado).toBe(NO.pele);
  });

  it('sem Almas recusa sem débito e marca sem_almas; nó bloqueado recusa com Almas de sobra', () => {
    const m = rico(299);
    const e = entrarNoSantuario(m, false);
    tocarNo(m, e, NO.folego);
    expect(tocarNo(m, e, NO.folego)).toBe(m);
    expect(e.recusa).toBe('sem_almas');
    expect(t('A9.SANTUARIO.SEM_ALMAS').length).toBeGreaterThan(0);
    const r = rico(9999);
    const e2 = entrarNoSantuario(r, false);
    tocarNo(r, e2, NO.martelo);
    expect(tocarNo(r, e2, NO.martelo)).toBe(r);
    expect(e2.recusa).toBe('bloqueado');
  });

  it('Reembolsar: desabilitado sem gasto; o 1º toque arma, o 2º devolve tudo; tocar num nó desarma', () => {
    const m0 = rico();
    const e = entrarNoSantuario(m0, false);
    expect(tocarReembolsar(m0, e)).toBe(m0);
    expect(e.reembolsoArmado).toBe(false);
    let m = m0;
    for (let i = 0; i < 3; i++) m = tocarNo(m, e, NO.folego); // seleciona, compra, compra
    expect(m.fundacao.ranks[NO.folego]).toBe(2);
    expect(tocarReembolsar(m, e)).toBe(m);
    expect(e.reembolsoArmado).toBe(true);
    tocarNo(m, e, NO.casco);
    expect(e.reembolsoArmado).toBe(false);
    tocarReembolsar(m, e);
    const r = tocarReembolsar(m, e);
    expect([r.almas, r.fundacao.gasto, r.fundacao.ranks.every((x) => x === 0), r.seq]).toEqual([3000, 0, true, m.seq + 1]);
  });

  it('fechar a árvore liga o marco', () => {
    const m = rico();
    const e = entrarNoSantuario(m, false);
    const novo = fecharArvore(m, e);
    expect([novo.marcos & MARCO.iselda, e.arvoreAberta, e.falaDeIselda]).toEqual([MARCO.iselda, false, false]);
  });
});

describe('detalhe do nó (FD1)', () => {
  it('Fôlego de forja com 3.000 Almas: rank 0/5, custo 300; depois de comprar, o custo sobe com G', () => {
    const d = detalheDoNo(rico(), NO.folego);
    expect([d.rank, d.maximo, d.custo, d.bloqueado]).toEqual([0, 5, 300, false]);
    expect(t(d.nomeId)).toBe('Fôlego de forja');
    const m = com({ ...rico(), fundacao: { ranks: [0, 0, 1, 0, 0, 0, 0, 0], gasto: 300 } });
    expect(detalheDoNo(m, NO.folego).custo).toBe(341 + 0 * 1);
  });

  it('os nós bloqueados não têm preço', () => {
    for (const i of [NO.martelo, NO.pes, NO.ferro]) expect([detalheDoNo(rico(), i).custo, detalheDoNo(rico(), i).bloqueado]).toEqual([null, true]);
  });
});

describe('alvos (SN1, FD1) em 390 × 844', () => {
  it('Santuário: o botão Vigília e Iselda a ≥ 72 pt; a grade da árvore cabe com insets 47/34', () => {
    const ins = { topo: 47, direita: 0, baixo: 34, esquerda: 0 };
    const s: Alvo[] = alvosDoSantuario(ins, []);
    expect(s.map((a) => a.id)).toEqual(['vigilia', 'iselda']);
    expect(s[0]!.y + s[0]!.altura).toBeLessThanOrEqual(ALTURA_LOGICA - 34);
    const m = medidasDaArvore(ins);
    expect(m.linha).toBe(96);
    expect(m.painelAltura).toBeGreaterThanOrEqual(150);
    const a = alvosDaArvore(ins, []);
    expect(a).toHaveLength(10);
    for (const x of a) expect([x.largura >= ALVO_MINIMO_PT, x.altura >= ALVO_MINIMO_PT]).toEqual([true, true]);
  });

  it('sem insets nada muda de forma; alvos não se sobrepõem', () => {
    const a = alvosDaArvore(insetsZerados(), []);
    for (let i = 0; i < a.length; i++)
      for (let j = i + 1; j < a.length; j++) {
        const [p, q] = [a[i]!, a[j]!];
        expect(p.x < q.x + q.largura && q.x < p.x + p.largura && p.y < q.y + q.altura && q.y < p.y + p.altura, `${p.id} × ${q.id}`).toBe(false);
      }
  });
});
