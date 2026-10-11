// F-003.7 (E2) na Playwright: heap sem crescimento em 60 s (B §4; ADR-0002 §11;
// design/decisoes-F-003.md §8). Cenário horda_rotativa (10 removidos e repostos
// a cada 60 passos): 300 vivos, 90 s de aquecimento, snapshot A, 60 s, snapshot
// B, cada um depois de HeapProfiler.collectGarbage. O aquecimento foi calibrado:
// com 30 s, os metadados do JIT do V8 (WeakArrayList, ProtectedFixedArray,
// SharedFunctionInfoWrapper) ainda cresciam ≈ 270 nós no 1º minuto e paravam
// depois (Δ ≈ 0 no 2º e no 3º minuto). Agrupa os nós por
// construtor (object, closure e native) ou pelo tipo, tira a lista fechada de
// exclusões e compara o total de bytes próprios e a contagem de cada grupo.
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { EVIDENCIAS, RAIZ, SEED, abrir, tocarAcender } from './apoio';

const URL_EXTRA = '&cenario=horda_rotativa&teto=300';
const AQUECIMENTO_MS = 90_000;
/** Inimigos que a rotação remove a cada 60 passos (horda_rotativa.json): entre a remoção e a reposição, há 290 vivos. */
const ROTACAO = 10;
/** Limites provisórios até as 3 rodadas de calibração (ADR-0005). */
const LIMITE_BYTES = 32_768;
const LIMITE_POR_GRUPO = 100;
/** Lista fechada de exclusões, com o motivo (o relatório a repete). */
const EXCLUSOES: Record<string, string> = {
  '(code)': 'código do JIT, que cresce com a otimização',
  PerformanceLongTaskTiming: 'entradas de desempenho do navegador, que crescem com tarefas longas',
  TaskAttributionTiming: 'entradas de desempenho do navegador, que crescem com tarefas longas',
};

interface Resumo {
  bytes: number;
  nos: number;
  grupos: Map<string, { n: number; bytes: number }>;
}

/** Tira um snapshot completo (depois de coleta) e o resume por grupo. */
async function snapshot(cdp: CDPSession): Promise<Resumo> {
  await cdp.send('HeapProfiler.collectGarbage');
  const pedacos: string[] = [];
  const ouvir = (e: { chunk: string }): void => void pedacos.push(e.chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', ouvir);
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  cdp.off('HeapProfiler.addHeapSnapshotChunk', ouvir);
  const s = JSON.parse(pedacos.join('')) as {
    snapshot: { meta: { node_fields: string[]; node_types: [string[]] } };
    nodes: number[];
    strings: string[];
  };
  const campos = s.snapshot.meta.node_fields;
  const tipos = s.snapshot.meta.node_types[0];
  const [iTipo, iNome, iBytes] = ['type', 'name', 'self_size'].map((c) => campos.indexOf(c)) as [number, number, number];
  const passo = campos.length;
  const grupos = new Map<string, { n: number; bytes: number }>();
  let bytes = 0;
  let nos = 0;
  for (let i = 0; i < s.nodes.length; i += passo) {
    const tipo = tipos[s.nodes[i + iTipo]!]!;
    const nome = s.strings[s.nodes[i + iNome]!]!;
    const grupo = tipo === 'object' || tipo === 'closure' || tipo === 'native' ? nome : `(${tipo})`;
    if (grupo in EXCLUSOES) continue;
    const b = s.nodes[i + iBytes]!;
    const g = grupos.get(grupo) ?? { n: 0, bytes: 0 };
    g.n++;
    g.bytes += b;
    grupos.set(grupo, g);
    bytes += b;
    nos++;
  }
  return { bytes, nos, grupos };
}

const estadoDaVigilia = (page: Page) =>
  page.evaluate(() => {
    const d = window.__GAME_DEBUG__;
    const v = d.vivos;
    return {
      passo: d.passo,
      vivos: v.oco_das_lanternas + v.oco_grande + v.novica_de_sal,
      removidos: d.diretor!.removidos,
      spawns: d.diretor!.spawns,
      render: d.render.modo,
      renderer: d.webgl.renderer,
      t: performance.now(),
    };
  });

test('F-003.7 (E2): heap sem crescimento em 60 s no cenário horda_rotativa', async ({ page, browserName }, info) => {
  test.setTimeout(240_000);
  await abrir(page, URL_EXTRA);
  await tocarAcender(page);
  await page.waitForFunction(() => {
    const v = window.__GAME_DEBUG__.vivos;
    return v.oco_das_lanternas + v.oco_grande + v.novica_de_sal === 300;
  });
  const cdp = await page.context().newCDPSession(page);
  await page.waitForTimeout(AQUECIMENTO_MS);

  const a = await snapshot(cdp);
  const ea = await estadoDaVigilia(page);
  const uso: { s: number; usadoKB: number }[] = [];
  for (let k = 1; k <= 6; k++) {
    await page.waitForTimeout(10_000);
    await cdp.send('HeapProfiler.collectGarbage');
    const h = (await cdp.send('Runtime.getHeapUsage')) as { usedSize: number };
    uso.push({ s: k * 10, usadoKB: Math.round(h.usedSize / 1024) });
  }
  const b = await snapshot(cdp);
  const eb = await estadoDaVigilia(page);

  const nomes = new Set([...a.grupos.keys(), ...b.grupos.keys()]);
  const mudaram = [...nomes]
    .map((g) => {
      const [x, y] = [a.grupos.get(g) ?? { n: 0, bytes: 0 }, b.grupos.get(g) ?? { n: 0, bytes: 0 }];
      return { grupo: g, delta_n: y.n - x.n, delta_bytes: y.bytes - x.bytes };
    })
    .filter((m) => m.delta_n !== 0 || m.delta_bytes !== 0)
    .sort((p, q) => Math.abs(q.delta_bytes) - Math.abs(p.delta_bytes));
  const deltaBytes = b.bytes - a.bytes;
  const piorGrupo = mudaram.reduce((m, g) => (g.delta_n > m.delta_n ? g : m), { grupo: '', delta_n: 0, delta_bytes: 0 });
  const aprovado = deltaBytes <= LIMITE_BYTES && piorGrupo.delta_n <= LIMITE_POR_GRUPO && eb.vivos >= 300 - ROTACAO;
  const relatorio = {
    criterio: 'F-003.7 (design/decisoes-F-003.md §8, E2)',
    identificacao: { seed: SEED, url: `?seed=${SEED}${URL_EXTRA}`, teto: 300, render: ea.render, navegador: browserName, renderer: ea.renderer },
    snapshots: {
      a: { passo: ea.passo, vivos: ea.vivos, liberacoes: ea.removidos, spawns: ea.spawns, bytes: a.bytes, nos: a.nos },
      b: { passo: eb.passo, vivos: eb.vivos, liberacoes: eb.removidos, spawns: eb.spawns, bytes: b.bytes, nos: b.nos },
      intervalo_s: Number(((eb.t - ea.t) / 1000).toFixed(1)),
    },
    liberacoes_no_intervalo: eb.removidos - ea.removidos,
    excluidos: EXCLUSOES,
    aquecimento_s: AQUECIMENTO_MS / 1000,
    limites: { delta_bytes: LIMITE_BYTES, delta_por_grupo: LIMITE_POR_GRUPO, calibracao: 'ADR-0005' },
    delta_bytes: deltaBytes,
    delta_nos: b.nos - a.nos,
    maior_delta_de_grupo: piorGrupo,
    grupos_que_mudaram: mudaram.slice(0, 40),
    heap_usado_a_cada_10s: uso,
    aprovado,
  };
  const destino = EVIDENCIAS ? join(RAIZ, 'production', 'evidencias', 'F-003', 'heap-60s.json') : info.outputPath('heap-60s.json');
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, JSON.stringify(relatorio, null, 2) + '\n');
  expect(eb.removidos - ea.removidos, 'a rotação nasceu e liberou inimigos no intervalo').toBeGreaterThan(300);
  expect(relatorio, JSON.stringify({ delta_bytes: deltaBytes, maior: piorGrupo, mudaram: mudaram.slice(0, 8) })).toMatchObject({ aprovado: true });
});
