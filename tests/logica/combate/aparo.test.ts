// Aparo (design/decisoes-F-006.md §4.1, AP2 a AP11; critérios F-006.2, F-006.3, F-006.6 na parte do teto e
// F-006.10 na parte do aparo): a janela de 11 passos contada em `c + 1 .. c + 11`, o sucesso e a ordem do
// que ele faz, o aparo falho e o vazio, as travas, a stamina e o contador de falhas do tutorial. Os testes
// comparam CAB.passo (o passo congelado não o move). O Oco Grande sozinho a 70 px telegrafa em T = 1, e o
// golpe cai em h = 37.
import { describe, expect, it } from 'vitest';
import armasJson from '../../../src/dados/armas.json';
import charneca from '../../../src/dados/regioes/charneca_das_lanternas.json';
import inimigosJson from '../../../src/dados/inimigos.json';
import vigilantes from '../../../src/dados/vigilantes.json';
import { criarDadosDaVigilia } from '../../../src/logica/mundo/dados';
import { rodarAtaques } from '../../../src/logica/mundo/ataques';
import { CAB, CENARIO, JOGADOR, JOGADOR3, JOGADOR3_U16, JOGADOR3_U8, PROMPT, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { criarComandos, fonteConstante } from '../../../src/logica/nucleo/comandos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { removerInimigo } from '../../../src/logica/mundo/inimigos';
import { hashEstado } from '../../../src/logica/nucleo/estado';
import { FONTES_DA_PROGRESSAO, PARADO } from '../apoio';
import { ACAO, D_LIVRE as D, LONGE, TIPO, aparoEm, criar, esquivaEm, eventosDe, fonteDeAcoes, junto, posJogador, posicionar, slotsVivos } from './apoio';

const ATQ = CENARIO.diretorDesligado | CENARIO.ataques;
const u8 = (e: Estado, campo: keyof typeof JOGADOR3_U8): number => e.jogador3U8[JOGADOR3_U8[campo]]!;
const u16 = (e: Estado, campo: keyof typeof JOGADOR3_U16): number => e.jogador3U16[JOGADOR3_U16[campo]]!;
const stamina = (e: Estado): number => e.jogador3[JOGADOR3.stamina]!;
const setStamina = (e: Estado, v: number): void => {
  e.jogador3[JOGADOR3.stamina] = v;
};
const hp = (e: Estado): number => e.jogador[JOGADOR.hp]!;
const passo = (e: Estado): number => e.cab[CAB.passo]!;

/** O Oco Grande sozinho a 70 px: telegrafo em T = 1, golpe em h = 37, com o jogador parado dentro do arco. */
const GRANDE = [{ codigo: TIPO.oco_grande, dx: 0, dy: -70 }];
const H = 37;

const NOVICA = [{ codigo: TIPO.novica_de_sal, dx: 0, dy: -190 }];

/** `aparoEm(k)` lê o comando no passo CAB.passo = k + 1: o passo `c` da D6. */
const toqueEm = (c: number) => fonteDeAcoes([aparoEm(c - 1)]);

/** O passo em que o projétil da Noviça sozinha chega ao jogador, sem aparo. */
function passoDoImpacto(): number {
  const e = criar({ cenario: ATQ | CENARIO.jogadorInvulneravel, inimigos: NOVICA });
  rodarAte(e, PARADO, 200);
  return eventosDe(e, EVENTO.golpeInimigo)[0]!.passo;
}

function comGrande(extra: Parameters<typeof criar>[0] = {}): Estado {
  return criar({ cenario: ATQ, inimigos: GRANDE, ...extra });
}

/** Roda até `CAB.passo` = alvo, devolvendo a stamina depois de cada passo vivo, por passo. */
function rodarAte(e: Estado, fonte = PARADO, alvo = 80): Map<number, number> {
  const st = new Map<number, number>();
  let guarda = 0;
  while (passo(e) < alvo) {
    const antes = passo(e);
    avancar(e, D, fonte, 1);
    if (passo(e) !== antes) st.set(passo(e), stamina(e));
    if (++guarda > 10_000) throw new Error('rodarAte');
  }
  return st;
}

describe('F-006.2: a janela cobre c + 1 a c + 11 (AP3)', () => {
  it('golpe em h = 37: só quem tocou em c de h − 11 a h − 1 apara; h − 12 e h não', () => {
    for (let c = H - 14; c <= H; c++) {
      const e = comGrande();
      rodarAte(e, toqueEm(c), 60);
      const aparou = eventosDe(e, EVENTO.aparo).length === 1;
      const esperado = c >= H - 11 && c <= H - 1;
      expect(aparou, `c=${c}`).toBe(esperado);
      expect(hp(e) === D.hpInicial, `c=${c} hp`).toBe(esperado);
      const g = eventosDe(e, EVENTO.golpeInimigo);
      expect(g).toHaveLength(1);
      expect(g[0]).toMatchObject({ passo: H, b: esperado ? 3 : 1 });
    }
  });

  it('o toque no próprio passo do golpe (c = h) leva o dano: o passo do comando não protege', () => {
    const e = comGrande();
    rodarAte(e, toqueEm(H), 60);
    expect(hp(e)).toBeLessThan(D.hpInicial);
    expect(eventosDe(e, EVENTO.aparo)).toHaveLength(0);
  });

  it('quadros de 1, 2 e 5 passos dão o mesmo estado, em toda a matriz', () => {
    for (let c = H - 13; c <= H; c++) {
      const hashes = [1, 2, 5].map((n) => {
        const e = comGrande();
        const fonte = toqueEm(c);
        let rodados = 0;
        while (rodados < 100) rodados += avancar(e, D, fonte, Math.min(n, 100 - rodados));
        return hashEstado(e);
      });
      expect(new Set(hashes).size, `c=${c}`).toBe(1);
    }
  });

  it('a janela grava 12 (limite 11) em c e conta 11, 10, ..., 1 até c + 11', () => {
    const e = comGrande();
    const fonte = toqueEm(5);
    const v: number[] = [];
    while (passo(e) < 20) {
      avancar(e, D, fonte, 1);
      v.push(u8(e, 'aparoJanela'));
    }
    expect(v.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(v.slice(4, 18)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0]);
    expect(u8(e, 'aparoLimite')).toBe(11);
  });

  it('uma falha que completa 2 no meio de uma janela de 12 não muda a janela em curso (limite gravado em c)', () => {
    // O prompt ligado e 1 falha: a 2ª falha chega durante a janela (dano de projétil/golpe); o limite fica 11.
    const e = comGrande();
    e.jogador3U8[JOGADOR3_U8.promptAparo] = PROMPT.visivel;
    e.jogador3U8[JOGADOR3_U8.falhasDeAparo] = 1;
    const fonte = toqueEm(H - 12);
    rodarAte(e, fonte, 60);
    expect(u8(e, 'aparoLimite')).toBe(11);
    // c = h − 12 está fora da janela de 11: o golpe fere (falha 2) e a janela já tinha acabado em c + 11.
    expect(eventosDe(e, EVENTO.aparo)).toHaveLength(0);
    expect(u8(e, 'falhasDeAparo')).toBeGreaterThanOrEqual(2);
  });
});

describe('F-006.6 (teto): o aparo devolve 30 com teto em 100 (AP6)', () => {
  it('stamina 60 → 45 no toque → 75 no sucesso; 95 → 80 → 100 (teto)', () => {
    for (const [antes, aposToque, aposSucesso] of [
      [60, 45, 75],
      [95, 80, 100],
      [15, 0, 30],
    ] as const) {
      const e = comGrande();
      const fonte = toqueEm(30);
      rodarAte(e, fonte, 29);
      setStamina(e, antes);
      const st = rodarAte(e, fonte, 60);
      expect(st.get(30), `toque de ${antes}`).toBe(aposToque);
      // Entre c e h não há regeneração (esperaRegen 30 do gasto).
      expect(st.get(H - 1)).toBe(aposToque);
      expect(st.get(H)).toBe(aposSucesso);
      const ev = eventosDe(e, EVENTO.aparo);
      expect(ev).toHaveLength(1);
      expect(ev[0]).toMatchObject({ passo: H, b: 0 });
      expect(ev[0]!.a).toBe(aposSucesso);
    }
  });

  it('o sucesso não é gasto: não reinicia o atraso de regeneração (esperaRegen segue o do toque)', () => {
    const e = comGrande();
    rodarAte(e, toqueEm(30), H);
    // G = 30: esperaRegen = 30 e cai 1 por passo; em h = 37 restam 23.
    expect(u8(e, 'esperaRegen')).toBe(23);
  });
});

describe('sucesso do aparo: a ordem do que ele faz (AP6)', () => {
  it('evento 15 em h, congelamento 5, janela zerada, golpe com desfecho 3 e dano 0, Postura Quebrada no atacante', () => {
    const e = comGrande();
    const s = slotsVivos(e)[0]!;
    rodarAte(e, toqueEm(30), H);
    expect(passo(e)).toBe(H);
    expect(u8(e, 'congelamento')).toBe(5);
    expect(u8(e, 'aparoJanela')).toBe(0);
    expect(hp(e)).toBe(D.hpInicial);
    const g = eventosDe(e, EVENTO.golpeInimigo)[0]!;
    expect(g).toMatchObject({ passo: H, b: 3, a: 0, slot: s });
    expect(e.inimigos.quebradaPassos[s]).toBe(120);
    expect(u16(e, 'alvoAparadoSlot')).toBe(s);
    expect(u16(e, 'alvoAparadoGeracao')).toBe(e.pool.geracao[s]);
    // 5 passos congelados: CAB.passo e CAB.relogio parados.
    const relogio = e.cab[CAB.relogio]!;
    avancar(e, D, PARADO, 5);
    expect([passo(e), e.cab[CAB.relogio]]).toEqual([H, relogio]);
    avancar(e, D, PARADO, 1);
    expect(passo(e)).toBe(H + 1);
  });

  it('o golpe fora do arco em h não é contato: sem evento 15, sem dano e a janela segue (AP4)', () => {
    const e = comGrande();
    rodarAte(e, toqueEm(30), 31);
    const [jx, jy] = posJogador(e);
    e.jogador[JOGADOR.x] = jx + 200;
    e.jogador[JOGADOR.y] = jy;
    rodarAte(e, PARADO, H);
    expect(eventosDe(e, EVENTO.aparo)).toHaveLength(0);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]).toMatchObject({ b: 4 });
    expect(hp(e)).toBe(D.hpInicial);
    // A janela não foi consumida: terminou em c + 12 (vazio ou falho), e não zerada pelo golpe.
    expect(u8(e, 'aparoJanela')).toBe(5);
  });

  it('contato do Oco das Lanternas durante a janela dá o dano normal e não consome a janela (AP4)', () => {
    const e = criar({ cenario: ATQ, inimigos: [LONGE] });
    const s = slotsVivos(e)[0]!;
    junto(e, s, 20, 0);
    rodarAte(e, toqueEm(1), 6);
    expect(hp(e)).toBeLessThan(D.hpInicial);
    expect(eventosDe(e, EVENTO.aparo)).toHaveLength(0);
    expect(u8(e, 'aparoJanela')).toBe(12 - 5);
  });

  it('dois aparáveis no mesmo passo: ambos desfecho 3, +30 uma vez, um evento 15, alvoAparado é o menor slot', () => {
    const e = criar({
      cenario: ATQ,
      inimigos: [
        { codigo: TIPO.oco_grande, dx: 0, dy: -70 },
        { codigo: TIPO.oco_grande, dx: 0, dy: 70 },
      ],
    });
    const [a, b] = slotsVivos(e) as [number, number];
    const fonte = toqueEm(30);
    rodarAte(e, fonte, 30);
    setStamina(e, 35);
    const st = rodarAte(e, fonte, H);
    const g = eventosDe(e, EVENTO.golpeInimigo);
    expect(g.map((x) => [x.slot, x.b])).toEqual([
      [a, 3],
      [b, 3],
    ]);
    expect(eventosDe(e, EVENTO.aparo)).toHaveLength(1);
    expect(st.get(H)).toBe(65);
    expect(st.get(H - 1)).toBe(35);
    expect(u16(e, 'alvoAparadoSlot')).toBe(Math.min(a, b));
    expect(eventosDe(e, EVENTO.posturaQuebrada).map((x) => x.slot)).toEqual([a, b]);
    expect(hp(e)).toBe(D.hpInicial);
  });

  it('projétil 3 passos depois do golpe aparado, já com a janela zerada: dano', () => {
    const impacto = passoDoImpacto();
    const e = criar({
      cenario: ATQ,
      inimigos: [
        { codigo: TIPO.oco_grande, dx: 0, dy: -70 },
        { codigo: TIPO.novica_de_sal, dx: 0, dy: -190 },
      ],
    });
    const [grande] = slotsVivos(e);
    // O golpe do Oco cai em impacto − 3: o telegrafo dele já está em curso, com o tempo certo.
    e.inimigos.ataqueFase[grande!] = 1;
    e.inimigos.ataqueTimer[grande!] = impacto - 3;
    e.inimigos.miraX[grande!] = 0;
    e.inimigos.miraY[grande!] = 1;
    rodarAte(e, toqueEm(impacto - 3 - 6), impacto);
    const g = eventosDe(e, EVENTO.golpeInimigo);
    expect(g.map((x) => [x.passo, x.b])).toEqual([
      [impacto - 3, 3],
      [impacto, 1],
    ]);
    expect(hp(e)).toBeLessThan(D.hpInicial);
  });
});

describe('F-006.3: aparo falho e aparo vazio (AP5, AP7)', () => {
  it('falho: stamina constante de P0 a P0 + 24 e a 1ª regeneração em P0 + 25 = G + 37', () => {
    const e = comGrande();
    const G = 1;
    const st = rodarAte(e, toqueEm(G), 60);
    const P0 = G + 12;
    expect(eventosDe(e, EVENTO.aparoFalho).map((x) => x.passo)).toEqual([P0]);
    expect(eventosDe(e, EVENTO.aparoVazio)).toHaveLength(0);
    expect(st.get(G)).toBe(85);
    for (let p = P0; p <= P0 + 24; p++) expect(st.get(p), `p=${p}`).toBe(st.get(P0));
    expect(st.get(P0 + 25)).toBe(st.get(P0)! + 0.5);
    expect(P0 + 25).toBe(G + 37);
    // Entre G e P0 não regenerou (atraso do gasto de 30).
    expect(st.get(P0 - 1)).toBe(85);
  });

  it('vazio: 1ª regeneração em G + 31, 6 passos (3 pontos) antes do falho', () => {
    const e = criar({ cenario: ATQ, inimigos: [LONGE] });
    const G = 1;
    const st = rodarAte(e, toqueEm(G), 60);
    expect(eventosDe(e, EVENTO.aparoVazio).map((x) => x.passo)).toEqual([G + 12]);
    expect(eventosDe(e, EVENTO.aparoFalho)).toHaveLength(0);
    for (let p = G; p <= G + 30; p++) expect(st.get(p), `p=${p}`).toBe(85);
    expect(st.get(G + 31)).toBe(85.5);
    // Falho: a 1ª regeneração só em G + 37: 6 passos depois.
    const f = comGrande();
    const sf = rodarAte(f, toqueEm(G), 60);
    expect(sf.get(G + 36)).toBe(85);
    expect(sf.get(G + 37)).toBe(85.5);
    expect(sf.get(G + 31)).toBe(85);
  });

  it('esperaRegen = max(esperaRegen, 24): o falho não soma (24 ≠ +24)', () => {
    const e = comGrande();
    rodarAte(e, toqueEm(1), 13);
    expect(u8(e, 'esperaRegen')).toBe(24);
    expect(u8(e, 'aparoFalho')).toBe(24);
  });

  it('esperaRegen = max: com 100 pendentes, o falho e o gasto do aparo não o rebaixam (D6 ST2)', () => {
    // Falho: a decisão cai em P0 = 13 (CAB.passo); injeta 100 no passo anterior.
    const f = comGrande();
    rodarAte(f, toqueEm(1), 12);
    expect(u8(f, 'aparoJanela')).toBe(1);
    f.jogador3U8[JOGADOR3_U8.esperaRegen] = 100;
    avancar(f, D, toqueEm(1), 1);
    expect(eventosDe(f, EVENTO.aparoFalho)).toHaveLength(1);
    expect(u8(f, 'aparoFalho')).toBe(24);
    expect(u8(f, 'esperaRegen')).toBe(100);
    // Gasto: o toque com 100 pendentes mantém 100 (e não grava os 30 do gasto).
    const g = criar({ cenario: ATQ, inimigos: [LONGE] });
    g.jogador3U8[JOGADOR3_U8.esperaRegen] = 100;
    avancar(g, D, fonteDeAcoes([aparoEm(0)]), 1);
    expect(u8(g, 'aparoJanela')).toBe(12);
    expect(stamina(g)).toBe(85);
    expect(u8(g, 'esperaRegen')).toBe(100);
  });

  it('o falho trava esquiva e aparo por 24 passos (P0 a P0 + 23) e volta em P0 + 24; a esquiva em P0 + 10 é ignorada sem custo', () => {
    const P0 = 13;
    const e = comGrande();
    const fonte = fonteDeAcoes([aparoEm(0), esquivaEm(P0 + 10 - 1, [0, 1]), { passo: P0 + 24 - 1, acoes: ACAO.esquiva, mira: [0, 1] }]);
    const st = rodarAte(e, fonte, P0 + 23);
    expect(eventosDe(e, EVENTO.esquiva)).toHaveLength(0);
    expect(eventosDe(e, EVENTO.acaoNegada)).toHaveLength(0);
    expect(u8(e, 'esquivaPasso')).toBe(0);
    expect(st.get(P0 + 23)).toBe(st.get(P0));
    rodarAte(e, fonte, P0 + 24);
    expect(eventosDe(e, EVENTO.esquiva).map((x) => x.passo)).toEqual([P0 + 24]);
    expect(stamina(e)).toBe(st.get(P0)! - 25);
  });

  it('o aparo em P0 + 10, durante o aparo falho, é ignorado: nem stamina nem janela mudam (AP8)', () => {
    const P0 = 13;
    const e = comGrande();
    const fonte = fonteDeAcoes([aparoEm(0), aparoEm(P0 + 10 - 1)]);
    const st = rodarAte(e, fonte, P0 + 12);
    expect(u8(e, 'aparoFalho')).toBeGreaterThan(0);
    expect(u8(e, 'aparoJanela')).toBe(0);
    expect(stamina(e)).toBe(st.get(P0));
    expect(st.get(P0 + 10)).toBe(st.get(P0));
    expect(eventosDe(e, EVENTO.acaoNegada)).toHaveLength(0);
    expect(eventosDe(e, EVENTO.aparoFalho)).toHaveLength(1);
  });

  it('aparo em c + 5 (dentro da janela) é ignorado sem custo nem evento', () => {
    const e = criar({ cenario: ATQ, inimigos: [LONGE] });
    const st = rodarAte(e, fonteDeAcoes([aparoEm(0), aparoEm(5)]), 8);
    expect(st.get(6)).toBe(85);
    expect(u8(e, 'aparoJanela')).toBe(12 - 7);
    expect(eventosDe(e, EVENTO.acaoNegada)).toHaveLength(0);
  });

  it('os dois bits no mesmo passo: o aparo é aceito e a esquiva ignorada (invariante: nunca coexistem)', () => {
    const e = criar({ cenario: ATQ, inimigos: [LONGE] });
    avancar(e, D, fonteDeAcoes([{ passo: 0, acoes: ACAO.aparo | ACAO.esquiva, mira: [0, -1] }]), 1);
    expect([u8(e, 'aparoJanela'), u8(e, 'esquivaPasso')]).toEqual([12, 0]);
    expect(stamina(e)).toBe(85);
  });

  it('invariante em 10.000 passos de roteiro aleatório: esquivaPasso > 0 e aparoJanela > 0 nunca coexistem', () => {
    let semente = 12345;
    const proximo = (): number => {
      semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0;
      return semente / 2 ** 32;
    };
    const acoes = [];
    for (let p = 0; p < 10_000; p += 1 + Math.floor(proximo() * 9)) {
      const r = proximo();
      acoes.push({ passo: p, acoes: r < 0.4 ? ACAO.esquiva : r < 0.8 ? ACAO.aparo : ACAO.esquiva | ACAO.aparo, mira: [1, 0] as [number, number] });
    }
    const e = comGrande({ cenario: ATQ | CENARIO.jogadorInvulneravel });
    const fonte = fonteDeAcoes(acoes);
    let esquivas = 0;
    let aparos = 0;
    for (let i = 0; i < 10_000; i++) {
      avancar(e, D, fonte, 1);
      if (u8(e, 'esquivaPasso') > 0 && u8(e, 'aparoJanela') > 0) throw new Error(`coexistem no passo ${passo(e)}`);
      if (u8(e, 'esquivaPasso') === 1) esquivas++;
      if (u8(e, 'aparoJanela') === 12) aparos++;
    }
    expect(esquivas).toBeGreaterThan(5);
    expect(aparos).toBeGreaterThan(50);
  });
});

describe('F-006.3: o contador de ameaças aparáveis (AP5)', () => {

  it('Noviça sozinha: o impacto a h − c de 12 a 47 é falho, a 48 e 60 é vazio; de 1 a 11 é sucesso', () => {
    const impacto = passoDoImpacto();
    for (const [dist, desfecho] of [
      [5, 'sucesso'],
      [11, 'sucesso'],
      [12, 'falho'],
      [30, 'falho'],
      [47, 'falho'],
      [48, 'vazio'],
      [60, 'vazio'],
    ] as const) {
      const e = criar({ cenario: ATQ, inimigos: NOVICA });
      rodarAte(e, toqueEm(impacto - dist), impacto + 60);
      const n = [EVENTO.aparo, EVENTO.aparoFalho, EVENTO.aparoVazio].map((t) => eventosDe(e, t).length);
      const esperado = desfecho === 'sucesso' ? [1, 0, 0] : desfecho === 'falho' ? [0, 1, 0] : [0, 0, 1];
      expect(n, `h−c=${dist}`).toEqual(esperado);
    }
  });

  it('o projétil que errou o jogador (linha a 40 px ao lado) não conta: toque é vazio', () => {
    const impacto = passoDoImpacto();
    const e = criar({ cenario: ATQ, inimigos: NOVICA });
    rodarAte(e, PARADO, 31);
    // Desvia o jogador para fora da linha do projétil depois do lançamento.
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.x]! + 60;
    rodarAte(e, toqueEm(impacto - 20), impacto + 60);
    expect(eventosDe(e, EVENTO.aparoVazio)).toHaveLength(1);
    expect(eventosDe(e, EVENTO.aparoFalho)).toHaveLength(0);
  });

  it('40 Noviças em telegrafo ao fundo e nenhum projétil a caminho: o toque errado é vazio', () => {
    const e = criar({ cenario: ATQ | CENARIO.jogadorInvulneravel, inimigos: Array.from({ length: 40 }, (_, i) => ({ codigo: TIPO.novica_de_sal, dx: 150 + i, dy: -150 })) });
    for (const s of slotsVivos(e)) {
      e.inimigos.ataqueFase[s] = 1;
      e.inimigos.ataqueTimer[s] = 30;
    }
    rodarAte(e, toqueEm(1), 14);
    expect(u16(e, 'ameacasAparaveis')).toBe(0);
    expect(eventosDe(e, EVENTO.aparoVazio).map((x) => x.passo)).toEqual([13]);
  });

  it('Oco Grande em telegrafo com o jogador fora do arco: vazio', () => {
    const e = comGrande();
    rodarAte(e, PARADO, 1);
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.x]! + 200;
    rodarAte(e, toqueEm(2), 16);
    expect(eventosDe(e, EVENTO.aparoVazio)).toHaveLength(1);
    expect(eventosDe(e, EVENTO.aparoFalho)).toHaveLength(0);
  });

  it('golpe já caído (toque depois de h): vazio', () => {
    const e = comGrande();
    rodarAte(e, toqueEm(H + 1), H + 20);
    expect(eventosDe(e, EVENTO.aparoVazio)).toHaveLength(1);
    expect(eventosDe(e, EVENTO.aparoFalho)).toHaveLength(0);
  });

  it('o contador gravado é o recontado por força bruta (Oco Grande no arco + projéteis)', () => {
    const e = criar({
      cenario: ATQ | CENARIO.jogadorInvulneravel,
      inimigos: [
        { codigo: TIPO.oco_grande, dx: 0, dy: -70 },
        { codigo: TIPO.novica_de_sal, dx: 120, dy: 0 },
        { codigo: TIPO.novica_de_sal, dx: -150, dy: 20 },
      ],
    });
    for (let i = 0; i < 160; i++) {
      avancar(e, D, PARADO, 1);
      let n = 0;
      const [jx, jy] = posJogador(e);
      for (const s of slotsVivos(e)) {
        if (e.inimigos.tipo[s] === TIPO.oco_grande && e.inimigos.ataqueFase[s] === 1) {
          const dx = jx - e.inimigos.x[s]!;
          const dy = jy - e.inimigos.y[s]!;
          const d = Math.hypot(dx, dy);
          if (d <= 80 && dx * e.inimigos.miraX[s]! + dy * e.inimigos.miraY[s]! >= 0.5 * d) n++;
        }
      }
      const pr = e.projeteis;
      for (let p = 0; p < pr.x.length; p++) {
        if (e.poolDeProjeteis.posicao[p]! < 0 || pr.tipo[p] !== 2) continue;
        const dx = jx - pr.x[p]!;
        const dy = jy - pr.y[p]!;
        const vx = pr.vx[p]!;
        const vy = pr.vy[p]!;
        const vv = vx * vx + vy * vy;
        const pp = dx * vx + dy * vy;
        const cr = dx * vy - dy * vx;
        if (pp > 0 && cr * cr <= 576 * vv && pp * pp <= 81.6 * 81.6 * vv) n++;
      }
      expect(u16(e, 'ameacasAparaveis'), `passo ${passo(e)}`).toBe(n);
    }
  });
});

describe('AP9: aparo com stamina insuficiente', () => {
  it('14,5 é negado (sem janela, sem mudança, evento 19); 15 é aceito e fica 0', () => {
    const e = criar({ cenario: ATQ, inimigos: [LONGE] });
    setStamina(e, 14.5);
    avancar(e, D, fonteDeAcoes([aparoEm(0)]), 1);
    expect(u8(e, 'aparoJanela')).toBe(0);
    // Nada foi gasto; a regeneração do passo segue normal (+0,5).
    expect(stamina(e)).toBe(15);
    expect(e.jogador3U8[JOGADOR3_U8.esperaRegen]).toBe(0);
    const neg = eventosDe(e, EVENTO.acaoNegada);
    expect(neg).toHaveLength(1);
    expect(neg[0]).toMatchObject({ forma: ACAO.aparo, a: 14.5, b: 15 });
    const f = criar({ cenario: ATQ, inimigos: [LONGE] });
    setStamina(f, 15);
    avancar(f, D, fonteDeAcoes([aparoEm(0)]), 1);
    expect(u8(f, 'aparoJanela')).toBe(12);
    expect(stamina(f)).toBe(0);
    expect(eventosDe(f, EVENTO.acaoNegada)).toHaveLength(0);
  });

  it('o ignorado por trava não gera acaoNegada (só o negado por stamina)', () => {
    const e = criar({ cenario: ATQ, inimigos: [LONGE] });
    avancar(e, D, fonteDeAcoes([aparoEm(0), aparoEm(1)]), 2);
    expect(eventosDe(e, EVENTO.acaoNegada)).toHaveLength(0);
  });
});

/** Dados com o ataque do Oco Grande trocado: sintético (AP10). */
function dadosComAparavel(aparavel: boolean) {
  const lista = JSON.parse(JSON.stringify(inimigosJson.inimigos)) as typeof inimigosJson.inimigos;
  lista.find((i) => i.id === 'oco_grande')!.ataques[0]!.aparavel = aparavel;
  return criarDadosDaVigilia({ ...charneca, obstaculos: [] }, vigilantes.vigilantes[0]!, lista, armasJson.armas, FONTES_DA_PROGRESSAO);
}

describe('AP10: ataque vermelho (aparavel: false)', () => {
  it('não é aparado: o HP cai, sem evento 15, janela não consumida e o toque vira vazio', () => {
    const dv = dadosComAparavel(false);
    const e = criar({ cenario: ATQ, inimigos: GRANDE }, dv);
    const fonte = toqueEm(30);
    while (passo(e) < H) avancar(e, dv, fonte, 1);
    expect(hp(e)).toBeLessThan(dv.hpInicial);
    expect(eventosDe(e, EVENTO.aparo)).toHaveLength(0);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]).toMatchObject({ b: 1 });
    expect(u8(e, 'aparoJanela')).toBe(12 - (H - 30));
    while (passo(e) < 60) avancar(e, dv, fonte, 1);
    expect(eventosDe(e, EVENTO.aparoVazio)).toHaveLength(1);
    expect(u16(e, 'ameacasAparaveis')).toBe(0);
  });

  it('o mesmo cenário com aparavel: true apara (controle)', () => {
    const dv = dadosComAparavel(true);
    const e = criar({ cenario: ATQ, inimigos: GRANDE }, dv);
    const fonte = toqueEm(30);
    while (passo(e) < H) avancar(e, dv, fonte, 1);
    expect(eventosDe(e, EVENTO.aparo)).toHaveLength(1);
  });
});

describe('AP11: janela de +6 passos e contador de falhas do tutorial', () => {
  const comPrompt = (falhas: number): Estado => {
    const e = comGrande();
    e.jogador3U8[JOGADOR3_U8.promptAparo] = PROMPT.visivel;
    e.jogador3U8[JOGADOR3_U8.falhasDeAparo] = falhas;
    return e;
  };

  it('com o prompt e 2 falhas: golpe a 17 passos é aparado e a 18 não; limite 17 e janela 18', () => {
    for (const [dist, aparou] of [
      [17, true],
      [18, false],
    ] as const) {
      const e = comPrompt(2);
      rodarAte(e, toqueEm(H - dist), 60);
      expect(eventosDe(e, EVENTO.aparo).length === 1, `dist ${dist}`).toBe(aparou);
    }
    const f = comPrompt(2);
    avancar(f, D, fonteDeAcoes([aparoEm(0)]), 1);
    expect([u8(f, 'aparoJanela'), u8(f, 'aparoLimite')]).toEqual([18, 17]);
  });

  it('sem o prompt (ou com 1 falha), vale 11: a 11 aparou, a 12 não', () => {
    for (const montar of [() => comGrande(), () => comPrompt(1)]) {
      const a = montar();
      rodarAte(a, toqueEm(H - 11), 60);
      expect(eventosDe(a, EVENTO.aparo)).toHaveLength(1);
      const b = montar();
      rodarAte(b, toqueEm(H - 12), 60);
      expect(eventosDe(b, EVENTO.aparo)).toHaveLength(0);
    }
  });

  it('o aparo falho com o prompt soma 1; o vazio não soma; sem o prompt nada soma', () => {
    const falho = comPrompt(0);
    rodarAte(falho, toqueEm(1), 20);
    expect(eventosDe(falho, EVENTO.aparoFalho)).toHaveLength(1);
    expect(u8(falho, 'falhasDeAparo')).toBe(1);

    const vazio = criar({ cenario: ATQ, inimigos: [LONGE] });
    vazio.jogador3U8[JOGADOR3_U8.promptAparo] = PROMPT.visivel;
    rodarAte(vazio, toqueEm(1), 20);
    expect(eventosDe(vazio, EVENTO.aparoVazio)).toHaveLength(1);
    expect(u8(vazio, 'falhasDeAparo')).toBe(0);

    const semPrompt = comGrande();
    rodarAte(semPrompt, toqueEm(1), 20);
    expect(eventosDe(semPrompt, EVENTO.aparoFalho)).toHaveLength(1);
    expect(u8(semPrompt, 'falhasDeAparo')).toBe(0);
  });

  it('o golpe que causa dano com o prompt soma 1 (sem o toque, a janela maior seria inalcançável); o contato não', () => {
    const e = comPrompt(0);
    rodarAte(e, PARADO, 40);
    expect(hp(e)).toBeLessThan(D.hpInicial);
    expect(u8(e, 'falhasDeAparo')).toBe(1);

    const c = criar({ cenario: ATQ, inimigos: [LONGE] });
    c.jogador3U8[JOGADOR3_U8.promptAparo] = PROMPT.visivel;
    junto(c, slotsVivos(c)[0]!, 20, 0);
    rodarAte(c, PARADO, 10);
    expect(hp(c)).toBeLessThan(D.hpInicial);
    expect(u8(c, 'falhasDeAparo')).toBe(0);
  });
});

describe('aparo no projétil: o dono, o slot liberado e o Sal (AP6, CA5)', () => {
  it('o projétil aparado some, o jogador não recebe Sal e o desfecho é 3', () => {
    const e = criar({ cenario: ATQ, inimigos: [{ codigo: TIPO.novica_de_sal, dx: 0, dy: -190 }] });
    const s = slotsVivos(e)[0]!;
    const impacto = passoDoImpacto();
    rodarAte(e, toqueEm(impacto - 6), impacto);
    const g = eventosDe(e, EVENTO.golpeInimigo)[0]!;
    expect(g).toMatchObject({ passo: impacto, b: 3, a: 0, forma: 8, slot: s });
    let vivos = 0;
    for (let p = 0; p < e.projeteis.x.length; p++) if (e.poolDeProjeteis.posicao[p]! >= 0) vivos++;
    expect(vivos).toBe(0);
    expect(u8(e, 'salPassos')).toBe(0);
    expect(hp(e)).toBe(D.hpInicial);
    expect(e.inimigos.quebradaPassos[s]).toBe(120);
    expect(u16(e, 'alvoAparadoSlot')).toBe(s);
  });

  it('dono já morto: +30, Postura em volta do jogador e Contra-ataque armado sem alvoAparado', () => {
    const e = criar({
      cenario: ATQ,
      inimigos: [
        { codigo: TIPO.novica_de_sal, dx: 0, dy: -190 },
        { codigo: TIPO.oco_das_lanternas, dx: 50, dy: 0 },
      ],
    });
    const [dono, perto] = slotsVivos(e) as [number, number];
    e.inimigos.hp[perto] = 1e6;
    e.inimigos.dano[perto] = 0;
    const impacto = passoDoImpacto();
    const fonte = toqueEm(impacto - 6);
    rodarAte(e, fonte, 45);
    // O dono morre depois do lançamento: o slot sai do pool (pode ser reaproveitado).
    removerInimigo(e, dono);
    rodarAte(e, fonte, impacto - 6);
    setStamina(e, 40);
    rodarAte(e, fonte, impacto);
    expect(eventosDe(e, EVENTO.aparo)).toHaveLength(1);
    expect(eventosDe(e, EVENTO.aparo)[0]!.a).toBe(70);
    expect(u16(e, 'alvoAparadoSlot')).toBe(0xffff);
    expect(e.inimigos.quebradaPassos[perto]).toBe(120);
  });
});

describe('o aparo na pilha de eventos da D6 (precedência AP4)', () => {
  it('rodarAtaques direto: janela ativa anula o golpe antes dos i-frames da esquiva (invariante de coexistência já provado)', () => {
    const e = criar({ cenario: ATQ, inimigos: GRANDE });
    const s = slotsVivos(e)[0]!;
    posicionar(e, s, posJogador(e)[0], posJogador(e)[1] - 40);
    e.inimigos.ataqueFase[s] = 1;
    e.inimigos.ataqueTimer[s] = 1;
    e.inimigos.miraX[s] = 0;
    e.inimigos.miraY[s] = 1;
    e.jogador3U8[JOGADOR3_U8.aparoJanela] = 5;
    e.jogador3U8[JOGADOR3_U8.aparoLimite] = 11;
    rodarAtaques(e, D);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]).toMatchObject({ b: 3 });
    expect(e.jogador3U8[JOGADOR3_U8.congelamento]).toBe(5);
    expect(hp(e)).toBe(D.hpInicial);
  });
});

describe('AP2: a borda do aparo ao vivo (fonteConstante)', () => {
  it('quadro de 2 passos com stamina 14,5: o 1º passo recusa e o 2º, que aceitaria (15), não vê a borda; nada de janela', () => {
    const e = criar({ cenario: ATQ, inimigos: [LONGE] });
    setStamina(e, 14.5);
    const cmd = criarComandos();
    cmd.acoes[0] = ACAO.aparo;
    const fonte = fonteConstante(cmd);
    avancar(e, D, fonte, 2);
    expect(cmd.acoes[0]).toBe(0);
    expect(u8(e, 'aparoJanela')).toBe(0);
    expect(eventosDe(e, EVENTO.acaoNegada)).toHaveLength(1);
    expect(stamina(e)).toBe(15.5);
  });

  it('com congelamento a borda sobrevive e vale no primeiro passo vivo', () => {
    const e = criar({ cenario: ATQ, inimigos: [LONGE] });
    e.jogador3U8[JOGADOR3_U8.congelamento] = 3;
    const cmd = criarComandos();
    cmd.acoes[0] = ACAO.aparo;
    const fonte = fonteConstante(cmd);
    avancar(e, D, fonte, 3);
    expect(cmd.acoes[0]).toBe(ACAO.aparo);
    expect(u8(e, 'aparoJanela')).toBe(0);
    avancar(e, D, fonte, 1);
    expect(cmd.acoes[0]).toBe(0);
    expect(u8(e, 'aparoJanela')).toBe(12);
    expect(passo(e)).toBe(1);
  });
});
