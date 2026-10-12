// Prompts de esquiva e de aparo, `?inicio` e `tutoriaisCumpridos` (design/decisoes-F-006.md §6, TU1, TU2, TU5, TU7):
// o gatilho é o evento `telegrafo`, nunca o relógio; a esquiva aceita e o aparo bem-sucedido cumprem; o bit
// pré-visto nunca acende. O Oco Grande sozinho a 70 px telegrafa em T = 1.
import { describe, expect, it } from 'vitest';
import { removerInimigo } from '../../../src/logica/mundo/inimigos';
import { CAB, CENARIO, JOGADOR3, JOGADOR3_U8, JOGADOR_U8, PROMPT, TODOS_OS_TUTORIAIS, TUTORIAL, criarEstado, tutoriaisCumpridos, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { DADOS_DA_CHARNECA, PARADO } from '../apoio';
import { D_LIVRE as D, TIPO, aparoEm, criar, esquivaEm, eventosDe, fonteDeAcoes, slotsVivos } from './apoio';

const ATQ = CENARIO.diretorDesligado | CENARIO.ataques;
const GRANDE = [{ codigo: TIPO.oco_grande, dx: 0, dy: -70 }];
const NOVICA = [{ codigo: TIPO.novica_de_sal, dx: 0, dy: -190 }];
const esquiva = (e: Estado): number => e.jogador3U8[JOGADOR3_U8.promptEsquiva]!;
const aparo = (e: Estado): number => e.jogador3U8[JOGADOR3_U8.promptAparo]!;
const passo = (e: Estado): number => e.cab[CAB.passo]!;
const rodar = (e: Estado, fonte = PARADO, n = 1): void => void avancar(e, D, fonte, n);
const ateOTelegrafo = (e: Estado, fonte = PARADO): number => {
  for (let i = 0; i < 400 && eventosDe(e, EVENTO.telegrafo).length === 0; i++) rodar(e, fonte);
  return eventosDe(e, EVENTO.telegrafo)[0]!.passo;
};

describe('prompt de esquiva (TU1)', () => {
  it('antes do 1º telegrafo fica aguardando, mesmo com o relógio em 3.700; no passo T vira visível', () => {
    const longe = criar({ tutoriaisVistos: 0, cenario: ATQ, relogioInicial: 3700, inicioLivre: true, inimigos: [{ codigo: TIPO.oco_grande, dx: 0, dy: -450 }] });
    rodar(longe, PARADO, 30);
    expect(longe.cab[CAB.relogio]).toBeGreaterThanOrEqual(3700);
    expect(esquiva(longe)).toBe(PROMPT.aguardando);
    const e = criar({ tutoriaisVistos: 0, cenario: ATQ, inimigos: GRANDE });
    expect(esquiva(e)).toBe(PROMPT.aguardando);
    const t = ateOTelegrafo(e);
    expect(passo(e)).toBe(t);
    expect(esquiva(e)).toBe(PROMPT.visivel);
  });

  it('segue visível depois do golpe e da morte do Oco Grande; a esquiva aceita o cumpre', () => {
    const e = criar({ tutoriaisVistos: 0, cenario: ATQ, inimigos: GRANDE });
    const t = ateOTelegrafo(e);
    while (passo(e) < t + 40) rodar(e);
    expect(eventosDe(e, EVENTO.golpeInimigo).length).toBe(1);
    expect(esquiva(e)).toBe(PROMPT.visivel);
    removerInimigo(e, slotsVivos(e)[0]!);
    rodar(e, PARADO, 5);
    expect(esquiva(e)).toBe(PROMPT.visivel);
    rodar(e, fonteDeAcoes([esquivaEm(passo(e))]));
    expect(eventosDe(e, EVENTO.esquiva).length).toBe(1);
    expect(esquiva(e)).toBe(PROMPT.cumprido);
  });

  it('a esquiva negada por stamina não cumpre', () => {
    const e = criar({ tutoriaisVistos: 0, cenario: ATQ, inimigos: GRANDE, staminaInicial: 10 });
    const t = ateOTelegrafo(e);
    rodar(e, fonteDeAcoes([esquivaEm(t)]));
    expect(eventosDe(e, EVENTO.acaoNegada).length).toBe(1);
    expect(esquiva(e)).toBe(PROMPT.visivel);
  });

  it('com o bit pré-visto nunca aparece', () => {
    const e = criar({ tutoriaisVistos: TUTORIAL.esquiva, cenario: ATQ, inimigos: GRANDE });
    ateOTelegrafo(e);
    expect(esquiva(e)).toBe(PROMPT.cumprido);
    const t = criar({ tutoriaisVistos: TODOS_OS_TUTORIAIS, cenario: ATQ, inimigos: GRANDE });
    ateOTelegrafo(t);
    expect(esquiva(t)).toBe(PROMPT.cumprido);
    expect(aparo(t)).toBe(PROMPT.cumprido);
  });
});

describe('prompt de aparo (TU2)', () => {
  it('só o telegrafo de Noviça o acende; o do Oco Grande não', () => {
    const g = criar({ tutoriaisVistos: 0, cenario: ATQ, inimigos: GRANDE });
    ateOTelegrafo(g);
    expect(aparo(g)).toBe(PROMPT.aguardando);
    const n = criar({ tutoriaisVistos: TUTORIAL.mover | TUTORIAL.esquiva, cenario: ATQ, inimigos: NOVICA });
    expect(aparo(n)).toBe(PROMPT.aguardando);
    ateOTelegrafo(n);
    expect(aparo(n)).toBe(PROMPT.visivel);
    expect(esquiva(n)).toBe(PROMPT.cumprido);
  });

  it('um toque sem ataque (aparo vazio) não cumpre; o aparo bem-sucedido, sim', () => {
    const vazio = criar({ tutoriaisVistos: TUTORIAL.mover | TUTORIAL.esquiva, cenario: ATQ, inimigos: NOVICA });
    const t = ateOTelegrafo(vazio);
    // Toque com o projétil ainda longe do impacto: o aparo vazio.
    rodar(vazio, fonteDeAcoes([aparoEm(passo(vazio))]), 20);
    expect(eventosDe(vazio, EVENTO.aparoVazio).length).toBe(1);
    expect(aparo(vazio)).toBe(PROMPT.visivel);
    expect(passo(vazio)).toBeGreaterThan(t);
    // O Oco Grande sozinho, com o toque na janela do golpe (h = 37).
    const ok = criar({ tutoriaisVistos: TUTORIAL.mover | TUTORIAL.esquiva, cenario: ATQ, inimigos: GRANDE });
    ok.jogador3U8[JOGADOR3_U8.promptAparo] = PROMPT.visivel;
    // Toque em c = 30: aparoEm(c − 1) lê o comando no passo c; a janela cobre o golpe em h = 37.
    rodar(ok, fonteDeAcoes([aparoEm(29)]), 45);
    expect(eventosDe(ok, EVENTO.aparo).length).toBe(1);
    expect(aparo(ok)).toBe(PROMPT.cumprido);
    expect(ok.jogador3[JOGADOR3.stamina]).toBeGreaterThan(0);
  });
});

describe('tutoriaisCumpridos (TU5)', () => {
  it('TODOS_OS_TUTORIAIS vale 7 e a função reflete os prompts cumpridos', () => {
    expect(TODOS_OS_TUTORIAIS).toBe(7);
    const e = criar({ tutoriaisVistos: 0 });
    expect(tutoriaisCumpridos(e)).toBe(0);
    e.jogadorU8[JOGADOR_U8.promptMover] = PROMPT.cumprido;
    expect(tutoriaisCumpridos(e)).toBe(TUTORIAL.mover);
    e.jogador3U8[JOGADOR3_U8.promptAparo] = PROMPT.cumprido;
    expect(tutoriaisCumpridos(e)).toBe(TUTORIAL.mover | TUTORIAL.aparo);
    e.jogador3U8[JOGADOR3_U8.promptEsquiva] = PROMPT.visivel;
    expect(tutoriaisCumpridos(e)).toBe(TUTORIAL.mover | TUTORIAL.aparo);
    expect(tutoriaisCumpridos(criar({ tutoriaisVistos: TODOS_OS_TUTORIAIS }))).toBe(7);
  });
});

describe('?inicio e inicioLivre (TU7)', () => {
  it('relógio inicial sem linha fixa lança; com inicioLivre não, e o garantido da linha nasce no 1º passo', () => {
    expect(() => criarEstado(1, DADOS_DA_CHARNECA, { relogioInicial: 3600 })).toThrow(/linha fixa/);
    const um = criarEstado(1, DADOS_DA_CHARNECA, { relogioInicial: 3600, inicioLivre: true });
    expect(um.cab[CAB.relogio]).toBe(3600);
    avancar(um, DADOS_DA_CHARNECA, PARADO, 1);
    const grandes = (e: Estado): number => slotsVivos(e).filter((s) => e.inimigos.tipo[s] === TIPO.oco_grande).length;
    const novicas = (e: Estado): number => slotsVivos(e).filter((s) => e.inimigos.tipo[s] === TIPO.novica_de_sal).length;
    expect(grandes(um)).toBeGreaterThanOrEqual(1);
    expect(novicas(um)).toBe(0);
    const tres = criarEstado(1, DADOS_DA_CHARNECA, { relogioInicial: 10800, inicioLivre: true });
    avancar(tres, DADOS_DA_CHARNECA, PARADO, 1);
    expect(novicas(tres)).toBeGreaterThanOrEqual(1);
  });
});
