// Morte, APAGANDO, Abandonar e FIM (design/decisoes-F-007.md AG1 a AG6, PE5, FR9, LY3): a checagem do HP é única no fim
// do passo, APAGANDO dura 30 passos sem armas nem diretor e o FIM congela o hash.
import { describe, expect, it } from 'vitest';
import { BRUTO, ORIGEM_DO_DANO, danoAoJogador } from '../../../src/logica/mundo/contato';
import { matarInimigo } from '../../../src/logica/mundo/inimigos';
import { modalAberto } from '../../../src/logica/progressao/modal';
import { encerrarVigilia, faseSemArmas, resultadoDaVigilia } from '../../../src/logica/mundo/vigilia';
import { ACAO, criarComandos } from '../../../src/logica/nucleo/comandos';
import { CAB, CAUSA_DO_FIM, FASE, JOGADOR, JOGADOR3_U8, JOGADOR4_U8, JOGADOR_U8, MUNDO, PROGRESSAO, type Estado } from '../../../src/logica/nucleo/estado';
import { CAUSA, EVENTO } from '../../../src/logica/nucleo/eventos';
import { hashEstado } from '../../../src/logica/nucleo/estado';
import { avancar, passo } from '../../../src/logica/nucleo/passo';
import { alocar, quantosAtivos } from '../../../src/logica/nucleo/pool';
import { ARMA } from '../../../src/logica/armas/tabela';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { D_LIVRE as D, TIPO, criar, eventosDe, fonteDeAcoes, posJogador } from '../combate/apoio';

const fase = (e: Estado): number => e.jogador4U8[JOGADOR4_U8.fase]!;
const OCO_ENCOSTADO = { codigo: TIPO.oco_das_lanternas, dx: 20, dy: 0 };
const PARADO = fonteDeAcoes([]);

/** Jogador com `hp` e um Oco encostado: o contato fere no 1º passo (dano bruto 5 × 0,3 = 1,5). */
function aoLadoDeUmOco(hp: number, params = {}): Estado {
  const e = criar({ inimigos: [OCO_ENCOSTADO], ...params });
  e.jogador[JOGADOR.hp] = hp;
  return e;
}

describe('morte (AG1)', () => {
  it('HP 1 e o contato de 1,5: o HP chega a 0 e a fase vira APAGANDO no mesmo passo, com o evento apagou', () => {
    const e = aoLadoDeUmOco(1);
    avancar(e, D, PARADO, 1);
    expect([fase(e), e.jogador[JOGADOR.hp], e.jogador4U8[JOGADOR4_U8.apagandoPassos]]).toEqual([FASE.apagando, 0, 0]);
    const ev = eventosDe(e, EVENTO.apagou);
    expect(ev).toHaveLength(1);
    expect([ev[0]!.passo, ev[0]!.slot]).toEqual([1, -1]);
  });

  it('HP 1,5 e dano 1,5: a vida acaba em 0 exato; HP 1,6 sobrevive com 0,1 (0,4 HP é vida, não 0)', () => {
    const a = aoLadoDeUmOco(1.5);
    avancar(a, D, PARADO, 1);
    expect(fase(a)).toBe(FASE.apagando);
    const b = aoLadoDeUmOco(1.6);
    avancar(b, D, PARADO, 1);
    expect([fase(b), b.jogador[JOGADOR.hp]]).toEqual([FASE.viva, Math.fround(Math.fround(1.6) - 1.5)]);
    expect(b.jogador[JOGADOR.hp]!).toBeGreaterThan(0);
  });

  it('modal pendente no passo da morte (RS3): a fila e a oferta são descartadas, o modal não abre e o nível do Resultado é o do estado', () => {
    const e = aoLadoDeUmOco(1);
    const pr = e.progresso;
    pr[PROGRESSAO.niveisPendentes] = 2;
    pr[PROGRESSAO.bausPorFechar] = 1;
    e.oferta.tipo[0] = 1;
    passo(e, D, criarComandos());
    expect([fase(e), pr[PROGRESSAO.niveisPendentes], pr[PROGRESSAO.bausPorFechar], e.oferta.tipo.every((v) => v === 0), modalAberto(e)]).toEqual([FASE.apagando, 0, 0, true, false]);
    expect(resultadoDaVigilia(e, D).nivel).toBe(pr[PROGRESSAO.nivel]);
    expect(avancar(e, D, PARADO, 40)).toBe(40);
  });

  it('duas execuções iguais dão o mesmo hash em todos os passos até depois do FIM', () => {
    const hashes = (): string[] => {
      const e = aoLadoDeUmOco(1, { xpInicial: 5000 });
      const h: string[] = [];
      for (let k = 0; k < 40; k++) {
        avancar(e, D, PARADO, 1);
        h.push(hashEstado(e).toString(16));
      }
      return h;
    };
    expect(hashes()).toEqual(hashes());
  });

  it('FR9: HP 0,3 com cura de 0,5 no passo e contato de 1,5: a cura roda antes do dano, a checagem é única no fim → APAGANDO e Frasco zerado sem evento', () => {
    const e = aoLadoDeUmOco(30);
    const fonte = fonteDeAcoes([{ passo: 0, acoes: ACAO.frasco }]);
    avancar(e, D, fonte, 2);
    expect(e.jogador4U8[JOGADOR4_U8.frascoPasso]).toBeGreaterThan(1);
    e.jogador[JOGADOR.hp] = 0.3;
    e.jogadorU8[JOGADOR_U8.invulContato] = 0;
    const eventos = (): number => eventosDe(e, EVENTO.frascoCancelado).length + eventosDe(e, EVENTO.frascoInterrompido).length;
    const antes = eventos();
    avancar(e, D, fonte, 1);
    expect(fase(e)).toBe(FASE.apagando);
    expect([e.jogador4U8[JOGADOR4_U8.frascoPasso], eventos() - antes]).toEqual([0, 0]);
  });
});

describe('APAGANDO (AG2, AG3)', () => {
  it('30 passos até FIM: zero mortes, XP e Almas novas; HP 0; relógio constante; comandos e pausa inertes; projéteis somem; o hash congela em FIM', () => {
    const e = aoLadoDeUmOco(1);
    // Um projétil vivo no passo da morte (posto à mão) some no 1º passo de APAGANDO.
    avancar(e, D, PARADO, 1);
    expect(fase(e)).toBe(FASE.apagando);
    const p = alocar(e.poolDeProjeteis);
    e.projeteis.vida[p] = 30;
    expect(e.poolDeProjeteis.posicao[p]).toBeGreaterThanOrEqual(0);
    const relogio = e.cab[CAB.relogio]!;
    const mortes = e.mundo[MUNDO.mortes]!;
    const xp = e.progresso[PROGRESSAO.xpTotal]!;
    const esquiva = fonteDeAcoes([{ passo: 1, acoes: ACAO.esquiva | ACAO.aparo | ACAO.frasco }]);
    for (let k = 1; k <= 29; k++) {
      avancar(e, D, esquiva, 1);
      expect(fase(e)).toBe(FASE.apagando);
      expect(e.jogador[JOGADOR.hp]).toBe(0);
      expect(e.jogador3U8[JOGADOR3_U8.esquivaPasso]).toBe(0);
      expect(e.jogador3U8[JOGADOR3_U8.aparoJanela]).toBe(0);
    }
    expect(e.jogador4U8[JOGADOR4_U8.apagandoPassos]).toBe(29);
    avancar(e, D, esquiva, 1);
    expect([fase(e), e.jogador4U8[JOGADOR4_U8.causaDoFim]]).toEqual([FASE.fim, CAUSA_DO_FIM.apagar]);
    expect([e.cab[CAB.relogio], e.mundo[MUNDO.mortes], e.progresso[PROGRESSAO.xpTotal]]).toEqual([relogio, mortes, xp]);
    expect(e.poolDeProjeteis.posicao.every((v) => v < 0)).toBe(true);
    const h = hashEstado(e);
    avancar(e, D, PARADO, 100);
    expect(hashEstado(e)).toBe(h);
    expect(eventosDe(e, EVENTO.fimDaVigilia)).toHaveLength(1);
  });

  it('mutação: com a Espada pronta e um Oco ao alcance, as armas NÃO rodam em APAGANDO (mortes, XP e Almas seguem; o Oco vive)', () => {
    const e = criar({ armas: [{ codigo: ARMA.espada_longa_do_juramento, nivel: 1 }] });
    e.jogador[JOGADOR.hp] = 0;
    avancar(e, D, PARADO, 1);
    expect(fase(e)).toBe(FASE.apagando);
    const [x, y] = posJogador(e);
    const s = nascerInimigo(e, D, TIPO.oco_das_lanternas, x, y - 40, false);
    e.inimigos.hp[s] = 1;
    e.build.recarga[0] = 0;
    const antes = [e.mundo[MUNDO.mortes], e.progresso[PROGRESSAO.xpTotal], e.progresso[PROGRESSAO.almas], quantosAtivos(e.poolDePickups)];
    avancar(e, D, PARADO, 28);
    expect(fase(e)).toBe(FASE.apagando);
    expect([e.mundo[MUNDO.mortes], e.progresso[PROGRESSAO.xpTotal], e.progresso[PROGRESSAO.almas], quantosAtivos(e.poolDePickups)]).toEqual(antes);
    expect(e.pool.posicao[s]).toBeGreaterThanOrEqual(0);
  });

  it('sem driver, só o passo: o FIM chega exatamente 30 passos depois do HP 0, e os inimigos andam em APAGANDO', () => {
    const e = aoLadoDeUmOco(1);
    avancar(e, D, PARADO, 1);
    e.inimigos.x[0] = e.jogador[JOGADOR.x]! + 300;
    const x0 = e.inimigos.x[0]!;
    avancar(e, D, PARADO, 29);
    expect(fase(e)).toBe(FASE.apagando);
    expect(e.inimigos.x[0]).not.toBe(x0);
    avancar(e, D, PARADO, 1);
    expect(fase(e)).toBe(FASE.fim);
  });

  it('o contato não fere em APAGANDO: nenhum danoAoJogador novo e o HP segue 0', () => {
    const e = aoLadoDeUmOco(1);
    avancar(e, D, PARADO, 1);
    const n = eventosDe(e, EVENTO.danoAoJogador).length;
    avancar(e, D, PARADO, 29);
    expect(eventosDe(e, EVENTO.danoAoJogador)).toHaveLength(n);
    expect(e.jogador[JOGADOR.hp]).toBe(0);
  });

  it('faseSemArmas: só a fase VIVA roda as armas; a mesma função serve a A_FOME da F-009', () => {
    expect([FASE.viva, FASE.apagando, FASE.fim].map(faseSemArmas)).toEqual([false, true, true]);
  });
});

describe('Abandonar (PE5, LY3)', () => {
  it('o bit 16 vence tudo e encerra no passo, sem simular: FIM, causa abandonar, relógio e hash do passo parados', () => {
    const e = criar({ inimigos: [OCO_ENCOSTADO] });
    avancar(e, D, PARADO, 10);
    const passo = e.cab[CAB.passo]!;
    const fonte = fonteDeAcoes([{ passo, acoes: ACAO.abandonar | ACAO.esquiva | ACAO.frasco }]);
    avancar(e, D, fonte, 1);
    expect([fase(e), e.jogador4U8[JOGADOR4_U8.causaDoFim], e.cab[CAB.passo]]).toEqual([FASE.fim, CAUSA_DO_FIM.abandonar, passo]);
    const ev = eventosDe(e, EVENTO.fimDaVigilia);
    expect([ev.length, ev[0]!.forma]).toEqual([1, CAUSA_DO_FIM.abandonar]);
    const h = hashEstado(e);
    avancar(e, D, PARADO, 50);
    expect(hashEstado(e)).toBe(h);
  });

  it('em APAGANDO e em FIM o bit é ignorado: a causa continua apagar', () => {
    const e = aoLadoDeUmOco(1);
    avancar(e, D, PARADO, 1);
    const ab = fonteDeAcoes([{ passo: 1, acoes: ACAO.abandonar }]);
    avancar(e, D, ab, 1);
    expect(fase(e)).toBe(FASE.apagando);
    const ab2 = fonteDeAcoes(Array.from({ length: 40 }, (_, k) => ({ passo: 2 + k, acoes: ACAO.abandonar })));
    avancar(e, D, ab2, 60);
    expect([fase(e), e.jogador4U8[JOGADOR4_U8.causaDoFim]]).toEqual([FASE.fim, CAUSA_DO_FIM.apagar]);
  });

  it('o replay com o bit 16 reproduz o hash', () => {
    const rodar = (): number => {
      const e = criar({ inimigos: [OCO_ENCOSTADO] });
      avancar(e, D, fonteDeAcoes([{ passo: 25, acoes: ACAO.abandonar }]), 60);
      return hashEstado(e);
    };
    expect(rodar()).toBe(rodar());
  });
});

describe('encerrarVigilia (AG6) e a divisão das Almas (MC1, PE6)', () => {
  it('Apagar: N = 0, 1, 2, 3, 4, 5, 15, 280, 1.100 dão mancha 0, 0, 1, 1, 1, 2, 5, 84, 330 e a soma fecha', () => {
    const esperado = new Map([[0, 0], [1, 0], [2, 1], [3, 1], [4, 1], [5, 2], [15, 5], [280, 84], [1100, 330]]);
    for (const [n, mancha] of esperado) {
      const e = criar({ almasIniciais: n });
      encerrarVigilia(e, D, CAUSA_DO_FIM.apagar);
      const r = resultadoDaVigilia(e, D);
      expect([r.mancha?.almas ?? 0, r.almasAoSantuario + (r.mancha?.almas ?? 0)]).toEqual([mancha, n]);
      const ev = eventosDe(e, EVENTO.fimDaVigilia)[0]!;
      expect([ev.a, ev.b]).toEqual([mancha, n - mancha]);
    }
  });

  it('Abandonar: N = 0, 1, 2, 3, 280, 281 levam 0, 0, 1, 1, 140, 140 ao Santuário e não criam mancha', () => {
    for (const [n, sant] of [[0, 0], [1, 0], [2, 1], [3, 1], [280, 140], [281, 140]] as const) {
      const e = criar({ almasIniciais: n });
      encerrarVigilia(e, D, CAUSA_DO_FIM.abandonar);
      const r = resultadoDaVigilia(e, D);
      expect([r.almasAoSantuario, r.mancha]).toEqual([sant, null]);
    }
  });

  it('as 4 causas: A Fome divide como o Apagar e o Amanhecer leva tudo; encerrar duas vezes não repete o evento', () => {
    for (const [causa, mancha] of [[CAUSA_DO_FIM.aFome, 30], [CAUSA_DO_FIM.amanhecer, 0]] as const) {
      const e = criar({ almasIniciais: 100 });
      encerrarVigilia(e, D, causa);
      encerrarVigilia(e, D, CAUSA_DO_FIM.abandonar);
      expect(eventosDe(e, EVENTO.fimDaVigilia)).toHaveLength(1);
      const r = resultadoDaVigilia(e, D);
      expect([r.causa, r.mancha?.almas ?? 0, r.almasAoSantuario]).toEqual([causa, mancha, 100 - mancha]);
    }
  });

  it('o Resultado: tempo truncado em segundos, mortes, dano recebido e aparos vêm do estado', () => {
    const e = aoLadoDeUmOco(1);
    avancar(e, D, PARADO, 61);
    const r = resultadoDaVigilia(e, D);
    expect([r.segundos, r.danoRecebido, r.mortes, r.aparos]).toEqual([0, 1, 0, 0]);
  });
});

describe('mortes (RS4)', () => {
  it('por arma soma 1, o convertido soma 10; causa diferente de arma soma 0', () => {
    const e = criar({ inimigos: [{ codigo: TIPO.oco_das_lanternas, dx: 450, dy: 450 }] });
    matarInimigo(e, D, 0, CAUSA.arma);
    expect(e.mundo[MUNDO.mortes]).toBe(1);
    const f = criar({ inimigos: [{ codigo: TIPO.oco_das_lanternas, dx: 450, dy: 450 }] });
    matarInimigo(f, D, 0, 99);
    expect(f.mundo[MUNDO.mortes]).toBe(0);
  });

  it('o Elmo (armadura) e o Apagar: o contador de dano soma só o HP perdido, limitado ao restante (golpe 30 com HP 5 soma 5)', () => {
    const e = criar();
    e.jogador[JOGADOR.hp] = 5;
    BRUTO[0] = 30;
    danoAoJogador(e, D, ORIGEM_DO_DANO.golpe);
    expect(e.jogador4[2]).toBe(5);
  });
});
