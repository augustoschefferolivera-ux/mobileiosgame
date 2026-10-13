// Alocação do render dos golpes do Lanterneiro (F-009.14, ADR-0005 §2, E4): `prepararChefe` e o escritor GPU, a cada quadro, com um
// golpe de cada tipo em telegrafo e as 3 zonas vivas: ≤ 16 B por quadro em funções de src/ (amostragem de 64 B do HeapProfiler).
import { Session } from 'node:inspector/promises';
import { describe, expect, it } from 'vitest';
import { criarCena } from './phaserFalso';
import { CamadaPorGPU, criarSaidaDeSprites } from '../../src/cenas/render/camadas';
import { MEMBROS_DO_CHEFE, prepararChefe } from '../../src/cenas/render/chefe';
import { criarSaidaDaHorda, prepararHorda } from '../../src/cenas/render/horda';
import { FASE_DO_ATAQUE } from '../../src/logica/mundo/tipos';
import { CHEFE_F32, CHEFE_U16, JOGADOR } from '../../src/logica/nucleo/estado';
import { comChefe, D } from '../logica/chefe/apoio';

const LIMITE = 16;
const MEDIDOS = 6000;
// O V8 só desboxa os doubles de `setor` depois de algumas dezenas de milhares de chamadas (3.000 quadros de aquecimento medem 54 B).

interface No {
  callFrame: { functionName: string; url: string; lineNumber: number };
  selfSize: number;
  children: No[];
}

async function medir(rodar: (n: number) => void, aquecimento: number): Promise<{ porQuadro: number; maiores: string[] }> {
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
  const maiores = [...porFuncao.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([f, b]) => `${f}: ${(b / MEDIDOS).toFixed(1)} B/quadro`);
  return { porQuadro: nossos / MEDIDOS, maiores };
}

describe('alocação do render do Lanterneiro (E4)', () => {
  it(`golpes e zonas em todos os quadros, ${MEDIDOS} quadros: ≤ ${LIMITE} B por quadro, sem lista branca`, async () => {
    const { e, s } = comChefe();
    const { cena } = criarCena();
    const camada = { gpu: new CamadaPorGPU(cena, MEMBROS_DO_CHEFE, false), saida: criarSaidaDeSprites(MEMBROS_DO_CHEFE) };
    const saida = criarSaidaDaHorda();
    e.chefeF32[CHEFE_F32.miraX] = 0;
    e.chefeF32[CHEFE_F32.miraY] = 1;
    for (let z = 0; z < 3; z++) {
      e.chefeF32[CHEFE_F32.zonaX0 + z] = e.jogador[JOGADOR.x]! + 40 * z;
      e.chefeF32[CHEFE_F32.zonaY0 + z] = e.jogador[JOGADOR.y]! + 30;
      e.chefeU16[CHEFE_U16.zonaTimer0 + z] = z === 0 ? 0xffff : 200;
    }
    let alfa = 0;
    const { porQuadro, maiores } = await medir((n) => {
      for (let k = 0; k < n; k++) {
        alfa = (alfa + 0.37) % 1;
        e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
        e.inimigos.ataqueId[s] = 1 + (k % 5);
        e.inimigos.ataqueTimer[s] = 1 + (k % 40);
        prepararHorda(e, alfa, e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!, saida);
        prepararChefe(e, D, saida, alfa, e.jogador[JOGADOR.x]!, e.jogador[JOGADOR.y]!, camada.saida);
        camada.gpu.escrever(camada.saida);
      }
    }, 20000);
    expect(camada.saida.visivel.reduce((a, v) => a + v, 0)).toBeGreaterThan(2);
    expect(porQuadro, maiores.join('; ')).toBeLessThanOrEqual(LIMITE);
  }, 120_000);
});
