// Ritmo de Almas × preço da árvore da Fundação (design/decisoes-F-010.md FD10): informativo, sem gate de balanceamento. Confere o
// preço total dos 19 ranks ativos (custoDoRank, Float32, ordem mais barata primeiro) e, com VDC_EVIDENCIAS=1 (scripts/verify.sh),
// grava production/evidencias/F-010/ritmo.txt com a tabela de compras e as Vigílias necessárias para as Almas medidas na F-009
// (production/evidencias/F-009/u9.log).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NOS_DA_FUNDACAO, custoDoRank } from '../../../src/logica/progressao/fundacao';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const EVIDENCIAS = process.env['VDC_EVIDENCIAS'] === '1';

interface Compra {
  readonly g: number;
  readonly no: string;
  readonly custo: number;
  readonly acumulado: number;
}

/** Compra sempre o rank mais barato disponível (empate: o primeiro nó da árvore) até esgotar os nós ativos. */
function comprasMaisBaratasPrimeiro(): Compra[] {
  const nos = NOS_DA_FUNDACAO.map((n, i) => ({ n, i })).filter((x) => x.n.ativo);
  const ranks = new Map<number, number>(nos.map((x) => [x.i, 0]));
  const compras: Compra[] = [];
  let g = 0;
  let acumulado = 0;
  for (;;) {
    let melhor: { i: number; custo: number } | null = null;
    for (const { n, i } of nos) {
      const rank = ranks.get(i)!;
      if (rank >= n.ranks) continue;
      const custo = custoDoRank(n.custoBase, rank + 1, g);
      if (melhor === null || custo < melhor.custo) melhor = { i, custo };
    }
    if (melhor === null) return compras;
    ranks.set(melhor.i, ranks.get(melhor.i)! + 1);
    g++;
    acumulado += melhor.custo;
    compras.push({ g, no: NOS_DA_FUNDACAO[melhor.i]!.id, custo: melhor.custo, acumulado });
  }
}

/** "Almas ao Santuário (400 / 1100 / 1600 aos 20:00): 900 / 1950 / 2700" do u9.log, por tipo de fim. */
function almasDoU9(): { rotulo: string; almas: number[] }[] {
  const caminho = join(RAIZ, 'production', 'evidencias', 'F-009', 'u9.log');
  if (!existsSync(caminho)) return [];
  const vistos = new Map<string, number[]>();
  for (const linha of readFileSync(caminho, 'utf-8').split('\n')) {
    const m = /^seed \d+ (\S+)\s+fim (\S+).*Almas ao Santuário \([^)]*\): (\d+) \/ (\d+) \/ (\d+)/.exec(linha);
    if (m) vistos.set(`${m[2]}, ${m[1]}`, [Number(m[3]), Number(m[4]), Number(m[5])]);
  }
  return [...vistos].map(([rotulo, almas]) => ({ rotulo, almas }));
}

describe('F-010 FD10: o ritmo de Almas e o preço da árvore', () => {
  const compras = comprasMaisBaratasPrimeiro();
  const total = compras[compras.length - 1]!.acumulado;

  it('são 19 ranks ativos; o 1º custa 300 (as Almas garantidas) e o total vem da fórmula em Float32', () => {
    expect(compras).toHaveLength(19);
    expect(compras[0]!.custo).toBe(300);
    expect(total).toBe(7852);
  });

  it('grava o ritmo.txt', () => {
    if (!EVIDENCIAS) return;
    const linhas = [
      '# Ritmo de Almas × preço da árvore da Fundação (D10 FD10; informativo, sem gate; o balanceamento fica para depois do iPhone).',
      '',
      '## Preço da árvore (19 ranks ativos; 300 × 1,12^(rank−1) × (1 + 0,015 × G), Float32; o rank mais barato primeiro)',
      'compra  nó                            custo  acumulado',
      ...compras.map((c) => `${String(c.g).padStart(6)}  ${c.no.padEnd(30)}${String(c.custo).padStart(6)}  ${String(c.acumulado).padStart(9)}`),
      `total: ${total} Almas (um só nó de 5 ranks: 1.969; de 3: 1.029).`,
      '',
      '## Vigílias para comprar tudo, com as Almas ao Santuário medidas na F-009 (u9.log, seeds 1 a 8) aos 20:00 de 400 / 1.100 / 1.600 coletadas',
      ...almasDoU9().map((x) => `${x.rotulo.padEnd(28)} ${x.almas.map((a) => String(a).padStart(5)).join(' / ')} Almas por Vigília => ${x.almas.map((a) => Math.ceil(total / a)).join(' / ')} Vigílias`),
      '',
      'A D10 FD10 estimou 5 a 20 Vigílias com os alvos líquidos de B §5.14 (400 / 1.100 / 1.600) e escreveu 7.851 de cabeça; o total do código é o de cima.',
      'O 1º Apagar garante 300 (GA1). Nenhuma decisão sai daqui: se o ritmo parecer errado, é balanceamento.',
    ];
    const destino = join(RAIZ, 'production', 'evidencias', 'F-010', 'ritmo.txt');
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, linhas.join('\n') + '\n');
  });
});
