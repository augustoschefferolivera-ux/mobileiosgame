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
import { CamadaPorGPU, criarSaidaDeSprites } from '../../src/cenas/render/camadas';
import { CAPACIDADE_DE_MORTES, EfeitosDaVigilia } from '../../src/cenas/render/efeitos';
import { criarSaidaDaHorda, criarTabelaDeDesenho, prepararHorda } from '../../src/cenas/render/horda';
import { CAB, CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PICKUPS, CENARIO, JOGADOR, MUNDO, MUNDO2, PROGRESSAO, TIPO_DE_PICKUP, criarEstado } from '../../src/logica/nucleo/estado';
import { criarComandos, fonteConstante } from '../../src/logica/nucleo/comandos';
import { PASSIVA } from '../../src/logica/progressao/tabela';
import { avancar } from '../../src/logica/nucleo/passo';
import { ARMA } from '../../src/logica/armas/tabela';
import { alocar, quantosAtivos } from '../../src/logica/nucleo/pool';
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
const MEDIDOS = 6000;

interface No {
  callFrame: { functionName: string; url: string; lineNumber: number };
  selfSize: number;
  children: No[];
}

/** Roda `rodar(n)` com o HeapProfiler amostrando e devolve os bytes em funções de src/ por passo e as 5 maiores. */
async function medir(rodar: (n: number) => void, aquecimento = AQUECIMENTO): Promise<{ porPasso: number; maiores: string[] }> {
  rodar(aquecimento);
  const sessao = new Session();
  sessao.connect();
  await sessao.post('HeapProfiler.startSampling', {
    samplingInterval: 64,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  } as never);
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
  const maiores = [...porFuncao.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([f, b]) => `${f}: ${(b / MEDIDOS).toFixed(1)} B/passo`);
  return { porPasso: nossos / MEDIDOS, maiores };
}

describe('alocação no caminho quente (E4)', () => {
  it(`cenário horda, ${MEDIDOS} passos e quadros: ≤ ${LIMITE} B por passo em funções de src/`, async () => {
    const e = criarEstado(1, D, { ...parametrosDoCenario('horda'), teto: 300 });
    const { cena } = criarCena();
    const escritor = new HordaPorGPU(cena, false);
    const tabela = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
    const saida = criarSaidaDaHorda();
    const { porPasso, maiores } = await medir((n) => {
      for (let k = 0; k < n; k++) {
        avancar(e, D, PARADO, 1);
        prepararHorda(e, 0.5, 585, 1266, saida);
        escritor.escrever(saida, tabela);
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
        prepararStatus(e, saida, status.saida);
        status.gpu.escrever(status.saida);
        prepararArmas(e, D, ef, 0.5, 585, 1266, 585, 1266, armas.saida);
        armas.gpu.escrever(armas.saida);
        prepararNumeros(ef, e, 0.5, 585, 1266, digitos.saida);
        digitos.gpu.escrever(digitos.saida);
      }
    }, AQUECIMENTO_COM_ARMAS);
    expect(ef.leitor.perdidos).toBe(0);
    // As armas matam o tempo todo (≈ 0,03 por passo medido): o caminho de nascer e de morrer é exercitado.
    expect(e.mundo[MUNDO.mortes]! / (AQUECIMENTO_COM_ARMAS + MEDIDOS)).toBeGreaterThan(0.02);
    expect(porPasso, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
  }, 240_000);
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
});
