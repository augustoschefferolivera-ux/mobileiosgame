// Zero alocação no caminho quente (B §3.13; design/decisoes-F-003.md §8, E4):
// com o HeapProfiler.startSampling do node:inspector (intervalo de 64 B,
// contando também o que os GCs coletaram), 6.000 passos do cenário horda (300
// vivos, jogador parado) mais 6.000 quadros de prepararHorda e do escritor GPU
// sobre o gl falso, depois de um aquecimento, somam os bytes amostrados em
// funções de src/. O limite é o do ADR-0005: medido 8,5 a 9,2 B/passo em 3
// rodadas, quase tudo do tiering do V8 e dos getters de import do Vitest; a
// mutação "um new Float32Array(2) por passo" mede ≈ 210 B/passo e reprova.
// Antes de os laços por inimigo escreverem as contas em linha, eram ≈ 48 KB por
// passo de HeapNumbers. O que se mede é o V8: no JSC (iPhone), um double não
// vira objeto ao passar por uma chamada.
// O caminho de nascer e liberar fica com o teste de heap de 60 s (F-003.7).
import { criarCena } from './phaserFalso';
import { Session } from 'node:inspector/promises';
import { describe, expect, it } from 'vitest';
import inimigos from '../../src/dados/inimigos.json';
import { HordaPorGPU } from '../../src/cenas/render/escritores';
import { MEMBROS_DAS_ARMAS, MEMBROS_DOS_DIGITOS, prepararArmas, prepararMortes, prepararNumeros, prepararStatus } from '../../src/cenas/render/armas';
import { MEMBROS_DO_MUNDO, prepararMundo } from '../../src/cenas/render/pickups';
import { MEMBROS_DOS_MEDIOS, MEMBROS_DOS_PROJETEIS_INIMIGOS, MEMBROS_DOS_TELEGRAFOS, prepararMedios, prepararProjeteisInimigos, prepararTelegrafos } from '../../src/cenas/render/ataques';
import { CamadaPorGPU, criarSaidaDeSprites } from '../../src/cenas/render/camadas';
import { CAPACIDADE_DE_MORTES, EfeitosDaVigilia } from '../../src/cenas/render/efeitos';
import { criarSaidaDaHorda, criarTabelaDeDesenho, prepararHorda } from '../../src/cenas/render/horda';
import { BRUTO, ORIGEM_DO_DANO, danoAoJogador } from '../../src/logica/mundo/contato';
import { CAB, CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PICKUPS, CENARIO, FASE, JOGADOR, JOGADOR4_U8, MUNDO, MUNDO2, PROGRESSAO, TIPO_DE_PICKUP, TODOS_OS_TUTORIAIS, TIPO_DE_PROJETIL, criarEstado, type ParametrosDaVigilia } from '../../src/logica/nucleo/estado';
import { ACAO, criarComandos, fonteConstante, fonteDoRoteiro, type AcaoDeRoteiro } from '../../src/logica/nucleo/comandos';
import { EVENTO, LeitorDeEventos, inicioDoEvento } from '../../src/logica/nucleo/eventos';
import { PASSIVA } from '../../src/logica/progressao/tabela';
import { avancar } from '../../src/logica/nucleo/passo';
import { ARMA } from '../../src/logica/armas/tabela';
import { alocar, quantosAtivos } from '../../src/logica/nucleo/pool';
import { nascerInimigo } from '../../src/logica/mundo/inimigos';
import { FASE_DO_ATAQUE, TIPO } from '../../src/logica/mundo/tipos';
import { parametrosDoCenario } from '../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D, PARADO } from '../logica/apoio';

/** Limite, em bytes por passo + quadro (ADR-0005). */
const LIMITE = 16;
const AQUECIMENTO = 3000;
const AQUECIMENTO_COM_ARMAS = 9000;
/**
 * E6 da F-005: com a União matando mais, o caminho de nascer e a aura só ficam otimizados lá pelo passo 10.000 e
 * a criarOnda (um golpe por vez) segue no interpretador; com 9.000 passos, 109 B/passo; com 18.000, ≈ 60.
 */
const AQUECIMENTO_DA_UNIAO = 27000;
/**
 * E7a e E7b (VT6): começou em 9.000 e subiu até onde a medida exigiu. Com 9.000 a 36.000 passos o E7a mede 17 a 22 B por
 * passo (o caminho de nascer ainda no interpretador) e o E7b, com a esquiva movendo o jogador, 1.400 a 5.500 B por passo
 * (moverHorda e golpear desotimizadas por ramos novos, que o V8 leva milhares de passos para reotimizar); com 63.000,
 * 8,7 B no E7a e 2,5 e 6,2 B no E7b, iguais em 2 rodadas (ADR-0008).
 */
const AQUECIMENTO_DOS_ATAQUES = 63000;
const MEDIDOS = 6000;

interface No {
  callFrame: { functionName: string; url: string; lineNumber: number };
  selfSize: number;
  children: No[];
}

/** Roda `rodar(n)` com o HeapProfiler amostrando e devolve os bytes em funções de src/ por passo e as 5 maiores. */
async function medir(rodar: (n: number) => void, aquecimento = AQUECIMENTO, medidos = MEDIDOS): Promise<{ porPasso: number; total: number; maiores: string[] }> {
  rodar(aquecimento);
  const sessao = new Session();
  sessao.connect();
  await sessao.post('HeapProfiler.startSampling', {
    samplingInterval: 64,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  } as never);
  rodar(medidos);
  const { profile } = (await sessao.post('HeapProfiler.stopSampling')) as unknown as { profile: { head: No } };
  sessao.disconnect();
  const porFuncao = new Map<string, number>();
  let nossos = 0;
  const visitar = (n: No): void => {
    const url = n.callFrame.url;
    if (n.selfSize > 0 && url.includes('/src/')) {
      nossos += n.selfSize;
      const chave = `${n.callFrame.functionName || '(anônima)'} ${url.slice(url.indexOf('/src/'))}:${n.callFrame.lineNumber + 1}`;
      porFuncao.set(chave, (porFuncao.get(chave) ?? 0) + n.selfSize);
    }
    n.children.forEach(visitar);
  };
  visitar(profile.head);
  const maiores = [...porFuncao.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([f, b]) => `${f}: ${(b / medidos).toFixed(1)} B/passo`);
  return { porPasso: nossos / medidos, total: nossos, maiores };
}

describe('alocação no caminho quente (E4)', () => {
  it(`cenário horda, ${MEDIDOS} passos e quadros: ≤ ${LIMITE} B por passo em funções de src/`, async () => {
    const e = criarEstado(1, D, { ...parametrosDoCenario('horda'), teto: 300 });
    const { cena } = criarCena();
    const escritor = new HordaPorGPU(cena, false);
    const tabela = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
    const saida = criarSaidaDaHorda();
    // A 2ª camada de médios (F-006 RE8): o escritor GPU de 500 membros, escrito a cada quadro.
    const medios = { gpu: new CamadaPorGPU(cena, MEMBROS_DOS_MEDIOS, false), saida: criarSaidaDeSprites(MEMBROS_DOS_MEDIOS) };
    const { porPasso, maiores } = await medir((n) => {
      for (let k = 0; k < n; k++) {
        avancar(e, D, PARADO, 1);
        prepararHorda(e, 0.5, 585, 1266, saida);
        escritor.escrever(saida, tabela);
        prepararMedios(e, saida, tabela, D, 0.5, medios.saida);
        medios.gpu.escrever(medios.saida);
      }
    });
    expect(quantosAtivos(e.pool)).toBe(300);
    expect(porPasso, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
  }, 120_000);

  // E6 (design/decisoes-F-004.md §8): com as armas matando, o diretor repõe o tempo todo e o caminho de nascer
  // fica morno. Aquecimento de 9.000 passos (2,5 min de jogo): com 3.000, as funções da aura e da salva, que
  // retornam cedo na maioria dos passos, ainda não foram otimizadas pelo TurboFan e o interpretador guarda cada
  // double como objeto (≈ 215 B/passo medidos); com 9.000 e o render das armas (consumidor do anel, preparos e as 4
  // camadas GPU novas), 12,6 a 13,2 B/passo em 3 rodadas, quase tudo no caminho de nascer (funções chamadas a cada
  // reposição, que ficam no interpretador).
  it(`com as 3 armas no nv8 matando na linha 19 (E6), ${MEDIDOS} passos e quadros: ≤ ${LIMITE} B por passo, sem lista branca`, async () => {
    const e = criarEstado(1, D, { ...parametrosDoCenario('tres_armas'), linhaFixa: 19, teto: 300 });
    const { cena } = criarCena();
    const escritor = new HordaPorGPU(cena, false);
    const tabela = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
    const saida = criarSaidaDaHorda();
    // O render das armas: o mundo (obstáculos e pickups), o consumidor do anel, os preparos e os escritores GPU das 4 camadas novas.
    const ef = new EfeitosDaVigilia(D.tipos);
    const camada = (n: number) => ({ gpu: new CamadaPorGPU(cena, n, false), saida: criarSaidaDeSprites(n) });
    const mundo = camada(MEMBROS_DO_MUNDO);
    const [mortes, status, armas, digitos] = [camada(CAPACIDADE_DE_MORTES), camada(CAPACIDADE_DE_INIMIGOS), camada(MEMBROS_DAS_ARMAS), camada(MEMBROS_DOS_DIGITOS)];
    // As 3 camadas da F-006: a 2ª de médios, os telegrafos e os projéteis inimigos.
    const [medios, telegrafos, projeteis] = [camada(MEMBROS_DOS_MEDIOS), camada(MEMBROS_DOS_TELEGRAFOS), camada(MEMBROS_DOS_PROJETEIS_INIMIGOS)];
    const { porPasso, maiores } = await medir((n) => {
      for (let k = 0; k < n; k++) {
        avancar(e, D, PARADO, 1);
        prepararMundo(e, D, 0.5, 585, 1266, mundo.saida);
        mundo.gpu.escrever(mundo.saida);
        ef.consumir(e, true);
        prepararHorda(e, 0.5, 585, 1266, saida);
        escritor.escrever(saida, tabela);
        prepararMortes(ef, e, 0.5, 585, 1266, tabela, mortes.saida);
        mortes.gpu.escrever(mortes.saida);
        prepararMedios(e, saida, tabela, D, 0.5, medios.saida);
        medios.gpu.escrever(medios.saida);
        prepararStatus(e, saida, status.saida);
        status.gpu.escrever(status.saida);
        prepararTelegrafos(e, D, saida, 0.5, telegrafos.saida);
        telegrafos.gpu.escrever(telegrafos.saida);
        prepararArmas(e, D, ef, 0.5, 585, 1266, 585, 1266, armas.saida);
        armas.gpu.escrever(armas.saida);
        prepararProjeteisInimigos(e, D, 0.5, 585, 1266, projeteis.saida);
        projeteis.gpu.escrever(projeteis.saida);
        prepararNumeros(ef, e, 0.5, 585, 1266, digitos.saida);
        digitos.gpu.escrever(digitos.saida);
      }
    }, AQUECIMENTO_COM_ARMAS);
    expect(ef.leitor.perdidos).toBe(0);
    // As armas matam o tempo todo (≈ 0,03 por passo medido): o caminho de nascer e de morrer é exercitado.
    expect(e.mundo[MUNDO.mortes]! / (AQUECIMENTO_COM_ARMAS + MEDIDOS)).toBeGreaterThan(0.02);
    expect(porPasso, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
  }, 240_000);
  // F-006 RE5 a RE8: o render dos ataques com telegrafos e projéteis vivos o tempo todo (só o render): 30 médios em
  // telegrafo (Oco Grande e Noviça), 19 projéteis de Sal em voo (o máximo medido no protótipo) e o indício ligado.
  it(`render dos ataques com 30 telegrafos e 19 projéteis vivos, ${MEDIDOS} quadros: ≤ ${LIMITE} B por quadro, sem lista branca`, async () => {
    const e = criarEstado(1, D, { ...parametrosDoCenario('tres_armas'), linhaFixa: 19, teto: 300 });
    const tabela = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
    for (let k = 0; k < 30; k++) {
      const s = nascerInimigo(e, D, k % 2 === 0 ? TIPO.oco_grande : TIPO.novica_de_sal, 585 + ((k % 6) - 3) * 40, 1266 - 120 - Math.floor(k / 6) * 40, false);
      e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
      e.inimigos.ataqueTimer[s] = 1 + ((k * 7) % 30);
      e.inimigos.miraX[s] = 0;
      e.inimigos.miraY[s] = 1;
    }
    for (let k = 0; k < 19; k++) {
      const p = alocar(e.poolDeProjeteis);
      e.projeteis.x[p] = e.projeteis.xAnt[p] = 585 + 20 + k * 6;
      e.projeteis.y[p] = e.projeteis.yAnt[p] = 1266 + (k % 3) * 9;
      e.projeteis.vx[p] = -1.6;
      e.projeteis.vy[p] = 0;
      e.projeteis.tipo[p] = TIPO_DE_PROJETIL.sal;
      e.projeteis.vida[p] = 100;
    }
    const { cena } = criarCena();
    const camada = (n: number) => ({ gpu: new CamadaPorGPU(cena, n, false), saida: criarSaidaDeSprites(n) });
    const [medios, telegrafos, projeteis] = [camada(MEMBROS_DOS_MEDIOS), camada(MEMBROS_DOS_TELEGRAFOS), camada(MEMBROS_DOS_PROJETEIS_INIMIGOS)];
    const saida = criarSaidaDaHorda();
    let alfa = 0;
    const { porPasso, maiores } = await medir((n) => {
      for (let k = 0; k < n; k++) {
        alfa = (alfa + 0.37) % 1;
        e.cab[CAB.passo] = k;
        prepararHorda(e, alfa, 585, 1266, saida);
        prepararMedios(e, saida, tabela, D, alfa, medios.saida);
        medios.gpu.escrever(medios.saida);
        prepararTelegrafos(e, D, saida, alfa, telegrafos.saida);
        telegrafos.gpu.escrever(telegrafos.saida);
        prepararProjeteisInimigos(e, D, alfa, 585, 1266, projeteis.saida);
        projeteis.gpu.escrever(projeteis.saida);
      }
    });
    expect(medios.saida.visivel.reduce((a, v) => a + v, 0)).toBe(30);
    expect(telegrafos.saida.visivel.reduce((a, v) => a + v, 0)).toBe(30);
    expect(projeteis.saida.visivel.reduce((a, v) => a + v, 0)).toBe(38);
    expect(porPasso, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
  }, 120_000);
  // F-005 R1 e U6: o mundo com o pool de pickups cheio (Cinzas das 3 faixas e baús) e as ondas vivas, só o render.
  it(`render do mundo com 512 pickups e 20 ondas vivas, ${MEDIDOS} quadros: ≤ ${LIMITE} B por quadro, sem lista branca`, async () => {
    const e = criarEstado(1, D, { ...parametrosDoCenario('tres_armas'), linhaFixa: 19, teto: 300 });
    for (let k = 0; k < CAPACIDADE_DE_PICKUPS; k++) {
      const s = alocar(e.poolDePickups);
      e.pickups.x[s] = e.pickups.xAnt[s] = 400 + (k % 64) * 7.25;
      e.pickups.y[s] = e.pickups.yAnt[s] = 1000 + Math.floor(k / 64) * 41.5;
      e.pickups.valor[s] = [1, 7, 30][k % 3]!;
      e.pickups.tipo[s] = k % 100 === 0 ? TIPO_DE_PICKUP.bauDourado : k % 50 === 0 ? TIPO_DE_PICKUP.bauComum : TIPO_DE_PICKUP.cinza;
    }
    for (let k = 0; k < 20; k++) {
      const o = alocar(e.poolDeEfeitos);
      e.efeitos.x[o] = 585 + k;
      e.efeitos.y[o] = 1266;
      e.efeitos.dirX[o] = 1;
      e.efeitos.idade[o] = 1 + (k % 14);
      e.efeitos.arma[o] = ARMA.lamina_do_juramento_eterno;
    }
    const { cena } = criarCena();
    const ef = new EfeitosDaVigilia(D.tipos);
    const mundo = { gpu: new CamadaPorGPU(cena, MEMBROS_DO_MUNDO, false), saida: criarSaidaDeSprites(MEMBROS_DO_MUNDO) };
    const armas = { gpu: new CamadaPorGPU(cena, MEMBROS_DAS_ARMAS, false), saida: criarSaidaDeSprites(MEMBROS_DAS_ARMAS) };
    let alfa = 0;
    const { porPasso, maiores } = await medir((n) => {
      for (let k = 0; k < n; k++) {
        alfa = (alfa + 0.37) % 1;
        prepararMundo(e, D, alfa, 585, 1266, mundo.saida);
        mundo.gpu.escrever(mundo.saida);
        prepararArmas(e, D, ef, alfa, 585, 1266, 585, 1266, armas.saida);
        armas.gpu.escrever(armas.saida);
      }
    });
    expect(mundo.saida.visivel.reduce((a, v) => a + v, 0)).toBe(54 + CAPACIDADE_DE_PICKUPS);
    expect(porPasso, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
  }, 120_000);
  // E6 da F-005: a simulação com Cinzas (pool cheio e junções), level up escolhido pela 1ª carta e a União
  // (baú dourado aos 10:00 com a Espada nv8 e o Elmo), as ondas vivas. Só a simulação; o render está acima.
  it(`simulação com Cinzas, level up e a União (E6 da F-005), ${MEDIDOS} passos: ≤ ${LIMITE} B por passo, sem lista branca`, async () => {
    const base = parametrosDoCenario('tres_armas');
    const e = criarEstado(1, D, {
      ...base,
      cenario: base.cenario & ~CENARIO.semCinzas,
      linhaFixa: 19,
      teto: 300,
      passivas: [{ codigo: PASSIVA.elmo_sem_rosto, nivel: 1 }],
      baus: [{ dx: 0, dy: 0, dourado: true }],
      relogioInicial: 36000,
    });
    // Medido: 11,2 a 11,5 B/passo em 3 rodadas, metade na criarOnda (5 HeapNumbers por onda no interpretador).
    // O pool de pickups quase cheio, longe do Ímã: as Cinzas novas juntam (X6).
    const x0 = e.jogador[JOGADOR.x]!;
    const y0 = e.jogador[JOGADOR.y]!;
    const longe = new Int32Array(CAPACIDADE_DE_PICKUPS - 8);
    for (let k = 0; k < longe.length; k++) {
      const s = (longe[k] = alocar(e.poolDePickups));
      e.pickups.x[s] = e.pickups.xAnt[s] = x0 + 600 + (k % 32) * 9;
      e.pickups.y[s] = e.pickups.yAnt[s] = y0 + 600 + Math.floor(k / 32) * 9;
      e.pickups.valor[s] = 1;
      e.pickups.tipo[s] = TIPO_DE_PICKUP.cinza;
    }
    // Parado, como a E6 da F-004 (andando, os ramos frios que a subida de nível expõe desotimizam moverHorda e
    // golpear em ciclos, 150 a 2.000 B/passo medidos com 9.000 a 30.000 passos de aquecimento: é o JIT, não o
    // código). Parado, quase nenhuma Cinza cai no Ímã; a cada 200 passos, o teste traz uma das Cinzas de longe para
    // 40 px do jogador, com 60 XP: ela voa e é coletada (coleta, voo, nível, modal e recálculo no trecho medido),
    // e o pool continua cheio, com junções.
    const fonte = fonteConstante(criarComandos(), 'primeira');
    const pr = e.progresso;
    let nivelAntes = -1;
    let chamadas = 0;
    const { porPasso, maiores } = await medir((n) => {
      if (chamadas++ === 1) nivelAntes = pr[PROGRESSAO.nivel]!;
      for (let k = 0; k < n; k++) {
        const p = e.cab[CAB.passo]!;
        const s = longe[(p / 200) % longe.length]!;
        if (p % 200 === 0 && e.poolDePickups.posicao[s]! >= 0) {
          e.pickups.x[s] = e.pickups.xAnt[s] = e.jogador[JOGADOR.x]! + 40;
          e.pickups.y[s] = e.pickups.yAnt[s] = e.jogador[JOGADOR.y]!;
          e.pickups.valor[s] = 60;
          e.pickups.tipo[s] = TIPO_DE_PICKUP.cinza;
        }
        avancar(e, D, fonte, 1);
      }
    }, AQUECIMENTO_DA_UNIAO);
    expect(e.cab[CAB.passo]).toBe(AQUECIMENTO_DA_UNIAO + MEDIDOS);
    expect(e.build.codigo).toContain(ARMA.lamina_do_juramento_eterno);
    expect(e.mundo2[MUNDO2.juncoes]).toBeGreaterThan(0);
    expect(pr[PROGRESSAO.nivel]! - nivelAntes, 'ao menos um level up medido').toBeGreaterThan(0);
    expect(porPasso, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
  }, 300_000);

  // ——— F-006 (VT6, ET11): os ataques dos inimigos, o jogador vulnerável ———

  /** Conta os eventos por código a cada passo, lendo o anel pelo leitor (o `medir` só soma funções de src/, e o leitor não aloca). */
  function contador(e: ReturnType<typeof criarEstado>): { leitor: LeitorDeEventos; porTipo: number[]; ler: () => void } {
    const leitor = new LeitorDeEventos();
    const porTipo = new Array<number>(32).fill(0);
    const ler = (): void => {
      const n = leitor.pendentes(e.eventos);
      for (let k = 0; k < n; k++) {
        porTipo[e.eventos.u32[inicioDoEvento(leitor.proximo + k) + 1]! & 0xff]!++;
      }
      leitor.proximo += n;
    };
    return { leitor, porTipo, ler };
  }

  /** A horda_com_ataques com a build do tres_armas (E7a) e, no E7b, a União no minuto 10 (Espada nv8 + Elmo → Lâmina); jogador vulnerável. */
  function paramsE7(tutoriaisVistos: number, uniao: boolean): Partial<ParametrosDaVigilia> {
    const base = { ...parametrosDoCenario('horda_com_ataques'), armas: parametrosDoCenario('tres_armas').armas };
    return {
      ...base,
      cenario: CENARIO.ataques | CENARIO.semCinzas,
      tutoriaisVistos,
      teto: 300,
      ...(uniao ? { passivas: [{ codigo: PASSIVA.elmo_sem_rosto, nivel: 1 }], baus: [{ dx: 0, dy: 0, dourado: true }], relogioInicial: 36000 } : {}),
    };
  }

  /** Aparo a cada 40 passos e esquiva 20 passos depois (a mira alterna): a cadência fixa do E7b. */
  function roteiroDeAcoes(passos: number): AcaoDeRoteiro[] {
    const lista: AcaoDeRoteiro[] = [];
    const miras: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (let p = 40; p < passos; p += 40) {
      lista.push({ passo: p, acoes: ACAO.aparo });
      lista.push({ passo: p + 20, acoes: ACAO.esquiva, mira: miras[(p / 40) % 4]! });
    }
    return lista;
  }

  it(`E7a: horda com ataques, jogador vulnerável e parado, ${MEDIDOS} passos e quadros: ≤ ${LIMITE} B por passo, sem lista branca`, async () => {
    const e = criarEstado(1, D, paramsE7(TODOS_OS_TUTORIAIS, false));
    const { cena } = criarCena();
    const escritor = new HordaPorGPU(cena, false);
    const tabela = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
    const saida = criarSaidaDaHorda();
    const medios = { gpu: new CamadaPorGPU(cena, MEMBROS_DOS_MEDIOS, false), saida: criarSaidaDeSprites(MEMBROS_DOS_MEDIOS) };
    const telegrafos = { gpu: new CamadaPorGPU(cena, MEMBROS_DOS_TELEGRAFOS, false), saida: criarSaidaDeSprites(MEMBROS_DOS_TELEGRAFOS) };
    const projeteis = { gpu: new CamadaPorGPU(cena, MEMBROS_DOS_PROJETEIS_INIMIGOS, false), saida: criarSaidaDeSprites(MEMBROS_DOS_PROJETEIS_INIMIGOS) };
    const fonte = fonteConstante(criarComandos(), 'primeira');
    const c = contador(e);
    const { porPasso, maiores } = await medir((n) => {
      for (let k = 0; k < n; k++) {
        avancar(e, D, fonte, 1);
        c.ler();
        prepararHorda(e, 0.5, 585, 1266, saida);
        escritor.escrever(saida, tabela);
        prepararMedios(e, saida, tabela, D, 0.5, medios.saida);
        medios.gpu.escrever(medios.saida);
        prepararTelegrafos(e, D, saida, 0.5, telegrafos.saida);
        telegrafos.gpu.escrever(telegrafos.saida);
        prepararProjeteisInimigos(e, D, 0.5, 585, 1266, projeteis.saida);
        projeteis.gpu.escrever(projeteis.saida);
      }
    }, AQUECIMENTO_DOS_ATAQUES);
    expect(c.leitor.perdidos).toBe(0);
    expect(c.porTipo[EVENTO.telegrafo], 'telegrafo').toBeGreaterThan(0);
    expect(c.porTipo[EVENTO.golpeInimigo], 'golpeInimigo').toBeGreaterThan(0);
    expect(c.porTipo[EVENTO.projetilLancado], 'projetilLancado').toBeGreaterThan(0);
    expect(porPasso, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
  }, 600_000);

  // F-007 (LY4, DM8): o dano líquido, o Frasco e a interrupção no caminho quente, com a horda atacando o jogador parado.
  it(`E7c: horda com ataques, Frasco a cada 400 passos, dano forte a cada 500 e HP refeito a cada 400, ${MEDIDOS} passos: ≤ ${LIMITE} B por passo, sem lista branca`, async () => {
    const total = AQUECIMENTO_DOS_ATAQUES + MEDIDOS + 400;
    const e = criarEstado(1, D, paramsE7(TODOS_OS_TUTORIAIS, false));
    const acoes: AcaoDeRoteiro[] = [];
    for (let p = 100; p < total; p += 400) acoes.push({ passo: p, acoes: ACAO.frasco });
    const fonte = fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }], 'primeira', acoes);
    const c = contador(e);
    let passo = 0;
    const { porPasso, maiores } = await medir((n) => {
      for (let k = 0; k < n; k++) {
        // A morte entra na medida (LY4): chegando em FIM, a Vigília renasce com HP 60 para o laço seguir.
        if (e.jogador4U8[JOGADOR4_U8.fase] === FASE.fim) {
          e.jogador4U8[JOGADOR4_U8.fase] = FASE.viva;
          e.jogador4U8[JOGADOR4_U8.causaDoFim] = 0;
          e.jogador4U8[JOGADOR4_U8.apagandoPassos] = 0;
          e.jogador[JOGADOR.hp] = 60;
        }
        if (passo % 400 === 0) {
          e.jogador[JOGADOR.hp] = 60;
          e.jogador4U8[JOGADOR4_U8.frascoCargas] = 3;
        }
        if (passo % 500 === 250) {
          BRUTO[0] = 40;
          danoAoJogador(e, D, ORIGEM_DO_DANO.golpe);
        }
        avancar(e, D, fonte, 1);
        c.ler();
        passo++;
      }
    }, AQUECIMENTO_DOS_ATAQUES);
    expect(c.leitor.perdidos).toBe(0);
    for (const ev of ['frascoIniciado', 'frascoInterrompido', 'danoAoJogador', 'golpeInimigo', 'apagou', 'fimDaVigilia'] as const) expect(c.porTipo[EVENTO[ev]], ev).toBeGreaterThan(0);
    expect(porPasso, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
  }, 600_000);

  for (const [rotulo, vistos] of [
    ['roteiro de esquiva, esquiva perfeita, aparo e Contra-ataque', TODOS_OS_TUTORIAIS],
    ['variante com tutoriaisVistos = 0 (prompts visíveis, falhasDeAparo e janela de 17)', 0],
  ] as const) {
    it(`E7b: ${rotulo}, ${MEDIDOS} passos: ≤ ${LIMITE} B por passo, sem lista branca`, async () => {
      const total = AQUECIMENTO_DOS_ATAQUES + MEDIDOS + 400;
      const e = criarEstado(1, D, paramsE7(vistos, true));
      const fonte = fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }], 'primeira', roteiroDeAcoes(total));
      const { cena } = criarCena();
      const ef = new EfeitosDaVigilia(D.tipos);
      const escritor = new HordaPorGPU(cena, false);
      const tabela = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
      const saida = criarSaidaDaHorda();
      const camada = (n: number) => ({ gpu: new CamadaPorGPU(cena, n, false), saida: criarSaidaDeSprites(n) });
      const [medios, telegrafos, projeteis, armas] = [camada(MEMBROS_DOS_MEDIOS), camada(MEMBROS_DOS_TELEGRAFOS), camada(MEMBROS_DOS_PROJETEIS_INIMIGOS), camada(MEMBROS_DAS_ARMAS)];
      const c = contador(e);
      const { porPasso, maiores } = await medir((n) => {
        for (let k = 0; k < n; k++) {
          avancar(e, D, fonte, 1);
          c.ler();
          ef.consumir(e, true);
          prepararHorda(e, 0.5, 585, 1266, saida);
          escritor.escrever(saida, tabela);
          prepararMedios(e, saida, tabela, D, 0.5, medios.saida);
          medios.gpu.escrever(medios.saida);
          prepararTelegrafos(e, D, saida, 0.5, telegrafos.saida);
          telegrafos.gpu.escrever(telegrafos.saida);
          prepararProjeteisInimigos(e, D, 0.5, 585, 1266, projeteis.saida);
          projeteis.gpu.escrever(projeteis.saida);
          prepararArmas(e, D, ef, 0.5, 585, 1266, 585, 1266, armas.saida);
          armas.gpu.escrever(armas.saida);
        }
      }, AQUECIMENTO_DOS_ATAQUES);
      expect(e.build.codigo).toContain(ARMA.lamina_do_juramento_eterno);
      for (const ev of ['telegrafo', 'golpeInimigo', 'projetilLancado', 'esquiva', 'esquivaPerfeita', 'aparo', 'contraAtaque'] as const) {
        expect(c.porTipo[EVENTO[ev]], ev).toBeGreaterThan(0);
      }
      if (vistos === 0) expect(c.porTipo[EVENTO.aparoFalho]! + c.porTipo[EVENTO.aparoVazio]!, 'aparo falho ou vazio').toBeGreaterThan(0);
      expect(porPasso, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
    }, 600_000);
  }

  // CA: 1.000 Contra-ataques em sequência (caSeq posto à mão), numa Vigília sem horda para o resto do passo custar quase nada.
  it('1.000 Contra-ataques em sequência: ≤ 64 B no total depois do aquecimento', async () => {
    const base = parametrosDoCenario('tres_armas');
    const e = criarEstado(1, D, { ...base, cenario: CENARIO.ataques | CENARIO.diretorDesligado | CENARIO.semCinzas, teto: 300 });
    const b = e.build;
    const um = (): void => {
      for (let v = 0; v < b.caSeq.length; v++) {
        if (b.codigo[v] !== 0) {
          b.caSeq[v] = 1;
          b.caEspera[v] = 0;
        }
      }
      for (let k = 0; k < 200 && b.caSeq.some((x) => x !== 0); k++) avancar(e, D, PARADO, 1);
    };
    const { total, maiores } = await medir(
      (n) => {
        for (let k = 0; k < n; k++) um();
      },
      10000,
      1000,
    );
    expect(b.caSeq.every((x) => x === 0)).toBe(true);
    expect(total, maiores.join('; ')).toBeLessThanOrEqual(64);
  }, 300_000);
});
