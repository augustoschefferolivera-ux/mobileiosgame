// Telemetria `frasco` e `dano_recebido` (design/decisoes-F-007.md TL1): lida do anel como `esquiva` e `aparo`.
import { describe, expect, it } from 'vitest';
import { JANELA_DO_CONTATO, TelemetriaDeCombate } from '../../src/cenas/telemetriaDeCombate';
import { BRUTO, ORIGEM_DO_DANO, danoAoJogador } from '../../src/logica/mundo/contato';
import { nascerInimigo } from '../../src/logica/mundo/inimigos';
import { TIPO } from '../../src/logica/mundo/tipos';
import { ACAO } from '../../src/logica/nucleo/comandos';
import { CAB, CENARIO, JOGADOR, criarEstado, type Estado } from '../../src/logica/nucleo/estado';
import { avancar } from '../../src/logica/nucleo/passo';
import { CAPACIDADE_DA_TELEMETRIA, RegistroDeTelemetria, TETO_POR_FONTE } from '../../src/plataforma/telemetria';
import { DADOS_BRUTOS as D, DADOS_DA_CHARNECA, PARADO } from '../logica/apoio';
import { fonteDeAcoes } from '../logica/combate/apoio';

const BASE = { cenario: CENARIO.diretorDesligado, armas: [] };
const linhas = (r: RegistroDeTelemetria, nome: string) => r.eventos().filter((x) => x.evento === nome);

function bater(e: Estado, bruto: number, origem: number): void {
  BRUTO[0] = bruto;
  danoAoJogador(e, D, origem);
}

describe('frasco: uma linha por uso (TL1)', () => {
  it('minuto e HP antes, uma linha por toque que inicia; o negado não grava', () => {
    const e = criarEstado(1, D, BASE);
    e.jogador[JOGADOR.hp] = 30;
    const r = new RegistroDeTelemetria();
    const tele = new TelemetriaDeCombate();
    avancar(e, D, fonteDeAcoes([{ passo: 0, acoes: ACAO.frasco }, { passo: 5, acoes: ACAO.frasco }]), 10);
    tele.ler(e, r);
    expect(linhas(r, 'frasco').map((x) => x.campos)).toEqual([{ minuto: 0, hp_antes: 30 }]);
    tele.ler(e, r);
    expect(linhas(r, 'frasco')).toHaveLength(1);
  });
});

describe('dano_recebido: golpe e projétil uma linha cada, contato agregado (TL1)', () => {
  it('golpe e projétil: fonte, minuto e HP restante (ceil)', () => {
    const e = criarEstado(1, D, BASE);
    const r = new RegistroDeTelemetria();
    const tele = new TelemetriaDeCombate();
    bater(e, 20, ORIGEM_DO_DANO.golpe);
    bater(e, 10.5, ORIGEM_DO_DANO.projetil);
    tele.ler(e, r);
    expect(linhas(r, 'dano_recebido').map((x) => x.campos)).toEqual([
      { fonte: 'golpe', minuto: 0, hp_restante: 130 },
      { fonte: 'projetil', minuto: 0, hp_restante: 120 },
    ]);
  });

  it('a janela do contato é a do dado (5 s = 300 passos) e o teto é o do dado (128)', () => {
    expect(JANELA_DO_CONTATO).toBe(DADOS_DA_CHARNECA.combate.telemetriaAgregacaoPassos);
    expect(TETO_POR_FONTE).toBe(DADOS_DA_CHARNECA.combate.telemetriaTeto);
  });

  it('horda de 3.600 passos com HP que não acaba: 12 linhas de contato (uma a cada 5 s), nenhuma por acerto', () => {
    const e = criarEstado(1, D, BASE);
    const j = e.jogador;
    nascerInimigo(e, D, TIPO.oco_das_lanternas, j[JOGADOR.x]! + 32, j[JOGADOR.y]!, false);
    const r = new RegistroDeTelemetria();
    const tele = new TelemetriaDeCombate();
    for (let p = 0; p < 3600; p++) {
      j[JOGADOR.hp] = 100;
      avancar(e, D, PARADO, 1);
      if (p % 7 === 0) tele.ler(e, r);
    }
    tele.ler(e, r);
    const contato = linhas(r, 'dano_recebido').filter((x) => x.campos['fonte'] === 'contato');
    expect(contato.length).toBeGreaterThanOrEqual(11);
    expect(contato.length).toBeLessThanOrEqual(12);
    expect(contato.every((x) => x.campos['hp_restante'] === 99)).toBe(true);
    expect(e.cab[CAB.passo]).toBe(3600);
  });

  it('a borda da janela (críticos M77): a linha fecha com exatamente 300 passos, não com 299, pela leitura e pelo contato seguinte', () => {
    const contatoNoPasso = (p: number) => {
      const e = criarEstado(1, D, BASE);
      e.cab[CAB.passo] = p;
      bater(e, 1.5, ORIGEM_DO_DANO.contato);
      return e;
    };
    // Só a leitura do quadro (sem contato novo): fecha em 10 + 300.
    for (const [agora, linhasEsperadas] of [[10 + JANELA_DO_CONTATO - 1, 0], [10 + JANELA_DO_CONTATO, 1]] as const) {
      const e = contatoNoPasso(10);
      const r = new RegistroDeTelemetria();
      const tele = new TelemetriaDeCombate();
      tele.ler(e, r);
      e.cab[CAB.passo] = agora;
      tele.ler(e, r);
      expect(linhas(r, 'dano_recebido'), `leitura em ${agora}`).toHaveLength(linhasEsperadas);
    }
    // O contato novo no passo 309 entra na mesma janela; no 310 fecha a anterior e abre outra.
    for (const [novo, linhasEsperadas] of [[10 + JANELA_DO_CONTATO - 1, 0], [10 + JANELA_DO_CONTATO, 1]] as const) {
      const e = contatoNoPasso(10);
      const r = new RegistroDeTelemetria();
      const tele = new TelemetriaDeCombate();
      tele.ler(e, r);
      e.cab[CAB.passo] = novo;
      bater(e, 1.5, ORIGEM_DO_DANO.contato);
      // Mede só o ramo do contato novo: lê com o passo ainda dentro da janela da nova linha.
      tele.ler(e, r);
      expect(linhas(r, 'dano_recebido'), `contato em ${novo}`).toHaveLength(linhasEsperadas);
      // A linha fechada é a da janela antiga: o HP dela é o do 1º contato (150 − 1,5 → 149), não o do contato novo (147).
      if (linhasEsperadas === 1) expect(linhas(r, 'dano_recebido')[0]!.campos['hp_restante']).toBe(149);
    }
  });

  it('a linha que zera o HP entra na hora, mesmo no meio da janela', () => {
    const e = criarEstado(1, D, BASE);
    const r = new RegistroDeTelemetria();
    const tele = new TelemetriaDeCombate();
    e.jogador[JOGADOR.hp] = 2;
    bater(e, 1.5, ORIGEM_DO_DANO.contato);
    tele.ler(e, r);
    expect(linhas(r, 'dano_recebido')).toHaveLength(0);
    bater(e, 1.5, ORIGEM_DO_DANO.contato);
    tele.ler(e, r);
    expect(linhas(r, 'dano_recebido').map((x) => x.campos)).toEqual([{ fonte: 'contato', minuto: 0, hp_restante: 0 }]);
  });
});

describe('teto de 128 por fonte (TL1)', () => {
  it('nenhuma fonte expulsa `frasco` nem `apagar`: pior caso 769 < 1.024', () => {
    const r = new RegistroDeTelemetria();
    r.registrar('frasco', 1, { minuto: 0, hp_antes: 10 });
    r.registrar('apagar', 2, { minuto: 0, nivel: 1, almas: 0, causa: 'apagar', posicao: [0, 0] });
    for (let k = 0; k < 400; k++) {
      for (const fonte of ['golpe', 'projetil', 'contato']) r.registrar('dano_recebido', 10 + k, { fonte, minuto: 0, hp_restante: 100 });
      r.registrar('esquiva', 10 + k, { minuto: 0, perfeita: false, peso: 'leve' });
      r.registrar('aparo', 10 + k, { minuto: 0, sucesso: true, alvo: null });
    }
    const todas = r.eventos();
    for (const fonte of ['golpe', 'projetil', 'contato']) expect(todas.filter((x) => x.evento === 'dano_recebido' && x.campos['fonte'] === fonte)).toHaveLength(TETO_POR_FONTE);
    expect(linhas(r, 'esquiva')).toHaveLength(TETO_POR_FONTE);
    expect(linhas(r, 'aparo')).toHaveLength(TETO_POR_FONTE);
    expect(linhas(r, 'frasco')).toHaveLength(1);
    expect(linhas(r, 'apagar')).toHaveLength(1);
    expect(todas.length).toBeLessThan(CAPACIDADE_DA_TELEMETRIA);
  });

  it('o teto guarda as mais novas: sai a mais antiga da mesma fonte', () => {
    const r = new RegistroDeTelemetria();
    for (let k = 0; k < 130; k++) r.registrar('frasco', k, { minuto: k, hp_antes: 1 });
    const f = linhas(r, 'frasco');
    expect(f).toHaveLength(TETO_POR_FONTE);
    expect(f[0]!.campos['minuto']).toBe(2);
    expect(f[f.length - 1]!.campos['minuto']).toBe(129);
  });

  it('o anel global de 1.024 continua valendo para as fontes sem teto', () => {
    const r = new RegistroDeTelemetria();
    for (let k = 0; k < 1100; k++) r.registrar('level_up', k, { minuto: 0, nivel: 1, cartas_oferecidas: [], carta_escolhida: 'x', reroll_usado: false });
    expect(r.eventos()).toHaveLength(CAPACIDADE_DA_TELEMETRIA);
  });
});
