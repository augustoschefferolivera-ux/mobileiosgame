// O fim da Vigília na cena (design/decisoes-F-007.md PE4, PE5, SV4, SV7, RS6): Abandonar com dois toques, crédito do meta
// uma vez, telemetria, Voltar e Repetir, opções e tutorial gravados. A cena roda sem Phaser de verdade: só os métodos
// do fim, com a simulação real e os vizinhos (Resultado, scene, tradutor) falsos.
import './ambientePhaser';
import { describe, expect, it, vi } from 'vitest';
import type { ContextoDoJogo, Simulacao } from '../../src/cenas/contexto';
import { Vigilia } from '../../src/cenas/Vigilia';
import { TradutorDeGestos } from '../../src/entrada/tradutorDeGestos';
import { FilaDeToques } from '../../src/entrada/filaDeToques';
import { criarAcumulador } from '../../src/logica/nucleo/acumulador';
import { criarCameraLenta } from '../../src/logica/nucleo/cameraLenta';
import { criarComandos, fonteConstante } from '../../src/logica/nucleo/comandos';
import { CAUSA_DO_FIM, FASE, JOGADOR, JOGADOR4_U8, JOGADOR_U8, PROGRESSAO, PROMPT, TUTORIAL, criarEstado } from '../../src/logica/nucleo/estado';
import { MARCO, metaPadrao } from '../../src/logica/save/meta';
import { ArmazenamentoDoMeta, CHAVE_DO_META } from '../../src/plataforma/armazenamento';
import { RegistroDeTelemetria } from '../../src/plataforma/telemetria';
import { DADOS_SEM_OBSTACULOS as D } from '../logica/apoio';

interface Interno {
  sim: Simulacao;
  resultadoIniciado: boolean;
  tocarAbandonar(): void;
  verificarFase(): void;
  alternarOpcao(q: 'numerosDeDano' | 'som' | 'flashes'): void;
  persistirTutoriais(): void;
  tratarToqueDoResultado(b: string): void;
  fecharBalaoDasCinzas(): void;
  fecharPausa(): void;
  abrirPausa(origem: 'botao' | 'gesto'): void;
  desarmarAbandonar(toque: string | null): void;
  scene: unknown;
  game: unknown;
}

function montar(almas = 100, ctxExtra: Partial<ContextoDoJogo> = {}) {
  const gravado = new Map<string, string>();
  const armazenamento = new ArmazenamentoDoMeta({ getItem: (k) => gravado.get(k) ?? null, setItem: (k, v) => void gravado.set(k, v) });
  const ctx = {
    seed: 7,
    pularTutoriais: false,
    vistos: null,
    cenario: null,
    meta: { armazenamento, atual: metaPadrao() },
    telemetria: new RegistroDeTelemetria(),
    opcoes: { numerosDeDano: true, som: true, flashes: true },
    entrada: { fila: new FilaDeToques(), tradutor: new TradutorDeGestos() },
    tela: 'VIGILIA',
    ...ctxExtra,
  } as unknown as ContextoDoJogo;
  const estado = criarEstado(1, D, { almasIniciais: almas, armas: [], cenario: 1 });
  const sim: Simulacao = {
    estado,
    dados: D,
    acumulador: criarAcumulador(),
    comandosAoVivo: criarComandos(),
    fonte: fonteConstante(criarComandos()),
    camera: { x: 0, y: 0 },
    pausada: false,
    pausa: { ativa: false, origem: null, alfa: 0, abandonarArmado: false },
    modal: { selecionada: null },
    cameraLenta: criarCameraLenta(),
    fimCreditado: false,
    gravador: null,
    idVigilia: 0,
    resultado: null,
    horda: null,
    efeitos: null,
  };
  ctx.simulacao = sim;
  const resultado = { mostrarApagando: vi.fn(), mostrarResultado: vi.fn(), esconder: vi.fn(), balaoAberto: true, fecharBalao: vi.fn() };
  const pausaCena = { mostrar: vi.fn(), esconder: vi.fn() };
  const hud = { sys: { setVisible: vi.fn() } };
  const cena = { start: vi.fn(), restart: vi.fn(), hud, get: (k: string) => (k === 'Pausa' ? pausaCena : k === 'Hud' ? hud : resultado) };
  const v = new Vigilia(ctx) as unknown as Interno;
  v.sim = sim;
  v.scene = cena;
  v.game = { sound: { setMute: vi.fn() } };
  return { v, ctx, sim, estado, resultado, cena, gravado };
}

describe('Abandonar (PE4, PE5)', () => {
  it('o 1º toque arma sem tocar o estado; o 2º confirma e roda o passo com o bit 16: FIM, causa abandonar', () => {
    const { v, sim, estado, resultado } = montar();
    v.tocarAbandonar();
    expect([sim.pausa.abandonarArmado, estado.jogador4U8[JOGADOR4_U8.fase]]).toEqual([true, FASE.viva]);
    expect(resultado.mostrarResultado).not.toHaveBeenCalled();
    v.tocarAbandonar();
    expect([sim.pausa.abandonarArmado, estado.jogador4U8[JOGADOR4_U8.fase], estado.jogador4U8[JOGADOR4_U8.causaDoFim]]).toEqual([false, FASE.fim, CAUSA_DO_FIM.abandonar]);
    expect(resultado.mostrarResultado).toHaveBeenCalledTimes(1);
    expect(resultado.mostrarApagando).not.toHaveBeenCalled();
  });

  it('com a pausa aberta, o Abandonar fecha a pausa e o tradutor passa ao modo do Resultado', () => {
    const { v, ctx, sim } = montar();
    sim.pausa.ativa = true;
    ctx.entrada.tradutor.mudarModo('pausa');
    v.tocarAbandonar();
    v.tocarAbandonar();
    expect([sim.pausa.ativa, ctx.entrada.tradutor.modo, ctx.tela]).toEqual([false, 'resultado', 'RESULTADO']);
  });
});

describe('Abandonar armado é desarmado por outro toque (PE4; críticos M72 e M73)', () => {
  it('Continuar, Som, Flashes e Números desarmam; o próprio Abandonar e nenhum toque mantêm; fora da pausa nada muda', () => {
    const { v, sim } = montar();
    for (const [pausa, toque, esperado] of [
      [true, 'continuar', false],
      [true, 'som', false],
      [true, 'flashes', false],
      [true, 'numeros', false],
      [true, 'abandonar', true],
      [true, null, true],
      [false, 'som', true],
    ] as const) {
      sim.pausa.ativa = pausa;
      sim.pausa.abandonarArmado = true;
      v.desarmarAbandonar(toque);
      expect(sim.pausa.abandonarArmado, `${pausa} ${toque}`).toBe(esperado);
    }
  });

  it('um 2º toque no Abandonar depois de Som não abandona: arma de novo e a Vigília segue VIVA', () => {
    const { v, sim, estado } = montar();
    sim.pausa.ativa = true;
    v.tocarAbandonar();
    v.desarmarAbandonar('som');
    v.tocarAbandonar();
    expect([sim.pausa.abandonarArmado, estado.jogador4U8[JOGADOR4_U8.fase]]).toEqual([true, FASE.viva]);
  });

  it('abrir a pausa e Continuar desarmam (o toque do jogador reabre desarmado) e a Hud some e volta', () => {
    const { v, sim, cena } = montar();
    sim.pausa.abandonarArmado = true;
    v.abrirPausa('botao');
    expect([sim.pausa.ativa, sim.pausa.abandonarArmado]).toEqual([true, false]);
    expect(cena.hud.sys.setVisible).toHaveBeenLastCalledWith(false);
    sim.pausa.abandonarArmado = true;
    v.fecharPausa();
    expect([sim.pausa.ativa, sim.pausa.abandonarArmado]).toEqual([false, false]);
    expect(cena.hud.sys.setVisible).toHaveBeenLastCalledWith(true);
  });
});

describe('crédito do meta uma vez (SV7)', () => {
  it('Abandonar com 100 Almas leva 50 ao Santuário, grava em vdc.meta e não credita de novo em chamadas repetidas', () => {
    const { v, ctx, sim, gravado } = montar(100);
    v.tocarAbandonar();
    v.tocarAbandonar();
    const m = ctx.meta.atual;
    expect([m.almas, m.mancha, m.vigiliasConcluidas, m.primeiroApagarFeito, m.seq]).toEqual([50, null, 1, false, 1]);
    expect(JSON.parse(gravado.get(CHAVE_DO_META)!).almas).toBe(50);
    v.verificarFase();
    v.verificarFase();
    expect(ctx.meta.atual.almas).toBe(50);
    expect(ctx.meta.atual.seq).toBe(1);
    expect(sim.resultado?.almasAoSantuario).toBe(50);
  });

  it('o Apagar (HP 0 → APAGANDO → FIM): 100 Almas dão 30 na mancha e 70 ao Santuário, e liga o primeiro Apagar', () => {
    const { v, ctx, sim, estado, resultado } = montar(100);
    estado.jogador[JOGADOR.hp] = 0;
    estado.jogador4U8[JOGADOR4_U8.fase] = FASE.apagando;
    v.verificarFase();
    expect(resultado.mostrarApagando).toHaveBeenCalledTimes(1);
    expect(sim.fimCreditado).toBe(false);
    estado.jogador4U8[JOGADOR4_U8.fase] = FASE.fim;
    estado.jogador4U8[JOGADOR4_U8.causaDoFim] = CAUSA_DO_FIM.apagar;
    v.verificarFase();
    v.verificarFase();
    const m = ctx.meta.atual;
    expect([m.almas, m.mancha?.almas, m.primeiroApagarFeito, m.vigiliasConcluidas]).toEqual([300, 30, true, 1]); // 70 + a garantia do 1º Apagar (GA1)
    expect(resultado.mostrarApagando).toHaveBeenCalledTimes(1);
    const [e] = ctx.telemetria.eventos().filter((x) => x.evento === 'apagar');
    expect([e!.campos['almas'], e!.campos['causa'], e!.campos['nivel']]).toEqual([100, 'apagar', estado.progresso[PROGRESSAO.nivel]]);
  });
});

describe('Voltar e Repetir (RS6)', () => {
  it('Voltar vai ao Santuário (F-010 SN2) com seed nova; Repetir sorteia seed nova e reinicia a Vigília', () => {
    const { v, ctx, cena } = montar();
    v.tratarToqueDoResultado('voltar');
    expect(cena.start).toHaveBeenCalledWith('Santuario');
    const seed = ctx.seed;
    v.tratarToqueDoResultado('repetir');
    expect(cena.restart).toHaveBeenCalledTimes(1);
    expect(ctx.seed).not.toBe(seed);
  });
});

describe('opções e tutoriais no meta (SV4, SV6)', () => {
  it('alternar uma opção grava na hora do toque e a próxima leitura a devolve', () => {
    const { v, ctx, gravado } = montar();
    v.alternarOpcao('som');
    expect(ctx.opcoes.som).toBe(false);
    expect(JSON.parse(gravado.get(CHAVE_DO_META)!).opcoes).toEqual({ som: false, flashes: true, numerosDeDano: true });
    expect(ctx.meta.armazenamento.ler().opcoes.som).toBe(false);
  });

  it('o tutorial cumprido grava a máscara uma vez por bit novo; ?tutorial=0 e ?cenario não gravam', () => {
    const { v, ctx, estado, gravado } = montar();
    v.persistirTutoriais();
    expect(gravado.has(CHAVE_DO_META)).toBe(false);
    estado.jogadorU8[JOGADOR_U8.promptMover] = PROMPT.cumprido;
    v.persistirTutoriais();
    v.persistirTutoriais();
    expect([ctx.meta.atual.tutoriais, ctx.meta.atual.seq]).toEqual([TUTORIAL.mover, 1]);
    const outro = montar(0, { pularTutoriais: true });
    outro.estado.jogadorU8[JOGADOR_U8.promptMover] = PROMPT.cumprido;
    outro.v.persistirTutoriais();
    expect(outro.gravado.has(CHAVE_DO_META)).toBe(false);
  });
});

describe('balão das Cinzas (F-010 GA3)', () => {
  const apagar = (v: Interno, estado: ReturnType<typeof montar>['estado']): void => {
    estado.jogador4U8[JOGADOR4_U8.fase] = FASE.fim;
    estado.jogador4U8[JOGADOR4_U8.causaDoFim] = CAUSA_DO_FIM.apagar;
    v.verificarFase();
  };

  it('o 1º Apagar pede o balão (com ou sem mancha); com o marco já ligado, não', () => {
    const a = montar(100);
    apagar(a.v, a.estado);
    expect(a.resultado.mostrarResultado).toHaveBeenCalledWith(expect.anything(), true);
    const b = montar(100, { meta: { armazenamento: montar().ctx.meta.armazenamento, atual: { ...metaPadrao(), marcos: MARCO.balaoCinzas } } });
    apagar(b.v, b.estado);
    expect(b.resultado.mostrarResultado).toHaveBeenCalledWith(expect.anything(), false);
  });

  it('Abandonar nunca pede o balão', () => {
    const { v, resultado } = montar(100);
    v.tocarAbandonar();
    v.tocarAbandonar();
    expect(resultado.mostrarResultado).toHaveBeenCalledWith(expect.anything(), false);
  });

  it('o toque fecha o balão e grava o marco no meta (uma vez)', () => {
    const { v, ctx, resultado, gravado } = montar(100);
    v.fecharBalaoDasCinzas();
    expect(resultado.fecharBalao).toHaveBeenCalledTimes(1);
    expect(ctx.meta.atual.marcos & MARCO.balaoCinzas).toBe(MARCO.balaoCinzas);
    expect(JSON.parse(gravado.get(CHAVE_DO_META)!).marcos).toBe(MARCO.balaoCinzas);
  });
});
