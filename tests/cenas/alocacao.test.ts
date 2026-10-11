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
import { criarSaidaDaHorda, criarTabelaDeDesenho, prepararHorda } from '../../src/cenas/render/horda';
import { MUNDO, criarEstado } from '../../src/logica/nucleo/estado';
import { avancar } from '../../src/logica/nucleo/passo';
import { quantosAtivos } from '../../src/logica/nucleo/pool';
import { parametrosDoCenario } from '../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D, PARADO } from '../logica/apoio';

/** Limite, em bytes por passo + quadro (ADR-0005). */
const LIMITE = 16;
const AQUECIMENTO = 3000;
const AQUECIMENTO_COM_ARMAS = 9000;
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
  // double como objeto (≈ 215 B/passo medidos); com 9.000, 12 a 13 B/passo em 3 rodadas, quase tudo no caminho de
  // nascer (funções chamadas a cada reposição, que ficam no interpretador).
  it(`com as 3 armas no nv8 matando na linha 19 (E6), ${MEDIDOS} passos e quadros: ≤ ${LIMITE} B por passo, sem lista branca`, async () => {
    const e = criarEstado(1, D, { ...parametrosDoCenario('tres_armas'), linhaFixa: 19, teto: 300 });
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
    }, AQUECIMENTO_COM_ARMAS);
    // As armas matam o tempo todo (≈ 0,03 por passo medido): o caminho de nascer e de morrer é exercitado.
    expect(e.mundo[MUNDO.mortes]! / (AQUECIMENTO_COM_ARMAS + MEDIDOS)).toBeGreaterThan(0.02);
    expect(porPasso, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
  }, 180_000);
});
