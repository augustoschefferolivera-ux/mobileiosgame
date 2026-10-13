// Alocação do Lanterneiro (F-009.14, ADR-0005 §2, E7): a luta inteira (ataques, aparos, Quebras, transições, Convocar, Explosão,
// zonas, cegueira, Agarrar e a Fúria) com ≤ 16 B por passo em funções de src/, medida como a de alocacao.test.ts (HeapProfiler
// com amostragem de 64 B, incluindo o que os GCs coletaram), depois de um aquecimento longo: o V8 só otimiza o que roda muito, e o
// chefe é um código de uma luta de 3 minutos.
import { Session } from 'node:inspector/promises';
import { describe, expect, it } from 'vitest';
import { ACERTO } from '../../src/logica/armas/acerto';
import { ARMA } from '../../src/logica/armas/tabela';
import { acertarNoChefe, surgirChefe } from '../../src/logica/mundo/chefe';
import { ACAO, type ComandosDoPasso, type FonteDeComandos } from '../../src/logica/nucleo/comandos';
import { CAB, CAPACIDADE_DE_INIMIGOS, CENARIO, CHEFE_F32, CHEFE_U16, CHEFE_U32, CHEFE_U8, ETAPA, FASE, FOGUEIRA_U32, FOGUEIRA_U8, JOGADOR, JOGADOR2, JOGADOR3_U16, JOGADOR4_U32, JOGADOR4_U8, PROGRESSAO, SEM_CHEFE, TODOS_OS_TUTORIAIS, criarEstado, type Estado } from '../../src/logica/nucleo/estado';
import { CAUSA, FORMA } from '../../src/logica/nucleo/eventos';
import { matarInimigo } from '../../src/logica/mundo/inimigos';
import { avancar } from '../../src/logica/nucleo/passo';
import { DADOS_BRUTOS as D } from '../logica/apoio';

const LIMITE = 16;
const MEDIDOS = 6000;
const AQUECIMENTO = Number(process.env['VDC_AQUECIMENTO_CHEFE'] ?? 150_000);

interface No {
  callFrame: { functionName: string; url: string; lineNumber: number };
  selfSize: number;
  children: No[];
}

async function medir(rodar: (n: number) => void, aquecimento: number): Promise<{ porPasso: number; maiores: string[] }> {
  rodar(aquecimento);
  const sessao = new Session();
  sessao.connect();
  await sessao.post('HeapProfiler.startSampling', { samplingInterval: 64, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true } as never);
  rodar(MEDIDOS);
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
  const maiores = [...porFuncao.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([f, b]) => `${f}: ${(b / MEDIDOS).toFixed(1)} B/passo`);
  // VDC_MEDIDAS=1 imprime a medida (os números do ADR); sem ele, só o limite reprova. O vitest esconde o console dos testes que passam.
  if (process.env['VDC_MEDIDAS'] === '1') process.stderr.write(`[alocacao-chefe] ${(nossos / MEDIDOS).toFixed(1)} B/passo; ${maiores.slice(0, 5).join('; ')}\n`);
  return { porPasso: nossos / MEDIDOS, maiores };
}

/**
 * O jogador da luta: parado dentro da arena, apara o telegrafo branco quando falta pouco, esquiva do vermelho (Luz Cega, Explosão)
 * e usa o Frasco. Lê o estado a cada passo; não aloca.
 */
function jogadorDaLuta(e: Estado): FonteDeComandos {
  return {
    comandosDoPasso(passo: number, out: ComandosDoPasso): void {
      const angulo = passo / 90;
      // Parado dentro da arena (como o F-008.8): só a esquiva, quando vem, o move.
      out.movimento[0] = 0;
      out.movimento[1] = 0;
      out.acoes[0] = 0;
      out.mira[0] = Math.cos(angulo + 1);
      out.mira[1] = Math.sin(angulo + 1);
      const s = e.chefeU16[CHEFE_U16.slot]!;
      if (s === SEM_CHEFE) return;
      const timer = e.inimigos.ataqueTimer[s]!;
      if (e.inimigos.ataqueFase[s] === 1 && e.jogador3U16[JOGADOR3_U16.ameacasAparaveis]! > 0 && timer === 6) out.acoes[0] = ACAO.aparo;
      else if (e.inimigos.ataqueFase[s] === 1 && timer === 8 && (e.inimigos.ataqueId[s] === 3 || e.inimigos.ataqueId[s] === 5)) out.acoes[0] = ACAO.esquiva;
    },
  };
}

function golpeDoJogador(e: Estado, s: number, forma: number): void {
  ACERTO[0] = 40;
  ACERTO[1] = 200;
  acertarNoChefe(e, D, s, 1, forma, 0);
}

/** Mantém a luta viva e passando por todas as fases: reabastece o HP em volta dos limiares e enche a Postura de tempos em tempos. */
function cuidarDaLuta(e: Estado): void {
  const passo = e.cab[CAB.passo]!;
  const s = e.chefeU16[CHEFE_U16.slot]!;
  if (s === SEM_CHEFE) {
    // O chefe saiu (abaixo): a luta recomeça. Uma morte de verdade (um golpe a mais) leva ao Amanhecer, medido no teste seguinte:
    // aqui a Vigília volta à fase VIVA e à etapa CHEFE.
    e.jogador4U8[JOGADOR4_U8.fase] = FASE.viva;
    e.fogueiraU8[FOGUEIRA_U8.etapa] = ETAPA.chefe;
    e.chefeU8[CHEFE_U8.morto] = 0;
    e.cab[CAB.relogio] = 72_000;
    surgirChefe(e, D);
    return;
  }
  if (passo % 1500 === 0 && e.chefeU16[CHEFE_U16.transicaoPassos] === 0) {
    const fase = e.chefeU8[CHEFE_U8.fase]!;
    const hpMax = e.chefeF32[CHEFE_F32.hpMax]!;
    // No limiar da próxima fase, para a transição vir no fim do passo; na 3 o HP vai a 1 e o próximo golpe o mata de verdade: a
    // morte leva ao Amanhecer, que corta projéteis e ondas (M1 do crítico: nada de matarInimigo(cinza) para esconder esse regime).
    if (fase === 3) e.inimigos.hp[s] = 1;
    else e.inimigos.hp[s] = fase === 1 ? Math.fround((hpMax * 60) / 100) : Math.fround((hpMax * 25) / 100);
  }
  if (passo % 700 === 350) e.chefeF32[CHEFE_F32.postura] = Math.max(e.chefeF32[CHEFE_F32.postura]!, 90);
  // O dano do jogador entra pelo ponto único do chefe (as armas têm os testes de alocação delas): um golpe da Espada a cada 15 passos,
  // uma faca a cada 20 e um tick do Círculo a cada 30; o relógio fica entre 20:00 e 23:00.
  if (passo % 45 === 0) golpeDoJogador(e, s, FORMA.onda);
  // Os convocados morrem em poucos passos, como com as armas matando (o F-008.8): sem eles acumulados, a conta é a do chefe.
  if (passo % 40 === 20) {
    for (let q = 0; q < CAPACIDADE_DE_INIMIGOS; q++) if (q !== s && e.pool.posicao[q]! >= 0) matarInimigo(e, D, q, CAUSA.arena);
  }
  if (e.cab[CAB.relogio]! > 80_000 && e.chefeU16[CHEFE_U16.transicaoPassos] === 0) e.cab[CAB.relogio] = 72_100;
}

describe('alocação do Lanterneiro (E7, F-009.14)', () => {
  it(`a luta inteira, ${MEDIDOS} passos depois de ${AQUECIMENTO}: ≤ ${LIMITE} B por passo, sem lista branca`, async () => {
    const e = criarEstado(7, D, {
      cenario: CENARIO.ataques | CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel,
      relogioInicial: 71_999,
      inicioLivre: true,
      tutoriaisVistos: TODOS_OS_TUTORIAIS,
      armas: [{ codigo: ARMA.espada_longa_do_juramento, nivel: 8 }, { codigo: ARMA.facas_de_sal, nivel: 8 }, { codigo: ARMA.circulo_de_sal, nivel: 8 }],
    });
    e.progresso[PROGRESSAO.nivel] = 29;
    const fonte = jogadorDaLuta(e);
    let fases = 0;
    const { porPasso, maiores } = await medir((n) => {
      for (let k = 0; k < n; k++) {
        avancar(e, D, fonte, 1);
        cuidarDaLuta(e);
        if (e.chefeU8[CHEFE_U8.faseMax]! > fases) fases = e.chefeU8[CHEFE_U8.faseMax]!;
      }
    }, AQUECIMENTO);
    expect(e.jogador4U8[JOGADOR4_U8.fase]).toBe(FASE.viva);
    // O que o teste mede aconteceu: as 3 fases (com a morte e o novo surgimento), aparos e muitas convocações.
    expect(fases).toBe(3);
    expect(e.jogador4U32[JOGADOR4_U32.aparos]).toBeGreaterThan(50);
    expect(e.fogueiraU32[FOGUEIRA_U32.convocacoes]).toBeGreaterThan(50);
    expect(porPasso, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
  }, 900_000);
});

describe('alocação de A Fome e do Amanhecer (E7, F-009.14)', () => {
  it(`ciclos de A Fome (até o HP zerar) e de Amanhecer (600 passos), ${MEDIDOS} passos depois de 30.000: ≤ ${LIMITE} B por passo`, async () => {
    const e = criarEstado(11, D, {
      cenario: CENARIO.diretorDesligado,
      relogioInicial: 79_000,
      inicioLivre: true,
      tutoriaisVistos: TODOS_OS_TUTORIAIS,
      armas: [{ codigo: ARMA.espada_longa_do_juramento, nivel: 1 }],
    });
    e.fogueiraU8[FOGUEIRA_U8.etapa] = ETAPA.chefe;
    const fonte: FonteDeComandos = {
      comandosDoPasso(_passo, out: ComandosDoPasso) {
        out.movimento[0] = 1;
        out.movimento[1] = 0;
        out.acoes[0] = 0;
        out.mira[0] = 1;
        out.mira[1] = 0;
      },
    };
    let ciclo = 0;
    let fome = 0;
    let amanheceres = 0;
    const reiniciar = (): void => {
      e.jogador4U8[JOGADOR4_U8.fase] = FASE.viva;
      e.jogador4U8[JOGADOR4_U8.causaDoFim] = 0;
      e.fogueiraU8[FOGUEIRA_U8.etapa] = ETAPA.chefe;
      e.jogador[JOGADOR.hp] = e.jogador2[JOGADOR2.hpMax]!;
      e.chefeU16[CHEFE_U16.amanhecerPassos] = 0;
      e.chefeU32[CHEFE_U32.fomePassos] = 0;
      if (ciclo++ % 2 === 0) {
        e.chefeU8[CHEFE_U8.morto] = 0;
        e.cab[CAB.relogio] = 82_799;
      } else {
        e.chefeU8[CHEFE_U8.morto] = 1;
        e.cab[CAB.relogio] = 80_000;
      }
    };
    reiniciar();
    const { porPasso, maiores } = await medir((n) => {
      for (let k = 0; k < n; k++) {
        if (e.jogador4U8[JOGADOR4_U8.fase] === FASE.fim) reiniciar();
        avancar(e, D, fonte, 1);
        if (e.jogador4U8[JOGADOR4_U8.fase] === FASE.aFome) fome++;
        if (e.jogador4U8[JOGADOR4_U8.fase] === FASE.amanhecer) amanheceres++;
      }
    }, 30_000);
    // O que o teste mede aconteceu: muitos passos de cada fase e vários fins.
    expect(fome).toBeGreaterThan(5000);
    expect(amanheceres).toBeGreaterThan(5000);
    expect(porPasso, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
  }, 300_000);
});
