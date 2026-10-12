// Estado v4, anel de eventos, morte, ordem do passo, RNG e NaN
// (design/decisoes-F-004.md §3 e §4).
import { describe, expect, it } from 'vitest';
import { liberarProjetil, rodarArmas } from '../../../src/logica/armas/armas';
import { ARMA } from '../../../src/logica/armas/tabela';
import {
  BYTES_DO_LAYOUT_4,
  BYTES_DO_LAYOUT_5,
  BYTES_DO_LAYOUT_6,
  BYTES_DO_LAYOUT_7,
  BYTES_ESTADO,
  CAPACIDADE_DE_PROJETEIS,
  CENARIO,
  JOGADOR_U8,
  LAYOUT,
  MUNDO,
  VERSAO_LAYOUT,
  baseDoFluxo,
  criarEstado,
  esvaziarBuild,
  hashEstado,
} from '../../../src/logica/nucleo/estado';
import { CAPACIDADE_DO_ANEL, CAUSA, EVENTO, FLAG, FLOATS_DO_EVENTO, FORMA, LeitorDeEventos, gravarEvento } from '../../../src/logica/nucleo/eventos';
import { verificarNaN } from '../../../src/logica/nucleo/nan';
import { avancar } from '../../../src/logica/nucleo/passo';
import { quantosAtivos } from '../../../src/logica/nucleo/pool';
import { matarInimigo, nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { aplicarRotacao } from '../../../src/logica/mundo/cenario';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA, DADOS_SEM_OBSTACULOS as D, PARADO } from '../apoio';
import { J, estadoCom, eventos, por, rel } from './apoio';

const E = ARMA.espada_longa_do_juramento;
const F = ARMA.facas_de_sal;
const C = ARMA.circulo_de_sal;

describe('layout v8 (o v4 da F-004, o v5 da F-005, o v6 da F-006 e o v7 da F-007 intactos no começo)', () => {
  it('versão 8, 76.788 bytes; os 42.988 do v4, os 67.488 do v5, os 74.636 do v6 e os 74.680 do v7 no mesmo lugar; cada seção em múltiplo de 4 e cada view alinhada à sua largura', () => {
    expect(VERSAO_LAYOUT).toBe(8);
    expect(BYTES_DO_LAYOUT_4).toBe(42988);
    expect(BYTES_DO_LAYOUT_5).toBe(67488);
    expect(BYTES_DO_LAYOUT_6).toBe(74636);
    expect(BYTES_DO_LAYOUT_7).toBe(74680);
    expect(BYTES_ESTADO).toBe(76788);
    expect(Object.values(LAYOUT).every((o) => o % 4 === 0)).toBe(true);
    const e = criarEstado(1, D);
    const views = [
      e.cab, e.rng, e.jogador, e.build.recarga, e.mundo, e.pool.livres, e.inimigos.x, e.projeteis.x, e.projeteis.ultimoAlvo, e.projeteis.vida,
      e.progresso, e.jogador2, e.mundo2, e.poolDePickups.livres, e.poolDePickups.geracao, e.pickups.x, e.pickups.valor,
      e.poolDeEfeitos.livres, e.efeitos.x, e.efeitos.bits,
    ];
    for (const v of views) expect(v.byteOffset % v.BYTES_PER_ELEMENT).toBe(0);
    expect(e.projeteis.salPassos.byteOffset + CAPACIDADE_DE_PROJETEIS).toBe(BYTES_DO_LAYOUT_4);
    expect(LAYOUT.progressao).toBe(BYTES_DO_LAYOUT_4);
    expect(e.efeitos.arma.byteOffset + e.efeitos.arma.length).toBe(BYTES_DO_LAYOUT_5);
    // Os donos dos projéteis fecham o v6, o bloco da F-007 fecha o v7 e o da F-008 fecha o buffer.
    expect(e.projeteis.donoGeracao.byteOffset + e.projeteis.donoGeracao.byteLength).toBe(BYTES_DO_LAYOUT_6);
    expect(e.jogador4U8.byteOffset + e.jogador4U8.byteLength).toBe(BYTES_DO_LAYOUT_7);
    expect(e.inimigos.convocaEspera.byteOffset + e.inimigos.convocaEspera.byteLength).toBe(BYTES_ESTADO);
  });

  it('a Vigília normal começa com a Espada nv1 na vaga 0, as outras vazias', () => {
    const e = criarEstado(1, D);
    expect([...e.build.codigo]).toEqual([E, 0, 0, 0, 0]);
    expect([...e.build.nivel]).toEqual([1, 0, 0, 0, 0]);
  });

  it('a build impossível é erro na montagem: 6 armas, nível 0 ou acima de 8, repetida, desconhecida ou a União', () => {
    const arma = (codigo: number, nivel: number) => ({ codigo, nivel });
    expect(() => criarEstado(1, D, { armas: [arma(1, 1), arma(2, 1), arma(3, 1), arma(1, 2), arma(2, 2), arma(3, 2)] })).toThrow();
    expect(() => criarEstado(1, D, { armas: [arma(1, 0)] })).toThrow(/nível/);
    expect(() => criarEstado(1, D, { armas: [arma(1, 9)] })).toThrow(/nível/);
    expect(() => criarEstado(1, D, { armas: [arma(2, 1), arma(2, 3)] })).toThrow(/repetida/);
    expect(() => criarEstado(1, D, { armas: [arma(9, 1)] })).toThrow(/desconhecida/);
    // A União entra numa build de teste (E6 da F-005) só no nível 1; a receita de cenário a recusa (tests/dados.test.ts).
    expect(() => criarEstado(1, D, { armas: [arma(ARMA.lamina_do_juramento_eterno, 2)] })).toThrow(/nível/);
    expect(criarEstado(1, D, { armas: [arma(ARMA.lamina_do_juramento_eterno, 1)] }).build.codigo[0]).toBe(ARMA.lamina_do_juramento_eterno);
  });
});

describe('anel de eventos (§4)', () => {
  it('fica fora do buffer: o hash não muda com o anel cheio ou vazio', () => {
    const e = criarEstado(1, D);
    expect(e.eventos.buffer).not.toBe(e.buffer);
    const antes = hashEstado(e);
    for (let k = 0; k < 2000; k++) gravarEvento(e.eventos, 1, EVENTO.acerto, 1, FORMA.ida, 3, 0, 1, 0, 0);
    expect(hashEstado(e)).toBe(antes);
  });

  it('1.500 eventos: ficam os 1.024 últimos, em ordem; um leitor atrasado conta 476 perdidos', () => {
    const e = criarEstado(1, D);
    const leitor = new LeitorDeEventos();
    for (let k = 0; k < 1500; k++) {
      FLOATS_DO_EVENTO[2] = k;
      gravarEvento(e.eventos, k, EVENTO.acerto, 1, FORMA.ida, 0, 0, 1, 0, 0);
    }
    const lidos = eventos(e);
    expect(lidos).toHaveLength(CAPACIDADE_DO_ANEL);
    expect(lidos[0]!.passo).toBe(476);
    expect(lidos.at(-1)!.f[2]).toBe(1499);
    expect(leitor.pendentes(e.eventos)).toBe(CAPACIDADE_DO_ANEL);
    expect(leitor.perdidos).toBe(476);
  });

  it('o handle do alvo é montado no gravador (geração × 65.536 + slot); sem alvo, 0xFFFFFFFF', () => {
    const e = criarEstado(1, D);
    gravarEvento(e.eventos, 7, EVENTO.acerto, 2, FORMA.faca, 499, 65535, 1, FLAG.matou, 0);
    gravarEvento(e.eventos, 7, EVENTO.golpe, 1, FORMA.ida, -1, 0, 0, 0, 0);
    const [a, b] = eventos(e);
    expect(a!.alvo).toBe(65535 * 65536 + 499);
    expect([a!.arma, a!.forma, a!.flags]).toEqual([2, FORMA.faca, FLAG.matou]);
    expect(b!.alvo).toBe(0xffffffff);
  });
});

describe('morte (M1 a M3) e remoções', () => {
  it('2 golpes da Espada nv1 matam o Oco do minuto 0 (12 HP) e 1 não; HP exatamente 0 conta como morto, 1e-7 não', () => {
    const e = estadoCom([[E, 1]]);
    const s = por(e, TIPO.oco_das_lanternas, 0, -40);
    rodarArmas(e, D);
    expect(e.pool.posicao[s]).toBeGreaterThanOrEqual(0);
    e.build.recarga[0] = 0;
    rodarArmas(e, D);
    expect(e.pool.posicao[s]).toBe(-1);
    expect(e.mundo[MUNDO.mortes]).toBe(1);
    for (const [hp, morre] of [
      [6.75, true],
      [6.75 + 1e-6, false],
    ] as const) {
      const f = estadoCom([[E, 1]]);
      const t = por(f, TIPO.oco_das_lanternas, 0, -40);
      f.inimigos.hp[t] = Math.fround(hp);
      rodarArmas(f, D);
      expect(f.pool.posicao[t]! < 0, `hp ${hp}`).toBe(morre);
    }
  });

  it('(T1 a) duas facas em voo tocam no mesmo passo um Oco de 1 HP: a do slot 0 mata, a do slot 1 não gasta acerto e segue', () => {
    const e = estadoCom([[F, 1]]);
    const alvo = por(e, TIPO.oco_das_lanternas, 0, -150);
    rodarArmas(e, D);
    expect(quantosAtivos(e.poolDeProjeteis)).toBe(2);
    const s = alvo;
    // As duas facas (−4 e +4 px) chegam juntas: o Oco fica no meio do caminho com 1 HP.
    e.inimigos.hp[s] = 1;
    e.build.recarga[0] = 54;
    let k = 0;
    while (e.pool.posicao[s]! >= 0 && k++ < 30) rodarArmas(e, D);
    const acertos = eventos(e).filter((v) => v.tipo === EVENTO.acerto);
    expect(acertos).toHaveLength(1);
    expect(acertos[0]!.flags & FLAG.matou).toBe(FLAG.matou);
    expect(eventos(e).filter((v) => v.tipo === EVENTO.morte)).toHaveLength(1);
    // A 2ª faca segue viva.
    expect(quantosAtivos(e.poolDeProjeteis)).toBe(1);
  });

  it('(T1 b) um Oco de 1 HP morto em 7b por uma faca não leva o golpe da Espada do mesmo passo; a faca (nv1) some', () => {
    const e = estadoCom([[E, 1], [F, 1]]);
    const s = por(e, TIPO.oco_das_lanternas, 0, -40);
    // Passo 1: a Espada golpeia (o Oco perde 6,75) e a salva sai; deixa só a 1ª faca.
    rodarArmas(e, D);
    const vivas: number[] = [];
    for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) if (e.poolDeProjeteis.posicao[p]! >= 0) vivas.push(p);
    for (const p of vivas.slice(1)) liberarProjetil(e, p);
    e.inimigos.hp[s] = 1;
    // A faca (6,4 px por passo) toca o Oco a 40 px no 3º voo: (40 − 24) / 6,4 = 2,5. Sem golpe nos 2 primeiros.
    e.build.recarga[0] = 50;
    rodarArmas(e, D);
    rodarArmas(e, D);
    expect(e.inimigos.hp[s]).toBe(1);
    const desde = eventos(e).length;
    e.build.recarga[0] = 0;
    rodarArmas(e, D);
    const novos = eventos(e, desde);
    expect(novos.filter((v) => v.tipo === EVENTO.golpe)).toHaveLength(1);
    expect(novos.filter((v) => v.tipo === EVENTO.acerto).map((v) => v.forma)).toEqual([FORMA.faca]);
    expect(novos.filter((v) => v.tipo === EVENTO.morte).map((v) => v.slot)).toEqual([s]);
    expect(quantosAtivos(e.poolDeProjeteis)).toBe(0);
  });

  it('M1 na aura: um Oco de 1 HP morto pela Espada (vaga 0) dentro da aura (vaga 1) leva 1 acerto e nenhum tick', () => {
    const e = estadoCom([[E, 1], [C, 1]]);
    const s = por(e, TIPO.oco_das_lanternas, 0, -40);
    e.inimigos.hp[s] = 1;
    rodarArmas(e, D);
    const acertos = eventos(e).filter((v) => v.tipo === EVENTO.acerto && v.slot === s);
    expect(acertos.map((v) => [v.forma, v.flags])).toEqual([[FORMA.ida, FLAG.matou]]);
    expect(eventos(e).filter((v) => v.tipo === EVENTO.morte).map((v) => v.slot)).toEqual([s]);
  });

  it('M1 na salva: com o mais próximo morto pela Espada no mesmo passo, as facas vão ao 2º candidato', () => {
    const e = estadoCom([[E, 1], [F, 1]]);
    const morto = por(e, TIPO.oco_das_lanternas, 0, -40);
    por(e, TIPO.oco_das_lanternas, 0, 100);
    e.inimigos.hp[morto] = 1;
    rodarArmas(e, D);
    const vivas: number[] = [];
    for (let p = 0; p < CAPACIDADE_DE_PROJETEIS; p++) if (e.poolDeProjeteis.posicao[p]! >= 0) vivas.push(p);
    expect(vivas).toHaveLength(2);
    // As duas para baixo, para o Oco vivo; nenhuma para o morto, que ficou acima.
    expect(vivas.every((p) => e.projeteis.vy[p]! > 0)).toBe(true);
  });

  it('um alvo de HP alto atingido pela Espada e pela aura no mesmo passo perde a soma', () => {
    const e = estadoCom([[E, 1], [C, 1]]);
    const s = por(e, TIPO.oco_grande, 0, -48);
    rodarArmas(e, D);
    expect(e.inimigos.hp[s]).toBe(Math.fround(Math.fround(100 - 6.75) - 0.75));
  });

  it('M2: o Oco morto no passo não encosta no jogador nesse passo (armas antes do contato)', () => {
    const e = estadoCom([[E, 1]], D, { cenario: CENARIO.diretorDesligado });
    const s = por(e, TIPO.oco_das_lanternas, 0, -32);
    e.inimigos.hp[s] = 1;
    const hp = e.jogador[0 + 6]!;
    avancar(e, D, PARADO, 1);
    expect(e.pool.posicao[s]).toBe(-1);
    expect(e.jogador[6]).toBe(hp);
    expect(e.jogadorU8[JOGADOR_U8.invulContato]).toBe(0);
  });

  it('M3 (RS4): matar um convertido por arma soma 10 em mortes e grava 1 morte com a flag convertido; a rotação não mexe em mortes', () => {
    const e = estadoCom([]);
    const s = nascerInimigo(e, D, TIPO.oco_grande, J.x, J.y - 300, true);
    matarInimigo(e, D, s, CAUSA.arma);
    expect(e.mundo[MUNDO.mortes]).toBe(10);
    const [m] = eventos(e).filter((v) => v.tipo === EVENTO.morte);
    expect([m!.inimigo, m!.flags & FLAG.convertido, m!.causa, m!.slot]).toEqual([TIPO.oco_grande, FLAG.convertido, CAUSA.arma, s]);
    const r = criarEstado(1, DADOS_DA_CHARNECA, { ...parametrosDoCenario('horda_rotativa'), teto: 300, armas: [] });
    avancar(r, DADOS_DA_CHARNECA, PARADO, 240);
    aplicarRotacao(r);
    expect(r.mundo[MUNDO.removidos]).toBeGreaterThan(0);
    expect(r.mundo[MUNDO.mortes]).toBe(0);
  });

  it('um golpe mata Ocos nos slots 4, 9 e 2: saem na ordem 2, 4, 9, e o próximo a nascer usa o 9', () => {
    const e = estadoCom([[E, 1]]);
    const slots: number[] = [];
    for (let k = 0; k < 10; k++) slots.push(por(e, TIPO.oco_das_lanternas, 300 + 40 * k, 600));
    for (const k of [4, 9, 2]) {
      e.inimigos.x[slots[k]!] = J.x + (k - 5);
      e.inimigos.y[slots[k]!] = J.y - 50;
      e.inimigos.hp[slots[k]!] = 1;
    }
    rodarArmas(e, D);
    const mortes = eventos(e).filter((v) => v.tipo === EVENTO.morte).map((v) => v.slot);
    expect(mortes).toEqual([2, 4, 9]);
    expect(nascerInimigo(e, D, TIPO.oco_das_lanternas, 10, 10, false)).toBe(9);
  });

  it('na linha 0, matar 5 Ocos faz a reposição seguinte repor 5', () => {
    const e = criarEstado(1, DADOS_DA_CHARNECA, { linhaFixa: 0, armas: [] });
    avancar(e, DADOS_DA_CHARNECA, PARADO, 600);
    const antes = quantosAtivos(e.pool);
    const spawns = e.mundo[MUNDO.spawns]!;
    let mortos = 0;
    for (let s = 0; s < 500 && mortos < 5; s++) {
      if (e.pool.posicao[s]! < 0) continue;
      matarInimigo(e, D, s, CAUSA.arma);
      mortos++;
    }
    avancar(e, DADOS_DA_CHARNECA, PARADO, 600);
    expect(quantosAtivos(e.pool)).toBe(antes);
    expect(e.mundo[MUNDO.spawns]! - spawns).toBe(5);
  });
});

describe('ordem do passo v4 (§4)', () => {
  it('as armas veem as posições finais: um Oco a 81,3 px anda 1,32 no passo e o golpe do mesmo passo o acerta', () => {
    const e = estadoCom([[E, 1]]);
    const s = por(e, TIPO.oco_das_lanternas, 0, -81.3);
    avancar(e, D, PARADO, 1);
    expect(e.inimigos.hp[s]).toBeLessThan(12);
  });

  it('o Sal aplicado na fase de armas do passo t vale da fase 3 de t + 1: 1,32 px em t e 0,66 em t + 1', () => {
    const e = estadoCom([[C, 1]]);
    // A 80,82 px: anda 1,32 na fase 3 e fica a 79,5, dentro da aura nv1 (R + r = 80) na fase de armas.
    const s = por(e, TIPO.oco_das_lanternas, 0, -80.82);
    const d0 = rel(e, s).d;
    avancar(e, D, PARADO, 1);
    const d1 = rel(e, s).d;
    expect(e.inimigos.salPassos[s]).toBe(180);
    avancar(e, D, PARADO, 1);
    expect(Math.abs(d0 - d1 - 1.32)).toBeLessThanOrEqual(1e-3);
    expect(Math.abs(d1 - rel(e, s).d - 0.66)).toBeLessThanOrEqual(1e-3);
  });

  it('quem nasce no passo t (diretor, depois das armas) não leva golpe em t', () => {
    const e = criarEstado(1, DADOS_DA_CHARNECA);
    avancar(e, DADOS_DA_CHARNECA, PARADO, 1);
    const acertos = eventos(e).filter((v) => v.tipo === EVENTO.acerto);
    expect(acertos).toHaveLength(0);
    expect(quantosAtivos(e.pool)).toBeGreaterThan(0);
  });
});

describe('RNG, determinismo e NaN', () => {
  it('as 4 palavras do fluxo armas não mudam em 3.600 passos com as 3 armas no nv8 na linha 19', () => {
    const e = criarEstado(1, DADOS_DA_CHARNECA, { ...parametrosDoCenario('tres_armas'), linhaFixa: 19, teto: 300 });
    const b = baseDoFluxo('armas');
    const antes = [...e.rng.subarray(b, b + 4)];
    avancar(e, DADOS_DA_CHARNECA, PARADO, 3600);
    expect(e.mundo[MUNDO.mortes]).toBeGreaterThan(0);
    expect([...e.rng.subarray(b, b + 4)]).toEqual(antes);
  });

  it('a cópia do buffer no passo 500 do tres_armas, com as armas ativas e facas em voo, segue igual', () => {
    const e = criarEstado(1, DADOS_DA_CHARNECA, { ...parametrosDoCenario('tres_armas'), teto: 300 });
    avancar(e, DADOS_DA_CHARNECA, PARADO, 500);
    const copia = criarEstado(1, DADOS_DA_CHARNECA, { ...parametrosDoCenario('tres_armas'), teto: 300 });
    copia.bytes.set(e.bytes);
    avancar(e, DADOS_DA_CHARNECA, PARADO, 500);
    avancar(copia, DADOS_DA_CHARNECA, PARADO, 500);
    expect(hashEstado(copia)).toBe(hashEstado(e));
  });

  it('um Oco exatamente no centro do jogador recebe faca, golpe e pulso sem NaN em 10 passos; NaN num projétil vivo é acusado', () => {
    const e = estadoCom([[E, 8], [F, 8], [C, 8]]);
    por(e, TIPO.oco_grande, 0, 0);
    for (let k = 0; k < 10; k++) {
      avancar(e, D, PARADO, 1);
      expect(() => verificarNaN(e, 1)).not.toThrow();
    }
    expect(eventos(e).every((v) => v.f.every((x) => Number.isFinite(x)))).toBe(true);
    esvaziarBuild(e);
    const f = estadoCom([[F, 1]]);
    por(f, TIPO.oco_das_lanternas, 0, -100);
    rodarArmas(f, D);
    let p = 0;
    while (f.poolDeProjeteis.posicao[p]! < 0) p++;
    f.projeteis.vx[p] = Number.NaN;
    expect(() => verificarNaN(f, 1)).toThrow(`NaN no projétil ${p}`);
  });
});
